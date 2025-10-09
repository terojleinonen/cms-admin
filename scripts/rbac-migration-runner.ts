#!/usr/bin/env tsx

/**
 * RBAC Migration Runner
 * 
 * This script orchestrates the complete RBAC migration process, including
 * pre-migration checks, backup creation, migration execution, and validation.
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { RBACDataMigration, type MigrationOptions } from './rbac-data-migration'
import { RBACRecoveryManager } from './rbac-recovery-procedures'

const prisma = new PrismaClient()

interface MigrationRunnerOptions {
  skipBackup?: boolean
  skipValidation?: boolean
  dryRun?: boolean
  verbose?: boolean
  force?: boolean
  rollbackOnFailure?: boolean
}

interface MigrationStep {
  name: string
  description: string
  execute: () => Promise<void>
  rollback?: () => Promise<void>
  required: boolean
}

class RBACMigrationRunner {
  private options: MigrationRunnerOptions
  private backupPath?: string
  private completedSteps: string[] = []

  constructor(options: MigrationRunnerOptions = {}) {
    this.options = {
      skipBackup: false,
      skipValidation: false,
      dryRun: false,
      verbose: false,
      force: false,
      rollbackOnFailure: true,
      ...options
    }
  }

  /**
   * Run the complete RBAC migration process
   */
  async runMigration(): Promise<void> {
    this.log('Starting RBAC Migration Process...')
    this.log('=====================================')

    try {
      // Pre-migration checks
      await this.preMigrationChecks()

      // Create backup
      if (!this.options.skipBackup) {
        await this.createBackup()
      }

      // Define migration steps
      const steps: MigrationStep[] = [
        {
          name: 'database-schema',
          description: 'Apply database schema migrations',
          execute: () => this.runDatabaseMigrations(),
          rollback: () => this.rollbackDatabaseMigrations(),
          required: true
        },
        {
          name: 'data-migration',
          description: 'Migrate existing user data',
          execute: () => this.runDataMigration(),
          rollback: () => this.rollbackDataMigration(),
          required: true
        },
        {
          name: 'validation',
          description: 'Validate migration results',
          execute: () => this.validateMigration(),
          required: !this.options.skipValidation
        },
        {
          name: 'cleanup',
          description: 'Clean up temporary data',
          execute: () => this.cleanupMigration(),
          required: false
        }
      ]

      // Execute migration steps
      for (const step of steps) {
        if (step.required || !this.options.force) {
          await this.executeStep(step)
        }
      }

      this.log('=====================================')
      this.log('✅ RBAC Migration completed successfully!')
      this.displayMigrationSummary()

    } catch (error) {
      this.log(`❌ Migration failed: ${error.message}`, 'error')
      
      if (this.options.rollbackOnFailure && this.completedSteps.length > 0) {
        this.log('🔄 Rolling back completed steps...')
        await this.rollbackMigration()
      }
      
      throw error
    }
  }

  /**
   * Pre-migration checks and validations
   */
  private async preMigrationChecks(): Promise<void> {
    this.log('Running pre-migration checks...')

    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`
      this.log('✅ Database connection verified')
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`)
    }

    // Check if migration is needed
    const existingUsers = await prisma.user.count()
    if (existingUsers === 0 && !this.options.force) {
      throw new Error('No users found. Use --force to proceed with empty database.')
    }

    // Check for existing RBAC tables
    const rbacTables = ['permission_cache', 'security_events', 'role_change_history']
    for (const table of rbacTables) {
      try {
        const result = await prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = '${table}'
          )
        `) as any[]
        
        if (result[0]?.exists) {
          this.log(`⚠️  Table '${table}' already exists`, 'warn')
        }
      } catch (error) {
        // Table doesn't exist, which is expected for new migrations
      }
    }

    // Check for required environment variables
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required')
    }

    // Check for pg_dump availability (for backup)
    if (!this.options.skipBackup) {
      try {
        execSync('which pg_dump', { stdio: 'ignore' })
        this.log('✅ pg_dump available for backup')
      } catch (error) {
        this.log('⚠️  pg_dump not available, skipping database backup', 'warn')
        this.options.skipBackup = true
      }
    }

    this.log('✅ Pre-migration checks completed')
  }

  /**
   * Create backup before migration
   */
  private async createBackup(): Promise<void> {
    this.log('Creating pre-migration backup...')

    const recovery = new RBACRecoveryManager({ verbose: this.options.verbose })
    
    try {
      // Create RBAC data backup
      this.backupPath = await recovery.createBackup()
      
      // Create database backup if possible
      try {
        await recovery.createDatabaseBackup()
        this.log('✅ Database backup created')
      } catch (error) {
        this.log(`⚠️  Database backup failed: ${error.message}`, 'warn')
      }
      
      this.log('✅ Pre-migration backup completed')
    } catch (error) {
      throw new Error(`Backup creation failed: ${error.message}`)
    }
  }

  /**
   * Execute a migration step
   */
  private async executeStep(step: MigrationStep): Promise<void> {
    this.log(`Executing step: ${step.name} - ${step.description}`)

    try {
      if (!this.options.dryRun) {
        await step.execute()
      } else {
        this.log(`[DRY RUN] Would execute: ${step.name}`)
      }
      
      this.completedSteps.push(step.name)
      this.log(`✅ Step completed: ${step.name}`)
    } catch (error) {
      throw new Error(`Step '${step.name}' failed: ${error.message}`)
    }
  }

  /**
   * Run database schema migrations
   */
  private async runDatabaseMigrations(): Promise<void> {
    this.log('Applying database schema migrations...')

    try {
      // Run Prisma migrations
      execSync('npx prisma migrate deploy', { 
        stdio: this.options.verbose ? 'inherit' : 'ignore',
        cwd: process.cwd()
      })

      // Apply custom RBAC migration scripts
      const migrationScript = join(__dirname, 'rbac-migration-001-add-missing-tables.sql')
      if (existsSync(migrationScript)) {
        const sql = readFileSync(migrationScript, 'utf8')
        await prisma.$executeRawUnsafe(sql)
        this.log('✅ Custom RBAC schema migrations applied')
      }

    } catch (error) {
      throw new Error(`Database migration failed: ${error.message}`)
    }
  }

  /**
   * Run data migration
   */
  private async runDataMigration(): Promise<void> {
    this.log('Running data migration...')

    const migrationOptions: MigrationOptions = {
      dryRun: this.options.dryRun,
      verbose: this.options.verbose,
      createDefaultAdmin: true
    }

    const dataMigration = new RBACDataMigration(migrationOptions)
    const result = await dataMigration.migrate()

    if (!result.success) {
      throw new Error(`Data migration failed: ${result.errors.join(', ')}`)
    }

    // Apply data migration SQL script
    const dataMigrationScript = join(__dirname, 'rbac-migration-002-data-migration.sql')
    if (existsSync(dataMigrationScript) && !this.options.dryRun) {
      const sql = readFileSync(dataMigrationScript, 'utf8')
      await prisma.$executeRawUnsafe(sql)
      this.log('✅ Data migration SQL script applied')
    }
  }

  /**
   * Validate migration results
   */
  private async validateMigration(): Promise<void> {
    this.log('Validating migration results...')

    const recovery = new RBACRecoveryManager({ 
      verbose: this.options.verbose,
      emergencyMode: false
    })

    await recovery.validateSystem()
    this.log('✅ Migration validation completed')
  }

  /**
   * Clean up temporary migration data
   */
  private async cleanupMigration(): Promise<void> {
    this.log('Cleaning up migration data...')

    // Clean up expired permission cache entries
    const expiredCount = await prisma.permissionCache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })

    this.log(`Cleaned up ${expiredCount.count} expired permission cache entries`)

    // Update database statistics
    await prisma.$executeRaw`ANALYZE`
    this.log('✅ Database statistics updated')
  }

  /**
   * Rollback migration steps
   */
  private async rollbackMigration(): Promise<void> {
    this.log('Rolling back migration...')

    // Rollback in reverse order
    const rollbackSteps = this.completedSteps.reverse()

    for (const stepName of rollbackSteps) {
      try {
        switch (stepName) {
          case 'data-migration':
            await this.rollbackDataMigration()
            break
          case 'database-schema':
            await this.rollbackDatabaseMigrations()
            break
        }
        this.log(`✅ Rolled back step: ${stepName}`)
      } catch (error) {
        this.log(`❌ Failed to rollback step '${stepName}': ${error.message}`, 'error')
      }
    }

    // Restore from backup if available
    if (this.backupPath && existsSync(this.backupPath)) {
      try {
        const recovery = new RBACRecoveryManager({ verbose: this.options.verbose })
        await recovery.restoreFromBackup(this.backupPath)
        this.log('✅ System restored from backup')
      } catch (error) {
        this.log(`❌ Failed to restore from backup: ${error.message}`, 'error')
      }
    }
  }

  /**
   * Rollback database migrations
   */
  private async rollbackDatabaseMigrations(): Promise<void> {
    const rollbackScript = join(__dirname, 'rbac-rollback-001.sql')
    if (existsSync(rollbackScript)) {
      const sql = readFileSync(rollbackScript, 'utf8')
      await prisma.$executeRawUnsafe(sql)
    }
  }

  /**
   * Rollback data migration
   */
  private async rollbackDataMigration(): Promise<void> {
    const rollbackScript = join(__dirname, 'rbac-rollback-002.sql')
    if (existsSync(rollbackScript)) {
      const sql = readFileSync(rollbackScript, 'utf8')
      await prisma.$executeRawUnsafe(sql)
    }
  }

  /**
   * Display migration summary
   */
  private displayMigrationSummary(): void {
    this.log('\n📊 Migration Summary:')
    this.log(`   Completed steps: ${this.completedSteps.length}`)
    this.log(`   Backup created: ${this.backupPath ? 'Yes' : 'No'}`)
    this.log(`   Dry run mode: ${this.options.dryRun ? 'Yes' : 'No'}`)
    
    if (this.backupPath) {
      this.log(`   Backup location: ${this.backupPath}`)
    }
    
    this.log('\n🔧 Next Steps:')
    this.log('   1. Verify the migration results')
    this.log('   2. Test the RBAC functionality')
    this.log('   3. Update any custom code that depends on the old schema')
    this.log('   4. Monitor system performance and logs')
    
    if (this.backupPath) {
      this.log(`   5. Keep the backup file safe: ${this.backupPath}`)
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
  const command = args[0] || 'run'

  const options: MigrationRunnerOptions = {
    skipBackup: args.includes('--skip-backup'),
    skipValidation: args.includes('--skip-validation'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    force: args.includes('--force'),
    rollbackOnFailure: !args.includes('--no-rollback')
  }

  const runner = new RBACMigrationRunner(options)

  try {
    switch (command) {
      case 'run':
        await runner.runMigration()
        break

      case 'rollback':
        await runner.rollbackMigration()
        console.log('✅ Migration rollback completed')
        break

      default:
        console.log('Usage: tsx rbac-migration-runner.ts [run|rollback] [options]')
        console.log('Commands:')
        console.log('  run       Run the complete RBAC migration')
        console.log('  rollback  Rollback the RBAC migration')
        console.log('Options:')
        console.log('  --skip-backup      Skip creating backup before migration')
        console.log('  --skip-validation  Skip post-migration validation')
        console.log('  --dry-run          Run without making changes')
        console.log('  --verbose          Enable verbose logging')
        console.log('  --force            Force migration even with warnings')
        console.log('  --no-rollback      Don\'t rollback on failure')
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

export { RBACMigrationRunner, type MigrationRunnerOptions }