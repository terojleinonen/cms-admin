/**
 * Security Alerts API
 * Endpoints for managing security alerts and monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { getSecurityAlertingSystem } from '@/lib/security-alerting'
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
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const severity = searchParams.get('severity')
    const type = searchParams.get('type')

    const securitySystem = getSecurityAlertingSystem(prisma)
    let alerts = securitySystem.getActiveAlerts()

    // Filter by status
    if (status !== 'active') {
      // For non-active alerts, we'd need to store them in database
      // For now, just return active alerts
    }

    // Filter by severity
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity)
    }

    // Filter by type
    if (type) {
      alerts = alerts.filter(alert => alert.type === type)
    }

    // Get security statistics
    const stats = securitySystem.getSecurityStats()

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
}

/**
 * POST /api/admin/security/alerts/resolve
 * Resolve a security alert
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { alertId, resolution, notes } = alertResolutionSchema.parse(body)

    const securitySystem = getSecurityAlertingSystem(prisma)
    const success = securitySystem.resolveAlert(alertId, resolution)

    if (!success) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }

    // Log the resolution action
    const auditService = await import('@/lib/audit-service')
    await auditService.getAuditService(prisma).logSecurity(
      session.user.id,
      'SUSPICIOUS_ACTIVITY',
      {
        action: 'alert_resolved',
        alertId,
        resolution,
        notes,
        resolvedBy: session.user.id,
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
}