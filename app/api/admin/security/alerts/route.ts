/**
 * Security Alerts API
 * Endpoints for managing security alerts and monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { SecurityService, SecurityEvent as SecurityAlert, SecurityEventType } from '@/lib/security'
import { z } from 'zod'

const alertResolutionSchema = z.object({
  alertId: z.string().min(1),
  resolution: z.enum(['resolved', 'false_positive']),
  notes: z.string().optional(),
})

/**
 * GET /api/admin/security/alerts
 * Get active security alerts
 */
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const severity = searchParams.get('severity')
    const type = searchParams.get('type')

    const securitySystem = SecurityService.getInstance()
    const alerts = await securitySystem.getSecurityEvents(50, severity || undefined, type as SecurityEventType || undefined)

    // Get security statistics
    const stats = await securitySystem.getSecurityStats()

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        stats,
      },
    })
  } catch (error) {
    console.error('Failed to get security alerts:', error)
    return NextResponse.json(
      { error: 'Failed to get security alerts' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)

/**
 * POST /api/admin/security/alerts/resolve
 * Resolve a security alert
 */
export const POST = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { alertId, resolution, notes } = alertResolutionSchema.parse(body)

    const securitySystem = SecurityService.getInstance()
    await securitySystem.resolveSecurityEvent(alertId, user.id as string)

    // Log the resolution action
    const auditService = await import('@/lib/audit-service')
    await auditService.getAuditService(prisma).logSecurity(
      user.id,
      'SUSPICIOUS_ACTIVITY',
      {
        action: 'alert_resolved',
        alertId,
        resolution,
        notes,
        resolvedBy: user.id,
      },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    )

    return NextResponse.json({
      success: true,
      message: `Alert ${resolution === 'resolved' ? 'resolved' : 'marked as false positive'}`,
    })
  } catch (error) {
    console.error('Failed to resolve security alert:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters',
          details: error.issues 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to resolve security alert' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)