/**
 * Audit Log Analysis API Endpoint
 * Provides comprehensive audit log analysis and reporting
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { AuditService } from '@/app/lib/audit-service'
import { db } from '@/app/lib/db'
import { hasPermission } from '@/app/lib/has-permission'

const auditService = new AuditService(db)

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions for viewing audit analysis
    if (!await hasPermission(session.user, 'system', 'manage')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view audit analysis' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default to 30 days ago
    
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : new Date() // Default to now
    
    const groupBy = (searchParams.get('groupBy') as 'hour' | 'day' | 'week') || 'day'
    const includeDetails = searchParams.get('includeDetails') === 'true'

    const analysis = await auditService.getAuditAnalysis({
      startDate,
      endDate,
      groupBy,
      includeDetails,
    })

    return NextResponse.json({
      success: true,
      data: analysis,
    })
  } catch (error) {
    console.error('Failed to fetch audit analysis:', error)
    
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

    // Check permissions for generating compliance reports
    if (!await hasPermission(session.user, 'system', 'manage')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to generate compliance reports' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      startDate,
      endDate,
      userId,
      actions,
      resources,
      includeFailures = true,
      format = 'json'
    } = body

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    const report = await auditService.getComplianceReport({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      userId,
      actions,
      resources,
      includeFailures,
    })

    // Log the compliance report generation
    await auditService.logSystem(
      session.user.id,
      'DATA_EXPORT',
      {
        reportType: 'compliance',
        dateRange: { startDate, endDate },
        filters: { userId, actions, resources, includeFailures },
        recordCount: report.logs.length,
      },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    )

    if (format === 'csv') {
      // Convert to CSV format
      const headers = [
        'ID',
        'User ID',
        'User Name',
        'User Email',
        'Action',
        'Resource',
        'Details',
        'IP Address',
        'User Agent',
        'Created At',
      ]

      const rows = report.logs.map(log => [
        log.id,
        log.userId,
        log.user.name,
        log.user.email,
        log.action,
        log.resource,
        JSON.stringify(log.details || {}),
        log.ipAddress || '',
        log.userAgent || '',
        log.createdAt.toISOString(),
      ])

      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="compliance-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: report,
    })
  } catch (error) {
    console.error('Failed to generate compliance report:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}