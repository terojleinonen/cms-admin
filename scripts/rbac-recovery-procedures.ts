#!/usr/bin/env tsx

/**
 * RBAC Recovery Procedures
 * 
 * This script provides comprehensive recovery procedures for the RBAC system,
 * including backup creation, data validation, and emergency recovery operations.
 */

import { PrismaClient, UserRole } from '@prisma/client'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

interface BackupData {
  timestamp: string
  version: string
  users: any[]
  userPreferences: any[]
  auditLogs: any[]
  roleChangeHistory: any[]
  permissionCache: any[]
  securityEvents: any[]
  notificationTemplates: any[]
}

interface RecoveryOptions {
  backupPath?: string
  validateOnly?: boolean
  verbose?: boolean
  emergencyMode?: boolean
}

class RBACRecoveryManager {
  private options: RecoveryOptions

  constructor(options: RecoveryOptions = {}) {
    this.options = {
      validateOnly: false,
      verbose: false,
      emergencyMode: false,
      ...options
    }
  }

  /**
   * Create a complete backup of RBAC data
   */
  async createBackup(outputPath?: string): Promise<string> {
    this.log('Creating RBAC system backup...')

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = outputPath || `rbac-backup-${timestamp}.json`

    try {
      const backupData: BackupData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        users: await prisma.user.findMany({
          include: {
            preferences: true,
            auditLogs: {
              orderBy: { createdAt: 'desc' },
              take: 100
            },
            roleChanges: true,
            permissionCache: true,
            securityEvents: true
          }
        }),
        userPreferences: await prisma.userPreferences.findMany(),
        auditLogs: await prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 1000
        }),
        roleChangeHistory: await prisma.roleChangeHistory.findMany({
          orderBy: { createdAt: 'desc' }
        }),
        permissionCache: await prisma.permissionCache.findMany(),
        securityEvents: await prisma.securityEvent.findMany({
          orderBy: { createdAt: 'desc' },
          take: 500
        }),
        notificationTemplates: await prisma.notificationTemplate.findMany()
      }

      writeFileSync(backupPath, JSON.stringify(backupData, null, 2))
      this.log(`Backup created successfully: ${backupPath}`)
      
      return backupPath
    } catch (error) {
      throw new Error(`Backup creation failed: ${error.message}`)
    }
  }

  /**
   * Restore RBAC data from backup
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    this.log(`Restoring RBAC system from backup: ${backupPath}`)

    if (!existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`)
    }

    try {
      const backupData: BackupData = JSON.parse(readFileSync(backupPath, 'utf8'))
      
      if (this.options.validateOnly) {
        await this.validateBackupData(backupData)
        this.log('Backup validation completed successfully')
        return
      }

      // Start transaction for atomic restore
      await prisma.$transaction(async (tx) => {
        // Clear existing data (in reverse dependency order)
        await tx.permissionCache.deleteMany()
        await tx.securityEvent.deleteMany()
        await tx.auditLog.deleteMany()
        await tx.roleChangeHistory.deleteMany()
        await tx.userPreferences.deleteMany()
        await tx.notificationTemplate.deleteMany()
        
        // Don't delete users as they might have other dependencies
        // Instead, update them with backup data

        // Restore notification templates
        for (const template of backupData.notificationTemplates) {
          await tx.notificationTemplate.create({
            data: {
              type: template.type,
              language: template.language,
              subject: template.subject,
              emailBody: template.emailBody,
              inAppTitle: template.inAppTitle,
              inAppBody: template.inAppBody,
              variables: template.variables,
              isActive: template.isActive
            }
          })
        }

        // Restore users and their related data
        for (const user of backupData.users) {
          // Update or create user
          await tx.user.upsert({
            where: { id: user.id },
            update: {
              email: user.email,
              passwordHash: user.passwordHash,
              name: user.name,
              role: user.role,
              isActive: user.isActive,
              profilePicture: user.profilePicture,
              emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
              twoFactorSecret: user.twoFactorSecret,
              twoFactorEnabled: user.twoFactorEnabled,
              lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null
            },
            create: {
              id: user.id,
              email: user.email,
              passwordHash: user.passwordHash,
              name: user.name,
              role: user.role,
              isActive: user.isActive,
              profilePicture: user.profilePicture,
              emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
              twoFactorSecret: user.twoFactorSecret,
              twoFactorEnabled: user.twoFactorEnabled,
              lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
              createdAt: new Date(user.createdAt),
              updatedAt: new Date(user.updatedAt)
            }
          })

          // Restore user preferences
          if (user.preferences) {
            await tx.userPreferences.create({
              data: {
                id: user.preferences.id,
                userId: user.id,
                theme: user.preferences.theme,
                timezone: user.preferences.timezone,
                language: user.preferences.language,
                notifications: user.preferences.notifications,
                dashboard: user.preferences.dashboard,
                createdAt: new Date(user.preferences.createdAt),
                updatedAt: new Date(user.preferences.updatedAt)
              }
            })
          }

          // Restore role change history
          for (const roleChange of user.roleChanges || []) {
            await tx.roleChangeHistory.create({
              data: {
                id: roleChange.id,
                userId: user.id,
                oldRole: roleChange.oldRole,
                newRole: roleChange.newRole,
                changedBy: roleChange.changedBy,
                reason: roleChange.reason,
                createdAt: new Date(roleChange.createdAt)
              }
            })
          }

          // Restore audit logs (limited to recent ones)
          for (const auditLog of (user.auditLogs || []).slice(0, 50)) {
            await tx.auditLog.create({
              data: {
                id: auditLog.id,
                userId: user.id,
                action: auditLog.action,
                resource: auditLog.resource,
                details: auditLog.details,
                ipAddress: auditLog.ipAddress,
                userAgent: auditLog.userAgent,
                createdAt: new Date(auditLog.createdAt)
              }
            })
          }

          // Restore permission cache (only non-expired entries)
          const now = new Date()
          for (const cacheEntry of user.permissionCache || []) {
            const expiresAt = new Date(cacheEntry.expiresAt)
            if (expiresAt > now) {
              await tx.permissionCache.create({
                data: {
                  id: cacheEntry.id,
                  userId: user.id,
                  resource: cacheEntry.resource,
                  action: cacheEntry.action,
                  scope: cacheEntry.scope,
                  result: cacheEntry.result,
                  expiresAt: expiresAt,
                  createdAt: new Date(cacheEntry.createdAt)
                }
              })
            }
          }

          // Restore security events (recent ones only)
          for (const securityEvent of (user.securityEvents || []).slice(0, 20)) {
            await tx.securityEvent.create({
              data: {
                id: securityEvent.id,
                type: securityEvent.type,
                severity: securityEvent.severity,
                userId: user.id,
                resource: securityEvent.resource,
                action: securityEvent.action,
                ipAddress: securityEvent.ipAddress,
                userAgent: securityEvent.userAgent,
                details: securityEvent.details,
                resolved: securityEvent.resolved,
                resolvedAt: securityEvent.resolvedAt ? new Date(securityEvent.resolvedAt) : null,
                resolvedBy: securityEvent.resolvedBy,
                createdAt: new Date(securityEvent.createdAt)
              }
            })
          }
        }
      })

      this.log('RBAC system restored successfully from backup')
    } catch (error) {
      throw new Error(`Restore failed: ${error.message}`)
    }
  }

  /**
   * Validate backup data integrity
   */
  private async validateBackupData(backupData: BackupData): Promise<void> {
    this.log('Validating backup data...')

    // Check required fields
    if (!backupData.timestamp || !backupData.version || !backupData.users) {
      throw new Error('Invalid backup format: missing required fields')
    }

    // Validate users
    for (const user of backupData.users) {
      if (!user.id || !user.email || !user.role) {
        throw new Error(`Invalid user data: missing required fields for user ${user.id || 'unknown'}`)
      }

      if (!Object.values(UserRole).includes(user.role)) {
        throw new Error(`Invalid user role: ${user.role} for user ${user.email}`)
      }
    }

    // Check for at least one admin user
    const adminUsers = backupData.users.filter(u => u.role === UserRole.ADMIN)
    if (adminUsers.length === 0) {
      throw new Error('No admin users found in backup data')
    }

    this.log(`Backup validation passed: ${backupData.users.length} users, ${adminUsers.length} admins`)
  }

  /**
   * Emergency recovery - create emergency admin and fix critical issues
   */
  async emergencyRecovery(): Promise<void> {
    this.log('Starting emergency recovery...')

    try {
      // Check if any admin users exist
      const adminCount = await prisma.user.count({
        where: { role: UserRole.ADMIN, isActive: true }
      })

      if (adminCount === 0) {
        this.log('No active admin users found, creating emergency admin...')
        
        const emergencyAdmin = await prisma.user.create({
          data: {
            email: 'emergency-admin@kinworkspace.com',
            passwordHash: '$2b$12$LQv3c1yqBwEHxv03kpOOHu.Kx.Ks8J8J8J8J8J8J8J8J8J8J8J8J8', // 'emergency123'
            name: 'Emergency Administrator',
            role: UserRole.ADMIN,
            isActive: true,
            emailVerified: new Date(),
            preferences: {
              create: {
                theme: 'SYSTEM',
                timezone: 'UTC',
                language: 'en',
                notifications: {
                  email: true,
                  push: true,
                  security: true,
                  marketing: false
                },
                dashboard: {
                  layout: 'default',
                  widgets: ['users', 'security', 'analytics'],
                  defaultView: 'dashboard'
                }
              }
            }
          }
        })

        // Create audit log for emergency admin creation
        await prisma.auditLog.create({
          data: {
            userId: emergencyAdmin.id,
            action: 'EMERGENCY_ADMIN_CREATED',
            resource: 'user',
            details: {
              reason: 'Emergency recovery - no admin users available',
              timestamp: new Date().toISOString()
            }
          }
        })

        this.log('Emergency admin created: emergency-admin@kinworkspace.com / emergency123')
        this.log('CRITICAL: Change this password immediately!')
      }

      // Clean up expired permission cache
      const expiredCacheCount = await prisma.permissionCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })

      this.log(`Cleaned up ${expiredCacheCount.count} expired permission cache entries`)

      // Fix any users with invalid roles
      const invalidRoleUsers = await prisma.user.updateMany({
        where: {
          role: {
            notIn: Object.values(UserRole)
          }
        },
        data: {
          role: UserRole.VIEWER
        }
      })

      if (invalidRoleUsers.count > 0) {
        this.log(`Fixed ${invalidRoleUsers.count} users with invalid roles`)
      }

      // Ensure all users have preferences
      const usersWithoutPreferences = await prisma.user.findMany({
        where: {
          preferences: null
        },
        select: { id: true }
      })

      for (const user of usersWithoutPreferences) {
        await prisma.userPreferences.create({
          data: {
            userId: user.id,
            theme: 'SYSTEM',
            timezone: 'UTC',
            language: 'en',
            notifications: {
              email: true,
              push: true,
              security: true,
              marketing: false
            },
            dashboard: {
              layout: 'default',
              widgets: [],
              defaultView: 'dashboard'
            }
          }
        })
      }

      if (usersWithoutPreferences.length > 0) {
        this.log(`Created preferences for ${usersWithoutPreferences.length} users`)
      }

      this.log('Emergency recovery completed successfully')
    } catch (error) {
      throw new Error(`Emergency recovery failed: ${error.message}`)
    }
  }

  /**
   * Validate current RBAC system integrity
   */
  async validateSystem(): Promise<void> {
    this.log('Validating RBAC system integrity...')

    const issues: string[] = []

    // Check for admin users
    const adminCount = await prisma.user.count({
      where: { role: UserRole.ADMIN, isActive: true }
    })

    if (adminCount === 0) {
      issues.push('No active admin users found')
    }

    // Check for users without preferences
    const usersWithoutPreferences = await prisma.user.count({
      where: { preferences: null }
    })

    if (usersWithoutPreferences > 0) {
      issues.push(`${usersWithoutPreferences} users without preferences`)
    }

    // Check for users with invalid roles
    const usersWithInvalidRoles = await prisma.user.count({
      where: {
        role: {
          notIn: Object.values(UserRole)
        }
      }
    })

    if (usersWithInvalidRoles > 0) {
      issues.push(`${usersWithInvalidRoles} users with invalid roles`)
    }

    // Check for expired permission cache entries
    const expiredCacheEntries = await prisma.permissionCache.count({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })

    if (expiredCacheEntries > 0) {
      issues.push(`${expiredCacheEntries} expired permission cache entries`)
    }

    if (issues.length > 0) {
      this.log('System validation issues found:')
      issues.forEach(issue => this.log(`  - ${issue}`, 'warn'))
      
      if (this.options.emergencyMode) {
        this.log('Running emergency recovery to fix issues...')
        await this.emergencyRecovery()
      }
    } else {
      this.log('System validation passed - no issues found')
    }
  }

  /**
   * Create database backup using pg_dump
   */
  async createDatabaseBackup(outputPath?: string): Promise<string> {
    this.log('Creating database backup...')

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = outputPath || `database-backup-${timestamp}.sql`

    try {
      const databaseUrl = process.env.DATABASE_URL
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable not set')
      }

      execSync(`pg_dump "${databaseUrl}" > "${backupPath}"`, { stdio: 'inherit' })
      this.log(`Database backup created: ${backupPath}`)
      
      return backupPath
    } catch (error) {
      throw new Error(`Database backup failed: ${error.message}`)
    }
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (this.options.verbose || level !== 'info') {
      const timestamp = new Date().toISOString()
      const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️'
      console.log(`${prefix} [${timestamp}] ${message}`)
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'validate'

  const options: RecoveryOptions = {
    validateOnly: args.includes('--validate-only'),
    verbose: args.includes('--verbose'),
    emergencyMode: args.includes('--emergency'),
    backupPath: args.find(arg => arg.startsWith('--backup='))?.split('=')[1]
  }

  const recovery = new RBACRecoveryManager(options)

  try {
    switch (command) {
      case 'backup':
        const outputPath = args[1] || undefined
        const backupPath = await recovery.createBackup(outputPath)
        console.log(`✅ Backup created: ${backupPath}`)
        break

      case 'restore':
        if (!options.backupPath && !args[1]) {
          console.error('❌ Backup path required for restore')
          process.exit(1)
        }
        const restorePath = options.backupPath || args[1]
        await recovery.restoreFromBackup(restorePath)
        console.log('✅ System restored from backup')
        break

      case 'validate':
        await recovery.validateSystem()
        console.log('✅ System validation completed')
        break

      case 'emergency':
        await recovery.emergencyRecovery()
        console.log('✅ Emergency recovery completed')
        break

      case 'db-backup':
        const dbBackupPath = await recovery.createDatabaseBackup(args[1])
        console.log(`✅ Database backup created: ${dbBackupPath}`)
        break

      default:
        console.log('Usage: tsx rbac-recovery-procedures.ts [command] [options]')
        console.log('Commands:')
        console.log('  backup [output-path]     Create RBAC data backup')
        console.log('  restore <backup-path>    Restore from backup')
        console.log('  validate                 Validate system integrity')
        console.log('  emergency                Run emergency recovery')
        console.log('  db-backup [output-path]  Create full database backup')
        console.log('Options:')
        console.log('  --validate-only          Only validate, don\'t restore')
        console.log('  --verbose                Enable verbose logging')
        console.log('  --emergency              Auto-fix issues during validation')
        console.log('  --backup=PATH            Specify backup file path')
        process.exit(1)
    }
  } catch (error) {
    console.error(`❌ ${error.message}`)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export { RBACRecoveryManager, type RecoveryOptions, type BackupData }