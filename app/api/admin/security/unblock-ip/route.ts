/**
 * Unblock IP API
 * POST /api/admin/security/unblock-ip - Unblock an IP address
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { SecurityService } from '@/lib/security'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const unblockIPSchema = z.object({
  ip: z.string().min(1, 'Invalid IP address')
})

export const POST = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    // Check authentication and admin role
    ,
        { status: 401 }
      )
    }

    // Validate request body
    const body = await request.json()
    const { ip } = unblockIPSchema.parse(body)

    // Get security service instance
    const securityService = SecurityService.getInstance(prisma)
    
    // Unblock the IP address
    securityService.unblockIP(ip)

    // Log the admin action
    await securityService.logSecurityEvent(
      'admin_action',
      'medium',
      `IP address ${ip} unblocked by admin`,
      request.headers.get('x-forwarded-for') || '',
      { 
        action: 'unblock_ip',
        targetIP: ip,
        adminId: session.user.id
      },
      session.user.id,
      request.headers.get('user-agent') || ''
    )

    return createApiSuccessResponse( success: true )

  } catch (error) {
    console.error('Unblock IP API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to unblock IP address' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)