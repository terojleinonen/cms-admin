/**
 * Audit Log Retention and Archival System
 * Manages log lifecycle, archival, and cleanup policies
 */

import { PrismaClient } from '@prisma/client'
import { promises as fs, createWriteStream, createReadStream } from 'fs'

interface ArchiveData {
  metadata: unknown;
  logs: any[];
}
import path from 'path'
import { createGzip } from 'zlib'
import { pipeline } from 'stream/promises'

export interface RetentionPolicy {
  name: string
  description: string
  retentionDays: number
  archiveAfterDays: number
  compressionEnabled: boolean
  archiveLocation: 'local' | 's3' | 'gcs'
  archiveConfig?: {
    bucket?: string
    region?: string
    credentials?: unknown
  }
}

export interface ArchivalResult {
  archivedCount: number
  archiveSize: number
  archiveLocation: string
  compressionRatio?: number
}

export interface CleanupResult {
  deletedCount: number
  freedSpace: number
  oldestDeletedDate: Date
  newestDeletedDate: Date
}

/**
 * Default retention policies for different log types
 */
export const DEFAULT_RETENTION_POLICIES: Record<string, RetentionPolicy> = {
  security: {
    name: 'Security Logs',
    description: 'High-priority security events and authentication logs',
    retentionDays: 2555, // 7 years for compliance
    archiveAfterDays: 365, // Archive after 1 year
    compressionEnabled: true,
    archiveLocation: 'local',
  },
  audit: {
    name: 'General Audit Logs',
    description: 'Standard user activity and system operation logs',
    retentionDays: 1095, // 3 years
    archiveAfterDays: 180, // Archive after 6 months
    compressionEnabled: true,
    archiveLocation: 'local',
  },
  system: {
    name: 'System Logs',
    description: 'System maintenance and operational logs',
    retentionDays: 365, // 1 year
    archiveAfterDays: 90, // Archive after 3 months
    compressionEnabled: true,
    archiveLocation: 'local',
  },
  debug: {
    name: 'Debug Logs',
    description: 'Development and debugging logs',
    retentionDays: 30, // 30 days
    archiveAfterDays: 7, // Archive after 1 week
    compressionEnabled: true,
    archiveLocation: 'local',
  },
}

/**
 * Audit Log Retention Manager
 */
export class AuditRetentionManager {
  private prisma: PrismaClient
  private archiveBasePath: string
  public policies: Record<string, RetentionPolicy>

  constructor(
    prisma: PrismaClient,
    archiveBasePath: string = './data/archives',
    customPolicies?: Record<string, RetentionPolicy>
  ) {
    this.prisma = prisma
    this.archiveBasePath = archiveBasePath
    this.policies = { ...DEFAULT_RETENTION_POLICIES, ...customPolicies }
  }

