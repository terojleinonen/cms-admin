/**
 * Search Suggestions API
 * Handles search autocomplete and suggestions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { getSuggestions, getSearchService } from '@/app/lib/search'
import { z } from 'zod'

// Validation schema for suggestions requests
const suggestionsSchema = z.object({
  query: z.string().optional().default(''),
  limit: z.number().min(1).max(20).optional().default(5),
  type: z.enum(['suggestions', 'popular']).optional()
})

// GET /api/search/suggestions - Get search suggestions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const suggestionOptions = {
      query: searchParams.get('query') || '',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 5,
      type: searchParams.get('type') as 'suggestions' | 'popular' | undefined
    }

    // Validate query parameters
    const validatedOptions = suggestionsSchema.parse(suggestionOptions)

    let suggestions: string[] = []
    let responseType: 'suggestions' | 'popular' = 'suggestions'

    if (!validatedOptions.query.trim() || validatedOptions.type === 'popular') {
      // Return popular terms when no query or explicitly requested
      const searchService = getSearchService()
      suggestions = searchService.getPopularTerms(validatedOptions.limit)
      responseType = 'popular'
    } else {
      // Return query-based suggestions
      suggestions = await getSuggestions(validatedOptions.query, {
        limit: validatedOptions.limit
      })
      responseType = 'suggestions'
    }

    return NextResponse.json({
      suggestions,
      query: validatedOptions.query,
      type: responseType,
      limit: validatedOptions.limit
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error getting search suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    )
  }
}