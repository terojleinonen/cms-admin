/**
 * Search API
 * Handles search requests across products, pages, and media
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { searchService } from '@/lib/search'
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
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    if (!user) {
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
    const searchResults = await searchService.search(validatedOptions)

    return createApiSuccessResponse({
      ...searchResults,
      query: validatedOptions.query,
      options: validatedOptions
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error performing search:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)

// POST /api/search/index - Rebuild search index
export const POST = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // No indexing needed for PostgreSQL-based search
    // Content is automatically searchable when in database
    
    // Get search statistics
    const stats = await searchService.getStats()

    return createApiSuccessResponse({
      message: 'Search system ready (PostgreSQL-based search)',
      stats
    })

  } catch (error) {
    console.error('Error rebuilding search index:', error)
    return NextResponse.json(
      { error: 'Failed to rebuild search index' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)