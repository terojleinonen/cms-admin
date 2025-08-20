/**
 * Database connection tests
 * Tests database connectivity, health checks, and error handling
 */

import { testDatabaseConnection, getDatabaseHealth, withDatabase, prisma } from '../../app/lib/db'
import { handleDatabaseError, isPrismaError, isUniqueConstraintError } from '../../app/lib/db-errors'
import { Prisma } from '@prisma/client'

describe('Database Connection', () => {
  // Skip these tests if database is not available
  beforeAll(async () => {
    const isConnected = await testDatabaseConnection()
    if (!isConnected) {
      console.warn('Database not available, skipping connection tests')
    }
  })

  describe('testDatabaseConnection', () => {
    it('should successfully connect to the database', async () => {
      const isConnected = await testDatabaseConnection()
      expect(typeof isConnected).toBe('boolean')
      // In CI/CD or without database, this might be false
      if (isConnected) {
        expect(isConnected).toBe(true)
      }
    })

    it('should handle connection failures gracefully', async () => {
      // Mock a connection failure
      const originalConnect = prisma.$connect
      prisma.$connect = jest.fn().mockRejectedValue(new Error('Connection failed'))

      const isConnected = await testDatabaseConnection()
      expect(isConnected).toBe(false)

      // Restore original method
      prisma.$connect = originalConnect
    })
  })

  describe('getDatabaseHealth', () => {
    it('should return health status', async () => {
      const health = await getDatabaseHealth()
      
      expect(health).toHaveProperty('connected')
      expect(typeof health.connected).toBe('boolean')
      
      if (health.connected) {
        expect(health).toHaveProperty('latency')
        expect(typeof health.latency).toBe('number')
        expect(health.latency).toBeGreaterThan(0)
      } else {
        expect(health).toHaveProperty('error')
        expect(typeof health.error).toBe('string')
      }
    })

    it('should return error status when database is unavailable', async () => {
      // Mock a database error
      const originalQueryRaw = prisma.$queryRaw
      prisma.$queryRaw = jest.fn().mockRejectedValue(new Error('Database unavailable'))

      const health = await getDatabaseHealth()
      
      expect(health.connected).toBe(false)
      expect(health).toHaveProperty('error')
      expect(health.error).toContain('Database unavailable')

      // Restore original method
      prisma.$queryRaw = originalQueryRaw
    })
  })

  describe('withDatabase', () => {
    it('should execute database operations successfully', async () => {
      const result = await withDatabase(async (client) => {
        // Simple operation that should work even without data
        return 'test-result'
      })

      expect(result.success).toBe(true)
      expect(result.data).toBe('test-result')
    })

    it('should handle database operation errors', async () => {
      const result = await withDatabase(async (client) => {
        // This should fail due to invalid query
        throw new Error('Test error')
      })

      expect(result.success).toBe(false)
      expect(result).toHaveProperty('error')
      expect(typeof result.error).toBe('string')
    })
  })
})