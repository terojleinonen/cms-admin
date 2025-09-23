/**
 * Resolve Security Event API
 * POST /api/admin/security/events/[id]/resolve - Resolve a security event
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { SecurityService } from '@/lib/security'
import { prisma } from '@/lib/db'

export const POST = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    // Check authentication and admin role
    ,
        { status: 401 }
      )
    }

    const { id } = params

    // Get security service instance
    const securityService = SecurityService.getInstance(prisma)
    
    // Resolve the security event
    const resolved = await securityService.resolveSecurityEvent(id, session.user.id)

    if (!resolved) {
      return NextResponse.json(
        { error: 'Security event not found' },
        { status: 404 }
      )
    }

    return createApiSuccessResponse( success: true )

  } catch (error) {
    console.error('Resolve security event API error:', error)
    return NextResponse.json(
      { error: 'Failed to resolve security event' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)