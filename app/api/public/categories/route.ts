/**
 * Public Categories API
 * Provides read-only access to active categories for the e-commerce frontend
 * Enhanced with caching, rate limiting, and improved hierarchical data
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma, Prisma } from '@/lib/db'
import { CacheService } from '@/lib/cache'
import { rateLimit, rateLimitConfigs, createRateLimitHeaders } from '@/lib/rate-limit'
import { z } from 'zod'
import { Category } from '@prisma/client'

interface TransformedFlatCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  parent: { id: string; name: string; slug: string; } | null;
  sortOrder: number;
  productCount: number;
  childrenCount: number;
  hasChildren: boolean;
  path: { id: string; name: string; slug: string; }[];
  createdAt: string;
  updatedAt: string;
}

type CategoryWithCount = Category & {
  _count: {
    products: number;
    children: number;
  };
};

type CategoryWithParentAndCount = Category & {
  parent: { id: string; name: string; slug: string; } | null;
  _count: {
    products: number;
    children: number;
  };
};

// Initialize cache service
const cache = CacheService.getInstance({ maxMemoryItems: 500 });
cache.initializeDatabase(prisma);

// Validation schema for query parameters
const querySchema = z.object({
  hierarchy: z.enum(['true', 'false']).default('false'),
  includeEmpty: z.enum(['true', 'false']).default('false'),
  maxDepth: z.string().regex(/^\d+$/).default('3'),
  parentId: z.string().uuid().optional(),
  search: z.string().min(1).max(100).optional(),
})

interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  productCount: number;
  totalProductCount: number;
  childrenCount: number;
  depth: number;
  hasChildren: boolean;
  children: CategoryTreeNode[] | undefined;
  path: { id: string; name: string; slug: string; }[];
}

// Helper function to build category tree recursively
async function buildCategoryTree(
  parentId: string | null, 
  maxDepth: number, 
  currentDepth: number = 0,
  includeEmpty: boolean = false,
  search?: string
): Promise<CategoryTreeNode[]> {
  if (currentDepth >= maxDepth) return []

  const where: Prisma.CategoryWhereInput = {
    isActive: true,
    parentId,
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  const categories = await prisma.category.findMany({
    where,
    include: {
      _count: {
        select: {
          products: {
            where: {
              product: {
                status: 'PUBLISHED'
              }
            }
          },
          children: {
            where: { isActive: true }
          }
        }
      }
    },
    orderBy: { sortOrder: 'asc' }
  })

  const result: CategoryTreeNode[] = []
  
  for (const category of categories as CategoryWithCount[]) {
    // Skip categories with no products if includeEmpty is false
    if (!includeEmpty && category._count.products === 0 && category._count.children === 0) {
      continue
    }

    const children = await buildCategoryTree(
      category.id, 
      maxDepth, 
      currentDepth + 1, 
      includeEmpty,
      search
    )

    // Calculate total product count including children
    const totalProductCount = category._count.products + 
      children.reduce((sum: number, child: CategoryTreeNode) => sum + (child.totalProductCount || 0), 0)

    result.push({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      sortOrder: category.sortOrder,
      productCount: category._count.products,
      totalProductCount,
      childrenCount: category._count.children,
      depth: currentDepth,
      hasChildren: children.length > 0,
      children: children.length > 0 ? children : undefined,
      path: await getCategoryPath(category.id),
    })
  }

  return result
}

// Helper function to get category breadcrumb path
async function getCategoryPath(categoryId: string): Promise<Array<{id: string, name: string, slug: string}>> {
  const path = []
  let currentId: string | null = categoryId

  while (currentId) {
    const category: { id: string; name: string; slug: string; parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, slug: true, parentId: true }
    })

    if (!category) break

    path.unshift({
      id: category.id,
      name: category.name,
      slug: category.slug
    })

    currentId = category.parentId
  }

  return path
}

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
    
    // Validate query parameters
    const queryParams = Object.fromEntries(searchParams.entries())
    const {
      hierarchy,
      includeEmpty,
      maxDepth: maxDepthStr,
      parentId,
      search,
    } = querySchema.parse(queryParams)

    const maxDepth = parseInt(maxDepthStr)

    // Generate cache key
    const cacheKey = `categories:${JSON.stringify({ hierarchy, includeEmpty, maxDepth, parentId, search })}`
    
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

    let result: { categories: CategoryTreeNode[] | TransformedFlatCategory[]; meta: { type: string; maxDepth?: number; includeEmpty: boolean; parentId: string | null; search: string | null; timestamp: string; cached: boolean; }; total?: number }

    if (hierarchy === 'true') {
      // Fetch hierarchical categories
      const categories = await buildCategoryTree(
        parentId || null, 
        maxDepth, 
        0, 
        includeEmpty === 'true',
        search
      )

      result = {
        categories,
        meta: {
          type: 'hierarchical',
          maxDepth,
          includeEmpty: includeEmpty === 'true',
          parentId: parentId || null,
          search: search || null,
          timestamp: new Date().toISOString(),
          cached: false,
        }
      }
    } else {
      // Fetch flat list of categories
      const where: Prisma.CategoryWhereInput = {
        isActive: true,
      }

      if (parentId) {
        where.parentId = parentId
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ]
      }

      const categories = await prisma.category.findMany({
        where,
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            }
          },
          _count: {
            select: {
              products: {
                where: {
                  product: {
                    status: 'PUBLISHED'
                  }
                }
              },
              children: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy: { sortOrder: 'asc' }
      })

      // Filter out empty categories if requested
      const filteredCategories = includeEmpty === 'true' 
        ? categories 
        : categories.filter((cat: CategoryWithParentAndCount) => cat._count.products > 0 || cat._count.children > 0)

      // Transform flat data with enhanced information
      const transformedCategories = await Promise.all(
        filteredCategories.map(async (category: CategoryWithParentAndCount) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          parentId: category.parentId,
          parent: category.parent,
          sortOrder: category.sortOrder,
          productCount: category._count.products,
          childrenCount: category._count.children,
          hasChildren: category._count.children > 0,
          path: await getCategoryPath(category.id),
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString(),
        }))
      )

      result = {
        categories: transformedCategories,
        total: transformedCategories.length,
        meta: {
          type: 'flat',
          includeEmpty: includeEmpty === 'true',
          parentId: parentId || null,
          search: search || null,
          timestamp: new Date().toISOString(),
          cached: false,
        }
      }
    }

    // Cache the result for 15 minutes (categories change less frequently)
    cache.setMemory(cacheKey, result, 900)

    const response = NextResponse.json(result)
    
    // Add rate limit headers
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult)
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    // Add cache headers
    response.headers.set('X-Cache', 'MISS')
    response.headers.set('Cache-Control', 'public, max-age=900') // 15 minutes
    
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

    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}