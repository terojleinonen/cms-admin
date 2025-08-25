/**
 * Database Isolation Integration Test
 * Tests that database isolation works correctly in integration test environment
 */

import { useIntegrationDatabase, withTransaction } from '../setup-integration'
import { createTestUser, createTestProduct, createTestCategory } from '../helpers/test-data-factory'

describe('Database Isolation Integration Tests', () => {
  // Use integration database with cleanup between tests
  useIntegrationDatabase({ seed: false, cleanup: true })

  describe('Basic CRUD Operations with Isolation', () => {
    it('should create and retrieve user data', async () => {
      const { getTestDatabase } = require('../setup-integration')
      const prisma = getTestDatabase()
      
      const userData = createTestUser({ 
        email: 'integration-user@test.com',
        name: 'Integration Test User'
      })
      
      const user = await prisma.user.create({ data: userData })
      
      expect(user.email).toBe('integration-user@test.com')
      expect(user.name).toBe('Integration Test User')
      expect(user.id).toBeValidUUID()
      
      // Retrieve the user
      const foundUser = await prisma.user.findUnique({
        where: { email: 'integration-user@test.com' }
      })
      
      expect(foundUser).toBeTruthy()
      expect(foundUser?.name).toBe('Integration Test User')
    })

    it('should handle relational data correctly', async () => {
      const { getTestDatabase } = require('../setup-integration')
      const prisma = getTestDatabase()
      
      // Create user
      const user = await prisma.user.create({
        data: createTestUser({ email: 'product-creator@test.com' })
      })
      
      // Create category
      const category = await prisma.category.create({
        data: createTestCategory({ name: 'Electronics', slug: 'electronics' })
      })
      
      // Create product with relations
      const product = await prisma.product.create({
        data: {
          ...createTestProduct({ 
            name: 'Test Laptop',
            slug: 'test-laptop',
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
      
      expect(product.name).toBe('Test Laptop')
      expect(product.creator.email).toBe('product-creator@test.com')
      expect(product.categories).toHaveLength(1)
      expect(product.categories[0].category.name).toBe('Electronics')
    })

    it('should isolate data between tests', async () => {
      const { getTestDatabase } = require('../setup-integration')
      const prisma = getTestDatabase()
      
      // This test should not see data from previous tests due to cleanup
      const users = await prisma.user.findMany()
      expect(users).toHaveLength(0)
      
      // Create new data for this test
      await prisma.user.create({
        data: createTestUser({ email: 'isolated-user@test.com' })
      })
      
      const newUsers = await prisma.user.findMany()
      expect(newUsers).toHaveLength(1)
      expect(newUsers[0].email).toBe('isolated-user@test.com')
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