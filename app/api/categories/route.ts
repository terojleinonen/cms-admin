/**
 * Categories API Routes
 * Handles CRUD operations for categories with hierarchical support
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { withSimpleAuth, validateBody, createSuccessResponse, createErrorResponse } from '@/lib/simple-api-middleware'

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug too long'),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/categories
 * Retrieve categories with hierarchical structure
 */
export const GET = withSimpleAuth(
  async (request: NextRequest, { user }) => {
    try {

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const parentId = searchParams.get('parentId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Build where clause
    const where: Record<string, unknown> = {}
    
    if (!includeInactive) {
      where.isActive = true
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (parentId) {
      where.parentId = parentId === 'null' ? null : parentId
    }

    // Fetch categories with children
    const categories = await prisma.category.findMany({
      where,
      include: {
        children: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        parent: true,
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    })

    const total = await prisma.category.count({ where })

    return createSuccessResponse({
      categories,
      total,
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return createErrorResponse('Failed to fetch categories', 500)
  }
}, {
  resource: 'categories',
  action: 'read',
  allowedMethods: ['GET']
})

/**
 * POST /api/categories
 * Create a new category
 */
export const POST = withSimpleAuth(
  async (request: NextRequest, { user }) => {
    try {

    const bodyValidation = await validateBody(request, createCategorySchema)
    
    if (!bodyValidation.success) {
      return createErrorResponse(bodyValidation.error)
    }

    const validatedData = bodyValidation.data

    // Check if slug already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug: validatedData.slug },
    })

    if (existingCategory) {
      return createErrorResponse('Category with this slug already exists', 409)
    }

    // If parentId is provided, verify parent exists
    if (validatedData.parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: validatedData.parentId },
      })

      if (!parentCategory) {
        return createErrorResponse('Parent category not found')
      }
    }

    // Get next sort order if not provided
    let sortOrder = validatedData.sortOrder
    if (sortOrder === undefined) {
      const lastCategory = await prisma.category.findFirst({
        where: { parentId: validatedData.parentId || null },
        orderBy: { sortOrder: 'desc' },
      })
      sortOrder = (lastCategory?.sortOrder || 0) + 1
    }

    const category = await prisma.category.create({
      data: {
        ...validatedData,
        sortOrder,
      },
      include: {
        children: true,
        parent: true,
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    })

    return createSuccessResponse({ category }, 201)
  } catch (error) {
    console.error('Error creating category:', error)
    return createErrorResponse('Failed to create category', 500)
  }
}, {
  resource: 'categories',
  action: 'create',
  allowedMethods: ['POST']
})