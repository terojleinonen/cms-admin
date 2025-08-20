/**
 * Product Management Integration Tests
 * Tests the complete product lifecycle from creation to deletion
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { UserRole } from '@prisma/client'
import { POST as createProduct, GET as getProducts } from '../../app/api/products/route'
import { GET as getProduct, PUT as updateProduct, DELETE as deleteProduct } from '../../app/api/products/[id]/route'
import { POST as createCategory } from '../../app/api/categories/route'
import { prisma } from '../../app/lib/db'
import { initTestDatabase, cleanupTestDatabase } from '../setup'

// Mock next-auth
jest.mock('next-auth')
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('Product Management Integration', () => {
  let testCategoryId: string
  let testUserId: string

  beforeAll(async () => {
    await initTestDatabase()
    
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: 'admin@integration-test.com',
        role: UserRole.ADMIN,
        isActive: true,
        passwordHash: 'hashed_password'
      }
    })
    testUserId = testUser.id

    // Mock admin session for all tests
    mockGetServerSession.mockResolvedValue({
      user: { 
        id: testUserId, 
        role: UserRole.ADMIN, 
        name: 'Test Admin', 
        email: 'admin@integration-test.com' 
      }
    } as any)
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    // Clean up test data
    await prisma.product.deleteMany({
      where: {
        name: {
          contains: 'Integration Test'
        }
      }
    })

    await prisma.category.deleteMany({
      where: {
        name: {
          contains: 'Integration Test'
        }
      }
    })

    // Create test category
    const categoryRequest = new NextRequest('http://localhost/api/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Integration Test Category',
        slug: 'integration-test-category',
        description: 'Category for integration testing'
      })
    })

    const categoryResponse = await createCategory(categoryRequest)
    const categoryData = await categoryResponse.json()
    testCategoryId = categoryData.category.id
  })

  it('should complete full product lifecycle', async () => {
    // Step 1: Create a new product
    const productData = {
      name: 'Integration Test Product',
      slug: 'integration-test-product',
      description: 'A product for integration testing',
      shortDescription: 'Test product',
      price: 99.99,
      compareAtPrice: 129.99,
      sku: 'INT-TEST-001',
      status: 'PUBLISHED',
      categoryIds: [testCategoryId],
      tags: ['test', 'integration'],
      seoTitle: 'Integration Test Product',
      seoDescription: 'SEO description for test product',
      weight: 1.5,
      dimensions: {
        length: 10,
        width: 8,
        height: 6
      }
    }

    const createRequest = new NextRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    })

    const createResponse = await createProduct(createRequest)
    const createData = await createResponse.json()

    expect(createResponse.status).toBe(201)
    expect(createData.product.name).toBe(productData.name)
    expect(createData.product.slug).toBe(productData.slug)
    expect(createData.product.price).toBe(productData.price)
    expect(createData.product.status).toBe('PUBLISHED')

    const productId = createData.product.id

    // Step 2: Verify product appears in products list
    const listRequest = new NextRequest('http://localhost/api/products')
    const listResponse = await getProducts(listRequest)
    const listData = await listResponse.json()

    expect(listResponse.status).toBe(200)
    const createdProduct = listData.products.find((p: any) => p.id === productId)
    expect(createdProduct).toBeTruthy()
    expect(createdProduct.name).toBe(productData.name)

    // Step 3: Get individual product
    const getRequest = new NextRequest(`http://localhost/api/products/${productId}`)
    const getResponse = await getProduct(getRequest, { params: { id: productId } })
    const getData = await getResponse.json()

    expect(getResponse.status).toBe(200)
    expect(getData.product.id).toBe(productId)
    expect(getData.product.name).toBe(productData.name)
    expect(getData.product.categories).toHaveLength(1)
    expect(getData.product.categories[0].id).toBe(testCategoryId)

    // Step 4: Update the product
    const updateData = {
      name: 'Updated Integration Test Product',
      price: 149.99,
      status: 'DRAFT'
    }

    const updateRequest = new NextRequest(`http://localhost/api/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })

    const updateResponse = await updateProduct(updateRequest, { params: { id: productId } })
    const updatedData = await updateResponse.json()

    expect(updateResponse.status).toBe(200)
    expect(updatedData.product.name).toBe(updateData.name)
    expect(updatedData.product.price).toBe(updateData.price)
    expect(updatedData.product.status).toBe('DRAFT')

    // Step 5: Verify update in database
    const dbProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { categories: true }
    })

    expect(dbProduct?.name).toBe(updateData.name)
    expect(dbProduct?.price).toBe(updateData.price)
    expect(dbProduct?.status).toBe('DRAFT')

    // Step 6: Delete the product
    const deleteRequest = new NextRequest(`http://localhost/api/products/${productId}`)
    const deleteResponse = await deleteProduct(deleteRequest, { params: { id: productId } })

    expect(deleteResponse.status).toBe(200)

    // Step 7: Verify product is deleted
    const verifyDeleteRequest = new NextRequest(`http://localhost/api/products/${productId}`)
    const verifyDeleteResponse = await getProduct(verifyDeleteRequest, { params: { id: productId } })

    expect(verifyDeleteResponse.status).toBe(404)
  })

  it('should handle product search and filtering', async () => {
    // Create multiple test products
    const products = [
      {
        name: 'Integration Test Chair',
        slug: 'integration-test-chair',
        description: 'A comfortable chair for testing',
        price: 199.99,
        status: 'PUBLISHED',
        categoryIds: [testCategoryId],
        tags: ['furniture', 'chair']
      },
      {
        name: 'Integration Test Desk',
        slug: 'integration-test-desk',
        description: 'A sturdy desk for testing',
        price: 299.99,
        status: 'PUBLISHED',
        categoryIds: [testCategoryId],
        tags: ['furniture', 'desk']
      },
      {
        name: 'Integration Test Lamp',
        slug: 'integration-test-lamp',
        description: 'A bright lamp for testing',
        price: 79.99,
        status: 'DRAFT',
        categoryIds: [testCategoryId],
        tags: ['lighting', 'lamp']
      }
    ]

    // Create all products
    for (const productData of products) {
      const request = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify(productData)
      })
      await createProduct(request)
    }

    // Test search functionality
    const searchRequest = new NextRequest('http://localhost/api/products?search=chair')
    const searchResponse = await getProducts(searchRequest)
    const searchData = await searchResponse.json()

    expect(searchResponse.status).toBe(200)
    expect(searchData.products).toHaveLength(1)
    expect(searchData.products[0].name).toContain('Chair')

    // Test status filtering
    const statusRequest = new NextRequest('http://localhost/api/products?status=PUBLISHED')
    const statusResponse = await getProducts(statusRequest)
    const statusData = await statusResponse.json()

    expect(statusResponse.status).toBe(200)
    expect(statusData.products).toHaveLength(2)
    statusData.products.forEach((product: any) => {
      expect(product.status).toBe('PUBLISHED')
    })

    // Test category filtering
    const categoryRequest = new NextRequest(`http://localhost/api/products?categoryId=${testCategoryId}`)
    const categoryResponse = await getProducts(categoryRequest)
    const categoryData = await categoryResponse.json()

    expect(categoryResponse.status).toBe(200)
    expect(categoryData.products).toHaveLength(3)

    // Test price range filtering
    const priceRequest = new NextRequest('http://localhost/api/products?minPrice=100&maxPrice=250')
    const priceResponse = await getProducts(priceRequest)
    const priceData = await priceResponse.json()

    expect(priceResponse.status).toBe(200)
    expect(priceData.products).toHaveLength(1)
    expect(priceData.products[0].name).toContain('Chair')
  })

  it('should validate product data integrity', async () => {
    // Test with invalid data
    const invalidProductData = {
      name: '', // Empty name
      slug: 'invalid-product',
      price: -10, // Negative price
      status: 'INVALID_STATUS' // Invalid status
    }

    const invalidRequest = new NextRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify(invalidProductData)
    })

    const invalidResponse = await createProduct(invalidRequest)
    const invalidData = await invalidResponse.json()

    expect(invalidResponse.status).toBe(400)
    expect(invalidData.error.code).toBe('VALIDATION_ERROR')
    expect(invalidData.error.details).toBeDefined()

    // Test with duplicate slug
    const firstProduct = {
      name: 'First Product',
      slug: 'duplicate-slug-test',
      price: 99.99,
      status: 'PUBLISHED'
    }

    const firstRequest = new NextRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify(firstProduct)
    })

    const firstResponse = await createProduct(firstRequest)
    expect(firstResponse.status).toBe(201)

    // Try to create second product with same slug
    const secondProduct = {
      name: 'Second Product',
      slug: 'duplicate-slug-test', // Same slug
      price: 149.99,
      status: 'PUBLISHED'
    }

    const secondRequest = new NextRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify(secondProduct)
    })

    const secondResponse = await createProduct(secondRequest)
    const secondData = await secondResponse.json()

    expect(secondResponse.status).toBe(409)
    expect(secondData.error.code).toBe('DUPLICATE_ENTRY')
  })
})