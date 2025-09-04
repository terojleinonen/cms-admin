/**
 * Search Analytics API
 * Handles search analytics tracking and reporting
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { trackSearchEvent, getSearchAnalytics } from '@/lib/search'
import { z } from 'zod'

// Validation schema for search analytics events
const searchEventSchema = z.object({
  action: z.enum(['search', 'click', 'suggestion']),
  query: z.string().min(1),
  resultsCount: z.number().min(0).optional(),
  clickedResultId: z.string().optional(),
  searchTime: z.number().min(0).optional(),
  filters: z.record(z.string(), z.any()).optional()
})

// Validation schema for analytics queries
const analyticsQuerySchema = z.object({
  type: z.enum(['overview', 'detailed']).optional().default('overview'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(1000).optional().default(100)
})

// POST /api/search/analytics - Track search events
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedEvent = searchEventSchema.parse(body)

    // Extract additional context from request
    const userAgent = request.headers.get('user-agent') || undefined
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     undefined

    // Track the search event
    await trackSearchEvent({
      query: validatedEvent.query,
      resultsCount: validatedEvent.resultsCount || 0,
      userId: session.user.id,
      filters: validatedEvent.filters,
      userAgent,
      ipAddress,
      searchTime: validatedEvent.searchTime
    })

    return NextResponse.json({
      success: true,
      message: 'Search event tracked successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid event data', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error tracking search event:', error)
    return NextResponse.json(
      { error: 'Failed to track search event' },
      { status: 500 }
    )
  }
}

// GET /api/search/analytics - Get search analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryOptions = {
      type: (searchParams.get('type') as 'overview' | 'detailed') || 'overview',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100
    }

    // Validate query parameters
    const validatedOptions = analyticsQuerySchema.parse(queryOptions)

    // Parse dates if provided
    const options: Record<string, unknown> = {
      limit: validatedOptions.limit
    }

    if (validatedOptions.startDate) {
      options.startDate = new Date(validatedOptions.startDate)
    }
    if (validatedOptions.endDate) {
      options.endDate = new Date(validatedOptions.endDate)
    }

    // Get analytics data
    const analytics = await getSearchAnalytics(validatedOptions.type, options)

    if (validatedOptions.type === 'overview') {
      return NextResponse.json({
        overview: analytics,
        type: 'overview',
        period: {
          startDate: validatedOptions.startDate,
          endDate: validatedOptions.endDate
        }
      })
    } else {
      return NextResponse.json({
        ...analytics,
        type: 'detailed',
        period: {
          startDate: validatedOptions.startDate,
          endDate: validatedOptions.endDate
        }
      })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error retrieving search analytics:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve analytics' },
      { status: 500 }
    )
  }
}