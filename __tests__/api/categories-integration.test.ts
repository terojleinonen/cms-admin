/**
 * Categories API Integration Tests
 * Comprehensive tests for category CRUD operations and hierarchical functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/api/categories/route'
import { GET as GetSingle, PUT as UpdateSingle, DELETE as DeleteSingle } from '@/api/categories/[id]/route'
import { POST as ReorderCategories } from '@/api/categories/reorder/route'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock auth config
jest.mock('@/lib/auth-config', () => ({
  authOptions: {}
}))

describe('Categories API Integration', () => {
  let mockUser: any
  let mockSession: any

  beforeEach(async () => {
    // Clean up test data
    await prisma.productCategory.deleteMany()
    await prisma.category.deleteMany()
    await prisma.user.deleteMany()
    
    // Create mock user
    mockUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        name: 'Admin User',
        passwordHash: 'hashed-password',
        role: UserRole.ADMIN,
      },
    })

    mockSession = {
      user: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      },
      expires: '2024-12-31',
    }
    
    const { getServerSession } = require('next-auth/next')
    getServerSession.mockResolvedValue(mockSession)
  })

  afterEach(async () => {
    await prisma.productCategory.deleteMany()
    await prisma.category.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('GET /api/categories', () => {
    it('should return empty array when no categories exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/categories')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.categories).toEqual([])
      expect(data.total).toBe(0)
    })

    it('should return categories with hierarchical structure', async () => {
      // Create parent category
      const parentCategory = await prisma.category.create({
        data: {
          name: 'Furniture',
          slug: 'furniture',
          description: 'All furniture items',
          sortOrder: 1,
        },
      })

      // Create child category
      const childCategory = await prisma.category.create({
        data: {
          name: 'Desks',
          slug: 'desks',
          description: 'Desk furniture',
          parentId: parentCategory.id,
          sortOrder: 1,
        },
      })

      const request = new NextRequest('http://localhost:3000/api/categories')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.categories).toHaveLength(2)
      expect(data.total).toBe(2)
      
      const parent = data.categories.find((c: any) => c.id === parentCategory.id)
      const child = data.categories.find((c: any) => c.id === childCategory.id)
      
      expect(parent).toBeDefined()
      expect(child).toBeDefined()
      expect(child.parentId).toBe(parentCategory.id)
    })

    it('should filter categories by search query', async () => {
      await prisma.category.createMany({
        data: [
          { name: 'Furniture', slug: 'furniture', sortOrder: 1 },
          { name: 'Lighting', slug: 'lighting', sortOrder: 2 },
          { name: 'Accessories', slug: 'accessories', sortOrder: 3 },
        ],
      })

      const request = new NextRequest('http://localhost:3000/api/categories?search=light')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.categories).toHaveLength(1)
      expect(data.categories[0].name).toBe('Lighting')
    })

    it('should support pagination', async () => {
      // Create multiple categories
      const categories = Array.from({ length: 15 }, (_, i) => ({
        name: `Category ${i + 1}`,
        slug: `category-${i + 1}`,
        sortOrder: i + 1,
      }))

      await prisma.category.createMany({ data: categories })

      const request = new NextRequest('http://localhost:3000/api/categories?page=2&limit=5')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.categories).toHaveLength(5)
      expect(data.total).toBe(15)
      expect(data.page).toBe(2)
      expect(data.totalPages).toBe(3)
    })

    it('should filter by active status', async () => {
      await prisma.category.createMany({
        data: [
          { name: 'Active Category', slug: 'active', sortOrder: 1, isActive: true },
          { name: 'Inactive Category', slug: 'inactive', sortOrder: 2, isActive: false },
        ],
      })

      const request = new NextRequest('http://localhost:3000/api/categories?active=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.categories).toHaveLength(1)
      expect(data.categories[0].name).toBe('Active Category')
    })
  })

  describe('POST /api/categories', () => {
    it('should create a new root category', async () => {
      const categoryData = {
        name: 'Office Furniture',
        slug: 'office-furniture',
        description: 'Professional office furniture',
      }

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.category.name).toBe(categoryData.name)
      expect(data.category.slug).toBe(categoryData.slug)
      expect(data.category.description).toBe(categoryData.description)
      expect(data.category.parentId).toBeNull()
      expect(data.category.sortOrder).toBe(1)
    })

    it('should create a child category with parent', async () => {
      const parentCategory = await prisma.category.create({
        data: {
          name: 'Furniture',
          slug: 'furniture',
          sortOrder: 1,
        },
      })

      const categoryData = {
        name: 'Desks',
        slug: 'desks',
        description: 'Office desks',
        parentId: parentCategory.id,
      }

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.category.parentId).toBe(parentCategory.id)
      expect(data.category.sortOrder).toBe(1)
    })

    it('should auto-generate slug from name if not provided', async () => {
      const categoryData = {
        name: 'Office Furniture & Accessories',
        description: 'Professional office items',
      }

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.category.slug).toBe('office-furniture-accessories')
    })

    it('should return error for duplicate slug', async () => {
      await prisma.category.create({
        data: {
          name: 'Furniture',
          slug: 'furniture',
          sortOrder: 1,
        },
      })

      const categoryData = {
        name: 'Different Furniture',
        slug: 'furniture', // Duplicate slug
        description: 'Another furniture category',
      }

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('DUPLICATE_ENTRY')
    })

    it('should validate required fields', async () => {
      const categoryData = {
        description: 'Missing name and slug',
      }

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should require authentication', async () => {
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', slug: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('should require editor role or higher', async () => {
      const viewerSession = {
        ...mockSession,
        user: { ...mockSession.user, role: UserRole.VIEWER }
      }
      
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(viewerSession)

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', slug: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(403)
    })
  })

  describe('PUT /api/categories/[id]', () => {
    it('should update category successfully', async () => {
      const category = await prisma.category.create({
        data: {
          name: 'Furniture',
          slug: 'furniture',
          sortOrder: 1,
        },
      })

      const updateData = {
        name: 'Updated Furniture',
        description: 'Updated description',
        isActive: false,
      }

      const request = new NextRequest(`http://localhost:3000/api/categories/${category.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await UpdateSingle(request, { params: { id: category.id } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.category.name).toBe(updateData.name)
      expect(data.category.description).toBe(updateData.description)
      expect(data.category.isActive).toBe(false)
    })

    it('should return 404 for non-existent category', async () => {
      const request = new NextRequest('http://localhost:3000/api/categories/non-existent-id', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await UpdateSingle(request, { params: { id: 'non-existent-id' } })
      expect(response.status).toBe(404)
    })

    it('should prevent creating circular parent relationships', async () => {
      const parentCategory = await prisma.category.create({
        data: { name: 'Parent', slug: 'parent', sortOrder: 1 },
      })

      const childCategory = await prisma.category.create({
        data: { name: 'Child', slug: 'child', parentId: parentCategory.id, sortOrder: 1 },
      })

      // Try to make parent a child of its own child
      const request = new NextRequest(`http://localhost:3000/api/categories/${parentCategory.id}`, {
        method: 'PUT',
        body: JSON.stringify({ parentId: childCategory.id }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await UpdateSingle(request, { params: { id: parentCategory.id } })
      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /api/categories/[id]', () => {
    it('should delete category without children', async () => {
      const category = await prisma.category.create({
        data: {
          name: 'Furniture',
          slug: 'furniture',
          sortOrder: 1,
        },
      })

      const request = new NextRequest(`http://localhost:3000/api/categories/${category.id}`, {
        method: 'DELETE',
      })

      const response = await DeleteSingle(request, { params: { id: category.id } })

      expect(response.status).toBe(200)

      const deletedCategory = await prisma.category.findUnique({
        where: { id: category.id },
      })
      expect(deletedCategory).toBeNull()
    })

    it('should not delete category with children', async () => {
      const parentCategory = await prisma.category.create({
        data: {
          name: 'Furniture',
          slug: 'furniture',
          sortOrder: 1,
        },
      })

      await prisma.category.create({
        data: {
          name: 'Desks',
          slug: 'desks',
          parentId: parentCategory.id,
          sortOrder: 1,
        },
      })

      const request = new NextRequest(`http://localhost:3000/api/categories/${parentCategory.id}`, {
        method: 'DELETE',
      })

      const response = await DeleteSingle(request, { params: { id: parentCategory.id } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should not delete category with associated products', async () => {
      const category = await prisma.category.create({
        data: { name: 'Furniture', slug: 'furniture', sortOrder: 1 },
      })

      // Create a product and associate it with the category
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          slug: 'test-product',
          price: 100,
          status: 'PUBLISHED',
        },
      })

      await prisma.productCategory.create({
        data: {
          productId: product.id,
          categoryId: category.id,
        },
      })

      const request = new NextRequest(`http://localhost:3000/api/categories/${category.id}`, {
        method: 'DELETE',
      })

      const response = await DeleteSingle(request, { params: { id: category.id } })
      expect(response.status).toBe(400)
    })

    it('should return 404 for non-existent category', async () => {
      const request = new NextRequest('http://localhost:3000/api/categories/non-existent-id', {
        method: 'DELETE',
      })

      const response = await DeleteSingle(request, { params: { id: 'non-existent-id' } })
      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/categories/reorder', () => {
    it('should reorder categories successfully', async () => {
      const categories = await Promise.all([
        prisma.category.create({ data: { name: 'Category 1', slug: 'cat-1', sortOrder: 1 } }),
        prisma.category.create({ data: { name: 'Category 2', slug: 'cat-2', sortOrder: 2 } }),
        prisma.category.create({ data: { name: 'Category 3', slug: 'cat-3', sortOrder: 3 } }),
      ])

      const reorderData = {
        categoryIds: [categories[2].id, categories[0].id, categories[1].id]
      }

      const request = new NextRequest('http://localhost:3000/api/categories/reorder', {
        method: 'POST',
        body: JSON.stringify(reorderData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await ReorderCategories(request)
      expect(response.status).toBe(200)

      // Verify new order
      const reorderedCategories = await prisma.category.findMany({
        orderBy: { sortOrder: 'asc' }
      })

      expect(reorderedCategories[0].id).toBe(categories[2].id)
      expect(reorderedCategories[0].sortOrder).toBe(1)
      expect(reorderedCategories[1].id).toBe(categories[0].id)
      expect(reorderedCategories[1].sortOrder).toBe(2)
      expect(reorderedCategories[2].id).toBe(categories[1].id)
      expect(reorderedCategories[2].sortOrder).toBe(3)
    })

    it('should validate category IDs exist', async () => {
      const reorderData = {
        categoryIds: ['non-existent-id-1', 'non-existent-id-2']
      }

      const request = new NextRequest('http://localhost:3000/api/categories/reorder', {
        method: 'POST',
        body: JSON.stringify(reorderData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await ReorderCategories(request)
      expect(response.status).toBe(400)
    })
  })
})