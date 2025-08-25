/**
 * Test Database Manager
 * Provides comprehensive database isolation strategy for testing
 * Handles connection management, transactions, and data cleanup
 */

import { PrismaClient } from '@prisma/client'
// Import functions dynamically to avoid circular dependencies

// Database connection pool configuration for tests
const TEST_DB_CONFIG = {
  connectionLimit: 5,
  acquireTimeout: 30000,
  timeout: 30000,
  idleTimeout: 30000,
}

// Test database instances
let testPrisma: PrismaClient | undefined
let integrationPrisma: PrismaClient | undefined

// Transaction isolation levels
export enum IsolationLevel {
  READ_UNCOMMITTED = 'Read Uncommitted',
  READ_COMMITTED = 'Read Committed',
  REPEATABLE_READ = 'Repeatable Read',
  SERIALIZABLE = 'Serializable'
}

/**
 * Test Database Manager Class
 * Manages database connections, transactions, and isolation for tests
 */
export class TestDatabaseManager {
  private static instance: TestDatabaseManager
  private prismaClient: PrismaClient | undefined
  private activeTransactions: Map<string, any> = new Map()
  private connectionPool: PrismaClient[] = []
  private isInitialized = false

  private constructor() {}

  static getInstance(): TestDatabaseManager {
    if (!TestDatabaseManager.instance) {
      TestDatabaseManager.instance = new TestDatabaseManager()
    }
    return TestDatabaseManager.instance
  }

  /**
   * Initialize test database with proper configuration
   */
  async initialize(useRealDatabase = false): Promise<PrismaClient> {
    if (this.isInitialized && this.prismaClient) {
      return this.prismaClient
    }

    const databaseUrl = this.getTestDatabaseUrl()
    
    this.prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: process.env.NODE_ENV === 'test' ? [] : ['query', 'info', 'warn', 'error'],
      // Configure connection pool for tests
      __internal: {
        engine: {
          connectionLimit: TEST_DB_CONFIG.connectionLimit,
        },
      },
    })

    try {
      await this.prismaClient.$connect()
      this.isInitialized = true
      
      if (useRealDatabase) {
        console.log('✅ Test database connected:', databaseUrl)
      }
      
      return this.prismaClient
    } catch (error) {
      console.error('❌ Failed to connect to test database:', error)
      throw new Error(`Database connection failed: ${error}`)
    }
  }

  /**
   * Get test database URL with proper test database name
   */
  private getTestDatabaseUrl(): string {
    const baseUrl = process.env.DATABASE_URL || 'postgresql://cms_user:secure_password@localhost:5432/kin_workspace_cms'
    
    // Replace database name with test database
    if (baseUrl.includes('kin_workspace_cms') && !baseUrl.includes('_test')) {
      return baseUrl.replace('kin_workspace_cms', 'kin_workspace_cms_test')
    }
    
    return baseUrl
  }

  /**
   * Create isolated transaction for test
   */
  async createTransaction(testId: string): Promise<PrismaClient> {
    if (!this.prismaClient) {
      throw new Error('Database not initialized. Call initialize() first.')
    }

    return new Promise((resolve, reject) => {
      this.prismaClient!.$transaction(async (tx) => {
        // Store transaction reference
        this.activeTransactions.set(testId, tx)
        
        // Return transaction client
        resolve(tx as PrismaClient)
        
        // Keep transaction open until explicitly rolled back
        return new Promise(() => {}) // Never resolves, keeps transaction open
      }).catch(reject)
    })
  }

  /**
   * Rollback transaction for test cleanup
   */
  async rollbackTransaction(testId: string): Promise<void> {
    const transaction = this.activeTransactions.get(testId)
    if (transaction) {
      this.activeTransactions.delete(testId)
      // Transaction will be automatically rolled back when promise rejects
      throw new Error('Transaction rolled back for test cleanup')
    }
  }

  /**
   * Execute test with automatic transaction rollback
   */
  async withTransaction<T>(
    testId: string,
    callback: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    if (!this.prismaClient) {
      throw new Error('Database not initialized. Call initialize() first.')
    }

    return this.prismaClient.$transaction(async (tx) => {
      try {
        return await callback(tx as PrismaClient)
      } catch (error) {
        // Transaction will be automatically rolled back
        throw error
      }
    })
  }

  /**
   * Clean up all test data
   */
  async cleanup(): Promise<void> {
    if (!this.prismaClient) {
      return
    }

    try {
      // Import cleanup function dynamically to avoid circular dependency
      const { cleanupTestDatabase } = await import('./test-data-factory')
      await cleanupTestDatabase(this.prismaClient)
      console.log('✅ Test database cleaned up')
    } catch (error) {
      console.error('❌ Failed to cleanup test database:', error)
      throw error
    }
  }

  /**
   * Seed database with test data
   */
  async seed(): Promise<any> {
    if (!this.prismaClient) {
      throw new Error('Database not initialized. Call initialize() first.')
    }

    try {
      // Clean existing data first
      await this.cleanup()
      
      // Import seed function dynamically to avoid circular dependency
      const { seedTestDatabase } = await import('./test-data-factory')
      const testData = await seedTestDatabase(this.prismaClient)
      console.log('✅ Test database seeded')
      return testData
    } catch (error) {
      console.error('❌ Failed to seed test database:', error)
      throw error
    }
  }

  /**
   * Reset database to clean state
   */
  async reset(): Promise<void> {
    if (!this.prismaClient) {
      return
    }

    try {
      await this.cleanup()
      await this.seed()
      console.log('✅ Test database reset')
    } catch (error) {
      console.error('❌ Failed to reset test database:', error)
      throw error
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    // Clear active transactions
    this.activeTransactions.clear()

    // Disconnect main client
    if (this.prismaClient) {
      try {
        await this.prismaClient.$disconnect()
        console.log('✅ Test database disconnected')
      } catch (error) {
        console.error('❌ Failed to disconnect from test database:', error)
      } finally {
        this.prismaClient = undefined
        this.isInitialized = false
      }
    }

    // Disconnect connection pool
    await this.disconnectPool()
  }

  /**
   * Get database client
   */
  getClient(): PrismaClient {
    if (!this.prismaClient) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this.prismaClient
  }

  /**
   * Check if database is connected
   */
  isConnected(): boolean {
    return this.isInitialized && !!this.prismaClient
  }

  /**
   * Get database health status
   */
  async getHealthStatus(): Promise<{
    connected: boolean
    activeTransactions: number
    connectionPool: number
  }> {
    let connected = false
    
    if (this.prismaClient) {
      try {
        await this.prismaClient.$queryRaw`SELECT 1`
        connected = true
      } catch {
        connected = false
      }
    }

    return {
      connected,
      activeTransactions: this.activeTransactions.size,
      connectionPool: this.connectionPool.length
    }
  }

  /**
   * Create connection pool for parallel tests
   */
  private async createConnectionPool(size: number = 3): Promise<void> {
    const databaseUrl = this.getTestDatabaseUrl()
    
    for (let i = 0; i < size; i++) {
      const client = new PrismaClient({
        datasources: {
          db: { url: databaseUrl },
        },
        log: [],
      })
      
      await client.$connect()
      this.connectionPool.push(client)
    }
  }

  /**
   * Disconnect connection pool
   */
  private async disconnectPool(): Promise<void> {
    await Promise.all(
      this.connectionPool.map(async (client) => {
        try {
          await client.$disconnect()
        } catch (error) {
          console.error('Failed to disconnect pool client:', error)
        }
      })
    )
    this.connectionPool = []
  }

  /**
   * Get available connection from pool
   */
  getPoolConnection(): PrismaClient | undefined {
    return this.connectionPool.pop()
  }

  /**
   * Return connection to pool
   */
  returnPoolConnection(client: PrismaClient): void {
    this.connectionPool.push(client)
  }
}

