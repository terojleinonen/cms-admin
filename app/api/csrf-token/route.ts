/**
 * CSRF Token API
 * Provides secure CSRF tokens for client-side requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { createCSRFTokenResponse } from '@/lib/csrf-protection'
import { withAPISecurity } from '@/lib/api-security'

// GET /api/csrf-token - Get CSRF token
export const GET = withAPISecurity(
  withApiPermissions(
    async (request: NextRequest, { user }) => {
      try {
        // Generate session ID (use user ID if authenticated, otherwise generate anonymous ID)
        const sessionId = user?.id || `anonymous-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        // Create CSRF token response with secure cookie
        return createCSRFTokenResponse(sessionId, request)
        
      } catch (error) {
        console.error('Error generating CSRF token:', error)
        return NextResponse.json(
          { 
            error: {
              code: 'CSRF_TOKEN_GENERATION_FAILED',
              message: 'Failed to generate CSRF token',
              timestamp: new Date().toISOString(),
            },
            success: false
          },
          { status: 500 }
        )
      }
    },
    {
      permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
    }
  ),
  {
    allowedMethods: ['GET'],
    skipRateLimit: false,
    rateLimitConfig: 'public'
  }
)