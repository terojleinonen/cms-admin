/**
 * Backup service for database and media files
 */

import { promises as fs } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface BackupOptions {
  includeMedia?: boolean
  compression?: boolean
  destination?: string
}

export interface BackupResult {
  success: boolean
  filename: string
  size: number
  timestamp: Date
  error?: string
}

export class BackupService {
  private backupDir: string

  constructor(backupDir: string = './backups') {
    this.backupDir = backupDir
  }

  /**
   * Create a full backup including database and media
   */
  async createBackup(options: BackupOptions = {}): Promise<BackupResult> {
    const timestamp = new Date()
    const filename = `backup-${timestamp.toISOString().replace(/[:.]/g, '-')}.sql`
    const filepath = path.join(this.backupDir, filename)

    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true })

      // Create database backup
      await this.createDatabaseBackup(filepath)

      // Get file size
      const stats = await fs.stat(filepath)

      return {
        success: true,
        filename,
        size: stats.size,
        timestamp
      }
    } catch (error) {
      return {
        success: false,
        filename,
        size: 0,
        timestamp,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Create database backup using pg_dump
   */
  private async createDatabaseBackup(filepath: string): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured')
    }

    const command = `pg_dump "${databaseUrl}" > "${filepath}"`
    await execAsync(command)
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(filename: string): Promise<BackupResult> {
    const filepath = path.join(this.backupDir, filename)
    const timestamp = new Date()

    try {
      // Check if backup file exists
      await fs.access(filepath)

      // Restore database
      await this.restoreDatabase(filepath)

      const stats = await fs.stat(filepath)

      return {
        success: true,
        filename,
        size: stats.size,
        timestamp
      }
    } catch (error) {
      return {
        success: false,
        filename,
        size: 0,
        timestamp,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Restore database using psql
   */
  private async restoreDatabase(filepath: string): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured')
    }

    const command = `psql "${databaseUrl}" < "${filepath}"`
    await execAsync(command)
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<Array<{ filename: string; size: number; created: Date }>> {
    try {
      const files = await fs.readdir(this.backupDir)
      const backups = []

      for (const file of files) {
        if (file.endsWith('.sql')) {
          const filepath = path.join(this.backupDir, file)
          const stats = await fs.stat(filepath)
          backups.push({
            filename: file,
            size: stats.size,
            created: stats.birthtime
          })
        }
      }

      return backups.sort((a, b) => b.created.getTime() - a.created.getTime())
    } catch (error) {
      return []
    }
  }

  /**
   * Delete old backups (keep only the most recent N backups)
   */
  async cleanupBackups(keepCount: number = 10): Promise<number> {
    const backups = await this.listBackups()
    const toDelete = backups.slice(keepCount)
    let deletedCount = 0

    for (const backup of toDelete) {
      try {
        const filepath = path.join(this.backupDir, backup.filename)
        await fs.unlink(filepath)
        deletedCount++
      } catch (error) {
        console.error(`Failed to delete backup ${backup.filename}:`, error)
      }
    }

    return deletedCount
  }
}