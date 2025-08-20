/**
 * Products API Routes
 * Handles CRUD operations for products with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../lib/auth-config'
import { prisma } from '../../lib/db'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug too long'),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  comparePrice: z.number().min(0, 'Compare price must be positive').optional(),
  sku: z.string().max(100, 'SKU too long').optional(),
  inventoryQuantity: z.number().int().min(0, 'Inventory must be non-negative').default(0),
  weight: z.number().min(0, 'Weight must be positive').optional(),
  dimensions: z.any().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  featured: z.boolean().default(false),
  seoTitle: z.string().max(255, 'SEO title too long').optional(),
  seoDescription: z.string().optional(),
  categoryIds: z.array(z.string().uuid()).default([]),
})

/**
 * GET /api/products
 * Retrieve products with filtering, search, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const categoryId = searchParams.get('categoryId')
    const featured = searchParams.get('featured')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (featured !== null && featured !== undefined) {
      where.featured = featured === 'true'
    }

    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }

    if (categoryId) {
      where.categories = {
        some: {
          categoryId: categoryId,
        },
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Build order by clause
    const orderBy: any = {}
    if (sortBy === 'price') {
      orderBy.price = sortOrder
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder
    } else if (sortBy === 'inventoryQuantity') {
      orderBy.inventoryQuantity = sortOrder
    } else {
      orderBy.createdAt = sortOrder
    }

    // Fetch products with relations
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
          media: {
            include: {
              media: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
          _count: {
            select: {
              categories: true,
              media: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    // Transform Decimal fields to numbers for JSON response
    const transformedProducts = products.map(product => ({
      ...product,
      price: product.price.toNumber(),
      comparePrice: product.comparePrice?.toNumber() || null,
      weight: product.weight?.toNumber() || null,
    }))

    return NextResponse.json({
      products: transformedProducts,
      total,
      page,
      limit,
      totalPages,
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/products
 * Create a new product
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createProductSchema.parse(body)

    // Check if slug already exists
    const existingProduct = await prisma.product.findUnique({
      where: { slug: validatedData.slug },
    })

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this slug already exists' },
        { status: 400 }
      )
    }

    // Check if SKU already exists (if provided)
    if (validatedData.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: validatedData.sku },
      })

      if (existingSku) {
        return NextResponse.json(
          { error: 'Product with this SKU already exists' },
          { status: 400 }
        )
      }
    }

    // Verify categories exist
    if (validatedData.categoryIds.length > 0) {
      const categories = await prisma.category.findMany({
        where: {
          id: { in: validatedData.categoryIds },
        },
      })

      if (categories.length !== validatedData.categoryIds.length) {
        return NextResponse.json(
          { error: 'One or more categories not found' },
          { status: 400 }
        )
      }
    }

    // Create product with categories
    const { categoryIds, ...productData } = validatedData
    
    const product = await prisma.product.create({
      data: {
        ...productData,
        price: new Decimal(productData.price),
        comparePrice: productData.comparePrice ? new Decimal(productData.comparePrice) : null,
        weight: productData.weight ? new Decimal(productData.weight) : null,
        createdBy: session.user.id,
        categories: {
          create: categoryIds.map(categoryId => ({
            categoryId,
          })),
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        media: {
          include: {
            media: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        _count: {
          select: {
            categories: true,
            media: true,
          },
        },
      },
    })

    // Transform Decimal fields to numbers for JSON response
    const transformedProduct = {
      ...product,
      price: product.price.toNumber(),
      comparePrice: product.comparePrice?.toNumber() || null,
      weight: product.weight?.toNumber() || null,
    }

    return NextResponse.json({ product: transformedProduct }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}