/**
 * Categories API Routes
 * Handles CRUD operations for categories with hierarchical support
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'

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
export const GET = withApiPermissions(
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

    return createApiSuccessResponse({
      categories,
      total,
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { 
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch categories',
          timestamp: new Date().toISOString()
        },
        success: false
      },
      { status: 500 }
    )
  }
}, {
  permissions: [{ resource: 'categories', action: 'read', scope: 'all' }]
})

/**
 * POST /api/categories
 * Create a new category
 */
export const POST = withApiPermissions(
  async (request: NextRequest, { user }) => {
    try {

    const body = await request.json()
    const validatedData = createCategorySchema.parse(body)

    // Check if slug already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug: validatedData.slug },
    })

    if (existingCategory) {
      return NextResponse.json(
        { 
          error: {
            code: 'DUPLICATE_ENTRY',
            message: 'Category with this slug already exists',
            timestamp: new Date().toISOString()
          },
          success: false
        },
        { status: 400 }
      )
    }

    // If parentId is provided, verify parent exists
    if (validatedData.parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: validatedData.parentId },
      })

      if (!parentCategory) {
        return NextResponse.json(
          { 
            error: {
              code: 'NOT_FOUND',
              message: 'Parent category not found',
              timestamp: new Date().toISOString()
            },
            success: false
          },
          { status: 400 }
        )
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

    return createApiSuccessResponse({ category }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.issues,
            timestamp: new Date().toISOString()
          },
          success: false
        },
        { status: 400 }
      )
    }

    console.error('Error creating category:', error)
    return NextResponse.json(
      { 
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create category',
          timestamp: new Date().toISOString()
        },
        success: false
      },
      { status: 500 }
    )
  }
}, {
  permissions: [{ resource: 'categories', action: 'create', scope: 'all' }],
  allowedMethods: ['POST']
})