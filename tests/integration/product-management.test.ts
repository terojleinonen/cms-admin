/**
 * Product Management Integration Tests
 * Tests the complete product lifecycle from creation to deletion
 * Enhanced with proper error handling, recovery, and isolation
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { UserRole } from '@prisma/client'
import { POST as createProduct, GET as getProducts } from '../../app/api/products/route'
import { GET as getProduct, PUT as updateProduct, DELETE as deleteProduct } from '../../app/api/products/[id]/route'
import { POST as createCategory } from '../../app/api/categories/route'
import { 
  useIsolatedTestContext,
  createAPITester,
  APIWorkflowTester
} from '../helpers/integration-test-utils'
import { 
  executeWithRecovery,
  executeDatabaseOperation,
  handleUniqueConstraint
} from '../helpers/error-recovery-utils'

// Mock next-auth
jest.mock('next-auth')
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('Product Management Integration', () => {
  const { getContext } = useIsolatedTestContext({
    isolationStrategy: 'transaction',
    seedData: true,
    cleanupAfterEach: true
  })

  let apiTester: APIWorkflowTester
  let testUserId: string
  let testCategoryId: string

  beforeAll(async () => {
    // Create test user for authentication
    const context = getContext()
    const testUser = await executeDatabaseOperation(
      async (prisma) => {
        return await prisma.user.create({
          data: {
            name: 'Test Admin',
            email: `admin-${Date.now()}@integration-test.com`,
            role: UserRole.ADMIN,
            isActive: true,
            passwordHash: 'hashed_password',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      },
      'product-management-setup',
      'create-test-user'
    )
    testUserId = testUser.id

    // Mock admin session for all tests
    mockGetServerSession.mockResolvedValue({
      user: { 
        id: testUserId, 
        role: UserRole.ADMIN, 
        name: 'Test Admin', 
        email: testUser.email 
      }
    } as any)
  })

  beforeEach(async () => {
    const context = getContext()
    apiTester = createAPITester(context)

    // Create test category for each test with proper error handling
    const categoryData = {
      name: `Integration Test Category ${Date.now()}`,
      slug: `integration-test-category-${Date.now()}`,
      description: 'Category for integration testing'
    }

    const category = await handleUniqueConstraint(
      async () => {
        const categoryRequest = apiTester.createRequest('/api/categories', {
          method: 'POST',
          body: JSON.stringify(categoryData)
        })

        const categoryResponse = await createCategory(categoryRequest)
        const categoryResult = await categoryResponse.json()
        return categoryResult.category
      },
      async () => {
        // Fallback: find existing category
        return await context.prisma.category.findUnique({
          where: { slug: categoryData.slug }
        })
      },
      'product-management-setup'
    )

    testCategoryId = category.id
  })

  it('should complete full product lifecycle with enhanced error handling', async () => {
    await executeWithRecovery(
      async () => {
        // Test complete product CRUD workflow
        const productData = {
          name: `Integration Test Product ${Date.now()}`,
          slug: `integration-test-product-${Date.now()}`,
          description: 'A product for integration testing',
          shortDescription: 'Test product',
          price: 99.99,
          comparePrice: 129.99,
          sku: `INT-TEST-${Date.now()}`,
          status: 'PUBLISHED',
          categoryIds: [testCategoryId],
          tags: ['test', 'integration']
        }

        const updateData = {
          name: `Updated Integration Test Product ${Date.now()}`,
          price: 149.99,
          status: 'DRAFT'
        }

        const { entity: product, entityId } = await apiTester.testCRUDWorkflow(
          'product',
          '/api/products',
          productData,
          updateData,
          {
            create: createProduct,
            read: getProduct,
            update: updateProduct,
            delete: deleteProduct,
            list: getProducts
          }
        )

        // Verify product relationships were maintained
        const context = getContext()
        const dbProduct = await executeDatabaseOperation(
          async (prisma) => {
            return await prisma.product.findUnique({
              where: { id: entityId },
              include: { 
                categories: {
                  include: {
                    category: true
                  }
                }
              }
            })
          },
          'product-lifecycle-test',
          'verify-product-relationships'
        )

        // Product should be deleted, so dbProduct should be null
        expect(dbProduct).toBeNull()
      },
      {
        testName: 'product-lifecycle',
        operation: 'complete-crud-workflow'
      },
      {
        maxRetries: 3,
        retryDelay: 500
      }
    )
  })

  it('should handle product search and filtering with proper isolation', async () => {
    const context = getContext()
    
    await executeWithRecovery(
      async () => {
        const timestamp = Date.now()
        
        // Create multiple test products with unique identifiers
        const products = [
          {
            name: `Integration Test Chair ${timestamp}`,
            slug: `integration-test-chair-${timestamp}`,
            description: 'A comfortable chair for testing',
            price: 199.99,
            status: 'PUBLISHED',
            categoryIds: [testCategoryId],
            tags: ['furniture', 'chair'],
            sku: `CHAIR-${timestamp}`
          },
          {
            name: `Integration Test Desk ${timestamp}`,
            slug: `integration-test-desk-${timestamp}`,
            description: 'A sturdy desk for testing',
            price: 299.99,
            status: 'PUBLISHED',
            categoryIds: [testCategoryId],
            tags: ['furniture', 'desk'],
            sku: `DESK-${timestamp}`
          },
          {
            name: `Integration Test Lamp ${timestamp}`,
            slug: `integration-test-lamp-${timestamp}`,
            description: 'A bright lamp for testing',
            price: 79.99,
            status: 'DRAFT',
            categoryIds: [testCategoryId],
            tags: ['lighting', 'lamp'],
            sku: `LAMP-${timestamp}`
          }
        ]

        // Create all products with error handling
        const createdProducts = []
        for (const productData of products) {
          const product = await handleUniqueConstraint(
            async () => {
              const request = apiTester.createRequest('/api/products', {
                method: 'POST',
                body: JSON.stringify(productData)
              })
              const response = await createProduct(request)
              const result = await response.json()
              return result.product
            },
            async () => {
              // Fallback: find existing product
              return await context.prisma.product.findUnique({
                where: { slug: productData.slug }
              })
            },
            'product-search-test'
          )
          createdProducts.push(product)
        }

        // Test search functionality
        const searchRequest = apiTester.createRequest('/api/products', {}, { search: 'Chair' })
        const searchResponse = await getProducts(searchRequest)
        const searchData = await searchResponse.json()

        expect(searchResponse.status).toBe(200)
        expect(searchData.products.length).toBeGreaterThanOrEqual(1)
        
        const chairProduct = searchData.products.find((p: any) => p.name.includes('Chair'))
        expect(chairProduct).toBeTruthy()

        // Test status filtering
        const statusRequest = apiTester.createRequest('/api/products', {}, { status: 'PUBLISHED' })
        const statusResponse = await getProducts(statusRequest)
        const statusData = await statusResponse.json()

        expect(statusResponse.status).toBe(200)
        const publishedProducts = statusData.products.filter((p: any) => 
          p.name.includes(`${timestamp}`)
        )
        expect(publishedProducts.length).toBeGreaterThanOrEqual(2)

        // Test category filtering
        const categoryRequest = apiTester.createRequest('/api/products', {}, { 
          categoryId: testCategoryId 
        })
        const categoryResponse = await getProducts(categoryRequest)
        const categoryData = await categoryResponse.json()

        expect(categoryResponse.status).toBe(200)
        const categoryProducts = categoryData.products.filter((p: any) => 
          p.name.includes(`${timestamp}`)
        )
        expect(categoryProducts.length).toBeGreaterThanOrEqual(3)
      },
      {
        testName: 'product-search-filtering',
        operation: 'test-search-and-filters'
      },
      {
        maxRetries: 3,
        retryDelay: 300
      }
    )
  })

  it('should validate product data integrity with proper error handling', async () => {
    await executeWithRecovery(
      async () => {
        // Test validation error handling
        await apiTester.testErrorHandling({
          create: createProduct,
          read: getProduct
        })

        // Test duplicate slug handling with unique constraint recovery
        const timestamp = Date.now()
        const duplicateSlug = `duplicate-slug-test-${timestamp}`
        
        const firstProduct = {
          name: 'First Product',
          slug: duplicateSlug,
          price: 99.99,
          status: 'PUBLISHED',
          sku: `FIRST-${timestamp}`
        }

        // Create first product
        const firstRequest = apiTester.createRequest('/api/products', {
          method: 'POST',
          body: JSON.stringify(firstProduct)
        })

        const firstResponse = await createProduct(firstRequest)
        expect(firstResponse.status).toBe(201)

        // Try to create second product with same slug
        const secondProduct = {
          name: 'Second Product',
          slug: duplicateSlug, // Same slug
          price: 149.99,
          status: 'PUBLISHED',
          sku: `SECOND-${timestamp}`
        }

        const secondRequest = apiTester.createRequest('/api/products', {
          method: 'POST',
          body: JSON.stringify(secondProduct)
        })

        const secondResponse = await createProduct(secondRequest)
        const secondData = await secondResponse.json()

        expect(secondResponse.status).toBe(409)
        expect(secondData.error).toBeDefined()
        expect(secondData.error.code).toBe('DUPLICATE_ENTRY')
      },
      {
        testName: 'product-validation',
        operation: 'test-data-integrity'
      }
    )
  })

  it('should handle concurrent product operations', async () => {
    await executeWithRecovery(
      async () => {
        // Test concurrent product creation
        await apiTester.testConcurrentOperations({
          create: createProduct,
          list: getProducts
        })
      },
      {
        testName: 'concurrent-products',
        operation: 'test-concurrent-operations'
      },
      {
        maxRetries: 5,
        retryDelay: 400
      }
    )
  })

  it('should test complete product workflow with relationships', async () => {
    await executeWithRecovery(
      async () => {
        // Test product workflow with category relationships
        const { product, category } = await apiTester.testProductWorkflow({
          createCategory: createCategory,
          createProduct: createProduct,
          getProduct: getProduct,
          updateProduct: updateProduct,
          deleteProduct: deleteProduct,
          listProducts: getProducts
        })

        expect(product).toBeDefined()
        expect(category).toBeDefined()
        expect(product.name).toContain('Updated API Test Product')
      },
      {
        testName: 'product-workflow',
        operation: 'test-complete-workflow'
      }
    )
  })
})