// Singleton instance
export const testDatabaseManager = TestDatabaseManager.getInstance()

// Convenience functions for backward compatibility
export const initTestDatabase = async (useRealDatabase = false): Promise<PrismaClient> => {
  return testDatabaseManager.initialize(useRealDatabase)
}

export const cleanupTestDatabase = async (): Promise<void> => {
  return testDatabaseManager.cleanup()
}

export const seedTestDatabase = async (): Promise<any> => {
  return testDatabaseManager.seed()
}

export const resetTestDatabase = async (): Promise<void> => {
  return testDatabaseManager.reset()
}

export const disconnectTestDatabase = async (): Promise<void> => {
  return testDatabaseManager.disconnect()
}

export const getTestDatabaseClient = (): PrismaClient => {
  return testDatabaseManager.getClient()
}

// Transaction helpers
export const withTestTransaction = async <T>(
  testId: string,
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> => {
  return testDatabaseManager.withTransaction(testId, callback)
}

// Jest hooks for easy integration
export const useTestDatabase = (options: {
  seed?: boolean
  cleanup?: boolean
  transactions?: boolean
} = {}) => {
  const { seed = true, cleanup = true, transactions = false } = options

  beforeAll(async () => {
    await testDatabaseManager.initialize(true)
    if (seed) {
      await testDatabaseManager.seed()
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
    await testDatabaseManager.disconnect()
  })
}

// Transaction-based test isolation
export const useTransactionIsolation = () => {
  let testId: string

  beforeEach(() => {
    testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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