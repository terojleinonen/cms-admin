/**
 * Security Events API
 * GET /api/admin/security/events - Get security events
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { SecurityService, SecurityEventType } from '@/lib/security'
import { prisma } from '@/lib/db'

export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    // Check authentication and admin role
    ,
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const severity = searchParams.get('severity') || undefined
    const type = searchParams.get('type') || undefined

    // Get security service instance
    const securityService = SecurityService.getInstance(prisma)
    
    // Get security events
    const events = await securityService.getSecurityEvents(limit, severity, type as SecurityEventType)

    return createApiSuccessResponse( events )

  } catch (error) {
    console.error('Security events API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security events' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)