  /**
   * Archive old audit logs based on retention policy
   */
  async archiveLogs(policyName: string = 'audit'): Promise<ArchivalResult> {
    const policy = this.policies[policyName]
    if (!policy) {
      throw new Error(`Retention policy '${policyName}' not found`)
    }

    const archiveDate = new Date(Date.now() - (policy.archiveAfterDays * 24 * 60 * 60 * 1000))
    const retentionDate = new Date(Date.now() - (policy.retentionDays * 24 * 60 * 60 * 1000))

    // Get logs to archive (older than archiveAfterDays but newer than retentionDays)
    const logsToArchive = await this.prisma.auditLog.findMany({
      where: {
        createdAt: {
          lt: archiveDate,
          gte: retentionDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    if (logsToArchive.length === 0) {
      return {
        archivedCount: 0,
        archiveSize: 0,
        archiveLocation: 'none',
      }
    }

    // Create archive directory
    const archiveDir = path.join(this.archiveBasePath, policyName)
    await fs.mkdir(archiveDir, { recursive: true })

    // Generate archive filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const archiveFilename = `audit-logs-${policyName}-${timestamp}.json`
    const archivePath = path.join(archiveDir, archiveFilename)

    // Prepare archive data
    const archiveData = {
      metadata: {
        policy: policyName,
        archivedAt: new Date().toISOString(),
        totalRecords: logsToArchive.length,
        dateRange: {
          from: logsToArchive[0]?.createdAt,
          to: logsToArchive[logsToArchive.length - 1]?.createdAt,
        },
        retentionPolicy: policy,
      },
      logs: logsToArchive,
    }

    let archiveSize: number
    let compressionRatio: number | undefined

    if (policy.compressionEnabled) {
      // Compress and write archive
      const compressedPath = `${archivePath}.gz`
      const jsonData = JSON.stringify(archiveData, null, 2)
      const originalSize = Buffer.byteLength(jsonData, 'utf8')

      await pipeline(
        async function* () {
          yield Buffer.from(jsonData, 'utf8')
        },
        createGzip(),
          createWriteStream(compressedPath)
      )

      const stats = await fs.stat(compressedPath)
      archiveSize = stats.size
      compressionRatio = originalSize / archiveSize

      // Remove uncompressed file if it exists
      try {
        await fs.unlink(archivePath)
      } catch {
        // Ignore if file doesn't exist
      }
    } else {
      // Write uncompressed archive
      await fs.writeFile(archivePath, JSON.stringify(archiveData, null, 2), 'utf8')
      const stats = await fs.stat(archivePath)
      archiveSize = stats.size
    }

    // Remove archived logs from database
    const logIds = logsToArchive.map(log => log.id)
    await this.prisma.auditLog.deleteMany({
      where: {
        id: {
          in: logIds,
        },
      },
    })

    console.log(`Archived ${logsToArchive.length} audit logs to ${archivePath}`)

    return {
      archivedCount: logsToArchive.length,
      archiveSize,
      archiveLocation: policy.compressionEnabled ? `${archivePath}.gz` : archivePath,
      compressionRatio,
    }
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanupLogs(policyName: string = 'audit'): Promise<CleanupResult> {
    const policy = this.policies[policyName]
    if (!policy) {
      throw new Error(`Retention policy '${policyName}' not found`)
    }

    const cutoffDate = new Date(Date.now() - (policy.retentionDays * 24 * 60 * 60 * 1000))

    // Get logs to delete for statistics
    const logsToDelete = await this.prisma.auditLog.findMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    if (logsToDelete.length === 0) {
      return {
        deletedCount: 0,
        freedSpace: 0,
        oldestDeletedDate: new Date(),
        newestDeletedDate: new Date(),
      }
    }

    // Estimate freed space (rough calculation)
    const avgLogSize = 500 // bytes per log entry (estimate)
    const freedSpace = logsToDelete.length * avgLogSize

    // Delete old logs
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    })

    console.log(`Cleaned up ${result.count} audit logs older than ${policy.retentionDays} days`)

    return {
      deletedCount: result.count,
      freedSpace,
      oldestDeletedDate: logsToDelete[0].createdAt,
      newestDeletedDate: logsToDelete[logsToDelete.length - 1].createdAt,
    }
  }

  /**
   * Run full retention cycle (archive then cleanup)
   */
  async runRetentionCycle(policyName: string = 'audit'): Promise<{
    archival: ArchivalResult
    cleanup: CleanupResult
  }> {
    console.log(`Starting retention cycle for policy: ${policyName}`)

    // First archive eligible logs
    const archival = await this.archiveLogs(policyName)
    
    // Then cleanup old logs
    const cleanup = await this.cleanupLogs(policyName)

    console.log(`Retention cycle completed for policy: ${policyName}`)
    console.log(`Archived: ${archival.archivedCount} logs, Deleted: ${cleanup.deletedCount} logs`)

    return { archival, cleanup }
  }

  /**
   * Get retention statistics
   */
  async getRetentionStats(): Promise<{
    totalLogs: number
    logsByAge: Record<string, number>
    archiveInfo: Array<{
      policy: string
      archiveCount: number
      totalSize: number
      oldestArchive: Date
      newestArchive: Date
    }>
  }> {
    // Get total log count
    const totalLogs = await this.prisma.auditLog.count()

    // Get logs by age ranges
    const now = new Date()
    const ranges = [
      { name: '0-7 days', days: 7 },
      { name: '8-30 days', days: 30 },
      { name: '31-90 days', days: 90 },
      { name: '91-365 days', days: 365 },
      { name: '1+ years', days: Infinity },
    ]

    const logsByAge: Record<string, number> = {}
    let previousDate = now

    for (const range of ranges) {
      const rangeDate = range.days === Infinity 
        ? new Date(0) 
        : new Date(now.getTime() - (range.days * 24 * 60 * 60 * 1000))

      const count = await this.prisma.auditLog.count({
        where: {
          createdAt: {
            lt: previousDate,
            gte: range.days === Infinity ? undefined : rangeDate,
          },
        },
      })

      logsByAge[range.name] = count
      previousDate = rangeDate
    }

    // Get archive information
    const archiveInfo: Array<{
      policy: string
      archiveCount: number
      totalSize: number
      oldestArchive: Date
      newestArchive: Date
    }> = []

    for (const [policyName] of Object.entries(this.policies)) {
      try {
        const archiveDir = path.join(this.archiveBasePath, policyName)
        const files = await fs.readdir(archiveDir)
        const archiveFiles = files.filter(f => f.startsWith('audit-logs-') && (f.endsWith('.json') || f.endsWith('.gz')))

        if (archiveFiles.length > 0) {
          let totalSize = 0
          const dates: Date[] = []

          for (const file of archiveFiles) {
            const filePath = path.join(archiveDir, file)
            const stats = await fs.stat(filePath)
            totalSize += stats.size
            dates.push(stats.mtime)
          }

          dates.sort((a, b) => a.getTime() - b.getTime())

          archiveInfo.push({
            policy: policyName,
            archiveCount: archiveFiles.length,
            totalSize,
            oldestArchive: dates[0],
            newestArchive: dates[dates.length - 1],
          })
        }
      } catch (error) {
        // Archive directory doesn't exist or is inaccessible
        console.warn(`Could not read archive directory for policy ${policyName}:`, error)
      }
    }

    return {
      totalLogs,
      logsByAge,
      archiveInfo,
    }
  }

  /**
   * Restore logs from archive
   */
  async restoreFromArchive(archiveFilePath: string): Promise<{
    restoredCount: number
    archiveMetadata: unknown
  }> {
    let archiveData: ArchiveData

    try {
      if (archiveFilePath.endsWith('.gz')) {
        // Handle compressed archives
        const { createGunzip } = await import('zlib')
        const { pipeline } = await import('stream/promises')
        
        let decompressedData = ''
        await pipeline(
          createReadStream(archiveFilePath),
          createGunzip(),
          async function* (source) {
            for await (const chunk of source) {
              decompressedData += chunk.toString()
            }
            yield decompressedData
          }
        )
        
        archiveData = JSON.parse(decompressedData) as ArchiveData
      } else {
        // Handle uncompressed archives
        const fileContent = await fs.readFile(archiveFilePath, 'utf8')
        archiveData = JSON.parse(fileContent) as ArchiveData
      }
    } catch (error) {
      throw new Error(`Failed to read archive file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    if (!archiveData.logs || !Array.isArray(archiveData.logs)) {
      throw new Error('Invalid archive format: missing logs array')
    }

    // Restore logs to database
    const logs = archiveData.logs.map((log: any) => ({
      id: log.id,
      userId: log.userId,
      action: log.action,
      resource: log.resource,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: new Date(log.createdAt),
    }))

    // Use transaction to ensure data integrity
    await this.prisma.$transaction(async (tx) => {
      for (const log of logs) {
        await tx.auditLog.upsert({
          where: { id: log.id },
          update: log,
          create: log,
        })
      }
    })

    console.log(`Restored ${logs.length} audit logs from ${archiveFilePath}`)

    return {
      restoredCount: logs.length,
      archiveMetadata: archiveData.metadata,
    }
  }

  /**
   * Schedule automatic retention cycles
   */
  scheduleRetentionCycles(): void {
    // Run retention cycle daily at 2 AM
    const scheduleDaily = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(2, 0, 0, 0)
      
      const msUntilTomorrow = tomorrow.getTime() - now.getTime()
      
      setTimeout(async () => {
        try {
          console.log('Starting scheduled retention cycle')
          
          // Run retention for all policies
          for (const policyName of Object.keys(this.policies)) {
            try {
              await this.runRetentionCycle(policyName)
            } catch (error) {
              console.error(`Retention cycle failed for policy ${policyName}:`, error)
            }
          }
          
          console.log('Scheduled retention cycle completed')
        } catch (error) {
          console.error('Scheduled retention cycle failed:', error)
        }
        
        // Schedule next run
        scheduleDaily()
      }, msUntilTomorrow)
    }

    scheduleDaily()
    console.log('Automatic retention cycles scheduled')
  }
}

/**
 * Create and configure retention manager
 */
export function createRetentionManager(
  prisma: PrismaClient,
  config?: {
    archiveBasePath?: string
    customPolicies?: Record<string, RetentionPolicy>
    autoSchedule?: boolean
  }
): AuditRetentionManager {
  const manager = new AuditRetentionManager(
    prisma,
    config?.archiveBasePath,
    config?.customPolicies
  )

  if (config?.autoSchedule !== false) {
    manager.scheduleRetentionCycles()
  }

  return manager
}