/**
 * Admin Audit Log Statistics API
 * Provides statistics and analytics for audit logs
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
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
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get audit log statistics' },
      { status: 500 }
    )
  }
}