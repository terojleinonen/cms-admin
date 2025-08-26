/**
 * Integration Test Utilities
 * Enhanced utilities for reliable integration testing with proper isolation
 */

import { PrismaClient } from '@prisma/client'
import { testDatabaseManager } from './test-database-manager'
import { createTestUser, createTestCategory, createTestProduct, createTestMedia } from './test-data-factory'

// Test isolation strategies
export enum TestIsolationStrategy {
  TRANSACTION = 'transaction',
  CLEANUP = 'cleanup',
  SEPARATE_DB = 'separate_db'
}

// Integration test configuration
export interface IntegrationTestConfig {
  isolationStrategy: TestIsolationStrategy
  seedData: boolean
  cleanupAfterEach: boolean
  timeoutMs: number
  retryAttempts: number
}

// Default configuration
export const DEFAULT_INTEGRATION_CONFIG: IntegrationTestConfig = {
  isolationStrategy: TestIsolationStrategy.TRANSACTION,
  seedData: true,
  cleanupAfterEach: true,
  timeoutMs: 30000,
  retryAttempts: 3
}

/**
 * Enhanced Integration Test Manager
 * Provides reliable database isolation and error recovery
 */
export class IntegrationTestManager {
  private static instance: IntegrationTestManager
  private config: IntegrationTestConfig
  private activeTransactions: Map<string, any> = new Map()
  private testData: Map<string, any> = new Map()

  private constructor(config: IntegrationTestConfig = DEFAULT_INTEGRATION_CONFIG) {
    this.config = config
  }

  static getInstance(config?: IntegrationTestConfig): IntegrationTestManager {
    if (!IntegrationTestManager.instance) {
      IntegrationTestManager.instance = new IntegrationTestManager(config)
    }
    return IntegrationTestManager.instance
  }

  /**
   * Setup integration test environment
   */
  async setup(): Promise<void> {
    try {
      await testDatabaseManager.initialize(true)
      
      if (this.config.seedData) {
        await this.seedTestData()
      }
      
      console.log('✅ Integration test environment setup complete')
    } catch (error) {
      console.error('❌ Failed to setup integration test environment:', error)
      throw error
    }
  }

  /**
   * Cleanup integration test environment
   */
  async cleanup(): Promise<void> {
    try {
      // Rollback any active transactions
      for (const [testId, transaction] of this.activeTransactions) {
        try {
          await testDatabaseManager.rollbackTransaction(testId)
        } catch {
          // Expected - transaction rollback
        }
      }
      this.activeTransactions.clear()

      // Clear test data cache
      this.testData.clear()

      // Cleanup database
      await testDatabaseManager.cleanup()
      await testDatabaseManager.disconnect()
      
      console.log('✅ Integration test environment cleanup complete')
    } catch (error) {
      console.error('❌ Failed to cleanup integration test environment:', error)
      throw error
    }
  }

