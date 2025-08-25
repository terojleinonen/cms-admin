/**
 * Test Database Configuration
 * Manages test database setup, migration, and environment configuration
 */

import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

// Test database configuration
export interface TestDatabaseConfig {
  host: string
  port: number
  username: string
  password: string
  database: string
  testDatabase: string
  url: string
  testUrl: string
}

/**
 * Parse database URL and extract configuration
 */
export function parseTestDatabaseConfig(): TestDatabaseConfig {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://cms_user:secure_password@localhost:5432/kin_workspace_cms'
  
  try {
    const url = new URL(databaseUrl)
    const database = url.pathname.slice(1) // Remove leading slash
    const testDatabase = database.includes('_test') ? database : `${database}_test`
    
    const config: TestDatabaseConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      username: url.username,
      password: url.password,
      database,
      testDatabase,
      url: databaseUrl,
      testUrl: databaseUrl.replace(database, testDatabase)
    }
    
    return config
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL format: ${databaseUrl}`)
  }
}

/**
 * Create test database if it doesn't exist
 */
export async function createTestDatabase(): Promise<void> {
  const config = parseTestDatabaseConfig()
  
  // Connect to default postgres database to create test database
  const adminUrl = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/postgres`
  const adminPrisma = new PrismaClient({
    datasources: {
      db: { url: adminUrl }
    }
  })
  
  try {
    await adminPrisma.$connect()
    
    // Check if test database exists
    const result = await adminPrisma.$queryRaw`
      SELECT 1 FROM pg_database WHERE datname = ${config.testDatabase}
    ` as any[]
    
    if (result.length === 0) {
      // Create test database
      await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${config.testDatabase}"`)
      console.log(`✅ Created test database: ${config.testDatabase}`)
    } else {
      console.log(`✅ Test database already exists: ${config.testDatabase}`)
    }
  } catch (error) {
    console.error('❌ Failed to create test database:', error)
    throw error
  } finally {
    await adminPrisma.$disconnect()
  }
}

/**
 * Drop test database
 */
export async function dropTestDatabase(): Promise<void> {
  const config = parseTestDatabaseConfig()
  
  // Connect to default postgres database to drop test database
  const adminUrl = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/postgres`
  const adminPrisma = new PrismaClient({
    datasources: {
      db: { url: adminUrl }
    }
  })
  
  try {
    await adminPrisma.$connect()
    
    // Terminate active connections to test database
    await adminPrisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${config.testDatabase}' AND pid <> pg_backend_pid()
    `)
    
    // Drop test database
    await adminPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${config.testDatabase}"`)
    console.log(`✅ Dropped test database: ${config.testDatabase}`)
  } catch (error) {
    console.error('❌ Failed to drop test database:', error)
    throw error
  } finally {
    await adminPrisma.$disconnect()
  }
}

/**
 * Run database migrations on test database
 */
export async function migrateTestDatabase(): Promise<void> {
  const config = parseTestDatabaseConfig()
  
  try {
    // Set test database URL for migration
    const originalUrl = process.env.DATABASE_URL
    process.env.DATABASE_URL = config.testUrl
    
    // Run Prisma migrations
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: config.testUrl }
    })
    
    console.log(`✅ Migrated test database: ${config.testDatabase}`)
    
    // Restore original URL
    if (originalUrl) {
      process.env.DATABASE_URL = originalUrl
    }
  } catch (error) {
    console.error('❌ Failed to migrate test database:', error)
    throw error
  }
}

/**
 * Reset test database (drop, create, migrate)
 */
export async function resetTestDatabase(): Promise<void> {
  console.log('🔄 Resetting test database...')
  
  try {
    await dropTestDatabase()
    await createTestDatabase()
    await migrateTestDatabase()
    console.log('✅ Test database reset complete')
  } catch (error) {
    console.error('❌ Failed to reset test database:', error)
    throw error
  }
}

/**
 * Setup test database environment
 */
export async function setupTestDatabaseEnvironment(): Promise<void> {
  const config = parseTestDatabaseConfig()
  
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = config.testUrl
  
  try {
    await createTestDatabase()
    await migrateTestDatabase()
    console.log('✅ Test database environment ready')
  } catch (error) {
    console.error('❌ Failed to setup test database environment:', error)
    throw error
  }
}

/**
 * Cleanup test database environment
 */
export async function cleanupTestDatabaseEnvironment(): Promise<void> {
  try {
    await dropTestDatabase()
    console.log('✅ Test database environment cleaned up')
  } catch (error) {
    console.error('❌ Failed to cleanup test database environment:', error)
    // Don't throw - cleanup should be best effort
  }
}

/**
 * Check if test database is accessible
 */
export async function checkTestDatabaseConnection(): Promise<boolean> {
  const config = parseTestDatabaseConfig()
  const testPrisma = new PrismaClient({
    datasources: {
      db: { url: config.testUrl }
    }
  })
  
  try {
    await testPrisma.$connect()
    await testPrisma.$queryRaw`SELECT 1`
    await testPrisma.$disconnect()
    return true
  } catch (error) {
    console.error('❌ Test database connection failed:', error)
    return false
  }
}

/**
 * Get test database statistics
 */
export async function getTestDatabaseStats(): Promise<{
  tables: number
  records: number
  size: string
}> {
  const config = parseTestDatabaseConfig()
  const testPrisma = new PrismaClient({
    datasources: {
      db: { url: config.testUrl }
    }
  })
  
  try {
    await testPrisma.$connect()
    
    // Get table count
    const tables = await testPrisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    ` as any[]
    
    // Get total record count across all tables
    const recordCounts = await testPrisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins - n_tup_del as record_count
      FROM pg_stat_user_tables
    ` as any[]
    
    const totalRecords = recordCounts.reduce((sum, table) => sum + (table.record_count || 0), 0)
    
    // Get database size
    const sizeResult = await testPrisma.$queryRaw`
      SELECT pg_size_pretty(pg_database_size(${config.testDatabase})) as size
    ` as any[]
    
    return {
      tables: tables[0]?.count || 0,
      records: totalRecords,
      size: sizeResult[0]?.size || '0 bytes'
    }
  } catch (error) {
    console.error('❌ Failed to get test database stats:', error)
    return { tables: 0, records: 0, size: '0 bytes' }
  } finally {
    await testPrisma.$disconnect()
  }
}

/**
 * Validate test database schema
 */
export async function validateTestDatabaseSchema(): Promise<boolean> {
  const config = parseTestDatabaseConfig()
  const testPrisma = new PrismaClient({
    datasources: {
      db: { url: config.testUrl }
    }
  })
  
  try {
    await testPrisma.$connect()
    
    // Check for required tables
    const requiredTables = [
      'users', 'categories', 'products', 'media', 'pages',
      'product_categories', 'product_media', 'content_revisions',
      'api_keys', 'backups'
    ]
    
    for (const table of requiredTables) {
      const result = await testPrisma.$queryRaw`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${table}
      ` as any[]
      
      if (result.length === 0) {
        console.error(`❌ Missing required table: ${table}`)
        return false
      }
    }
    
    console.log('✅ Test database schema validation passed')
    return true
  } catch (error) {
    console.error('❌ Test database schema validation failed:', error)
    return false
  } finally {
    await testPrisma.$disconnect()
  }
}

// Export configuration for use in tests
export const testDatabaseConfig = parseTestDatabaseConfig()