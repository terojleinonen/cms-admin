/**
 * Products API Routes
 * Handles CRUD operations for products with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma, Prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { ProductStatus } from '@prisma/client'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { withAPISecurity, validateAndSanitizeBody } from '@/lib/api-security'
import { validationSchemas } from '@/lib/validation-schemas'



// Use centralized validation schemas
const { product: productSchemas } = validationSchemas

/**
 * GET /api/products
 * Retrieve products with filtering, search, and pagination
 */
export const GET = withAPISecurity(
  withApiPermissions(
    async (request: NextRequest, { user }) => {
      try {
        // Validate query parameters
        const { searchParams } = new URL(request.url)
        const queryValidation = productSchemas.query.safeParse(Object.fromEntries(searchParams))
        
        if (!queryValidation.success) {
          return NextResponse.json(
            {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid query parameters',
                details: queryValidation.error.flatten().fieldErrors,
                timestamp: new Date().toISOString(),
              },
              success: false,
            },
            { status: 400 }
          )
        }

        const query = queryValidation.data

        // Build where clause
        const where: Prisma.ProductWhereInput = {}

        if (query.search) {
          where.OR = [
            { name: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { shortDescription: { contains: query.search, mode: 'insensitive' } },
            { sku: { contains: query.search, mode: 'insensitive' } },
          ]
        }

        if (query.status) {
          where.status = query.status
        }

        if (query.featured !== undefined) {
          where.featured = query.featured
        }

        if (query.minPrice || query.maxPrice) {
          where.price = {}
          if (query.minPrice) where.price.gte = query.minPrice
          if (query.maxPrice) where.price.lte = query.maxPrice
        }

        if (query.categoryId) {
          where.categories = {
            some: {
              categoryId: query.categoryId,
            },
          }
        }

        if (query.tags && query.tags.length > 0) {
          where.tags = {
            hasSome: query.tags,
          }
        }

        // Calculate pagination
        const skip = (query.page - 1) * query.limit

        // Build order by clause
        const orderBy: Prisma.ProductOrderByWithRelationInput = {}
        if (query.sortBy === 'price') {
          orderBy.price = query.sortOrder
        } else if (query.sortBy === 'name') {
          orderBy.name = query.sortOrder
        } else if (query.sortBy === 'inventoryQuantity') {
          orderBy.inventoryQuantity = query.sortOrder
        } else {
          orderBy.createdAt = query.sortOrder
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
            take: query.limit,
          }),
          prisma.product.count({ where }),
        ])

        const totalPages = Math.ceil(total / query.limit)

        // Transform Decimal fields to numbers for JSON response
        const transformedProducts = products.map(product => ({
          ...product,
          price: product.price.toNumber(),
          comparePrice: product.comparePrice?.toNumber() || null,
          weight: product.weight?.toNumber() || null,
        }))

        return createApiSuccessResponse({
          products: transformedProducts,
          total,
          page: query.page,
          limit: query.limit,
          totalPages,
        })
      } catch (error) {
        console.error('Error fetching products:', error)
        return NextResponse.json(
          { 
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to fetch products',
              timestamp: new Date().toISOString()
            },
            success: false
          },
          { status: 500 }
        )
      }
    },
    {
      permissions: [{ resource: 'products', action: 'read', scope: 'all' }]
    }
  ),
  {
    allowedMethods: ['GET'],
    rateLimitConfig: 'public'
  }
)

/**
 * POST /api/products
 * Create a new product
 */
export const POST = withAPISecurity(
  withApiPermissions(
    async (request: NextRequest, { user }) => {
      try {
        // Validate and sanitize request body
        const bodyValidation = await validateAndSanitizeBody(request, productSchemas.create)
        
        if (!bodyValidation.success) {
          return NextResponse.json(
            {
              error: {
                code: 'VALIDATION_ERROR',
                message: bodyValidation.error,
                details: bodyValidation.details,
                timestamp: new Date().toISOString(),
              },
              success: false,
            },
            { status: 400 }
          )
        }

        const validatedData = bodyValidation.data

        // Check if slug already exists
        const existingProduct = await prisma.product.findUnique({
          where: { slug: validatedData.slug },
        })

        if (existingProduct) {
          return NextResponse.json(
            { 
              error: {
                code: 'DUPLICATE_ENTRY',
                message: 'Product with this slug already exists',
                timestamp: new Date().toISOString(),
              },
              success: false
            },
            { status: 409 }
          )
        }

        // Check if SKU already exists (if provided)
        if (validatedData.sku) {
          const existingSku = await prisma.product.findUnique({
            where: { sku: validatedData.sku },
          })

          if (existingSku) {
            return NextResponse.json(
              { 
                error: {
                  code: 'DUPLICATE_ENTRY',
                  message: 'Product with this SKU already exists',
                  timestamp: new Date().toISOString(),
                },
                success: false
              },
              { status: 409 }
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
              { 
                error: {
                  code: 'INVALID_REFERENCE',
                  message: 'One or more categories not found',
                  timestamp: new Date().toISOString(),
                },
                success: false
              },
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
            createdBy: user!.id,
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

        return createApiSuccessResponse({ product: transformedProduct }, 201)
      } catch (error) {
        console.error('Error creating product:', error)
        return NextResponse.json(
          { 
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to create product',
              timestamp: new Date().toISOString()
            },
            success: false
          },
          { status: 500 }
        )
      }
    },
    {
      permissions: [{ resource: 'products', action: 'create', scope: 'all' }]
    }
  ),
  {
    allowedMethods: ['POST'],
    requireCSRF: true,
    rateLimitConfig: 'sensitive'
  }
)