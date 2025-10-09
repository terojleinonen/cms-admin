/**
 * Audit Log Analysis API Endpoint
 * Provides comprehensive audit log analysis, statistics, and compliance reporting
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { AuditService } from '@/app/lib/audit-service'
import { db } from '@/app/lib/db'
import { hasPermission } from '@/app/lib/has-permission'
import { z } from 'zod'

const auditService = new AuditService(db)

const analysisQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  groupBy: z.enum(['hour', 'day', 'week']).default('day'),
  userId: z.string().optional(),
  actions: z.array(z.string()).optional(),
  resources: z.array(z.string()).optional(),
})

const complianceReportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  format: z.enum(['json', 'csv']).default('json'),
  userId: z.string().optional(),
  actions: z.array(z.string()).optional(),
  resources: z.array(z.string()).optional(),
  includeFailures: z.boolean().default(true),
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

    // Check permissions for viewing audit log analysis
    if (!await hasPermission(session.user, 'system', 'read')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view audit log analysis' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const query = analysisQuerySchema.parse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      groupBy: searchParams.get('groupBy') || 'day',
      userId: searchParams.get('userId'),
      actions: searchParams.get('actions')?.split(','),
      resources: searchParams.get('resources')?.split(','),
    })

    // Set default date range if not provided (last 30 days)
    const endDate = query.endDate ? new Date(query.endDate) : new Date()
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Get comprehensive audit analysis
    const [
      stats,
      timeline,
      topUsers,
      actionDistribution,
      resourceAccess,
      securityMetrics,
      complianceMetrics
    ] = await Promise.all([
      auditService.getStats(Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))),
      getTimelineAnalysis(startDate, endDate, query.groupBy),
      getTopUsers(startDate, endDate, query.userId),
      getActionDistribution(startDate, endDate),
      getResourceAccessPatterns(startDate, endDate),
      getSecurityMetrics(startDate, endDate),
      getComplianceMetrics(startDate, endDate)
    ])

    const analysis = {
      timeline,
      topUsers,
      actionDistribution,
      resourceAccess,
      securityMetrics,
      complianceMetrics,
      summary: {
        totalLogs: stats.totalLogs,
        actionBreakdown: stats.actionBreakdown,
        resourceBreakdown: stats.resourceBreakdown,
        severityBreakdown: stats.severityBreakdown,
        recentActivity: stats.recentActivity,
      }
    }

    return NextResponse.json({
      success: true,
      data: analysis,
    })
  } catch (error) {
    console.error('Failed to get audit log analysis:', error)
    
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
    const reportRequest = complianceReportSchema.parse(body)

    const startDate = new Date(reportRequest.startDate)
    const endDate = new Date(reportRequest.endDate)

    // Generate compliance report
    const complianceReport = await auditService.getComplianceReport({
      startDate,
      endDate,
      userId: reportRequest.userId,
      actions: reportRequest.actions,
      resources: reportRequest.resources,
      includeFailures: reportRequest.includeFailures,
    })

    // Log the compliance report generation
    await auditService.logSecurity(
      session.user.id,
      'DATA_EXPORT',
      {
        type: 'compliance_report',
        format: reportRequest.format,
        dateRange: { startDate: reportRequest.startDate, endDate: reportRequest.endDate },
        filters: {
          userId: reportRequest.userId,
          actions: reportRequest.actions,
          resources: reportRequest.resources,
        }
      },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    )

    if (reportRequest.format === 'csv') {
      // Convert to CSV format
      const csvData = convertComplianceReportToCSV(complianceReport)
      
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="compliance-report-${reportRequest.startDate}-${reportRequest.endDate}.csv"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: complianceReport,
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

// Helper functions for analysis

async function getTimelineAnalysis(startDate: Date, endDate: Date, groupBy: 'hour' | 'day' | 'week') {
  const timeFormat = groupBy === 'hour' ? 'YYYY-MM-DD HH24:00:00' : 
                    groupBy === 'day' ? 'YYYY-MM-DD' : 'YYYY-"W"WW'

  const timeline = await db.$queryRaw`
    SELECT 
      TO_CHAR(created_at, ${timeFormat}) as period,
      COUNT(*) as total_actions,
      COUNT(*) FILTER (WHERE details->>'success' = 'false') as failed_actions,
      COUNT(*) FILTER (WHERE action LIKE 'security.%') as security_events,
      COUNT(DISTINCT user_id) as unique_users
    FROM audit_logs 
    WHERE created_at >= ${startDate} AND created_at <= ${endDate}
    GROUP BY TO_CHAR(created_at, ${timeFormat})
    ORDER BY period
  ` as Array<{
    period: string
    total_actions: bigint
    failed_actions: bigint
    security_events: bigint
    unique_users: bigint
  }>

  return timeline.map(item => ({
    period: item.period,
    totalActions: Number(item.total_actions),
    failedActions: Number(item.failed_actions),
    securityEvents: Number(item.security_events),
    uniqueUsers: Number(item.unique_users),
  }))
}

async function getTopUsers(startDate: Date, endDate: Date, filterUserId?: string) {
  const whereClause = filterUserId ? 'AND al.user_id = $3' : ''
  const params = filterUserId ? [startDate, endDate, filterUserId] : [startDate, endDate]

  const topUsers = await db.$queryRaw`
    SELECT 
      al.user_id,
      u.name as user_name,
      u.email as user_email,
      COUNT(*) as action_count,
      COUNT(*) FILTER (WHERE al.details->>'success' = 'false') as failed_actions,
      MAX(al.created_at) as last_activity
    FROM audit_logs al
    JOIN users u ON al.user_id = u.id
    WHERE al.created_at >= ${startDate} AND al.created_at <= ${endDate} ${whereClause}
    GROUP BY al.user_id, u.name, u.email
    ORDER BY action_count DESC
    LIMIT 20
  ` as Array<{
    user_id: string
    user_name: string
    user_email: string
    action_count: bigint
    failed_actions: bigint
    last_activity: Date
  }>

  return topUsers.map(user => ({
    userId: user.user_id,
    userName: user.user_name,
    userEmail: user.user_email,
    actionCount: Number(user.action_count),
    failedActions: Number(user.failed_actions),
    lastActivity: user.last_activity,
  }))
}

async function getActionDistribution(startDate: Date, endDate: Date) {
  const actions = await db.$queryRaw`
    SELECT 
      action,
      COUNT(*) as count
    FROM audit_logs 
    WHERE created_at >= ${startDate} AND created_at <= ${endDate}
    GROUP BY action
    ORDER BY count DESC
    LIMIT 20
  ` as Array<{
    action: string
    count: bigint
  }>

  const totalActions = actions.reduce((sum, action) => sum + Number(action.count), 0)

  return actions.map(action => ({
    action: action.action,
    count: Number(action.count),
    percentage: totalActions > 0 ? (Number(action.count) / totalActions) * 100 : 0,
  }))
}

async function getResourceAccessPatterns(startDate: Date, endDate: Date) {
  const resources = await db.$queryRaw`
    SELECT 
      resource,
      COUNT(*) FILTER (WHERE action LIKE '%read%' OR action LIKE '%view%') as reads,
      COUNT(*) FILTER (WHERE action LIKE '%create%' OR action LIKE '%update%' OR action LIKE '%write%') as writes,
      COUNT(*) FILTER (WHERE action LIKE '%delete%') as deletes,
      COUNT(*) as total
    FROM audit_logs 
    WHERE created_at >= ${startDate} AND created_at <= ${endDate}
    GROUP BY resource
    ORDER BY total DESC
    LIMIT 20
  ` as Array<{
    resource: string
    reads: bigint
    writes: bigint
    deletes: bigint
    total: bigint
  }>

  return resources.map(resource => ({
    resource: resource.resource,
    reads: Number(resource.reads),
    writes: Number(resource.writes),
    deletes: Number(resource.deletes),
    total: Number(resource.total),
  }))
}

async function getSecurityMetrics(startDate: Date, endDate: Date) {
  const metrics = await db.$queryRaw`
    SELECT 
      COUNT(*) FILTER (WHERE action LIKE 'security.%') as total_security_events,
      COUNT(*) FILTER (WHERE action LIKE 'security.%' AND details->>'severity' = 'critical') as critical_events,
      COUNT(*) FILTER (WHERE action = 'security.suspicious_activity') as suspicious_activities,
      COUNT(*) FILTER (WHERE action = 'security.permission_denied') as permission_violations,
      COUNT(*) FILTER (WHERE action = 'security.account_locked') as account_lockouts
    FROM audit_logs 
    WHERE created_at >= ${startDate} AND created_at <= ${endDate}
  ` as Array<{
    total_security_events: bigint
    critical_events: bigint
    suspicious_activities: bigint
    permission_violations: bigint
    account_lockouts: bigint
  }>

  const metric = metrics[0]
  return {
    totalSecurityEvents: Number(metric.total_security_events),
    criticalEvents: Number(metric.critical_events),
    suspiciousActivities: Number(metric.suspicious_activities),
    permissionViolations: Number(metric.permission_violations),
    accountLockouts: Number(metric.account_lockouts),
  }
}

async function getComplianceMetrics(startDate: Date, endDate: Date) {
  const metrics = await db.$queryRaw`
    SELECT 
      COUNT(*) FILTER (WHERE action LIKE '%read%' OR action LIKE '%view%') as data_access,
      COUNT(*) FILTER (WHERE action LIKE '%create%' OR action LIKE '%update%' OR action LIKE '%write%') as data_modification,
      COUNT(*) FILTER (WHERE action = 'security.data_export') as data_export,
      COUNT(*) FILTER (WHERE action LIKE 'system.%') as admin_actions,
      COUNT(*) FILTER (WHERE action LIKE 'user.%') as user_management
    FROM audit_logs 
    WHERE created_at >= ${startDate} AND created_at <= ${endDate}
  ` as Array<{
    data_access: bigint
    data_modification: bigint
    data_export: bigint
    admin_actions: bigint
    user_management: bigint
  }>

  const metric = metrics[0]
  return {
    dataAccess: Number(metric.data_access),
    dataModification: Number(metric.data_modification),
    dataExport: Number(metric.data_export),
    adminActions: Number(metric.admin_actions),
    userManagement: Number(metric.user_management),
  }
}

function convertComplianceReportToCSV(report: any): string {
  const headers = [
    'Log ID',
    'Timestamp',
    'User ID',
    'User Name',
    'User Email',
    'User Role',
    'Action',
    'Resource',
    'Success',
    'IP Address',
    'User Agent',
    'Details'
  ]

  const rows = report.logs.map((log: any) => [
    log.id,
    log.createdAt,
    log.userId,
    log.user.name,
    log.user.email,
    log.user.role,
    log.action,
    log.resource,
    log.details?.success !== false ? 'Yes' : 'No',
    log.ipAddress || '',
    log.userAgent || '',
    JSON.stringify(log.details || {})
  ])

  // Add summary section
  const summaryRows = [
    [''],
    ['COMPLIANCE SUMMARY'],
    ['Total Actions', report.summary.totalActions],
    ['Unique Users', report.summary.uniqueUsers],
    ['Failed Actions', report.summary.failedActions],
    ['Critical Events', report.summary.criticalEvents],
  ]

  const allRows = [headers, ...rows, ...summaryRows]
  return allRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}