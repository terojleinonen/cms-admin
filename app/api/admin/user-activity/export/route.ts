/**
 * User Activity Data Export API
 * Provides export functionality for user activity data in various formats
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const exportSchema = z.object({
  type: z.enum(['metrics', 'alerts', 'permissions', 'behavior']),
  format: z.enum(['csv', 'json']).default('csv'),
  timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
  userId: z.string().optional(),
})

/**
 * POST /api/admin/user-activity/export
 * Export user activity data in specified format
 */
export const POST = withApiPermissions(
  async (request: NextRequest, { user }) => {
    try {
      const body = await request.json()
      const { type, format, timeRange, userId } = exportSchema.parse(body)

      // Calculate time range
      const now = new Date()
      const startDate = new Date()
      
      switch (timeRange) {
        case '1h':
          startDate.setHours(now.getHours() - 1)
          break
        case '24h':
          startDate.setDate(now.getDate() - 1)
          break
        case '7d':
          startDate.setDate(now.getDate() - 7)
          break
        case '30d':
          startDate.setDate(now.getDate() - 30)
          break
      }

      let exportData: any
      let filename: string

      switch (type) {
        case 'metrics':
          exportData = await exportMetrics(startDate, now, userId)
          filename = `user-activity-metrics-${timeRange}`
          break
        case 'alerts':
          exportData = await exportAlerts(startDate, now)
          filename = `user-activity-alerts-${timeRange}`
          break
        case 'permissions':
          exportData = await exportPermissions(startDate, now, userId)
          filename = `permission-analytics-${timeRange}`
          break
        case 'behavior':
          exportData = await exportBehavior(startDate, now, userId)
          filename = `behavior-analysis-${timeRange}`
          break
        default:
          throw new Error('Invalid export type')
      }

      // Log the export action
      await prisma.auditLog.create({
        data: {
          userId: user?.id || '',
          action: 'data.export',
          resource: 'user_activity',
          details: {
            exportType: type,
            format,
            timeRange,
            recordCount: Array.isArray(exportData) ? exportData.length : 1,
            exportedBy: user?.name || '' || user?.email || '',
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      })

      // Format data based on requested format
      let formattedData: string
      let contentType: string

      if (format === 'csv') {
        formattedData = formatAsCSV(exportData, type)
        contentType = 'text/csv'
        filename += '.csv'
      } else {
        formattedData = JSON.stringify(exportData, null, 2)
        contentType = 'application/json'
        filename += '.json'
      }

      return new NextResponse(formattedData, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } catch (error) {
      console.error('Failed to export user activity data:', error)
      
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
        { error: 'Failed to export user activity data' },
        { status: 500 }
      )
    }
  },
  {
    permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
  }
)

/**
 * Export user activity metrics
 */
async function exportMetrics(startDate: Date, endDate: Date, userId?: string) {
  const whereClause = {
    createdAt: { gte: startDate, lte: endDate },
    ...(userId && { userId }),
  }

  const logs = await prisma.auditLog.findMany({
    where: whereClause,
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return logs.map(log => ({
    timestamp: log.createdAt.toISOString(),
    userId: log.userId,
    userName: log.user?.name || 'Unknown',
    userEmail: log.user?.email || 'Unknown',
    userRole: log.user?.role || 'Unknown',
    action: log.action,
    resource: log.resource,
    success: (log.details as any)?.success !== false,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    details: JSON.stringify(log.details || {}),
  }))
}

/**
 * Export security alerts
 */
async function exportAlerts(startDate: Date, endDate: Date) {
  // Get security-related events
  const securityEvents = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      OR: [
        { action: 'auth.login_failed' },
        { action: 'permission.denied' },
        { action: { contains: 'security.' } },
        { action: 'alert.acknowledged' },
      ],
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return securityEvents.map(event => ({
    timestamp: event.createdAt.toISOString(),
    type: event.action.includes('auth') ? 'authentication' : 
          event.action.includes('permission') ? 'authorization' : 
          event.action.includes('alert') ? 'alert_management' : 'security',
    severity: determineSeverity(event.action),
    userId: event.userId,
    userName: event.user?.name || 'Unknown',
    userEmail: event.user?.email || 'Unknown',
    action: event.action,
    resource: event.resource,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    details: JSON.stringify(event.details || {}),
  }))
}

/**
 * Export permission analytics
 */
async function exportPermissions(startDate: Date, endDate: Date, userId?: string) {
  const whereClause = {
    createdAt: { gte: startDate, lte: endDate },
    OR: [
      { action: 'permission.check' },
      { action: 'permission.granted' },
      { action: 'permission.denied' },
      { action: 'permission.cache_hit' },
      { action: 'permission.cache_miss' },
    ],
    ...(userId && { userId }),
  }

  const permissionLogs = await prisma.auditLog.findMany({
    where: whereClause,
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return permissionLogs.map(log => ({
    timestamp: log.createdAt.toISOString(),
    userId: log.userId,
    userName: log.user?.name || 'Unknown',
    userRole: log.user?.role || 'Unknown',
    checkType: log.action,
    resource: (log.details as any)?.resource || log.resource || 'unknown',
    action: (log.details as any)?.action || 'unknown',
    result: log.action === 'permission.granted' ? 'granted' : 
            log.action === 'permission.denied' ? 'denied' : 'checked',
    cacheHit: log.action === 'permission.cache_hit',
    latency: (log.details as any)?.latency || null,
    details: JSON.stringify(log.details || {}),
  }))
}

/**
 * Export behavior analysis
 */
async function exportBehavior(startDate: Date, endDate: Date, userId?: string) {
  const whereClause = {
    createdAt: { gte: startDate, lte: endDate },
    ...(userId && { userId }),
  }

  // Get user activity data
  const userActivities = await prisma.auditLog.groupBy({
    by: ['userId'],
    where: whereClause,
    _count: { id: true },
  })

  const behaviorData = await Promise.all(
    userActivities.map(async (activity) => {
      const user = await prisma.user.findUnique({
        where: { id: activity.userId },
        select: { id: true, name: true, email: true, role: true },
      })

      if (!user) return null

      const userLogs = await prisma.auditLog.findMany({
        where: {
          userId: activity.userId,
          createdAt: { gte: startDate, lte: endDate },
        },
      })

      // Calculate behavior metrics
      const loginCount = userLogs.filter(log => log.action === 'auth.login').length
      const failedLoginCount = userLogs.filter(log => log.action === 'auth.login_failed').length
      const resourcesAccessed = [...new Set(userLogs.map(log => log.resource).filter(Boolean))]
      const securityEvents = userLogs.filter(log => 
        log.action.includes('security.') || 
        log.action.includes('permission.denied')
      ).length

      // Simple risk calculation
      let riskScore = 0
      if (failedLoginCount > 5) riskScore += 25
      if (resourcesAccessed.length > 15) riskScore += 15
      if (securityEvents > 10) riskScore += 20
      if (activity._count.id > 500) riskScore += 10

      const riskLevel = riskScore >= 50 ? 'high' : 
                       riskScore >= 30 ? 'medium' : 'low'

      return {
        userId: user?.id || '',
        userName: user?.name || '' || 'Unknown',
        userEmail: user?.email || '' || 'Unknown',
        userRole: user?.role,
        totalActions: activity._count.id,
        loginCount,
        failedLoginCount,
        resourcesAccessedCount: resourcesAccessed.length,
        securityEvents,
        riskScore,
        riskLevel,
        lastActivity: userLogs[0]?.createdAt?.toISOString() || null,
        analysisDate: new Date().toISOString(),
      }
    })
  )

  return behaviorData.filter(data => data !== null)
}

/**
 * Format data as CSV
 */
function formatAsCSV(data: any[], type: string): string {
  if (!data || data.length === 0) {
    return 'No data available'
  }

  // Get headers from first object
  const headers = Object.keys(data[0])
  
  // Create CSV content
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value || ''
      }).join(',')
    )
  ]

  return csvRows.join('\n')
}

/**
 * Determine severity based on action type
 */
function determineSeverity(action: string): 'low' | 'medium' | 'high' | 'critical' {
  if (action.includes('failed') || action.includes('denied')) {
    return 'high'
  }
  if (action.includes('security.')) {
    return 'medium'
  }
  return 'low'
}