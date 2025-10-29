/**
 * Products API Routes
 * Handles CRUD operations for products with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma, Prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { ProductStatus } from '@prisma/client'
import { withSimpleAuth, validateBody, createSuccessResponse, createErrorResponse } from '@/lib/simple-api-middleware'
import { z } from 'zod'



// Simplified validation schemas
const productQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  featured: z.string().optional().transform(val => val === 'true'),
  minPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  maxPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  categoryId: z.string().uuid().optional(),
  tags: z.string().optional().transform(val => val ? val.split(',') : []),
  sortBy: z.enum(['price', 'name', 'inventoryQuantity', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

const productCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  price: z.number().positive(),
  comparePrice: z.number().positive().optional(),
  sku: z.string().optional(),
  inventoryQuantity: z.number().int().min(0).default(0),
  status: z.nativeEnum(ProductStatus).default('DRAFT'),
  featured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  categoryIds: z.array(z.string().uuid()).default([]),
  weight: z.number().positive().optional()
})

/**
 * GET /api/products
 * Retrieve products with filtering, search, and pagination
 */
export const GET = withSimpleAuth(
  async (request: NextRequest, { user }) => {
    try {
      // Validate query parameters
      const { searchParams } = new URL(request.url)
      const queryValidation = productQuerySchema.safeParse(Object.fromEntries(searchParams))
      
      if (!queryValidation.success) {
        return createErrorResponse('Invalid query parameters')
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

      return createSuccessResponse({
        products: transformedProducts,
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
      })
    } catch (error) {
      console.error('Error fetching products:', error)
      return createErrorResponse('Failed to fetch products', 500)
    }
  },
  {
    resource: 'products',
    action: 'read',
    allowedMethods: ['GET']
  }
)

/**
 * POST /api/products
 * Create a new product
 */
export const POST = withSimpleAuth(
  async (request: NextRequest, { user }) => {
    try {
      // Validate request body
      const bodyValidation = await validateBody(request, productCreateSchema)
      
      if (!bodyValidation.success) {
        return createErrorResponse(bodyValidation.error)
      }

      const validatedData = bodyValidation.data

        // Check if slug already exists
        const existingProduct = await prisma.product.findUnique({
          where: { slug: validatedData.slug },
        })

        if (existingProduct) {
          return createErrorResponse('Product with this slug already exists', 409)
        }

        // Check if SKU already exists (if provided)
        if (validatedData.sku) {
          const existingSku = await prisma.product.findUnique({
            where: { sku: validatedData.sku },
          })

          if (existingSku) {
            return createErrorResponse('Product with this SKU already exists', 409)
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
            return createErrorResponse('One or more categories not found')
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

      return createSuccessResponse({ product: transformedProduct }, 201)
    } catch (error) {
      console.error('Error creating product:', error)
      return createErrorResponse('Failed to create product', 500)
    }
  },
  {
    resource: 'products',
    action: 'create',
    allowedMethods: ['POST']
  }
)