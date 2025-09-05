#!/usr/bin/env node

/**
 * Test Database Setup Script
 * Sets up the test database environment for running tests
 */

const { execSync } = require('child_process')
const { PrismaClient } = require('@prisma/client')

// Parse database URL and create test database URL
function getTestDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://cms_user:secure_password@localhost:5432/kin_workspace_cms'
  
  try {
    const url = new URL(databaseUrl)
    const database = url.pathname.slice(1) // Remove leading slash
    const testDatabase = database.includes('_test') ? database : `${database}_test`
    
    return databaseUrl.replace(database, testDatabase)
  } catch {
    console.error('❌ Invalid DATABASE_URL format:', databaseUrl)
    process.exit(1)
  }
}

// Create test database if it doesn't exist
async function createTestDatabase() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://cms_user:secure_password@localhost:5432/kin_workspace_cms'
  const testDatabaseUrl = getTestDatabaseUrl()
  
  try {
    const url = new URL(databaseUrl)
    const testUrl = new URL(testDatabaseUrl)
    const testDatabase = testUrl.pathname.slice(1)
    
    // Connect to default postgres database to create test database
    const adminUrl = `postgresql://${url.username}:${url.password}@${url.hostname}:${url.port}/postgres`
    const adminPrisma = new PrismaClient({
      datasources: {
        db: { url: adminUrl }
      }
    })
    
    await adminPrisma.$connect()
    console.log('✅ Connected to PostgreSQL server')
    
    // Check if test database exists
    const result = await adminPrisma.$queryRaw`
      SELECT 1 FROM pg_database WHERE datname = ${testDatabase}
    `
    
    if (result.length === 0) {
      // Create test database
      await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${testDatabase}"`)
      console.log(`✅ Created test database: ${testDatabase}`)
    } else {
      console.log(`✅ Test database already exists: ${testDatabase}`)
    }
    
    await adminPrisma.$disconnect()
  } catch (error) {
    console.error('❌ Failed to create test database:', error.message)
    process.exit(1)
  }
}

// Run database migrations on test database
async function migrateTestDatabase() {
  const testDatabaseUrl = getTestDatabaseUrl()
  
  try {
    console.log('🔄 Running database migrations on test database...')
    
    // Run Prisma migrations with test database URL
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    })
    
    console.log('✅ Database migrations completed')
  } catch (error) {
    console.error('❌ Failed to run database migrations:', error.message)
    process.exit(1)
  }
}

// Validate test database schema
async function validateTestDatabase() {
  const testDatabaseUrl = getTestDatabaseUrl()
  
  try {
    const testPrisma = new PrismaClient({
      datasources: {
        db: { url: testDatabaseUrl }
      }
    })
    
    await testPrisma.$connect()
    console.log('✅ Connected to test database')
    
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
      `
      
      if (result.length === 0) {
        throw new Error(`Missing required table: ${table}`)
      }
    }
    
    console.log('✅ Test database schema validation passed')
    await testPrisma.$disconnect()
  } catch (error) {
    console.error('❌ Test database validation failed:', error.message)
    process.exit(1)
  }
}

// Main setup function
async function setupTestDatabase() {
  console.log('🚀 Setting up test database environment...')
  
  try {
    // Set test environment
    process.env.NODE_ENV = 'test'
    
    // Create test database
    await createTestDatabase()
    
    // Run migrations
    await migrateTestDatabase()
    
    // Validate schema
    await validateTestDatabase()
    
    console.log('✅ Test database setup complete!')
    console.log(`📊 Test database URL: ${getTestDatabaseUrl()}`)
    
  } catch (error) {
    console.error('❌ Test database setup failed:', error.message)
    process.exit(1)
  }
}

// Handle command line arguments
const command = process.argv[2]

switch (command) {
  case 'create':
    createTestDatabase().then(() => process.exit(0)).catch(() => process.exit(1))
    break
  case 'migrate':
    migrateTestDatabase().then(() => process.exit(0)).catch(() => process.exit(1))
    break
  case 'validate':
    validateTestDatabase().then(() => process.exit(0)).catch(() => process.exit(1))
    break
  case 'reset':
    // Drop and recreate test database
    (async () => {
      const testDatabaseUrl = getTestDatabaseUrl()
      const url = new URL(testDatabaseUrl)
      const testDatabase = url.pathname.slice(1)
      
      try {
        // Connect to admin database
        const adminUrl = `postgresql://${url.username}:${url.password}@${url.hostname}:${url.port}/postgres`
        const adminPrisma = new PrismaClient({
          datasources: { db: { url: adminUrl } }
        })
        
        await adminPrisma.$connect()
        
        // Terminate connections and drop database
        await adminPrisma.$executeRawUnsafe(`
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = '${testDatabase}' AND pid <> pg_backend_pid()
        `)
        
        await adminPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${testDatabase}"`)
        console.log(`✅ Dropped test database: ${testDatabase}`)
        
        await adminPrisma.$disconnect()
        
        // Recreate and migrate
        await setupTestDatabase()
      } catch (error) {
        console.error('❌ Failed to reset test database:', error.message)
        process.exit(1)
      }
    })()
    break
  default:
    setupTestDatabase()
}