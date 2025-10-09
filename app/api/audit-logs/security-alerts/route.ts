/**
 * Security Alerts API Endpoint
 * Provides security alerts and incident analysis based on audit logs
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { AuditService } from '@/app/lib/audit-service'
import { db } from '@/app/lib/db'
import { hasPermission } from '@/app/lib/has-permission'
import { z } from 'zod'

const auditService = new AuditService(db)

const alertsQuerySchema = z.object({
  days: z.coerce.number().min(1).max(365).default(7),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions for viewing security alerts
    if (!await hasPermission(session.user, 'system', 'read')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view security alerts' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const query = alertsQuerySchema.parse({
      days: searchParams.get('days'),
      severity: searchParams.get('severity'),
      limit: searchParams.get('limit'),
    })

    // Get security alerts and incidents
    const [alerts, incidents] = await Promise.all([
      auditService.getSecurityAlerts(query.days),
      auditService.getSecurityIncidents(query.days)
    ])

    // Filter by severity if specified
    const filteredAlerts = query.severity 
      ? alerts.filter(alert => alert.severity === query.severity)
      : alerts

    // Limit results
    const limitedAlerts = filteredAlerts.slice(0, query.limit)

    return NextResponse.json({
      success: true,
      data: {
        alerts: limitedAlerts,
        incidents,
        summary: {
          totalAlerts: filteredAlerts.length,
          criticalAlerts: filteredAlerts.filter(a => a.severity === 'critical').length,
          highAlerts: filteredAlerts.filter(a => a.severity === 'high').length,
          mediumAlerts: filteredAlerts.filter(a => a.severity === 'medium').length,
          lowAlerts: filteredAlerts.filter(a => a.severity === 'low').length,
        }
      },
    })
  } catch (error) {
    console.error('Failed to get security alerts:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions for managing security alerts
    if (!await hasPermission(session.user, 'system', 'manage')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage security alerts' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, alertId, reason } = body

    if (action === 'acknowledge') {
      // Log the alert acknowledgment
      await auditService.logSecurity(
        session.user.id,
        'SUSPICIOUS_ACTIVITY',
        {
          type: 'alert_acknowledged',
          alertId,
          reason,
        },
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      )

      return NextResponse.json({
        success: true,
        message: 'Alert acknowledged successfully',
      })
    }

    if (action === 'resolve') {
      // Log the alert resolution
      await auditService.logSecurity(
        session.user.id,
        'SUSPICIOUS_ACTIVITY',
        {
          type: 'alert_resolved',
          alertId,
          reason,
        },
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      )

      return NextResponse.json({
        success: true,
        message: 'Alert resolved successfully',
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to manage security alert:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}