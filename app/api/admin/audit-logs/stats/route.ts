/**
 * Admin Audit Log Statistics API
 * Provides statistics and analytics for audit logs
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { getAuditService } from '@/lib/audit-service'
import { z } from 'zod'

const statsFiltersSchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
})

/**
 * GET /api/admin/audit-logs/stats
 * Get audit log statistics and analytics
 */
export const GET = withApiPermissions(
  async (request: NextRequest, { user: _user }) => {
    try {
      const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const filters = statsFiltersSchema.parse(params)

    const auditService = getAuditService(prisma)
    const stats = await auditService.getStats(filters.days)
    const securityAlerts = await auditService.getSecurityAlerts(7) // Last 7 days

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        securityAlerts,
      },
    })
  } catch (error) {
    console.error('Failed to get audit log statistics:', error)
    
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
      { error: 'Failed to get audit log statistics' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)