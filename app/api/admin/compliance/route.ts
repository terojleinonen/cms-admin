/**
 * Compliance API Endpoint
 * Handles compliance reporting and audit trail exports
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ComplianceService } from '@/lib/compliance-service'
import { prisma as db } from '@/lib/db'
import { hasPermission } from '@/lib/has-permission'

const complianceService = new ComplianceService(db)

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin permissions for compliance reports
    if (!hasPermission({ ...session.user, isActive: true }, 'system:manage')) {
      return NextResponse.json(
        { error: 'Insufficient permissions for compliance reports' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'compliance'
    
    switch (reportType) {
      case 'compliance': {
        const startDate = new Date(searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        const endDate = new Date(searchParams.get('endDate') || new Date())
        const userId = searchParams.get('userId') || undefined
        const actions = searchParams.get('actions')?.split(',') || undefined
        const resources = searchParams.get('resources')?.split(',') || undefined
        const includeFailures = searchParams.get('includeFailures') !== 'false'

        const report = await complianceService.generateComplianceReport({
          startDate,
          endDate,
          userId,
          actions,
          resources,
          includeFailures,
        })

        return NextResponse.json({
          success: true,
          data: report,
        })
      }

      case 'user-activity': {
        const startDate = new Date(searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        const endDate = new Date(searchParams.get('endDate') || new Date())

        const userActivity = await complianceService.generateUserActivityReports(startDate, endDate)

        return NextResponse.json({
          success: true,
          data: userActivity,
        })
      }

      case 'security-standard': {
        const standard = searchParams.get('standard') as 'SOC2' | 'ISO27001' | 'GDPR' | 'HIPAA'
        
        if (!standard || !['SOC2', 'ISO27001', 'GDPR', 'HIPAA'].includes(standard)) {
          return NextResponse.json(
            { error: 'Invalid or missing security standard' },
            { status: 400 }
          )
        }

        const report = await complianceService.generateSecurityStandardReport(standard)

        return NextResponse.json({
          success: true,
          data: report,
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Compliance API error:', error)
    
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

    // Check admin permissions for compliance exports
    if (!hasPermission({ ...session.user, isActive: true }, 'system:manage')) {
      return NextResponse.json(
        { error: 'Insufficient permissions for compliance exports' },
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

    const exportResult = await complianceService.exportAuditTrail({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      userId,
      actions,
      resources,
      includeFailures,
      format,
    })

    // Log the export action
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // This would be logged via the audit service
    // await auditService.logSecurity(user?.id || '', 'DATA_EXPORT', { ... })

    return new NextResponse(exportResult.data as any, {
      headers: {
        'Content-Type': exportResult.contentType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
      },
    })
  } catch (error) {
    console.error('Compliance export error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}