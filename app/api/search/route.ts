/**
 * Search API
 * Handles search requests across products, pages, and media
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'
import { searchService, SearchOptions } from '@/app/lib/search'
import { z } from 'zod'

// Validation schema for search requests
const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  types: z.array(z.enum(['product', 'page', 'media'])).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
  filters: z.object({
    status: z.array(z.string()).optional(),
    category: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    dateRange: z.object({
      start: z.string().optional(),
      end: z.string().optional()
    }).optional()
  }).optional(),
  sortBy: z.enum(['relevance', 'date', 'title']).optional().default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

// GET /api/search - Perform search
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const searchOptions = {
      query: searchParams.get('query') || '',
      types: searchParams.get('types')?.split(',') as ('product' | 'page' | 'media')[] || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      filters: {
        status: searchParams.get('status')?.split(',') || undefined,
        category: searchParams.get('category')?.split(',') || undefined,
        tags: searchParams.get('tags')?.split(',') || undefined,
        dateRange: {
          start: searchParams.get('dateStart') || undefined,
          end: searchParams.get('dateEnd') || undefined
        }
      },
      sortBy: (searchParams.get('sortBy') as 'relevance' | 'date' | 'title') || 'relevance',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    }

    // Validate search options
    const validatedOptions = searchSchema.parse(searchOptions)

    // Perform search
    const searchResults = searchService.search(validatedOptions)

    return NextResponse.json({
      ...searchResults,
      query: validatedOptions.query,
      options: validatedOptions
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error performing search:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

// POST /api/search/index - Rebuild search index
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Clear existing index
    searchService.clearIndex()

    // Index products
    const products = await prisma.product.findMany({
      include: {
        categories: {
          include: {
            category: true
          }
        },
        creator: {
          select: {
            name: true
          }
        }
      }
    })

    const productDocuments = products.map(product => ({
      id: product.id,
      type: 'product' as const,
      title: product.name,
      content: [product.description, product.shortDescription].filter(Boolean).join(' '),
      excerpt: product.shortDescription || '',
      tags: [], // Products don't have tags in current schema
      status: product.status,
      category: product.categories[0]?.category.name || '',
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      url: `/admin/products/${product.id}`,
      metadata: {
        price: product.price,
        sku: product.sku,
        featured: product.featured,
        creator: product.creator.name
      }
    }))

    // Index pages
    const pages = await prisma.page.findMany({
      include: {
        creator: {
          select: {
            name: true
          }
        }
      }
    })

    const pageDocuments = pages.map(page => ({
      id: page.id,
      type: 'page' as const,
      title: page.title,
      content: page.content || '',
      excerpt: page.excerpt || '',
      tags: [], // Pages don't have tags in current schema
      status: page.status,
      category: page.template,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
      url: `/admin/pages/${page.id}`,
      metadata: {
        template: page.template,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        publishedAt: page.publishedAt?.toISOString(),
        creator: page.creator.name
      }
    }))

    // Index media
    const media = await prisma.media.findMany({
      include: {
        creator: {
          select: {
            name: true
          }
        }
      }
    })

    const mediaDocuments = media.map(mediaItem => ({
      id: mediaItem.id,
      type: 'media' as const,
      title: mediaItem.originalName,
      content: mediaItem.altText || '',
      excerpt: mediaItem.altText || '',
      tags: [], // Media doesn't have tags in current schema
      status: 'published', // Media is always considered published
      category: mediaItem.mimeType.split('/')[0], // image, video, etc.
      createdAt: mediaItem.createdAt.toISOString(),
      updatedAt: mediaItem.createdAt.toISOString(), // Media doesn't have updatedAt
      url: `/admin/media/${mediaItem.id}`,
      metadata: {
        filename: mediaItem.filename,
        mimeType: mediaItem.mimeType,
        fileSize: mediaItem.fileSize,
        width: mediaItem.width,
        height: mediaItem.height,
        folder: mediaItem.folder,
        creator: mediaItem.creator.name
      }
    }))

    // Add all documents to search index
    const allDocuments = [...productDocuments, ...pageDocuments, ...mediaDocuments]
    searchService.addDocuments(allDocuments)

    // Get index statistics
    const stats = searchService.getStats()

    return NextResponse.json({
      message: 'Search index rebuilt successfully',
      stats
    })

  } catch (error) {
    console.error('Error rebuilding search index:', error)
    return NextResponse.json(
      { error: 'Failed to rebuild search index' },
      { status: 500 }
    )
  }
}