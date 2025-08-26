/**
 * Enhanced Integration Test
 * Simple test to verify the enhanced integration test utilities work correctly
 */

import { 
  useIsolatedTestContext,
  createAPITester
} from '../helpers/integration-test-utils'
import { 
  executeWithRecovery,
  executeDatabaseOperation
} from '../helpers/error-recovery-utils'
import { 
  cleanDatabase,
  seedMinimalDatabase,
  verifyDatabaseClean
} from '../helpers/database-cleanup-utils'
import { createTestUser, createTestCategory } from '../helpers/test-data-factory'

describe('Enhanced Integration Test Utilities', () => {
  const { getContext } = useIsolatedTestContext({
    isolationStrategy: 'cleanup', // Use cleanup strategy for simplicity
    seedData: false,
    cleanupAfterEach: true
  })

  it('should create and manage test context properly', async () => {
    const context = getContext()
    
    expect(context).toBeDefined()
    expect(context.prisma).toBeDefined()
    expect(context.testId).toBeDefined()
    expect(context.testName).toBeDefined()
  })

  it('should handle database operations with error recovery', async () => {
    const context = getContext()
    
    await executeWithRecovery(
      async () => {
        // Clean database first
        await cleanDatabase(context.prisma)
        
        // Verify it's clean
        const isClean = await verifyDatabaseClean(context.prisma)
        expect(isClean).toBe(true)
        
        // Create test user with error handling
        const userData = createTestUser({
          email: `test-user-${Date.now()}@example.com`,
          name: 'Test User'
        })
        
        const user = await executeDatabaseOperation(
          async (prisma) => {
            return await prisma.user.create({ data: userData })
          },
          'enhanced-integration-test',
          'create-test-user'
        )
        
        expect(user).toBeDefined()
        expect(user.email).toBe(userData.email)
        expect(user.name).toBe(userData.name)
        
        // Verify user exists
        const foundUser = await context.prisma.user.findUnique({
          where: { email: userData.email }
        })
        
        expect(foundUser).toBeTruthy()
        expect(foundUser?.id).toBe(user.id)
      },
      {
        testName: 'enhanced-integration-utilities',
        operation: 'test-database-operations'
      }
    )
  })

  it('should handle test data creation with proper isolation', async () => {
    const context = getContext()
    
    await executeWithRecovery(
      async () => {
        // Create test user using context helper
        const user = await context.createUser({
          email: `context-user-${Date.now()}@example.com`,
          name: 'Context User'
        })
        
        expect(user).toBeDefined()
        expect(user.email).toContain('context-user-')
        
        // Create test category using context helper
        const category = await context.createCategory({
          name: `Context Category ${Date.now()}`,
          slug: `context-category-${Date.now()}`
        })
        
        expect(category).toBeDefined()
        expect(category.name).toContain('Context Category')
        
        // Verify both exist in database
        const userCount = await context.prisma.user.count()
        const categoryCount = await context.prisma.category.count()
        
        expect(userCount).toBeGreaterThanOrEqual(1)
        expect(categoryCount).toBeGreaterThanOrEqual(1)
      },
      {
        testName: 'test-data-creation',
        operation: 'create-test-entities'
      }
    )
  })

  it('should handle API testing utilities', async () => {
    const context = getContext()
    const apiTester = createAPITester(context)
    
    expect(apiTester).toBeDefined()
    
    // Test request creation
    const request = apiTester.createRequest('/api/test', {
      method: 'POST',
      body: JSON.stringify({ test: 'data' })
    })
    
    expect(request).toBeDefined()
    expect(request.url).toContain('/api/test')
    expect(request.method).toBe('POST')
  })

  it('should handle error recovery scenarios', async () => {
    const context = getContext()
    
    // Test retry mechanism
    let attemptCount = 0
    
    const result = await executeWithRecovery(
      async () => {
        attemptCount++
        
        if (attemptCount < 2) {
          throw new Error('Simulated failure')
        }
        
        return 'success'
      },
      {
        testName: 'error-recovery-test',
        operation: 'test-retry-mechanism'
      },
      {
        maxRetries: 3,
        retryDelay: 50
      }
    )
    
    expect(result).toBe('success')
    expect(attemptCount).toBe(2)
  })

  it('should handle database cleanup properly', async () => {
    const context = getContext()
    
    await executeWithRecovery(
      async () => {
        // Create some test data
        await context.createUser({
          email: `cleanup-user-${Date.now()}@example.com`,
          name: 'Cleanup User'
        })
        
        await context.createCategory({
          name: `Cleanup Category ${Date.now()}`,
          slug: `cleanup-category-${Date.now()}`
        })
        
        // Verify data exists
        const userCount = await context.prisma.user.count()
        const categoryCount = await context.prisma.category.count()
        
        expect(userCount).toBeGreaterThan(0)
        expect(categoryCount).toBeGreaterThan(0)
        
        // Clean database
        await cleanDatabase(context.prisma)
        
        // Verify cleanup
        const isClean = await verifyDatabaseClean(context.prisma)
        expect(isClean).toBe(true)
      },
      {
        testName: 'database-cleanup-test',
        operation: 'test-cleanup-functionality'
      }
    )
  })
})