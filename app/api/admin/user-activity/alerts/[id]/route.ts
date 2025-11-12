/**
 * Individual Alert Management API
 * Handles acknowledgment and management of specific alerts
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateAlertSchema = z.object({
  acknowledged: z.boolean().optional(),
  notes: z.string().optional(),
})

/**
 * PATCH /api/admin/user-activity/alerts/[id]
 * Update alert status (acknowledge, add notes, etc.)
 */
export const PATCH = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    try {
      const { id: alertId } = await params || {}
      
      if (!alertId) {
        return NextResponse.json(
          { error: 'Alert ID is required' },
          { status: 400 }
        )
      }

      const body = await request.json()
      const { acknowledged, notes } = updateAlertSchema.parse(body)

      // For this demo, we'll simulate alert storage in audit logs
      // In a real implementation, you'd have a dedicated alerts table
      
      if (acknowledged !== undefined) {
        // Log the acknowledgment action
        await prisma.auditLog.create({
          data: {
            userId: user?.id || '',
            action: 'alert.acknowledged',
            resource: 'security_alert',
            details: {
              alertId,
              acknowledged,
              notes,
              acknowledgedBy: user?.name || '' || user?.email || '',
              acknowledgedAt: new Date(),
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          },
        })
      }

      return NextResponse.json({
        success: true,
        data: {
          id: alertId,
          acknowledged: acknowledged ?? false,
          acknowledgedBy: user?.name || '' || user?.email || '',
          acknowledgedAt: new Date(),
          notes,
        },
      })
    } catch (error) {
      console.error('Failed to update alert:', error)
      
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
        { error: 'Failed to update alert' },
        { status: 500 }
      )
    }
  },
  {
    permissions: [{ resource: 'system', action: 'manage', scope: 'all' }]
  }
)

/**
 * GET /api/admin/user-activity/alerts/[id]
 * Get details of a specific alert
 */
export const GET = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    try {
      const { id: alertId } = await params || {}
      
      if (!alertId) {
        return NextResponse.json(
          { error: 'Alert ID is required' },
          { status: 400 }
        )
      }

      // In a real implementation, you'd fetch from an alerts table
      // For now, we'll return a simulated alert based on the ID
      
      const alert = {
        id: alertId,
        type: 'security',
        severity: 'high',
        title: 'Security Alert',
        message: 'Alert details would be fetched from database',
        timestamp: new Date(),
        acknowledged: false,
        details: {
          alertId,
          source: 'user_activity_monitor',
        },
      }

      return NextResponse.json({
        success: true,
        data: alert,
      })
    } catch (error) {
      console.error('Failed to get alert details:', error)
      
      return NextResponse.json(
        { error: 'Failed to get alert details' },
        { status: 500 }
      )
    }
  },
  {
    permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
  }
)