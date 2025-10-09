#!/usr/bin/env tsx

/**
 * RBAC Data Migration Utility
 * 
 * This script provides utilities for migrating existing user data to the new RBAC system.
 * It handles user role assignments, permission cache initialization, and data validation.
 */

import { PrismaClient, UserRole } from '@prisma/client'
import { hash } from 'bcryptjs'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

interface MigrationOptions {
  dryRun?: boolean
  verbose?: boolean
  createDefaultAdmin?: boolean
  defaultAdminEmail?: string
  defaultAdminPassword?: string
}

interface MigrationResult {
  success: boolean
  usersProcessed: number
  adminUsersCreated: number
  preferencesCreated: number
  auditLogsCreated: number
  errors: string[]
  warnings: string[]
}

class RBACDataMigration {
  private options: MigrationOptions
  private result: MigrationResult

  constructor(options: MigrationOptions = {}) {
    this.options = {
      dryRun: false,
      verbose: false,
      createDefaultAdmin: true,
      defaultAdminEmail: 'admin@kinworkspace.com',
      defaultAdminPassword: 'admin123',
      ...options
    }

    this.result = {
      success: false,
      usersProcessed: 0,
      adminUsersCreated: 0,
      preferencesCreated: 0,
      auditLogsCreated: 0,
      errors: [],
      warnings: []
    }
  }

  /**
   * Run the complete RBAC data migration
   */
  async migrate(): Promise<MigrationResult> {
    try {
      this.log('Starting RBAC data migration...')
      
      // Check database connection
      await this.checkDatabaseConnection()
      
      // Run migration steps
      await this.migrateUsers()
      await this.createUserPreferences()
      await this.ensureAdminUsers()
      await this.createInitialAuditLogs()
      await this.validateMigration()
      
      this.result.success = true
      this.log('RBAC data migration completed successfully!')
      
    } catch (error) {
      this.result.errors.push(`Migration failed: ${error.message}`)
      this.log(`Migration failed: ${error.message}`, 'error')
    }

    return this.result
  }

