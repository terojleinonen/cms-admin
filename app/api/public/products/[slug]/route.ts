/**
 * Public Single Product API
 * Provides read-only access to a single published product by slug or ID
 * Enhanced with caching, rate limiting, and comprehensive data
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { prisma, Prisma } from '@/lib/db'
import { isValidUUID } from '@/lib/format-utils'
import { z } from 'zod'

interface TransformedCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  parent: { id: string; name: string; slug: string; } | null;
  breadcrumb: { id: string; name: string; slug: string; }[];
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
  thumbnailUrl: string;
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  price: number;
  comparePrice: number | null;
  featured: boolean;
  primaryImage: {
    id: string;
    filename: string;
    altText: string | null;
    url: string;
  } | null;
}

interface TransformedProduct {
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
  status: string;
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
  categories?: TransformedCategory[];
  media?: TransformedMedia[];
  primaryImage?: TransformedMedia | null;
  galleryImages?: TransformedMedia[];
  relatedProducts?: RelatedProduct[];
}

// Simple in-memory cache for this route
const cache = new Map<string, { data: unknown; expires: number }>()

// Using consolidated isValidUUID from format-utils

// Validation schema for query parameters
const querySchema = z.object({
  includeMedia: z.enum(['true', 'false']).default('true'),
  includeCategories: z.enum(['true', 'false']).default('true'),
  includeRelated: z.enum(['true', 'false']).default('false'),
  relatedLimit: z.string().regex(/^\d+$/).default('4'),
})

export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    const { slug } = params
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryParams = Object.fromEntries(searchParams.entries())
    const {
      includeMedia,
      includeCategories,
      includeRelated,
      relatedLimit: relatedLimitStr,
    } = querySchema.parse(queryParams)

    const relatedLimit = parseInt(relatedLimitStr)

    // Determine if the parameter is an ID (UUID) or slug
    const isId = isValidUUID(slug)

    // Generate cache key
    const cacheKey = `product:${slug}:${JSON.stringify({ includeMedia, includeCategories, includeRelated, relatedLimit })}`
    
    // Try to get from cache first
    const cached = cache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      const response = NextResponse.json(cached.data)
      response.headers.set('X-Cache', 'HIT')
      return response
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
              parent: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                }
              }
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
              folder: true,
            }
          }
        },
        orderBy: [
          { isPrimary: 'desc' },
          { sortOrder: 'asc' }
        ]
      }
    }
    
    const product = await prisma.product.findUnique({
      where: isId 
        ? { id: slug, status: 'PUBLISHED' }
        : { slug, status: 'PUBLISHED' },
      include,
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Transform data for frontend consumption
    const transformedProduct: TransformedProduct = {
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
      transformedProduct.categories = (product.categories as any[]).map((pc) => ({
        ...pc.category,
        breadcrumb: pc.category.parent 
          ? [pc.category.parent, { id: pc.category.id, name: pc.category.name, slug: pc.category.slug }]
          : [{ id: pc.category.id, name: pc.category.name, slug: pc.category.slug }]
      }))
    }

    // Add media if requested
    if (includeMedia === 'true' && product.media) {
      transformedProduct.media = (product.media as any[]).map((pm) => ({
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
        url: `/${pm.media.folder}/${pm.media.filename}`,
        thumbnailUrl: `/${pm.media.folder}/thumbnails/${pm.media.filename}`,
      }))

      // Separate primary and gallery images
      const primaryImage = transformedProduct.media.find(m => m.isPrimary)
      const galleryImages = transformedProduct.media.filter(m => !m.isPrimary)
      
      transformedProduct.primaryImage = primaryImage || transformedProduct.media[0] || null
      transformedProduct.galleryImages = galleryImages
    }

    // Add related products if requested
    if (includeRelated === 'true' && product.categories && product.categories.length > 0) {
      const categoryIds = (product.categories as any[]).map(pc => pc.categoryId)
      
      const relatedProducts = await prisma.product.findMany({
        where: {
          id: { not: product.id }, // Exclude current product
          status: 'PUBLISHED',
          categories: {
            some: {
              categoryId: { in: categoryIds }
            }
          }
        },
        include: {
          media: {
            where: { isPrimary: true },
            include: {
              media: {
                select: {
                  id: true,
                  filename: true,
                  altText: true,
                  folder: true,
                }
              }
            }
          }
        },
        take: relatedLimit,
        orderBy: [
          { featured: 'desc' },
          { createdAt: 'desc' }
        ]
      })

      transformedProduct.relatedProducts = relatedProducts.map(rp => ({
        id: rp.id,
        name: rp.name,
        slug: rp.slug,
        shortDescription: rp.shortDescription,
        price: rp.price.toNumber(),
        comparePrice: rp.comparePrice?.toNumber() || null,
        featured: rp.featured,
        primaryImage: rp.media[0] ? {
          id: rp.media[0].media.id,
          filename: rp.media[0].media.filename,
          altText: rp.media[0].media.altText,
          url: `/${rp.media[0].media.folder}/${rp.media[0].media.filename}`,
        } : null
      }))
    }

    const result = {
      product: transformedProduct,
      meta: {
        timestamp: new Date().toISOString(),
        cached: false,
      }
    }

    // Cache the result for 10 minutes
    cache.set(cacheKey, { data: result, expires: Date.now() + 600000 })

    const response = NextResponse.json(result)
    
    // Add cache headers
    response.headers.set('X-Cache', 'MISS')
    response.headers.set('Cache-Control', 'public, max-age=600') // 10 minutes
    
    return response

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)