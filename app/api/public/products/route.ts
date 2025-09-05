/**
 * Public Products API
 * Provides read-only access to published products for the e-commerce frontend
 * Enhanced with caching, rate limiting, and improved filtering
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma, Prisma, ProductStatus } from '@/lib/db'
import { CacheService } from '@/lib/cache'
import { rateLimit, rateLimitConfigs, createRateLimitHeaders } from '@/lib/rate-limit'
import { z } from 'zod'

interface TransformedCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
}

interface TransformedMedia {
  id: string;
  filename: string;
  originalName: string;
  altText: string | null;
  width: number | null;
  height: number | null;
  mimeType: string;
  fileSize: number;
  sortOrder: number;
  isPrimary: boolean;
  url: string;
}

// Initialize cache service
const cache = CacheService.getInstance({ maxMemoryItems: 1000 });
cache.initializeDatabase(prisma);

// Validation schema for query parameters
const querySchema = z.object({
  status: z.enum(['PUBLISHED', 'DRAFT', 'ARCHIVED']).default('PUBLISHED'),
  category: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  featured: z.enum(['true', 'false']).optional(),
  search: z.string().min(1).max(100).optional(),
  minPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  maxPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  inStock: z.enum(['true', 'false']).optional(),
  page: z.string().regex(/^\d+$/).default('1'),
  limit: z.string().regex(/^\d+$/).default('20'),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'price', 'featured', 'inventoryQuantity']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeMedia: z.enum(['true', 'false']).default('true'),
  includeCategories: z.enum(['true', 'false']).default('true'),
})

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, rateLimitConfigs.public)
    if (!rateLimitResult.success) {
      const headers = createRateLimitHeaders(rateLimitResult)
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${rateLimitResult.retryAfter} seconds.`,
        },
        {
          status: 429,
          headers,
        }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Validate and parse query parameters
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedParams = querySchema.parse(queryParams)
    
    const {
      status,
      category,
      categoryId,
      featured,
      search,
      minPrice,
      maxPrice,
      inStock,
      page: pageStr,
      limit: limitStr,
      sortBy,
      sortOrder,
      includeMedia,
      includeCategories,
    } = validatedParams

    const page = parseInt(pageStr)
    const limit = Math.min(parseInt(limitStr), 100) // Cap at 100 items per page

    // Generate cache key
    const cacheKey = `products:${JSON.stringify(validatedParams)}`
    
    // Try to get from cache first
    const cachedResult = cache.getMemory(cacheKey)
    if (cachedResult) {
      const response = NextResponse.json(cachedResult)
      const rateLimitHeaders = createRateLimitHeaders(rateLimitResult)
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      response.headers.set('X-Cache', 'HIT')
      return response
    }

    // Build where clause with improved filtering
    const where: Prisma.ProductWhereInput = {
      status: status as ProductStatus,
    }

    if (featured !== undefined) {
      where.featured = featured === 'true'
    }

    if (inStock === 'true') {
      where.inventoryQuantity = { gt: 0 }
    }

    // Enhanced search functionality
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { seoTitle: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Price range filtering
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }

    // Category filtering (support both slug and ID)
    if (category || categoryId) {
      where.categories = {
        some: categoryId 
          ? { categoryId }
          : { category: { slug: category } }
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Build order by clause with multiple sort options
    const orderBy: Prisma.ProductOrderByWithRelationInput = {}
    switch (sortBy) {
      case 'price':
        orderBy.price = sortOrder
        break
      case 'name':
        orderBy.name = sortOrder
        break
      case 'featured':
        orderBy.featured = sortOrder
        break
      case 'inventoryQuantity':
        orderBy.inventoryQuantity = sortOrder
        break
      case 'updatedAt':
        orderBy.updatedAt = sortOrder
        break
      default:
        orderBy.createdAt = sortOrder
    }

    // Build include clause based on parameters
    const include: Prisma.ProductInclude = {}
    
    if (includeCategories === 'true') {
      include.categories = {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              parentId: true,
            }
          }
        }
      }
    }

    if (includeMedia === 'true') {
      include.media = {
        include: {
          media: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              altText: true,
              width: true,
              height: true,
              mimeType: true,
              fileSize: true,
            }
          }
        },
        orderBy: [
          { isPrimary: 'desc' },
          { sortOrder: 'asc' }
        ]
      }
    }

    // Fetch products with relations
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    // Transform data for frontend consumption
    const transformedProducts = products.map(product => {
      const baseProduct: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        shortDescription: string | null;
        price: number;
        comparePrice: number | null;
        sku: string | null;
        inventoryQuantity: number;
        weight: number | null;
        dimensions: Prisma.JsonValue;
        status: ProductStatus;
        featured: boolean;
        seoTitle: string | null;
        seoDescription: string | null;
        createdAt: string;
        updatedAt: string;
        categories?: TransformedCategory[];
        media?: TransformedMedia[];
      } = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price.toNumber(),
        comparePrice: product.comparePrice?.toNumber() || null,
        sku: product.sku,
        inventoryQuantity: product.inventoryQuantity,
        weight: product.weight?.toNumber() || null,
        dimensions: product.dimensions,
        status: product.status,
        featured: product.featured,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      }

      // Add categories if requested
      if (includeCategories === 'true' && product.categories) {
        baseProduct.categories = product.categories.map((pc: { category: TransformedCategory }) => pc.category)
      }

      // Add media if requested
      if (includeMedia === 'true' && product.media) {
        baseProduct.media = product.media.map((pm: { media: { id: string; filename: string; originalName: string; altText: string | null; width: number | null; height: number | null; mimeType: string; fileSize: number; }; sortOrder: number; isPrimary: boolean; }) => ({
          id: pm.media.id,
          filename: pm.media.filename,
          originalName: pm.media.originalName,
          altText: pm.media.altText,
          width: pm.media.width,
          height: pm.media.height,
          mimeType: pm.media.mimeType,
          fileSize: pm.media.fileSize,
          sortOrder: pm.sortOrder,
          isPrimary: pm.isPrimary,
          url: `/uploads/${pm.media.filename}`, // Add full URL
        }))
      }

      return baseProduct
    })

    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    const result = {
      products: transformedProducts,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
      },
      filters: {
        status,
        category,
        categoryId,
        featured,
        search,
        minPrice,
        maxPrice,
        inStock,
        sortBy,
        sortOrder,
      },
      meta: {
        timestamp: new Date().toISOString(),
        cached: false,
      }
    }

    // Cache the result for 5 minutes
    cache.setMemory(cacheKey, result, 300)

    const response = NextResponse.json(result)
    
    // Add rate limit headers
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult)
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    // Add cache headers
    response.headers.set('X-Cache', 'MISS')
    response.headers.set('Cache-Control', 'public, max-age=300') // 5 minutes
    
    return response

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}