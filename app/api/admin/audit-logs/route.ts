/**
 * Admin Audit Logs API
 * Provides endpoints for viewing, filtering, and exporting audit logs
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { getAuditService } from '@/lib/audit-service'
import { z } from 'zod'

// Validation schemas
const auditLogFiltersSchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
})

const exportFiltersSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  userId: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

/**
 * GET /api/admin/audit-logs
 * Get audit logs with filtering and pagination
 */
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    try {
      const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())

    // Validate query parameters
    const filters = auditLogFiltersSchema.parse(params)

    // Convert date strings to Date objects
    const auditFilters = {
      ...filters,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    }

    const auditService = getAuditService(prisma)
    const result = await auditService.getLogs(auditFilters)

    // Filter by search term if provided
    let filteredLogs = result.logs
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filteredLogs = result.logs.filter(log => 
        log.action.toLowerCase().includes(searchTerm) ||
        log.resource.toLowerCase().includes(searchTerm) ||
        log.user.name.toLowerCase().includes(searchTerm) ||
        log.user.email.toLowerCase().includes(searchTerm) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(searchTerm))
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        logs: filteredLogs,
        pagination: {
          page: result.page,
          limit: filters.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
    })
  } catch (error) {
    console.error('Failed to get audit logs:', error)
    
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
      { error: 'Failed to get audit logs' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)
/*
*
 * POST /api/admin/audit-logs/export
 * Export audit logs in JSON or CSV format
 */
export const POST = withApiPermissions(
  async (request: NextRequest, { user }) => {
    try {

    const body = await request.json()
    const filters = exportFiltersSchema.parse(body)

    // Convert date strings to Date objects
    const auditFilters = {
      userId: filters.userId,
      action: filters.action,
      resource: filters.resource,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      limit: 10000, // Large limit for export
    }

    const auditService = getAuditService(prisma)
    const exportData = await auditService.exportLogs(auditFilters, filters.format)

    // Log the export action
    await auditService.logSecurity(
      session.user.id,
      'DATA_EXPORT',
      {
        exportType: 'audit_logs',
        format: filters.format,
        filters: auditFilters,
      },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    )

    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${filters.format}`
    const contentType = filters.format === 'csv' ? 'text/csv' : 'application/json'

    return new NextResponse(exportData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to export audit logs:', error)
    
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
      { error: 'Failed to export audit logs' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)