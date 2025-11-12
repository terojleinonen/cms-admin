/**
 * Audit Logs API Endpoint
 * Handles audit log submissions, queries, and analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { AuditService } from '@/lib/audit-service'
import { prisma as db } from '@/lib/db'
import { hasPermission } from '@/lib/has-permission'

const auditService = new AuditService(db)

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Check if this is an export request
    if (body.format) {
      // Verify admin permissions for export
      if (!hasPermission({ ...session.user, isActive: true }, 'system:manage')) {
        return NextResponse.json(
          { error: 'Insufficient permissions for audit log export' },
          { status: 403 }
        )
      }

      const exportData = await auditService.exportLogs(
        {
          userId: body.userId,
          action: body.action,
          resource: body.resource,
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
        },
        body.format
      )

      const contentType = body.format === 'csv' ? 'text/csv' : 'application/json'
      const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${body.format}`

      return new NextResponse(exportData, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    // Regular audit log submission
    const { action, resource, resourceId, details, severity } = body

    if (!action || !resource) {
      return NextResponse.json(
        { error: 'Missing required fields: action, resource' },
        { status: 400 }
      )
    }

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Log the audit entry
    const auditLog = await auditService.log({
      userId: session.user?.id || '',
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
      severity,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: auditLog.id,
        timestamp: auditLog.createdAt,
      },
    })
  } catch (error) {
    console.error('Audit log API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions for viewing audit logs
    if (!await hasPermission({ ...session.user, isActive: true }, 'system:read')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view audit logs' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const filters = {
      userId: searchParams.get('userId') || undefined,
      action: searchParams.get('action') || undefined,
      resource: searchParams.get('resource') || undefined,
      severity: searchParams.get('severity') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    }

    const result = await auditService.getLogs(filters)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}