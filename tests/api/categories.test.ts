/**
 * Category API Tests
 * Tests for category CRUD operations and hierarchical functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/api/categories/route'
import { GET as GetSingle, PUT as UpdateSingle, DELETE as DeleteSingle } from '@/api/categories/[id]/route'
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

describe('/api/categories', () => {
  let mockUser: any
  let mockSession: any

  beforeEach(async () => {
    // Clean up all related tables in correct order
    await prisma.productCategory.deleteMany()
    await prisma.product.deleteMany()
    await prisma.category.deleteMany()
    await prisma.user.deleteMany()
    
    // Create mock user and session
    mockUser = await createMockUser({ role: 'ADMIN' })
    mockSession = createMockSession(mockUser)
    
    const { getServerSession } = require('next-auth/next')
    getServerSession.mockResolvedValue(mockSession)
  })

  afterEach(async () => {
    // Clean up all related tables in correct order
    await prisma.productCategory.deleteMany()
    await prisma.product.deleteMany()
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
      
      expect(parent.children).toHaveLength(1)
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
  })

  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
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
      expect(data.error).toContain('already exists')
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
  })

  describe('PUT /api/categories/[id]', () => {
    it('should update category', async () => {
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
      expect(data.error).toContain('children')
    })
  })
})