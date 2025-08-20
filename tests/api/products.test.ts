/**
 * Product API Tests
 * Tests for product CRUD operations and business logic
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/api/products/route'
import { GET as GetSingle, PUT as UpdateSingle, DELETE as DeleteSingle } from '@/api/products/[id]/route'
import { prisma } from '@/lib/db'
import { createMockUser, createMockSession } from '../helpers/auth-helpers'

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))
jest.mock('@/lib/auth-config', () => ({
  authConfig: {
    providers: [],
    callbacks: {},
    pages: {},
  },
}))

describe('/api/products', () => {
  let mockUser: any
  let mockSession: any
  let testCategory: any

  beforeEach(async () => {
    // Clean up tables
    await prisma.productMedia.deleteMany()
    await prisma.productCategory.deleteMany()
    await prisma.product.deleteMany()
    await prisma.category.deleteMany()
    
    // Create mock user and session
    mockUser = await createMockUser({ role: 'ADMIN' })
    mockSession = createMockSession(mockUser)
    
    // Create test category
    testCategory = await prisma.category.create({
      data: {
        name: 'Test Category',
        slug: 'test-category',
        sortOrder: 1,
      },
    })
    
    const { getServerSession } = require('next-auth/next')
    getServerSession.mockResolvedValue(mockSession)
  })

  afterEach(async () => {
    await prisma.productMedia.deleteMany()
    await prisma.productCategory.deleteMany()
    await prisma.product.deleteMany()
    await prisma.category.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('GET /api/products', () => {
    it('should return empty array when no products exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/products')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.products).toEqual([])
      expect(data.total).toBe(0)
    })

    it('should return products with pagination', async () => {
      // Create test products
      await prisma.product.createMany({
        data: [
          {
            name: 'Product 1',
            slug: 'product-1',
            price: 99.99,
            createdBy: mockUser.id,
          },
          {
            name: 'Product 2',
            slug: 'product-2',
            price: 149.99,
            createdBy: mockUser.id,
          },
        ],
      })

      const request = new NextRequest('http://localhost:3000/api/products?page=1&limit=10')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.products).toHaveLength(2)
      expect(data.total).toBe(2)
      expect(data.page).toBe(1)
      expect(data.totalPages).toBe(1)
    })

    it('should filter products by search query', async () => {
      await prisma.product.createMany({
        data: [
          {
            name: 'Office Desk',
            slug: 'office-desk',
            price: 299.99,
            createdBy: mockUser.id,
          },
          {
            name: 'Standing Lamp',
            slug: 'standing-lamp',
            price: 89.99,
            createdBy: mockUser.id,
          },
        ],
      })

      const request = new NextRequest('http://localhost:3000/api/products?search=desk')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.products).toHaveLength(1)
      expect(data.products[0].name).toBe('Office Desk')
    })

    it('should filter products by status', async () => {
      await prisma.product.createMany({
        data: [
          {
            name: 'Published Product',
            slug: 'published-product',
            price: 99.99,
            status: 'PUBLISHED',
            createdBy: mockUser.id,
          },
          {
            name: 'Draft Product',
            slug: 'draft-product',
            price: 149.99,
            status: 'DRAFT',
            createdBy: mockUser.id,
          },
        ],
      })

      const request = new NextRequest('http://localhost:3000/api/products?status=PUBLISHED')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.products).toHaveLength(1)
      expect(data.products[0].status).toBe('PUBLISHED')
    })

    it('should filter products by category', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Categorized Product',
          slug: 'categorized-product',
          price: 199.99,
          createdBy: mockUser.id,
        },
      })

      await prisma.productCategory.create({
        data: {
          productId: product.id,
          categoryId: testCategory.id,
        },
      })

      const request = new NextRequest(`http://localhost:3000/api/products?categoryId=${testCategory.id}`)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.products).toHaveLength(1)
      expect(data.products[0].id).toBe(product.id)
    })
  })

  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const productData = {
        name: 'New Product',
        slug: 'new-product',
        description: 'A great product',
        price: 299.99,
        sku: 'NP-001',
        inventoryQuantity: 10,
        categoryIds: [testCategory.id],
      }

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify(productData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.product.name).toBe(productData.name)
      expect(data.product.slug).toBe(productData.slug)
      expect(data.product.price).toBe(productData.price)
      expect(data.product.createdBy).toBe(mockUser.id)
    })

    it('should return error for duplicate slug', async () => {
      await prisma.product.create({
        data: {
          name: 'Existing Product',
          slug: 'existing-product',
          price: 99.99,
          createdBy: mockUser.id,
        },
      })

      const productData = {
        name: 'New Product',
        slug: 'existing-product', // Duplicate slug
        price: 149.99,
      }

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify(productData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('already exists')
    })

    it('should require authentication', async () => {
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', slug: 'test', price: 99.99 }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/products/[id]', () => {
    it('should update product', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Original Product',
          slug: 'original-product',
          price: 99.99,
          createdBy: mockUser.id,
        },
      })

      const updateData = {
        name: 'Updated Product',
        price: 149.99,
        status: 'PUBLISHED',
      }

      const request = new NextRequest(`http://localhost:3000/api/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await UpdateSingle(request, { params: { id: product.id } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.product.name).toBe(updateData.name)
      expect(data.product.price).toBe(updateData.price)
      expect(data.product.status).toBe(updateData.status)
    })

    it('should update product categories', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Product with Categories',
          slug: 'product-with-categories',
          price: 199.99,
          createdBy: mockUser.id,
        },
      })

      const newCategory = await prisma.category.create({
        data: {
          name: 'New Category',
          slug: 'new-category',
          sortOrder: 2,
        },
      })

      const updateData = {
        categoryIds: [testCategory.id, newCategory.id],
      }

      const request = new NextRequest(`http://localhost:3000/api/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await UpdateSingle(request, { params: { id: product.id } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.product.categories).toHaveLength(2)
    })
  })

  describe('DELETE /api/products/[id]', () => {
    it('should delete product', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Product to Delete',
          slug: 'product-to-delete',
          price: 99.99,
          createdBy: mockUser.id,
        },
      })

      const request = new NextRequest(`http://localhost:3000/api/products/${product.id}`, {
        method: 'DELETE',
      })

      const response = await DeleteSingle(request, { params: { id: product.id } })

      expect(response.status).toBe(200)

      const deletedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      })
      expect(deletedProduct).toBeNull()
    })

    it('should return 404 for non-existent product', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'
      const request = new NextRequest(`http://localhost:3000/api/products/${nonExistentId}`, {
        method: 'DELETE',
      })

      const response = await DeleteSingle(request, { params: { id: nonExistentId } })

      expect(response.status).toBe(404)
    })
  })
})