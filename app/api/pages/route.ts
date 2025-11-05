/**
 * Pages API
 * Handles CRUD operations for content pages
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { hasPermission } from '@/lib/permissions'

// Validation schema for page creation/update
const pageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  content: z.string().optional(),
  excerpt: z.string().optional(),
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  template: z.string().default('default'),
  seoTitle: z.string().max(255, 'SEO title too long').optional(),
  seoDescription: z.string().max(500, 'SEO description too long').optional(),
  publishedAt: z.string().datetime().optional().nullable()
})

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).optional(),
  template: z.string().optional(),
  sortBy: z.enum(['title', 'createdAt', 'updatedAt', 'publishedAt']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// GET /api/pages - List pages with filtering and pagination
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams))

    // Build where clause
    const where: Record<string, unknown> = {}
    
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } }
      ]
    }

    if (query.status) {
      where.status = query.status
    }

    if (query.template) {
      where.template = query.template
    }

    // Calculate pagination
    const skip = (query.page - 1) * query.limit

    // Get pages with pagination
    const [pages, totalCount] = await Promise.all([
      prisma.page.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          [query.sortBy]: query.sortOrder
        },
        skip,
        take: query.limit
      }),
      prisma.page.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / query.limit)

    return NextResponse.json({
      pages,
      pagination: {
        page: query.page,
        limit: query.limit,
        totalCount,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error fetching pages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'pages', action: 'read', scope: 'all' }]
}
)

// POST /api/pages - Create new page
export const POST = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = pageSchema.parse(body)

    // Check if slug already exists
    const existingPage = await prisma.page.findUnique({
      where: { slug: validatedData.slug }
    })

    if (existingPage) {
      return NextResponse.json(
        { error: 'A page with this slug already exists' },
        { status: 409 }
      )
    }

    // Create page
    const page = await prisma.page.create({
      data: {
        ...validatedData,
        publishedAt: validatedData.publishedAt ? new Date(validatedData.publishedAt) : null,
        createdBy: session.user.id
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(page, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid page data', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating page:', error)
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'pages', action: 'create', scope: 'all' }]
}
)