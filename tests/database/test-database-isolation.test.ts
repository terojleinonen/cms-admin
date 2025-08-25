/**
 * Test Database Isolation Strategy Tests
 * Validates that the database isolation strategy works correctly
 */

import { PrismaClient } from '@prisma/client'
import { checkTestDatabaseConnection } from '../helpers/test-database-config'

describe('Test Database Isolation Strategy', () => {
  let testPrisma: PrismaClient

  beforeAll(async () => {
    // Initialize test database connection
    const testDatabaseUrl = process.env.DATABASE_URL?.replace('kin_workspace_cms', 'kin_workspace_cms_test') || 
                           'postgresql://cms_user:secure_password@localhost:5432/kin_workspace_cms_test'
    
    testPrisma = new PrismaClient({
      datasources: {
        db: { url: testDatabaseUrl }
      }
    })
    
    await testPrisma.$connect()
  })

  afterAll(async () => {
    if (testPrisma) {
      await testPrisma.$disconnect()
    }
  })

  beforeEach(async () => {
    // Clean up data between tests
    await testPrisma.productMedia.deleteMany()
    await testPrisma.productCategory.deleteMany()
    await testPrisma.product.deleteMany()
    await testPrisma.category.deleteMany()
    await testPrisma.user.deleteMany()
  })

  describe('Database Connection Management', () => {
    it('should connect to test database not production', async () => {
      const isConnected = await checkTestDatabaseConnection()
      expect(isConnected).toBe(true)
    })

    it('should be able to perform basic operations', async () => {
      // Test basic database operations
      const result = await testPrisma.$queryRaw`SELECT 1 as test`
      expect(result).toEqual([{ test: 1 }])
    })
  })

  describe('Transaction Isolation', () => {
    it('should create isolated transactions', async () => {
      await testPrisma.$transaction(async (tx) => {
        // Create test data within transaction
        const user = await tx.user.create({
          data: {
            email: 'transaction-test@example.com',
            name: 'Transaction Test User',
            passwordHash: 'test-hash',
            role: 'EDITOR'
          }
        })
        
        expect(user.email).toBe('transaction-test@example.com')
        
        // Data should exist within transaction
        const foundUser = await tx.user.findUnique({
          where: { email: 'transaction-test@example.com' }
        })
        expect(foundUser).toBeTruthy()
      })
      
      // Data should exist after successful transaction
      const foundUser = await testPrisma.user.findUnique({
        where: { email: 'transaction-test@example.com' }
      })
      expect(foundUser).toBeTruthy()
    })

    it('should handle transaction rollback on error', async () => {
      try {
        await testPrisma.$transaction(async (tx) => {
          // Create test data
          await tx.user.create({
            data: {
              email: 'error-test@example.com',
              name: 'Error Test User',
              passwordHash: 'test-hash',
              role: 'EDITOR'
            }
          })
          
          // Throw error to trigger rollback
          throw new Error('Test error')
        })
      } catch (error) {
        expect(error.message).toBe('Test error')
      }
      
      // Data should not exist due to rollback
      const foundUser = await testPrisma.user.findUnique({
        where: { email: 'error-test@example.com' }
      })
      expect(foundUser).toBeNull()
    })

    it('should support multiple concurrent transactions', async () => {
      const promises = Array.from({ length: 3 }, (_, index) => 
        testPrisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: `concurrent-${index}@example.com`,
              name: `Concurrent User ${index}`,
              passwordHash: 'test-hash',
              role: 'EDITOR'
            }
          })
          
          // Simulate some work
          await new Promise(resolve => setTimeout(resolve, 10))
          
          return user
        })
      )
      
      const results = await Promise.all(promises)
      expect(results).toHaveLength(3)
      
      // All transactions should have committed
      for (let i = 0; i < 3; i++) {
        const foundUser = await testPrisma.user.findUnique({
          where: { email: `concurrent-${i}@example.com` }
        })
        expect(foundUser).toBeTruthy()
      }
    })
  })

  describe('Data Cleanup and Seeding', () => {
    it('should clean up test data between tests', async () => {
      // Create test data
      await testPrisma.user.create({
        data: {
          email: 'cleanup-test@example.com',
          name: 'Cleanup Test User',
          passwordHash: 'test-hash',
          role: 'EDITOR'
        }
      })
      
      // Verify data exists
      let foundUser = await testPrisma.user.findUnique({
        where: { email: 'cleanup-test@example.com' }
      })
      expect(foundUser).toBeTruthy()
    })

    it('should have clean state from previous test', async () => {
      // This test should not see data from previous test due to beforeEach cleanup
      const foundUser = await testPrisma.user.findUnique({
        where: { email: 'cleanup-test@example.com' }
      })
      expect(foundUser).toBeNull()
    })

    it('should handle bulk data operations', async () => {
      // Create multiple users
      const users = await Promise.all([
        testPrisma.user.create({
          data: {
            email: 'bulk1@example.com',
            name: 'Bulk User 1',
            passwordHash: 'test-hash',
            role: 'EDITOR'
          }
        }),
        testPrisma.user.create({
          data: {
            email: 'bulk2@example.com',
            name: 'Bulk User 2',
            passwordHash: 'test-hash',
            role: 'ADMIN'
          }
        })
      ])
      
      expect(users).toHaveLength(2)
      
      // Verify all users exist
      const allUsers = await testPrisma.user.findMany()
      expect(allUsers).toHaveLength(2)
    })
  })

  describe('Test Isolation Between Tests', () => {
    it('should isolate data between test runs - test 1', async () => {
      await testPrisma.user.create({
        data: {
          email: 'isolation-test-1@example.com',
          name: 'Isolation Test 1',
          passwordHash: 'test-hash',
          role: 'EDITOR'
        }
      })
      
      const user = await testPrisma.user.findUnique({
        where: { email: 'isolation-test-1@example.com' }
      })
      expect(user).toBeTruthy()
    })

    it('should isolate data between test runs - test 2', async () => {
      // Data from previous test should not exist due to cleanup
      const user = await testPrisma.user.findUnique({
        where: { email: 'isolation-test-1@example.com' }
      })
      expect(user).toBeNull()
      
      // Create new data for this test
      await testPrisma.user.create({
        data: {
          email: 'isolation-test-2@example.com',
          name: 'Isolation Test 2',
          passwordHash: 'test-hash',
          role: 'EDITOR'
        }
      })
      
      const newUser = await testPrisma.user.findUnique({
        where: { email: 'isolation-test-2@example.com' }
      })
      expect(newUser).toBeTruthy()
    })
  })

  describe('Complex Data Operations', () => {
    it('should handle complex relational data', async () => {
      // Create user
      const user = await testPrisma.user.create({
        data: {
          email: 'complex-test@example.com',
          name: 'Complex Test User',
          passwordHash: 'test-hash',
          role: 'ADMIN'
        }
      })
      
      // Create category
      const category = await testPrisma.category.create({
        data: {
          name: 'Test Category',
          slug: 'test-category'
        }
      })
      
      // Create product with relations
      const product = await testPrisma.product.create({
        data: {
          name: 'Test Product',
          slug: 'test-product',
          price: 99.99,
          createdBy: user.id,
          categories: {
            create: {
              categoryId: category.id
            }
          }
        },
        include: {
          categories: {
            include: {
              category: true
            }
          },
          creator: true
        }
      })
      
      expect(product.name).toBe('Test Product')
      expect(product.creator.email).toBe('complex-test@example.com')
      expect(product.categories).toHaveLength(1)
      expect(product.categories[0].category.name).toBe('Test Category')
    })

    it('should handle unique constraint violations gracefully', async () => {
      const userData = {
        email: 'unique-test@example.com',
        name: 'Unique Test User',
        passwordHash: 'test-hash',
        role: 'EDITOR' as const
      }
      
      // Create first user
      await testPrisma.user.create({ data: userData })
      
      // Try to create duplicate - should fail
      await expect(
        testPrisma.user.create({ data: userData })
      ).rejects.toThrow()
      
      // Should still have only one user
      const users = await testPrisma.user.findMany({
        where: { email: 'unique-test@example.com' }
      })
      expect(users).toHaveLength(1)
    })
  })

  describe('Performance and Connection Pooling', () => {
    it('should handle multiple concurrent database operations', async () => {
      const operations = Array.from({ length: 10 }, (_, index) => 
        testPrisma.user.create({
          data: {
            email: `concurrent-${index}@example.com`,
            name: `Concurrent User ${index}`,
            passwordHash: 'test-hash',
            role: 'EDITOR'
          }
        })
      )
      
      const startTime = Date.now()
      const results = await Promise.all(operations)
      const endTime = Date.now()
      
      expect(results).toHaveLength(10)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
      
      // Verify all users were created
      const users = await testPrisma.user.findMany({
        where: {
          email: {
            startsWith: 'concurrent-'
          }
        }
      })
      expect(users).toHaveLength(10)
    })

    it('should maintain connection stability under load', async () => {
      // Perform many operations to test connection stability
      for (let i = 0; i < 20; i++) {
        await testPrisma.user.create({
          data: {
            email: `load-test-${i}@example.com`,
            name: `Load Test User ${i}`,
            passwordHash: 'test-hash',
            role: 'EDITOR'
          }
        })
        
        if (i % 5 === 0) {
          // Check connection health periodically
          const result = await testPrisma.$queryRaw`SELECT 1 as health`
          expect(result).toEqual([{ health: 1 }])
        }
      }
      
      // Final health check
      const finalResult = await testPrisma.$queryRaw`SELECT COUNT(*) as count FROM users`
      expect(finalResult[0].count).toBeGreaterThan(0)
    })
  })
})