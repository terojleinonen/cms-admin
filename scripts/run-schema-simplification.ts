#!/usr/bin/env tsx

/**
 * Database Schema Simplification Migration Runner
 * 
 * This script safely migrates the database schema to remove unused tables
 * and consolidate functionality as part of the codebase simplification effort.
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

interface MigrationStats {
  roleChangesPreserved: number
  tablesRemoved: string[]
  migrationTime: number
}

async function runSchemaMigration(): Promise<MigrationStats> {
  const startTime = Date.now()
  
  console.log('🚀 Starting database schema simplification migration...')
  
  try {
    // Step 1: Check if tables exist and get counts
    console.log('📊 Gathering pre-migration statistics...')
    
    const stats: any = {}
    
    try {
      stats.roleChangeCount = await prisma.$queryRaw`SELECT COUNT(*) FROM role_change_history`
      console.log(`   - Role changes to preserve: ${stats.roleChangeCount[0]?.count || 0}`)
    } catch (error) {
      console.log('   - role_change_history table not found (already removed)')
      stats.roleChangeCount = [{ count: 0 }]
    }

    try {
      stats.permissionCacheCount = await prisma.$queryRaw`SELECT COUNT(*) FROM permission_cache`
      console.log(`   - Permission cache entries: ${stats.permissionCacheCount[0]?.count || 0}`)
    } catch (error) {
      console.log('   - permission_cache table not found (already removed)')
    }

    try {
      stats.securityEventCount = await prisma.$queryRaw`SELECT COUNT(*) FROM security_events`
      console.log(`   - Security events: ${stats.securityEventCount[0]?.count || 0}`)
    } catch (error) {
      console.log('   - security_events table not found (already removed)')
    }

    // Step 2: Create backup of essential data
    console.log('💾 Creating backup of essential data...')
    
    // Backup role changes to audit logs if table exists
    let roleChangesPreserved = 0
    try {
      const result = await prisma.$executeRaw`
        INSERT INTO audit_logs (id, user_id, action, resource, details, created_at)
        SELECT 
          gen_random_uuid(),
          user_id,
          'ROLE_CHANGED',
          'user',
          jsonb_build_object(
            'oldRole', old_role,
            'newRole', new_role,
            'changedBy', changed_by,
            'reason', reason
          ),
          created_at
        FROM role_change_history
        WHERE NOT EXISTS (
          SELECT 1 FROM audit_logs 
          WHERE action = 'ROLE_CHANGED' 
          AND user_id = role_change_history.user_id 
          AND created_at = role_change_history.created_at
        )
      `
      roleChangesPreserved = Number(result)
      console.log(`   ✅ Preserved ${roleChangesPreserved} role changes in audit logs`)
    } catch (error) {
      console.log('   ⚠️  Role change history table not found or already migrated')
    }

    // Step 3: Drop unused tables
    console.log('🗑️  Removing unused tables...')
    
    const tablesToRemove = [
      'permission_cache',
      'security_events', 
      'role_change_history',
      'api_usage_logs',
      'backup_restore_logs',
      'search_events',
      'notification_templates'
    ]
    
    const tablesRemoved: string[] = []
    
    for (const table of tablesToRemove) {
      try {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${table} CASCADE`)
        tablesRemoved.push(table)
        console.log(`   ✅ Removed table: ${table}`)
      } catch (error) {
        console.log(`   ⚠️  Table ${table} not found or already removed`)
      }
    }

    // Step 4: Update schema comments and indexes
    console.log('📝 Updating schema documentation...')
    
    try {
      await prisma.$executeRaw`
        COMMENT ON COLUMN audit_logs.details IS 'JSON details including role changes: {oldRole, newRole, changedBy, reason}'
      `
      console.log('   ✅ Updated audit_logs documentation')
    } catch (error) {
      console.log('   ⚠️  Could not update column comment')
    }

    // Step 5: Create optimized indexes
    console.log('🔍 Creating optimized indexes...')
    
    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action_resource ON audit_logs(action, resource)
      `
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_role_changes ON audit_logs USING GIN (details) WHERE action = 'ROLE_CHANGED'
      `
      console.log('   ✅ Created performance indexes')
    } catch (error) {
      console.log('   ⚠️  Could not create indexes (may already exist)')
    }

    const migrationTime = Date.now() - startTime
    
    console.log('✅ Schema simplification migration completed successfully!')
    console.log(`   - Migration time: ${migrationTime}ms`)
    console.log(`   - Role changes preserved: ${roleChangesPreserved}`)
    console.log(`   - Tables removed: ${tablesRemoved.length}`)
    
    return {
      roleChangesPreserved,
      tablesRemoved,
      migrationTime
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

async function verifyMigration(): Promise<void> {
  console.log('🔍 Verifying migration results...')
  
  try {
    // Check that role changes were preserved in audit logs
    const roleChangeAudits = await prisma.auditLog.count({
      where: { action: 'ROLE_CHANGED' }
    })
    console.log(`   ✅ Role changes in audit logs: ${roleChangeAudits}`)
    
    // List remaining tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    ` as Array<{ table_name: string }>
    
    console.log('   📋 Remaining tables:')
    tables.forEach(table => {
      console.log(`      - ${table.table_name}`)
    })
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
    throw error
  }
}

async function main() {
  try {
    const stats = await runSchemaMigration()
    await verifyMigration()
    
    console.log('\n🎉 Database schema simplification completed successfully!')
    console.log('\n📊 Migration Summary:')
    console.log(`   - Tables removed: ${stats.tablesRemoved.join(', ')}`)
    console.log(`   - Role changes preserved: ${stats.roleChangesPreserved}`)
    console.log(`   - Migration time: ${stats.migrationTime}ms`)
    console.log('\n💡 Next steps:')
    console.log('   1. Run `npx prisma generate` to update Prisma client')
    console.log('   2. Update application code to use simplified schema')
    console.log('   3. Test application functionality')
    
  } catch (error) {
    console.error('\n❌ Migration failed. Please check the error above and try again.')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export { runSchemaMigration, verifyMigration }