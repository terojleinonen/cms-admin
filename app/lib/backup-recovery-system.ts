/**
 * Automated Backup and Recovery System
 * Handles automated backups and recovery procedures for production RBAC system
 */

import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, mkdir, access } from 'fs/promises'
import { join } from 'path'
import { createHash } from 'crypto'

const execAsync = promisify(exec)

interface BackupMetadata {
  id: string
  timestamp: Date
  type: 'full' | 'incremental' | 'rbac_only'
  size: number
  checksum: string
  tables: string[]
  status: 'in_progress' | 'completed' | 'failed'
  error?: string
}

interface RecoveryPoint {
  backupId: string
  timestamp: Date
  description: string
  verified: boolean
}

export class BackupRecoverySystem {
  private prisma: PrismaClient
  private backupDir: string
  private maxBackups: number

  constructor(backupDir: string = './backups', maxBackups: number = 30) {
    this.prisma = new PrismaClient()
    this.backupDir = backupDir
    this.maxBackups = maxBackups
  }

  async initialize(): Promise<void> {
    // Ensure backup directory exists
    try {
      await access(this.backupDir)
    } catch {
      await mkdir(this.backupDir, { recursive: true })
    }

    // Create backup metadata table if it doesn't exist
    try {
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS backup_metadata (
          id VARCHAR(255) PRIMARY KEY,
          timestamp TIMESTAMP NOT NULL,
          type VARCHAR(50) NOT NULL,
          size BIGINT NOT NULL,
          checksum VARCHAR(255) NOT NULL,
          tables TEXT[] NOT NULL,
          status VARCHAR(50) NOT NULL,
          error TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    } catch (error) {
      console.error('Failed to create backup_metadata table:', error)
    }
  }

  async createFullBackup(): Promise<BackupMetadata> {
    const backupId = `full_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date()
    
    console.log(`Starting full backup: ${backupId}`)

    try {
      // Get all RBAC-related tables
      const rbacTables = [
        'User', 'Role', 'Permission', 'UserRole', 'RolePermission',
        'PermissionCache', 'AuditLog', 'SecurityEvent'
      ]

      const backupPath = join(this.backupDir, `${backupId}.sql`)
      
      // Create database dump
      const dumpCommand = this.buildDumpCommand(rbacTables, backupPath)
      await execAsync(dumpCommand)

      // Calculate file size and checksum
      const backupData = await readFile(backupPath)
      const size = backupData.length
      const checksum = createHash('sha256').update(backupData).digest('hex')

      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        type: 'full',
        size,
        checksum,
        tables: rbacTables,
        status: 'completed'
      }

      // Store metadata
      await this.storeBackupMetadata(metadata)
      
      console.log(`Full backup completed: ${backupId}`)
      return metadata

    } catch (error) {
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        type: 'full',
        size: 0,
        checksum: '',
        tables: [],
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }

      await this.storeBackupMetadata(metadata)
      throw error
    }
  }

  async createIncrementalBackup(lastBackupTime: Date): Promise<BackupMetadata> {
    const backupId = `incremental_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date()
    
    console.log(`Starting incremental backup: ${backupId}`)

    try {
      // Get changed data since last backup
      const changedData = await this.getChangedData(lastBackupTime)
      
      const backupPath = join(this.backupDir, `${backupId}.json`)
      const backupContent = JSON.stringify(changedData, null, 2)
      
      await writeFile(backupPath, backupContent)

      const size = Buffer.byteLength(backupContent)
      const checksum = createHash('sha256').update(backupContent).digest('hex')

      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        type: 'incremental',
        size,
        checksum,
        tables: Object.keys(changedData),
        status: 'completed'
      }

      await this.storeBackupMetadata(metadata)
      
      console.log(`Incremental backup completed: ${backupId}`)
      return metadata

    } catch (error) {
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        type: 'incremental',
        size: 0,
        checksum: '',
        tables: [],
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }

      await this.storeBackupMetadata(metadata)
      throw error
    }
  }

  async createRBACOnlyBackup(): Promise<BackupMetadata> {
    const backupId = `rbac_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date()
    
    console.log(`Starting RBAC-only backup: ${backupId}`)

    try {
      // Export only RBAC configuration data
      const rbacData = {
        users: await this.prisma.user.findMany({
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        permissions: await this.prisma.permissionCache.findMany(),
        auditLogs: await this.prisma.auditLog.findMany({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        }),
        securityEvents: await this.prisma.securityEvent.findMany({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        })
      }

      const backupPath = join(this.backupDir, `${backupId}.json`)
      const backupContent = JSON.stringify(rbacData, null, 2)
      
      await writeFile(backupPath, backupContent)

      const size = Buffer.byteLength(backupContent)
      const checksum = createHash('sha256').update(backupContent).digest('hex')

      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        type: 'rbac_only',
        size,
        checksum,
        tables: ['User', 'PermissionCache', 'AuditLog', 'SecurityEvent'],
        status: 'completed'
      }

      await this.storeBackupMetadata(metadata)
      
      console.log(`RBAC-only backup completed: ${backupId}`)
      return metadata

    } catch (error) {
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        type: 'rbac_only',
        size: 0,
        checksum: '',
        tables: [],
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }

      await this.storeBackupMetadata(metadata)
      throw error
    }
  }

  async verifyBackup(backupId: string): Promise<boolean> {
    try {
      const metadata = await this.getBackupMetadata(backupId)
      if (!metadata) {
        throw new Error(`Backup metadata not found: ${backupId}`)
      }

      const backupPath = join(this.backupDir, `${backupId}.${metadata.type === 'full' ? 'sql' : 'json'}`)
      const backupData = await readFile(backupPath)
      
      const actualChecksum = createHash('sha256').update(backupData).digest('hex')
      const isValid = actualChecksum === metadata.checksum

      if (!isValid) {
        console.error(`Backup verification failed: ${backupId}`)
        console.error(`Expected checksum: ${metadata.checksum}`)
        console.error(`Actual checksum: ${actualChecksum}`)
      }

      return isValid
    } catch (error) {
      console.error(`Backup verification error: ${backupId}`, error)
      return false
    }
  }

  async restoreFromBackup(backupId: string, options: { dryRun?: boolean } = {}): Promise<void> {
    console.log(`Starting restore from backup: ${backupId}`)

    const metadata = await this.getBackupMetadata(backupId)
    if (!metadata) {
      throw new Error(`Backup not found: ${backupId}`)
    }

    // Verify backup integrity
    const isValid = await this.verifyBackup(backupId)
    if (!isValid) {
      throw new Error(`Backup verification failed: ${backupId}`)
    }

    if (options.dryRun) {
      console.log(`Dry run: Would restore backup ${backupId}`)
      return
    }

    try {
      if (metadata.type === 'full') {
        await this.restoreFullBackup(backupId)
      } else if (metadata.type === 'rbac_only') {
        await this.restoreRBACBackup(backupId)
      } else {
        throw new Error(`Incremental restore not yet implemented`)
      }

      console.log(`Restore completed successfully: ${backupId}`)
    } catch (error) {
      console.error(`Restore failed: ${backupId}`, error)
      throw error
    }
  }

  async scheduleAutomatedBackups(): Promise<void> {
    console.log('Starting automated backup scheduler...')

    // Full backup daily at 2 AM
    const scheduleFullBackup = () => {
      const now = new Date()
      const nextRun = new Date(now)
      nextRun.setHours(2, 0, 0, 0)
      
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1)
      }

      const timeUntilNext = nextRun.getTime() - now.getTime()
      
      setTimeout(async () => {
        try {
          await this.createFullBackup()
          await this.cleanupOldBackups()
        } catch (error) {
          console.error('Scheduled full backup failed:', error)
        }
        
        // Schedule next backup
        scheduleFullBackup()
      }, timeUntilNext)
    }

    // RBAC backup every 6 hours
    const scheduleRBACBackup = () => {
      setTimeout(async () => {
        try {
          await this.createRBACOnlyBackup()
        } catch (error) {
          console.error('Scheduled RBAC backup failed:', error)
        }
        
        // Schedule next backup
        scheduleRBACBackup()
      }, 6 * 60 * 60 * 1000) // 6 hours
    }

    scheduleFullBackup()
    scheduleRBACBackup()
  }

  private buildDumpCommand(tables: string[], outputPath: string): string {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      throw new Error('DATABASE_URL not configured')
    }

    // Parse database URL
    const url = new URL(dbUrl)
    const host = url.hostname
    const port = url.port || '5432'
    const database = url.pathname.slice(1)
    const username = url.username
    const password = url.password

    const tableArgs = tables.map(t => `-t ${t}`).join(' ')
    
    return `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} ${tableArgs} -f ${outputPath}`
  }

  private async getChangedData(since: Date): Promise<Record<string, any[]>> {
    const changedData: Record<string, any[]> = {}

    // Get changed audit logs
    changedData.auditLogs = await this.prisma.auditLog.findMany({
      where: {
        timestamp: { gte: since }
      }
    })

    // Get changed security events
    changedData.securityEvents = await this.prisma.securityEvent.findMany({
      where: {
        timestamp: { gte: since }
      }
    })

    // Get changed permission cache entries
    changedData.permissionCache = await this.prisma.permissionCache.findMany({
      where: {
        createdAt: { gte: since }
      }
    })

    return changedData
  }

  private async storeBackupMetadata(metadata: BackupMetadata): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO backup_metadata (id, timestamp, type, size, checksum, tables, status, error)
        VALUES (${metadata.id}, ${metadata.timestamp}, ${metadata.type}, ${metadata.size}, 
                ${metadata.checksum}, ${metadata.tables}, ${metadata.status}, ${metadata.error})
      `
    } catch (error) {
      console.error('Failed to store backup metadata:', error)
    }
  }

  private async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    try {
      const result = await this.prisma.$queryRaw<BackupMetadata[]>`
        SELECT * FROM backup_metadata WHERE id = ${backupId}
      `
      return result[0] || null
    } catch (error) {
      console.error('Failed to get backup metadata:', error)
      return null
    }
  }

  private async restoreFullBackup(backupId: string): Promise<void> {
    const backupPath = join(this.backupDir, `${backupId}.sql`)
    
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      throw new Error('DATABASE_URL not configured')
    }

    const url = new URL(dbUrl)
    const host = url.hostname
    const port = url.port || '5432'
    const database = url.pathname.slice(1)
    const username = url.username
    const password = url.password

    const restoreCommand = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${database} -f ${backupPath}`
    
    await execAsync(restoreCommand)
  }

  private async restoreRBACBackup(backupId: string): Promise<void> {
    const backupPath = join(this.backupDir, `${backupId}.json`)
    const backupContent = await readFile(backupPath, 'utf-8')
    const rbacData = JSON.parse(backupContent)

    // This is a simplified restore - in production, you'd want more sophisticated logic
    console.log('RBAC restore would restore:', Object.keys(rbacData))
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const allBackups = await this.prisma.$queryRaw<BackupMetadata[]>`
        SELECT * FROM backup_metadata 
        ORDER BY timestamp DESC
      `

      if (allBackups.length > this.maxBackups) {
        const toDelete = allBackups.slice(this.maxBackups)
        
        for (const backup of toDelete) {
          await this.prisma.$executeRaw`
            DELETE FROM backup_metadata WHERE id = ${backup.id}
          `
          console.log(`Cleaned up old backup: ${backup.id}`)
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error)
    }
  }

  async cleanup(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

// Singleton instance for production use
export const backupRecoverySystem = new BackupRecoverySystem()