  /**
   * Check database connection and required tables
   */
  private async checkDatabaseConnection(): Promise<void> {
    try {
      await prisma.$queryRaw`SELECT 1`
      this.log('Database connection verified')

      // Check if required tables exist
      const tables = ['users', 'user_preferences', 'audit_logs', 'role_change_history']
      for (const table of tables) {
        const result = await prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = '${table}'
          )
        `) as any[]
        
        if (!result[0]?.exists) {
          throw new Error(`Required table '${table}' does not exist. Run database migrations first.`)
        }
      }
      
      this.log('Required tables verified')
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`)
    }
  }

  /**
   * Migrate existing users to ensure proper RBAC setup
   */
  private async migrateUsers(): Promise<void> {
    this.log('Migrating existing users...')

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    for (const user of users) {
      try {
        // Ensure user has a valid role
        if (!user.role || !Object.values(UserRole).includes(user.role)) {
          if (!this.options.dryRun) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: UserRole.EDITOR }
            })
          }
          this.log(`Updated role for user ${user.email} to EDITOR`)
        }

        this.result.usersProcessed++
      } catch (error) {
        this.result.errors.push(`Failed to migrate user ${user.email}: ${error.message}`)
      }
    }

    this.log(`Processed ${this.result.usersProcessed} users`)
  }

  /**
   * Create user preferences for users who don't have them
   */
  private async createUserPreferences(): Promise<void> {
    this.log('Creating user preferences...')

    const usersWithoutPreferences = await prisma.user.findMany({
      where: {
        preferences: null
      },
      select: {
        id: true,
        email: true,
        role: true
      }
    })

    for (const user of usersWithoutPreferences) {
      try {
        if (!this.options.dryRun) {
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
                widgets: user.role === UserRole.ADMIN 
                  ? ['users', 'security', 'analytics'] 
                  : ['products', 'orders'],
                defaultView: 'dashboard'
              }
            }
          })
        }

        this.result.preferencesCreated++
        this.log(`Created preferences for user ${user.email}`)
      } catch (error) {
        this.result.errors.push(`Failed to create preferences for user ${user.email}: ${error.message}`)
      }
    }

    this.log(`Created ${this.result.preferencesCreated} user preferences`)
  }

  /**
   * Ensure at least one admin user exists
   */
  private async ensureAdminUsers(): Promise<void> {
    this.log('Checking admin users...')

    const adminCount = await prisma.user.count({
      where: { role: UserRole.ADMIN }
    })

    if (adminCount === 0 && this.options.createDefaultAdmin) {
      this.log('No admin users found, creating default admin...')

      if (!this.options.dryRun) {
        const passwordHash = await hash(this.options.defaultAdminPassword!, 12)

        const admin = await prisma.user.create({
          data: {
            email: this.options.defaultAdminEmail!,
            passwordHash,
            name: 'System Administrator',
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
                  widgets: ['users', 'security', 'analytics', 'performance'],
                  defaultView: 'dashboard'
                }
              }
            }
          }
        })

        // Create role change history
        await prisma.roleChangeHistory.create({
          data: {
            userId: admin.id,
            oldRole: 'VIEWER',
            newRole: 'ADMIN',
            reason: 'Default admin created during RBAC migration'
          }
        })

        this.result.adminUsersCreated++
        this.result.warnings.push(
          `Default admin created with email: ${this.options.defaultAdminEmail}. ` +
          `Password: ${this.options.defaultAdminPassword}. CHANGE THIS IMMEDIATELY!`
        )
      }
    } else {
      this.log(`Found ${adminCount} admin users`)
    }
  }

  /**
   * Create initial audit logs for the migration
   */
  private async createInitialAuditLogs(): Promise<void> {
    this.log('Creating initial audit logs...')

    const users = await prisma.user.findMany({
      where: {
        auditLogs: {
          none: {
            action: 'USER_MIGRATED'
          }
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    for (const user of users) {
      try {
        if (!this.options.dryRun) {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: 'USER_MIGRATED',
              resource: 'user',
              details: {
                migration_version: '002',
                original_role: user.role,
                migration_date: new Date().toISOString()
              }
            }
          })
        }

        this.result.auditLogsCreated++
      } catch (error) {
        this.result.errors.push(`Failed to create audit log for user ${user.email}: ${error.message}`)
      }
    }

    this.log(`Created ${this.result.auditLogsCreated} audit log entries`)
  }

  /**
   * Validate the migration results
   */
  private async validateMigration(): Promise<void> {
    this.log('Validating migration...')

    // Check that all users have valid roles
    const usersWithInvalidRoles = await prisma.user.count({
      where: {
        OR: [
          { role: null },
          { role: { notIn: Object.values(UserRole) } }
        ]
      }
    })

    if (usersWithInvalidRoles > 0) {
      this.result.errors.push(`Found ${usersWithInvalidRoles} users with invalid roles`)
    }

    // Check that all users have preferences
    const usersWithoutPreferences = await prisma.user.count({
      where: { preferences: null }
    })

    if (usersWithoutPreferences > 0) {
      this.result.warnings.push(`Found ${usersWithoutPreferences} users without preferences`)
    }

    // Check that at least one admin exists
    const adminCount = await prisma.user.count({
      where: { role: UserRole.ADMIN }
    })

    if (adminCount === 0) {
      this.result.errors.push('No admin users found after migration')
    }

    this.log('Migration validation completed')
  }

  /**
   * Rollback the migration (limited rollback capabilities)
   */
  async rollback(): Promise<void> {
    this.log('Rolling back RBAC migration...')

    try {
      // Remove migration audit logs
      await prisma.auditLog.deleteMany({
        where: {
          action: 'USER_MIGRATED'
        }
      })

      // Remove role change history from migration
      await prisma.roleChangeHistory.deleteMany({
        where: {
          reason: 'Default admin created during RBAC migration'
        }
      })

      this.log('Migration rollback completed')
    } catch (error) {
      throw new Error(`Rollback failed: ${error.message}`)
    }
  }

  /**
   * Export user data for backup before migration
   */
  async exportUserData(): Promise<any> {
    this.log('Exporting user data...')

    const users = await prisma.user.findMany({
      include: {
        preferences: true,
        auditLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        roleChanges: true
      }
    })

    const exportData = {
      exportDate: new Date().toISOString(),
      totalUsers: users.length,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        preferences: user.preferences,
        recentAuditLogs: user.auditLogs,
        roleChanges: user.roleChanges
      }))
    }

    this.log(`Exported data for ${users.length} users`)
    return exportData
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
  const command = args[0] || 'migrate'

  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    createDefaultAdmin: !args.includes('--no-default-admin'),
    defaultAdminEmail: args.find(arg => arg.startsWith('--admin-email='))?.split('=')[1],
    defaultAdminPassword: args.find(arg => arg.startsWith('--admin-password='))?.split('=')[1]
  }

  const migration = new RBACDataMigration(options)

  try {
    switch (command) {
      case 'migrate':
        const result = await migration.migrate()
        console.log('\n=== Migration Result ===')
        console.log(`Success: ${result.success}`)
        console.log(`Users processed: ${result.usersProcessed}`)
        console.log(`Admin users created: ${result.adminUsersCreated}`)
        console.log(`Preferences created: ${result.preferencesCreated}`)
        console.log(`Audit logs created: ${result.auditLogsCreated}`)
        
        if (result.warnings.length > 0) {
          console.log('\nWarnings:')
          result.warnings.forEach(warning => console.log(`⚠️  ${warning}`))
        }
        
        if (result.errors.length > 0) {
          console.log('\nErrors:')
          result.errors.forEach(error => console.log(`❌ ${error}`))
          process.exit(1)
        }
        break

      case 'rollback':
        await migration.rollback()
        console.log('✅ Migration rollback completed')
        break

      case 'export':
        const exportData = await migration.exportUserData()
        console.log(JSON.stringify(exportData, null, 2))
        break

      default:
        console.log('Usage: tsx rbac-data-migration.ts [migrate|rollback|export] [options]')
        console.log('Options:')
        console.log('  --dry-run              Run without making changes')
        console.log('  --verbose              Enable verbose logging')
        console.log('  --no-default-admin     Skip creating default admin')
        console.log('  --admin-email=EMAIL    Set default admin email')
        console.log('  --admin-password=PASS  Set default admin password')
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

export { RBACDataMigration, type MigrationOptions, type MigrationResult }