/**
 * Product Management E2E Tests
 * End-to-end tests for critical product management workflows
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

// Import API handlers
import { GET as getProducts, POST as createProduct } from '@/api/products/route'
import { GET as getProduct, PUT as updateProduct, DELETE as deleteProduct } from '@/api/products/[id]/route'
import { GET as getCategories, POST as createCategory } from '@/api/categories/route'
import { POST as uploadMedia } from '@/api/media/route'

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock auth config
jest.mock('@/lib/auth-config', () => ({
  authOptions: {}
}))

// Mock file system operations
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
  },
}))

// Mock Sharp for image processing
jest.mock('sharp', () => {
  return jest.fn(() => ({
    metadata: jest.fn().mockResolvedValue({
      width: 800,
      height: 600,
      format: 'jpeg',
      size: 1024000,
    }),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(undefined),
  }))
})

describe('Product Management E2E Workflow', () => {
  let adminUser: any
  let editorUser: any
  let adminSession: any
  let editorSession: any

  beforeEach(async () => {
    // Clean up test data
    await prisma.productMedia.deleteMany()
    await prisma.productCategory.deleteMany()
    await prisma.media.deleteMany()
    await prisma.product.deleteMany()
    await prisma.category.deleteMany()
    await prisma.user.deleteMany()

    // Create test users
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        name: 'Admin User',
        passwordHash: 'hashed-password',
        role: UserRole.ADMIN,
      },
    })

    editorUser = await prisma.user.create({
      data: {
        email: 'editor@test.com',
        name: 'Editor User',
        passwordHash: 'hashed-password',
        role: UserRole.EDITOR,
      },
    })

    adminSession = {
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
      expires: '2024-12-31',
    }

    editorSession = {
      user: {
        id: editorUser.id,
        email: editorUser.email,
        name: editorUser.name,
        role: editorUser.role,
      },
      expires: '2024-12-31',
    }

    const { getServerSession } = require('next-auth/next')
    getServerSession.mockResolvedValue(adminSession)
  })

  afterEach(async () => {
    await prisma.productMedia.deleteMany()
    await prisma.productCategory.deleteMany()
    await prisma.media.deleteMany()
    await prisma.product.deleteMany()
    await prisma.category.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Complete Product Creation Workflow', () => {
    it('should create a complete product with categories and media', async () => {
      // Step 1: Create categories
      const categoryData = {
        name: 'Office Furniture',
        slug: 'office-furniture',
        description: 'Professional office furniture',
      }

      const categoryRequest = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData),
        headers: { 'Content-Type': 'application/json' },
      })

      const categoryResponse = await createCategory(categoryRequest)
      expect(categoryResponse.status).toBe(201)
      
      const categoryResult = await categoryResponse.json()
      const category = categoryResult.category

      // Step 2: Upload media
      const mediaFormData = new FormData()
      const mockFile = new File(['mock image data'], 'product-image.jpg', {
        type: 'image/jpeg',
      })
      mediaFormData.append('file', mockFile)
      mediaFormData.append('altText', 'Product image')

      const mediaRequest = new NextRequest('http://localhost:3000/api/media', {
        method: 'POST',
        body: mediaFormData,
      })

      const mediaResponse = await uploadMedia(mediaRequest)
      expect(mediaResponse.status).toBe(201)
      
      const mediaResult = await mediaResponse.json()
      const media = mediaResult.media

      // Step 3: Create product with categories and media
      const productData = {
        name: 'Executive Desk',
        slug: 'executive-desk',
        description: 'Premium executive desk with storage',
        shortDescription: 'Executive desk with storage',
        price: 899.99,
        comparePrice: 1199.99,
        sku: 'DESK-001',
        inventoryQuantity: 10,
        weight: 45.5,
        dimensions: {
          length: 150,
          width: 80,
          height: 75,
        },
        status: 'PUBLISHED',
        featured: true,
        seoTitle: 'Executive Desk - Premium Office Furniture',
        seoDescription: 'High-quality executive desk perfect for modern offices',
        categoryIds: [category.id],
        mediaIds: [media.id],
      }

      const productRequest = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify(productData),
        headers: { 'Content-Type': 'application/json' },
      })

      const productResponse = await createProduct(productRequest)
      expect(productResponse.status).toBe(201)
      
      const productResult = await productResponse.json()
      const product = productResult.product

      // Verify product was created with all associations
      expect(product.name).toBe(productData.name)
      expect(product.price).toBe(productData.price)
      expect(product.status).toBe(productData.status)

      // Step 4: Verify product can be retrieved with all relationships
      const getProductRequest = new NextRequest(`http://localhost:3000/api/products/${product.id}`)
      const getProductResponse = await getProduct(getProductRequest, { params: { id: product.id } })
      expect(getProductResponse.status).toBe(200)
      
      const retrievedProductResult = await getProductResponse.json()
      const retrievedProduct = retrievedProductResult.product

      expect(retrievedProduct.categories).toHaveLength(1)
      expect(retrievedProduct.categories[0].id).toBe(category.id)
      expect(retrievedProduct.media).toHaveLength(1)
      expect(retrievedProduct.media[0].id).toBe(media.id)
    })

    it('should handle product creation with validation errors', async () => {
      const invalidProductData = {
        name: '', // Missing required name
        price: -100, // Invalid negative price
        status: 'INVALID_STATUS', // Invalid status
      }

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify(invalidProductData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await createProduct(request)
      expect(response.status).toBe(400)
      
      const result = await response.json()
      expect(result.error.code).toBe('VALIDATION_ERROR')
      expect(result.error.details).toBeDefined()
    })
  })

  describe('Product Update Workflow', () => {
    it('should update product with new categories and media', async () => {
      // Create initial product
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          slug: 'test-product',
          price: 100,
          status: 'DRAFT',
        },
      })

      // Create new category
      const category = await prisma.category.create({
        data: {
          name: 'New Category',
          slug: 'new-category',
          sortOrder: 1,
        },
      })

      // Create new media
      const media = await prisma.media.create({
        data: {
          filename: 'new-image.jpg',
          originalName: 'New Image.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024000,
          width: 800,
          height: 600,
          folder: 'uploads',
          createdBy: adminUser.id,
        },
      })

      // Update product
      const updateData = {
        name: 'Updated Product Name',
        price: 150,
        status: 'PUBLISHED',
        categoryIds: [category.id],
        mediaIds: [media.id],
      }

      const request = new NextRequest(`http://localhost:3000/api/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await updateProduct(request, { params: { id: product.id } })
      expect(response.status).toBe(200)
      
      const result = await response.json()
      const updatedProduct = result.product

      expect(updatedProduct.name).toBe(updateData.name)
      expect(updatedProduct.price).toBe(updateData.price)
      expect(updatedProduct.status).toBe(updateData.status)

      // Verify relationships were updated
      const productWithRelations = await prisma.product.findUnique({
        where: { id: product.id },
        include: {
          categories: true,
          media: true,
        },
      })

      expect(productWithRelations?.categories).toHaveLength(1)
      expect(productWithRelations?.categories[0].categoryId).toBe(category.id)
      expect(productWithRelations?.media).toHaveLength(1)
      expect(productWithRelations?.media[0].mediaId).toBe(media.id)
    })
  })

  describe('Product Listing and Filtering Workflow', () => {
    it('should list products with filtering and pagination', async () => {
      // Create test categories
      const category1 = await prisma.category.create({
        data: { name: 'Category 1', slug: 'cat-1', sortOrder: 1 },
      })

      const category2 = await prisma.category.create({
        data: { name: 'Category 2', slug: 'cat-2', sortOrder: 2 },
      })

      // Create test products
      const products = await Promise.all([
        prisma.product.create({
          data: {
            name: 'Product A',
            slug: 'product-a',
            price: 100,
            status: 'PUBLISHED',
            featured: true,
          },
        }),
        prisma.product.create({
          data: {
            name: 'Product B',
            slug: 'product-b',
            price: 200,
            status: 'PUBLISHED',
            featured: false,
          },
        }),
        prisma.product.create({
          data: {
            name: 'Product C',
            slug: 'product-c',
            price: 300,
            status: 'DRAFT',
            featured: true,
          },
        }),
      ])

      // Associate products with categories
      await prisma.productCategory.createMany({
        data: [
          { productId: products[0].id, categoryId: category1.id },
          { productId: products[1].id, categoryId: category2.id },
          { productId: products[2].id, categoryId: category1.id },
        ],
      })

      // Test basic listing
      const listRequest = new NextRequest('http://localhost:3000/api/products')
      const listResponse = await getProducts(listRequest)
      expect(listResponse.status).toBe(200)
      
      const listResult = await listResponse.json()
      expect(listResult.products).toHaveLength(3)
      expect(listResult.total).toBe(3)

      // Test filtering by status
      const statusFilterRequest = new NextRequest('http://localhost:3000/api/products?status=PUBLISHED')
      const statusFilterResponse = await getProducts(statusFilterRequest)
      const statusFilterResult = await statusFilterResponse.json()
      expect(statusFilterResult.products).toHaveLength(2)

      // Test filtering by featured
      const featuredFilterRequest = new NextRequest('http://localhost:3000/api/products?featured=true')
      const featuredFilterResponse = await getProducts(featuredFilterRequest)
      const featuredFilterResult = await featuredFilterResponse.json()
      expect(featuredFilterResult.products).toHaveLength(2)

      // Test filtering by category
      const categoryFilterRequest = new NextRequest(`http://localhost:3000/api/products?categoryId=${category1.id}`)
      const categoryFilterResponse = await getProducts(categoryFilterRequest)
      const categoryFilterResult = await categoryFilterResponse.json()
      expect(categoryFilterResult.products).toHaveLength(2)

      // Test search
      const searchRequest = new NextRequest('http://localhost:3000/api/products?search=Product A')
      const searchResponse = await getProducts(searchRequest)
      const searchResult = await searchResponse.json()
      expect(searchResult.products).toHaveLength(1)
      expect(searchResult.products[0].name).toBe('Product A')

      // Test pagination
      const paginationRequest = new NextRequest('http://localhost:3000/api/products?page=1&limit=2')
      const paginationResponse = await getProducts(paginationRequest)
      const paginationResult = await paginationResponse.json()
      expect(paginationResult.products).toHaveLength(2)
      expect(paginationResult.page).toBe(1)
      expect(paginationResult.totalPages).toBe(2)

      // Test sorting
      const sortRequest = new NextRequest('http://localhost:3000/api/products?sortBy=price&sortOrder=desc')
      const sortResponse = await getProducts(sortRequest)
      const sortResult = await sortResponse.json()
      expect(sortResult.products[0].price).toBe(300)
      expect(sortResult.products[1].price).toBe(200)
      expect(sortResult.products[2].price).toBe(100)
    })
  })

  describe('Product Deletion Workflow', () => {
    it('should delete product and clean up relationships', async () => {
      // Create product with relationships
      const category = await prisma.category.create({
        data: { name: 'Test Category', slug: 'test-cat', sortOrder: 1 },
      })

      const media = await prisma.media.create({
        data: {
          filename: 'test-image.jpg',
          originalName: 'Test Image.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024000,
          width: 800,
          height: 600,
          folder: 'uploads',
          createdBy: adminUser.id,
        },
      })

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          slug: 'test-product',
          price: 100,
          status: 'PUBLISHED',
        },
      })

      // Create relationships
      await prisma.productCategory.create({
        data: { productId: product.id, categoryId: category.id },
      })

      await prisma.productMedia.create({
        data: { productId: product.id, mediaId: media.id, sortOrder: 1 },
      })

      // Delete product
      const deleteRequest = new NextRequest(`http://localhost:3000/api/products/${product.id}`, {
        method: 'DELETE',
      })

      const deleteResponse = await deleteProduct(deleteRequest, { params: { id: product.id } })
      expect(deleteResponse.status).toBe(200)

      // Verify product is deleted
      const deletedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      })
      expect(deletedProduct).toBeNull()

      // Verify relationships are cleaned up
      const productCategories = await prisma.productCategory.findMany({
        where: { productId: product.id },
      })
      expect(productCategories).toHaveLength(0)

      const productMedia = await prisma.productMedia.findMany({
        where: { productId: product.id },
      })
      expect(productMedia).toHaveLength(0)

      // Verify category and media still exist (not cascade deleted)
      const existingCategory = await prisma.category.findUnique({
        where: { id: category.id },
      })
      expect(existingCategory).not.toBeNull()

      const existingMedia = await prisma.media.findUnique({
        where: { id: media.id },
      })
      expect(existingMedia).not.toBeNull()
    })

    it('should return 404 for non-existent product deletion', async () => {
      const deleteRequest = new NextRequest('http://localhost:3000/api/products/non-existent-id', {
        method: 'DELETE',
      })

      const deleteResponse = await deleteProduct(deleteRequest, { params: { id: 'non-existent-id' } })
      expect(deleteResponse.status).toBe(404)
    })
  })

  describe('Permission-based Access Control', () => {
    it('should allow editors to create and update products', async () => {
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(editorSession)

      const productData = {
        name: 'Editor Product',
        slug: 'editor-product',
        price: 100,
        status: 'DRAFT',
      }

      const createRequest = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify(productData),
        headers: { 'Content-Type': 'application/json' },
      })

      const createResponse = await createProduct(createRequest)
      expect(createResponse.status).toBe(201)
    })

    it('should require authentication for product operations', async () => {
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(null)

      const productData = {
        name: 'Unauthorized Product',
        slug: 'unauthorized-product',
        price: 100,
      }

      const createRequest = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify(productData),
        headers: { 'Content-Type': 'application/json' },
      })

      const createResponse = await createProduct(createRequest)
      expect(createResponse.status).toBe(401)
    })
  })
})