/**
 * Integration Test Setup
 * Configures real database connections for integration tests
 * Uses the new TestDatabaseManager for improved isolation and connection management
 */

import { PrismaClient } from '@prisma/client'
import { testDatabaseManager, TestDatabaseManager } from './helpers/test-database-manager'
import { setupTestDatabaseEnvironment } from './helpers/test-database-config'
// Import functions dynamically to avoid circular dependencies

// Legacy integration prisma client for backward compatibility
let integrationPrisma: PrismaClient | undefined

// Initialize real database connection for integration tests
export const initIntegrationDatabase = async () => {
  try {
    // Setup test database environment if not already done
    await setupTestDatabaseEnvironment()
    
    // Initialize using the new database manager
    integrationPrisma = await testDatabaseManager.initialize(true)
    console.log('✅ Integration test database connected')
    return integrationPrisma
  } catch (error) {
    console.error('❌ Failed to connect to integration test database:', error)
    throw error
  }
}

// Cleanup integration database
export const cleanupIntegrationDatabase = async () => {
  try {
    await testDatabaseManager.cleanup()
    await testDatabaseManager.disconnect()
    integrationPrisma = undefined
    console.log('✅ Integration test database cleaned up')
  } catch (error) {
    console.error('❌ Failed to cleanup integration test database:', error)
    throw error
  }
}

// Seed integration database with test data
export const seedIntegrationDatabase = async () => {
  try {
    const testData = await testDatabaseManager.seed()
    console.log('✅ Integration test database seeded')
    return testData
  } catch (error) {
    console.error('❌ Failed to seed integration test database:', error)
    throw error
  }
}

// Transaction wrapper for integration tests with improved isolation
export const withTransaction = async <T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> => {
  const testId = `integration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  return testDatabaseManager.withTransaction(testId, callback)
}

// Create isolated test user for integration tests
export const createIntegrationTestUser = async (userData: any = {}) => {
  const client = testDatabaseManager.getClient()
  const { createTestUser } = require('./helpers/test-data-factory')
  const testUser = createTestUser(userData)
  
  try {
    return await client.user.create({ data: testUser })
  } catch (error: any) {
    // If user already exists, return existing user
    if (error.code === 'P2002') {
      return await client.user.findUnique({
        where: { email: testUser.email }
      })
    }
    throw error
  }
}

// Create isolated test category for integration tests
export const createIntegrationTestCategory = async (categoryData: any = {}) => {
  const client = testDatabaseManager.getClient()
  const { createTestCategory } = require('./helpers/test-data-factory')
  const testCategory = createTestCategory(categoryData)
  
  try {
    return await client.category.create({ data: testCategory })
  } catch (error: any) {
    // If category already exists, return existing category
    if (error.code === 'P2002') {
      return await client.category.findUnique({
        where: { slug: testCategory.slug }
      })
    }
    throw error
  }
}

// Create isolated test product for integration tests
export const createIntegrationTestProduct = async (productData: any = {}) => {
  const client = testDatabaseManager.getClient()
  const { createTestProduct } = require('./helpers/test-data-factory')
  const testProduct = createTestProduct(productData)
  
  try {
    return await client.product.create({ data: testProduct })
  } catch (error: any) {
    // If product already exists, return existing product
    if (error.code === 'P2002') {
      return await client.product.findUnique({
        where: { slug: testProduct.slug }
      })
    }
    throw error
  }
}

// Export the integration prisma client for backward compatibility
export { integrationPrisma }

// Global setup and teardown for integration tests
export const setupIntegrationTests = async () => {
  await initIntegrationDatabase()
  await seedIntegrationDatabase()
}

export const teardownIntegrationTests = async () => {
  await cleanupIntegrationDatabase()
}

// Enhanced Jest hooks for integration test files with transaction isolation
export const useIntegrationDatabase = (options: {
  seed?: boolean
  cleanup?: boolean
  transactions?: boolean
} = {}) => {
  const { seed = true, cleanup = true, transactions = false } = options

  beforeAll(async () => {
    await initIntegrationDatabase()
    if (seed) {
      await seedIntegrationDatabase()
    }
  })
  
  beforeEach(async () => {
    if (cleanup && !transactions) {
      await testDatabaseManager.cleanup()
      if (seed) {
        await testDatabaseManager.seed()
      }
    }
  })
  
  afterAll(async () => {
    await cleanupIntegrationDatabase()
  })
}

// Transaction-based isolation for integration tests
export const useTransactionIsolation = () => {
  let testId: string

  beforeEach(() => {
    testId = `integration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  })

  afterEach(async () => {
    if (testId) {
      try {
        await testDatabaseManager.rollbackTransaction(testId)
      } catch {
        // Expected - transaction rollback
      }
    }
  })

  return {
    getTransaction: () => testDatabaseManager.createTransaction(testId),
    withTransaction: <T>(callback: (prisma: PrismaClient) => Promise<T>) =>
      testDatabaseManager.withTransaction(testId, callback)
  }
}

// Helper to determine if we should use real database or mocks
export const shouldUseRealDatabase = () => {
  // Use real database for integration tests
  const testPath = expect.getState().testPath || ''
  return testPath.includes('integration') || 
         testPath.includes('e2e') ||
         process.env.USE_REAL_DATABASE === 'true'
}

// Dynamic database client that returns real or mock based on test type
export const getTestDatabase = () => {
  if (shouldUseRealDatabase()) {
    return testDatabaseManager.getClient()
  } else {
    // Return mock for unit tests
    const { prisma } = require('../__mocks__/@/lib/db')
    return prisma
  }
}