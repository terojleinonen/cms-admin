/**
 * Security Statistics API
 * GET /api/admin/security/stats - Get security statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { SecurityService } from '@/lib/security'
import { prisma } from '@/lib/db'

export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    // Check authentication and admin role
    ,
        { status: 401 }
      )
    }

    // Get security service instance
    const securityService = SecurityService.getInstance(prisma)
    
    // Get security statistics
    const stats = await securityService.getSecurityStats()

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Security stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security statistics' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)