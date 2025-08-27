/**
 * Database Isolation Integration Test
 * Tests that database isolation works correctly in integration test environment
 * Enhanced with proper transaction management and error recovery
 */

import { 
  useIsolatedTestContext,
  IntegrationTestContext
} from '../helpers/integration-test-utils'
import { 
  executeWithRecovery,
  executeDatabaseOperation,
  executeTransaction,
  handleUniqueConstraint
} from '../helpers/error-recovery-utils'
import { withTransaction } from '../setup-integration'
import { 
  cleanDatabase,
  seedMinimalDatabase,
  verifyDatabaseClean
} from '../helpers/database-cleanup-utils'
import { createTestUser, createTestProduct, createTestCategory } from '../helpers/test-data-factory'

describe('Database Isolation Integration Tests', () => {
  const { getContext } = useIsolatedTestContext({
    isolationStrategy: 'transaction',
    seedData: false,
    cleanupAfterEach: true
  })

  describe('Basic CRUD Operations with Isolation', () => {
    it('should create and retrieve user data with proper isolation', async () => {
      const context = getContext()
      
      await executeWithRecovery(
        async () => {
          const userData = createTestUser({ 
            email: `isolation-user-${Date.now()}@test.com`,
            name: 'Isolation Test User'
          })
          
          // Create user with error handling
          const user = await handleUniqueConstraint(
            async () => await context.prisma.user.create({ data: userData }),
            async () => await context.prisma.user.findUnique({ where: { email: userData.email } }),
            'create-user-test'
          )
          
          expect(user.email).toBe(userData.email)
          expect(user.name).toBe('Isolation Test User')
          expect(user.id).toBeValidUUID()
          
          // Retrieve the user with database operation wrapper
          const foundUser = await executeDatabaseOperation(
            async (prisma) => {
              return await prisma.user.findUnique({
                where: { email: userData.email }
              })
            },
            'isolation-test',
            'retrieve-user'
          )
          
          expect(foundUser).toBeTruthy()
          expect(foundUser?.name).toBe('Isolation Test User')
        },
        {
          testName: 'basic-crud-isolation',
          operation: 'create-retrieve-user'
        }
      )
    })

    it('should handle relational data correctly with transaction isolation', async () => {
      const context = getContext()
      
      await executeTransaction(
        async (prisma) => {
          // Create user
          const user = await prisma.user.create({
            data: createTestUser({ 
              email: `product-creator-${Date.now()}@test.com`,
              name: 'Product Creator'
            })
          })
          
          // Create category
          const category = await prisma.category.create({
            data: createTestCategory({ 
              name: `Electronics-${Date.now()}`,
              slug: `electronics-${Date.now()}`
            })
          })
          
          // Create product with relations
          const product = await prisma.product.create({
            data: {
              ...createTestProduct({ 
                name: `Test Laptop ${Date.now()}`,
                slug: `test-laptop-${Date.now()}`,
                createdBy: user.id 
              }),
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
          
          expect(product.name).toContain('Test Laptop')
          expect(product.creator.email).toBe(user.email)
          expect(product.categories).toHaveLength(1)
          expect(product.categories[0].category.name).toContain('Electronics')
          
          return { user, category, product }
        },
        'relational-data-test',
        'create-related-entities'
      )
    })

    it('should isolate data between tests with proper cleanup verification', async () => {
      const context = getContext()
      
      await executeWithRecovery(
        async () => {
          // Verify database is clean at start of test
          const isClean = await verifyDatabaseClean(context.prisma)
          expect(isClean).toBe(true)
          
          // Create new data for this test
          const userData = createTestUser({ 
            email: `isolated-user-${Date.now()}@test.com`,
            name: 'Isolated Test User'
          })
          
          const user = await context.prisma.user.create({ data: userData })
          
          // Verify data exists in current transaction
          const users = await context.prisma.user.findMany()
          expect(users).toHaveLength(1)
          expect(users[0].email).toBe(userData.email)
          expect(users[0].id).toBe(user.id)
        },
        {
          testName: 'data-isolation',
          operation: 'verify-test-isolation'
        }
      )
    })
  })

  describe('Transaction-based Isolation', () => {
    it('should rollback transaction on error', async () => {
      const { getTestDatabase } = require('../setup-integration')
      const prisma = getTestDatabase()
      
      try {
        await withTransaction(async (tx) => {
          // Create user within transaction
          await tx.user.create({
            data: createTestUser({ email: 'transaction-user@test.com' })
          })
          
          // Verify user exists within transaction
          const user = await tx.user.findUnique({
            where: { email: 'transaction-user@test.com' }
          })
          expect(user).toBeTruthy()
          
          // Throw error to trigger rollback
          throw new Error('Test transaction rollback')
        })
      } catch (error) {
        expect(error.message).toBe('Test transaction rollback')
      }
      
      // User should not exist outside transaction
      const user = await prisma.user.findUnique({
        where: { email: 'transaction-user@test.com' }
      })
      expect(user).toBeNull()
    })

    it('should commit transaction on success', async () => {
      const { getTestDatabase } = require('../setup-integration')
      const prisma = getTestDatabase()
      
      await withTransaction(async (tx) => {
        // Create user within transaction
        const user = await tx.user.create({
          data: createTestUser({ email: 'committed-user@test.com' })
        })
        
        expect(user.email).toBe('committed-user@test.com')
        return user
      })
      
      // User should exist after successful transaction
      const user = await prisma.user.findUnique({
        where: { email: 'committed-user@test.com' }
      })
      expect(user).toBeTruthy()
      expect(user?.email).toBe('committed-user@test.com')
    })

    it('should handle nested transactions', async () => {
      const { getTestDatabase } = require('../setup-integration')
      const prisma = getTestDatabase()
      
      await withTransaction(async (tx) => {
        // Create user in outer transaction
        const user = await tx.user.create({
          data: createTestUser({ email: 'outer-user@test.com' })
        })
        
        // Create category in nested operation
        const category = await tx.category.create({
          data: createTestCategory({ name: 'Nested Category', slug: 'nested-category' })
        })
        
        // Create product linking both
        const product = await tx.product.create({
          data: {
            ...createTestProduct({ 
              name: 'Nested Product',
              slug: 'nested-product',
              createdBy: user.id 
            }),
            categories: {
              create: {
                categoryId: category.id
              }
            }
          }
        })
        
        expect(product.name).toBe('Nested Product')
      })
      
      // All data should be committed
      const user = await prisma.user.findUnique({
        where: { email: 'outer-user@test.com' }
      })
      const category = await prisma.category.findUnique({
        where: { slug: 'nested-category' }
      })
      const product = await prisma.product.findUnique({
        where: { slug: 'nested-product' }
      })
      
      expect(user).toBeTruthy()
      expect(category).toBeTruthy()
      expect(product).toBeTruthy()
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent database operations', async () => {
      const { getTestDatabase } = require('../setup-integration')
      const prisma = getTestDatabase()
      
      // Create multiple users concurrently
      const userPromises = Array.from({ length: 5 }, (_, index) =>
        prisma.user.create({
          data: createTestUser({ email: `concurrent-${index}@test.com` })
        })
      )
      
      const users = await Promise.all(userPromises)
      
      expect(users).toHaveLength(5)
      users.forEach((user, index) => {
        expect(user.email).toBe(`concurrent-${index}@test.com`)
        expect(user.id).toBeValidUUID()
      })
      
      // Verify all users exist in database
      const allUsers = await prisma.user.findMany({
        where: {
          email: {
            startsWith: 'concurrent-'
          }
        }
      })
      
      expect(allUsers).toHaveLength(5)
    })

    it('should handle concurrent transactions', async () => {
      const transactionPromises = Array.from({ length: 3 }, (_, index) =>
        withTransaction(async (tx) => {
          const user = await tx.user.create({
            data: createTestUser({ email: `tx-user-${index}@test.com` })
          })
          
          // Simulate some work
          await new Promise(resolve => setTimeout(resolve, 10))
          
          return user
        })
      )
      
      const results = await Promise.all(transactionPromises)
      
      expect(results).toHaveLength(3)
      results.forEach((user, index) => {
        expect(user.email).toBe(`tx-user-${index}@test.com`)
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle unique constraint violations', async () => {
      const { getTestDatabase } = require('../setup-integration')
      const prisma = getTestDatabase()
      
      const userData = createTestUser({ email: 'unique-test@test.com' })
      
      // Create first user
      await prisma.user.create({ data: userData })
      
      // Try to create duplicate - should fail
      await expect(
        prisma.user.create({ data: userData })
      ).rejects.toThrow()
      
      // Should still have only one user
      const users = await prisma.user.findMany({
        where: { email: 'unique-test@test.com' }
      })
      expect(users).toHaveLength(1)
    })

    it('should recover from database errors', async () => {
      const { getTestDatabase } = require('../setup-integration')
      const prisma = getTestDatabase()
      
      // Try invalid operation
      await expect(
        prisma.user.create({
          data: {
            // Missing required fields
            email: 'invalid@test.com'
            // Missing name, passwordHash, etc.
          } as any
        })
      ).rejects.toThrow()
      
      // Should still be able to perform valid operations
      const user = await prisma.user.create({
        data: createTestUser({ email: 'recovery-test@test.com' })
      })
      
      expect(user.email).toBe('recovery-test@test.com')
    })
  })
})