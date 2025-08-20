/**
 * Current user API endpoint
 * Returns information about the currently authenticated user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, requireAuth } from '../../../lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth()
    
    // If not authenticated, return error response
    if (authResult instanceof Response) {
      return authResult
    }

    // Get current user details
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      )
    }

    // Return user information (without sensitive data)
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get current user error:', error)

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user information',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    )
  }
}