  /**
   * Create isolated test context
   */
  async createTestContext(testName: string): Promise<IntegrationTestContext> {
    const testId = `integration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    let prismaClient: PrismaClient
    let cleanup: () => Promise<void>

    switch (this.config.isolationStrategy) {
      case TestIsolationStrategy.TRANSACTION:
        prismaClient = await testDatabaseManager.createTransaction(testId)
        this.activeTransactions.set(testId, prismaClient)
        cleanup = async () => {
          try {
            await testDatabaseManager.rollbackTransaction(testId)
            this.activeTransactions.delete(testId)
          } catch {
            // Expected - transaction rollback
          }
        }
        break

      case TestIsolationStrategy.CLEANUP:
        prismaClient = testDatabaseManager.getClient()
        cleanup = async () => {
          await testDatabaseManager.cleanup()
          if (this.config.seedData) {
            await this.seedTestData()
          }
        }
        break

      case TestIsolationStrategy.SEPARATE_DB:
        // For now, use transaction strategy as separate DB is complex
        prismaClient = await testDatabaseManager.createTransaction(testId)
        this.activeTransactions.set(testId, prismaClient)
        cleanup = async () => {
          try {
            await testDatabaseManager.rollbackTransaction(testId)
            this.activeTransactions.delete(testId)
          } catch {
            // Expected - transaction rollback
          }
        }
        break

      default:
        throw new Error(`Unsupported isolation strategy: ${this.config.isolationStrategy}`)
    }

    return new IntegrationTestContext(testId, testName, prismaClient, cleanup, this)
  }

  /**
   * Seed test data
   */
  private async seedTestData(): Promise<void> {
    const client = testDatabaseManager.getClient()
    
    // Create admin user
    const adminUser = await client.user.create({
      data: createTestUser({
        email: 'admin@integration-test.com',
        name: 'Integration Admin',
        role: 'ADMIN'
      })
    })

    // Create editor user
    const editorUser = await client.user.create({
      data: createTestUser({
        email: 'editor@integration-test.com',
        name: 'Integration Editor',
        role: 'EDITOR'
      })
    })

    // Create test category
    const category = await client.category.create({
      data: createTestCategory({
        name: 'Integration Test Category',
        slug: 'integration-test-category'
      })
    })

    // Create test product
    const product = await client.product.create({
      data: createTestProduct({
        name: 'Integration Test Product',
        slug: 'integration-test-product',
        createdBy: adminUser.id
      })
    })

    // Create test media
    const media = await client.media.create({
      data: createTestMedia({
        filename: 'integration-test-image.jpg',
        createdBy: adminUser.id
      })
    })

    // Store seeded data for reference
    this.testData.set('seedData', {
      users: { admin: adminUser, editor: editorUser },
      categories: { main: category },
      products: { main: product },
      media: { main: media }
    })
  }

  /**
   * Get seeded test data
   */
  getSeededData(): any {
    return this.testData.get('seedData')
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.config.retryAttempts
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxAttempts) {
          throw lastError
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 100
        await new Promise(resolve => setTimeout(resolve, delay))
        
        console.warn(`Retry attempt ${attempt}/${maxAttempts} after error:`, error)
      }
    }
    
    throw lastError!
  }
}

/**
 * Integration Test Context
 * Provides isolated test environment with automatic cleanup
 */
export class IntegrationTestContext {
  constructor(
    public readonly testId: string,
    public readonly testName: string,
    public readonly prisma: PrismaClient,
    private cleanupFn: () => Promise<void>,
    private manager: IntegrationTestManager
  ) {}

  /**
   * Create test user in this context
   */
  async createUser(userData: any = {}): Promise<any> {
    return this.manager.retryOperation(async () => {
      return await this.prisma.user.create({
        data: createTestUser(userData)
      })
    })
  }

  /**
   * Create test category in this context
   */
  async createCategory(categoryData: any = {}): Promise<any> {
    return this.manager.retryOperation(async () => {
      return await this.prisma.category.create({
        data: createTestCategory(categoryData)
      })
    })
  }

  /**
   * Create test product in this context
   */
  async createProduct(productData: any = {}): Promise<any> {
    return this.manager.retryOperation(async () => {
      return await this.prisma.product.create({
        data: createTestProduct(productData)
      })
    })
  }

  /**
   * Create test media in this context
   */
  async createMedia(mediaData: any = {}): Promise<any> {
    return this.manager.retryOperation(async () => {
      return await this.prisma.media.create({
        data: createTestMedia(mediaData)
      })
    })
  }

  /**
   * Execute operation with error recovery
   */
  async executeWithRecovery<T>(operation: () => Promise<T>): Promise<T> {
    return this.manager.retryOperation(operation)
  }

  /**
   * Cleanup this test context
   */
  async cleanup(): Promise<void> {
    await this.cleanupFn()
  }
}

/**
 * Jest hooks for integration tests
 */
export function useIntegrationTestManager(config?: Partial<IntegrationTestConfig>) {
  const fullConfig = { ...DEFAULT_INTEGRATION_CONFIG, ...config }
  const manager = IntegrationTestManager.getInstance(fullConfig)

  beforeAll(async () => {
    await manager.setup()
  }, fullConfig.timeoutMs)

  afterAll(async () => {
    await manager.cleanup()
  }, fullConfig.timeoutMs)

  return manager
}

/**
 * Create isolated test context for each test
 */
export function useIsolatedTestContext(config?: Partial<IntegrationTestConfig>) {
  const manager = useIntegrationTestManager(config)
  let context: IntegrationTestContext | undefined

  beforeEach(async () => {
    const testName = expect.getState().currentTestName || 'unknown-test'
    context = await manager.createTestContext(testName)
  })

  afterEach(async () => {
    if (context) {
      await context.cleanup()
      context = undefined
    }
  })

  return {
    getContext: () => {
      if (!context) {
        throw new Error('Test context not available. Make sure to call this within a test.')
      }
      return context
    }
  }
}

/**
 * API workflow testing utilities
 */
export class APIWorkflowTester {
  constructor(private context: IntegrationTestContext) {}

  /**
   * Test complete CRUD workflow
   */
  async testCRUDWorkflow(
    entityName: string,
    createData: any,
    updateData: any,
    apiHandlers: {
      create: (request: Request) => Promise<Response>
      read: (request: Request, params?: any) => Promise<Response>
      update: (request: Request, params?: any) => Promise<Response>
      delete: (request: Request, params?: any) => Promise<Response>
      list: (request: Request) => Promise<Response>
    }
  ): Promise<void> {
    // Create
    const createRequest = new Request('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify(createData),
      headers: { 'Content-Type': 'application/json' }
    })

    const createResponse = await apiHandlers.create(createRequest)
    expect(createResponse.status).toBe(201)
    
    const createResult = await createResponse.json()
    const entityId = createResult[entityName].id

    // Read
    const readRequest = new Request(`http://localhost/api/test/${entityId}`)
    const readResponse = await apiHandlers.read(readRequest, { id: entityId })
    expect(readResponse.status).toBe(200)

    // Update
    const updateRequest = new Request(`http://localhost/api/test/${entityId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' }
    })

    const updateResponse = await apiHandlers.update(updateRequest, { id: entityId })
    expect(updateResponse.status).toBe(200)

    // List
    const listRequest = new Request('http://localhost/api/test')
    const listResponse = await apiHandlers.list(listRequest)
    expect(listResponse.status).toBe(200)

    // Delete
    const deleteRequest = new Request(`http://localhost/api/test/${entityId}`, {
      method: 'DELETE'
    })

