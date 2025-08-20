/**
 * Admin Dashboard End-to-End Tests
 * Tests critical user workflows through the admin interface
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { UserRole } from '@prisma/client'
import { GET as getDashboard } from '../../app/api/analytics/dashboard/route'
import { GET as getUsers } from '../../app/api/users/route'
import { GET as getProducts } from '../../app/api/products/route'
import { GET as getCategories } from '../../app/api/categories/route'
import { prisma } from '../../app/lib/db'
import { initTestDatabase, cleanupTestDatabase } from '../setup'

// Mock next-auth
jest.mock('next-auth')
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('Admin Dashboard E2E', () => {
  let adminUserId: string
  let editorUserId: string

  beforeAll(async () => {
    await initTestDatabase()
    
    // Create test admin user
    const adminUser = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: 'admin@e2e-test.com',
        role: UserRole.ADMIN,
        isActive: true,
        passwordHash: 'hashed_password'
      }
    })
    adminUserId = adminUser.id

    // Create test editor user
    const editorUser = await prisma.user.create({
      data: {
        name: 'Test Editor',
        email: 'editor@e2e-test.com',
        role: UserRole.EDITOR,
        isActive: true,
        passwordHash: 'hashed_password'
      }
    })
    editorUserId = editorUser.id
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    // Clean up test data
    await prisma.product.deleteMany({
      where: {
        name: {
          contains: 'E2E Test'
        }
      }
    })

    await prisma.category.deleteMany({
      where: {
        name: {
          contains: 'E2E Test'
        }
      }
    })
  })

  describe('Admin User Workflow', () => {
    beforeEach(() => {
      // Mock admin session
      mockGetServerSession.mockResolvedValue({
        user: { 
          id: adminUserId, 
          role: UserRole.ADMIN, 
          name: 'Test Admin', 
          email: 'admin@e2e-test.com' 
        }
      } as any)
    })

    it('should complete admin dashboard workflow', async () => {
      // Step 1: Access dashboard analytics
      const dashboardRequest = new NextRequest('http://localhost/api/analytics/dashboard')
      const dashboardResponse = await getDashboard(dashboardRequest)
      const dashboardData = await dashboardResponse.json()

      expect(dashboardResponse.status).toBe(200)
      expect(dashboardData.metrics).toBeDefined()
      expect(dashboardData.metrics.totalProducts).toBeDefined()
      expect(dashboardData.metrics.totalCategories).toBeDefined()
      expect(dashboardData.metrics.totalUsers).toBeDefined()
      expect(dashboardData.metrics.totalMedia).toBeDefined()

      // Step 2: Access user management
      const usersRequest = new NextRequest('http://localhost/api/users')
      const usersResponse = await getUsers(usersRequest)
      const usersData = await usersResponse.json()

      expect(usersResponse.status).toBe(200)
      expect(usersData.users).toBeDefined()
      expect(usersData.users.length).toBeGreaterThanOrEqual(2) // Admin + Editor
      expect(usersData.pagination).toBeDefined()

      // Verify admin can see all users
      const adminUser = usersData.users.find((u: any) => u.id === adminUserId)
      const editorUser = usersData.users.find((u: any) => u.id === editorUserId)
      expect(adminUser).toBeTruthy()
      expect(editorUser).toBeTruthy()

      // Step 3: Access product management
      const productsRequest = new NextRequest('http://localhost/api/products')
      const productsResponse = await getProducts(productsRequest)
      const productsData = await productsResponse.json()

      expect(productsResponse.status).toBe(200)
      expect(productsData.products).toBeDefined()
      expect(productsData.pagination).toBeDefined()

      // Step 4: Access category management
      const categoriesRequest = new NextRequest('http://localhost/api/categories')
      const categoriesResponse = await getCategories(categoriesRequest)
      const categoriesData = await categoriesResponse.json()

      expect(categoriesResponse.status).toBe(200)
      expect(categoriesData.categories).toBeDefined()
    })

    it('should handle admin-only operations', async () => {
      // Test user creation (admin-only)
      const createUserRequest = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'E2E Test User',
          email: 'e2e-test-user@example.com',
          password: 'SecurePassword123!',
          role: 'EDITOR'
        })
      })

      // Import the POST handler
      const { POST: createUser } = await import('../../app/api/users/route')
      const createUserResponse = await createUser(createUserRequest)
      const createUserData = await createUserResponse.json()

      expect(createUserResponse.status).toBe(201)
      expect(createUserData.user.name).toBe('E2E Test User')
      expect(createUserData.user.role).toBe('EDITOR')

      // Test user role modification (admin-only)
      const updateUserRequest = new NextRequest(`http://localhost/api/users/${createUserData.user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          role: 'VIEWER'
        })
      })

      const { PUT: updateUser } = await import('../../app/api/users/[id]/route')
      const updateUserResponse = await updateUser(updateUserRequest, { 
        params: { id: createUserData.user.id } 
      })
      const updateUserData = await updateUserResponse.json()

      expect(updateUserResponse.status).toBe(200)
      expect(updateUserData.user.role).toBe('VIEWER')

      // Test user deletion (admin-only)
      const deleteUserRequest = new NextRequest(`http://localhost/api/users/${createUserData.user.id}`)
      const { DELETE: deleteUser } = await import('../../app/api/users/[id]/route')
      const deleteUserResponse = await deleteUser(deleteUserRequest, { 
        params: { id: createUserData.user.id } 
      })

      expect(deleteUserResponse.status).toBe(200)
    })
  })

  describe('Editor User Workflow', () => {
    beforeEach(() => {
      // Mock editor session
      mockGetServerSession.mockResolvedValue({
        user: { 
          id: editorUserId, 
          role: UserRole.EDITOR, 
          name: 'Test Editor', 
          email: 'editor@e2e-test.com' 
        }
      } as any)
    })

    it('should complete editor content management workflow', async () => {
      // Step 1: Create a category
      const categoryData = {
        name: 'E2E Test Category',
        slug: 'e2e-test-category',
        description: 'Category created during E2E testing'
      }

      const { POST: createCategory } = await import('../../app/api/categories/route')
      const createCategoryRequest = new NextRequest('http://localhost/api/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData)
      })

      const createCategoryResponse = await createCategory(createCategoryRequest)
      const createCategoryData = await createCategoryResponse.json()

      expect(createCategoryResponse.status).toBe(201)
      expect(createCategoryData.category.name).toBe(categoryData.name)

      const categoryId = createCategoryData.category.id

      // Step 2: Create a product in the category
      const productData = {
        name: 'E2E Test Product',
        slug: 'e2e-test-product',
        description: 'Product created during E2E testing',
        shortDescription: 'E2E test product',
        price: 199.99,
        sku: 'E2E-TEST-001',
        status: 'DRAFT',
        categoryIds: [categoryId],
        tags: ['e2e', 'test']
      }

      const { POST: createProduct } = await import('../../app/api/products/route')
      const createProductRequest = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify(productData)
      })

      const createProductResponse = await createProduct(createProductRequest)
      const createProductData = await createProductResponse.json()

      expect(createProductResponse.status).toBe(201)
      expect(createProductData.product.name).toBe(productData.name)
      expect(createProductData.product.status).toBe('DRAFT')

      const productId = createProductData.product.id

      // Step 3: Update product to published status
      const updateProductRequest = new NextRequest(`http://localhost/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'PUBLISHED'
        })
      })

      const { PUT: updateProduct } = await import('../../app/api/products/[id]/route')
      const updateProductResponse = await updateProduct(updateProductRequest, { 
        params: { id: productId } 
      })
      const updateProductData = await updateProductResponse.json()

      expect(updateProductResponse.status).toBe(200)
      expect(updateProductData.product.status).toBe('PUBLISHED')

      // Step 4: Verify product appears in published products list
      const publishedProductsRequest = new NextRequest('http://localhost/api/products?status=PUBLISHED')
      const publishedProductsResponse = await getProducts(publishedProductsRequest)
      const publishedProductsData = await publishedProductsResponse.json()

      expect(publishedProductsResponse.status).toBe(200)
      const publishedProduct = publishedProductsData.products.find((p: any) => p.id === productId)
      expect(publishedProduct).toBeTruthy()
      expect(publishedProduct.status).toBe('PUBLISHED')
    })

    it('should be restricted from admin-only operations', async () => {
      // Test that editor cannot access user management
      const usersRequest = new NextRequest('http://localhost/api/users')
      const usersResponse = await getUsers(usersRequest)
      const usersData = await usersResponse.json()

      expect(usersResponse.status).toBe(403)
      expect(usersData.error.code).toBe('FORBIDDEN')

      // Test that editor cannot create users
      const createUserRequest = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Unauthorized User',
          email: 'unauthorized@example.com',
          password: 'password123',
          role: 'EDITOR'
        })
      })

      const { POST: createUser } = await import('../../app/api/users/route')
      const createUserResponse = await createUser(createUserRequest)
      const createUserData = await createUserResponse.json()

      expect(createUserResponse.status).toBe(403)
      expect(createUserData.error.code).toBe('FORBIDDEN')
    })
  })

  describe('Cross-Role Data Consistency', () => {
    it('should maintain data consistency across different user roles', async () => {
      // Create data as admin
      mockGetServerSession.mockResolvedValue({
        user: { 
          id: adminUserId, 
          role: UserRole.ADMIN, 
          name: 'Test Admin', 
          email: 'admin@e2e-test.com' 
        }
      } as any)

      const categoryData = {
        name: 'E2E Consistency Test Category',
        slug: 'e2e-consistency-test-category',
        description: 'Category for testing data consistency'
      }

      const { POST: createCategory } = await import('../../app/api/categories/route')
      const createCategoryRequest = new NextRequest('http://localhost/api/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData)
      })

      const createCategoryResponse = await createCategory(createCategoryRequest)
      const createCategoryData = await createCategoryResponse.json()
      const categoryId = createCategoryData.category.id

      // Switch to editor role and verify data visibility
      mockGetServerSession.mockResolvedValue({
        user: { 
          id: editorUserId, 
          role: UserRole.EDITOR, 
          name: 'Test Editor', 
          email: 'editor@e2e-test.com' 
        }
      } as any)

      const categoriesRequest = new NextRequest('http://localhost/api/categories')
      const categoriesResponse = await getCategories(categoriesRequest)
      const categoriesData = await categoriesResponse.json()

      expect(categoriesResponse.status).toBe(200)
      const createdCategory = categoriesData.categories.find((c: any) => c.id === categoryId)
      expect(createdCategory).toBeTruthy()
      expect(createdCategory.name).toBe(categoryData.name)

      // Editor should be able to create products in admin-created categories
      const productData = {
        name: 'E2E Consistency Test Product',
        slug: 'e2e-consistency-test-product',
        description: 'Product for testing data consistency',
        price: 99.99,
        status: 'PUBLISHED',
        categoryIds: [categoryId]
      }

      const { POST: createProduct } = await import('../../app/api/products/route')
      const createProductRequest = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify(productData)
      })

      const createProductResponse = await createProduct(createProductRequest)
      const createProductData = await createProductResponse.json()

      expect(createProductResponse.status).toBe(201)
      expect(createProductData.product.categories).toHaveLength(1)
      expect(createProductData.product.categories[0].id).toBe(categoryId)

      // Switch back to admin and verify all data is accessible
      mockGetServerSession.mockResolvedValue({
        user: { 
          id: adminUserId, 
          role: UserRole.ADMIN, 
          name: 'Test Admin', 
          email: 'admin@e2e-test.com' 
        }
      } as any)

      const adminProductsRequest = new NextRequest('http://localhost/api/products')
      const adminProductsResponse = await getProducts(adminProductsRequest)
      const adminProductsData = await adminProductsResponse.json()

      expect(adminProductsResponse.status).toBe(200)
      const editorCreatedProduct = adminProductsData.products.find(
        (p: any) => p.id === createProductData.product.id
      )
      expect(editorCreatedProduct).toBeTruthy()
      expect(editorCreatedProduct.createdBy).toBe(editorUserId)
    })
  })
})