    const deleteResponse = await apiHandlers.delete(deleteRequest, { id: entityId })
    expect(deleteResponse.status).toBe(200)

    // Verify deletion
    const verifyRequest = new Request(`http://localhost/api/test/${entityId}`)
    const verifyResponse = await apiHandlers.read(verifyRequest, { id: entityId })
    expect(verifyResponse.status).toBe(404)
  }

  /**
   * Test authentication workflow
   */
  async testAuthWorkflow(
    authHandlers: {
      register: (request: Request) => Promise<Response>
      login: (request: Request) => Promise<Response>
      profile: (request: Request) => Promise<Response>
    },
    userData: any
  ): Promise<string> {
    // Register
    const registerRequest = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      headers: { 'Content-Type': 'application/json' }
    })

    const registerResponse = await authHandlers.register(registerRequest)
    expect(registerResponse.status).toBe(201)

    // Login
    const loginRequest = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: userData.email,
        password: userData.password
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    const loginResponse = await authHandlers.login(loginRequest)
    expect(loginResponse.status).toBe(200)
    
    const loginResult = await loginResponse.json()
    const token = loginResult.token

    // Profile access
    const profileRequest = new Request('http://localhost/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const profileResponse = await authHandlers.profile(profileRequest)
    expect(profileResponse.status).toBe(200)

    return token
  }
}

/**
 * Error handling and recovery utilities
 */
export class ErrorRecoveryHelper {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 100
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxAttempts) {
          throw lastError
        }
        
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
      }
    }
    
    throw lastError!
  }

  static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 10000
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ])
  }

  static async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    failureThreshold: number = 5,
    resetTimeoutMs: number = 60000
  ): Promise<T> {
    // Simple circuit breaker implementation
    // In a real implementation, this would track failures across calls
    return operation()
  }
}

// Export convenience functions
export const createIntegrationTestManager = (config?: Partial<IntegrationTestConfig>) => 
  IntegrationTestManager.getInstance({ ...DEFAULT_INTEGRATION_CONFIG, ...config })

export const createAPITester = (context: IntegrationTestContext, config?: Partial<APITestConfig>) =>
  new APIWorkflowTester(context, config)

export const withIntegrationTest = useIntegrationTestManager
export const withIsolatedTest = useIsolatedTestContext