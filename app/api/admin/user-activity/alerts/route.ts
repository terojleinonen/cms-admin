/**
 * User Activity Alerts API
 * Provides real-time security alerts and notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const alertsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  type: z.enum(['security', 'performance', 'compliance', 'anomaly']).optional(),
  acknowledged: z.coerce.boolean().optional(),
})

interface UserActivityAlert {
  id: string
  type: 'security' | 'performance' | 'compliance' | 'anomaly'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  userId?: string
  userName?: string
  timestamp: Date
  acknowledged: boolean
  details: Record<string, any>
}

/**
 * GET /api/admin/user-activity/alerts
 * Get user activity alerts and security notifications
 */
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    try {
      const { searchParams } = new URL(request.url)
      const params = Object.fromEntries(searchParams.entries())
      const { limit, severity, type, acknowledged } = alertsQuerySchema.parse(params)

      // Get recent security events and anomalies
      const now = new Date()
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const alerts: UserActivityAlert[] = []

      // Generate security alerts from audit logs
      const securityEvents = await prisma.auditLog.findMany({
        where: {
          createdAt: { gte: last24Hours, lte: now },
          OR: [
            { action: 'auth.login_failed' },
            { action: 'permission.denied' },
            { action: { contains: 'security.' } },
            { action: 'auth.suspicious_activity' },
          ],
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit * 2, // Get more to filter and process
      })

      // Process failed login alerts
      const failedLoginsByUser = new Map<string, any[]>()
      securityEvents
        .filter(event => event.action === 'auth.login_failed')
        .forEach(event => {
          const userId = event.userId
          if (!failedLoginsByUser.has(userId)) {
            failedLoginsByUser.set(userId, [])
          }
          failedLoginsByUser.get(userId)!.push(event)
        })

      failedLoginsByUser.forEach((events, userId) => {
        if (events.length >= 5) {
          const user = events[0].user
          alerts.push({
            id: `failed-login-${userId}-${Date.now()}`,
            type: 'security',
            severity: events.length >= 10 ? 'critical' : 'high',
            title: 'Multiple Failed Login Attempts',
            message: `User ${user?.name || 'Unknown'} has ${events.length} failed login attempts in the last 24 hours`,
            userId,
            userName: user?.name || 'Unknown',
            timestamp: events[0].createdAt,
            acknowledged: false,
            details: {
              failedAttempts: events.length,
              lastAttempt: events[0].createdAt,
              ipAddresses: [...new Set(events.map(e => e.ipAddress).filter(Boolean))],
            },
          })
        }
      })

      // Process permission denial alerts
      const permissionDenials = securityEvents.filter(event => event.action === 'permission.denied')
      const denialsByUser = new Map<string, any[]>()
      
      permissionDenials.forEach(event => {
        const userId = event.userId
        if (!denialsByUser.has(userId)) {
          denialsByUser.set(userId, [])
        }
        denialsByUser.get(userId)!.push(event)
      })

      denialsByUser.forEach((events, userId) => {
        if (events.length >= 10) {
          const user = events[0].user
          alerts.push({
            id: `permission-denied-${userId}-${Date.now()}`,
            type: 'security',
            severity: events.length >= 20 ? 'high' : 'medium',
            title: 'Excessive Permission Denials',
            message: `User ${user?.name || 'Unknown'} has been denied access ${events.length} times in the last 24 hours`,
            userId,
            userName: user?.name || 'Unknown',
            timestamp: events[0].createdAt,
            acknowledged: false,
            details: {
              denialCount: events.length,
              resources: [...new Set(events.map(e => e.resource).filter(Boolean))],
              actions: [...new Set(events.map(e => (e.details as any)?.action).filter(Boolean))],
            },
          })
        }
      })

      // Check for suspicious activity patterns
      const suspiciousUsers = await findSuspiciousUsers(last24Hours, now)
      suspiciousUsers.forEach(suspiciousUser => {
        alerts.push({
          id: `suspicious-${suspiciousUser.userId}-${Date.now()}`,
          type: 'anomaly',
          severity: suspiciousUser.riskLevel as any,
          title: 'Suspicious User Activity Detected',
          message: suspiciousUser.description,
          userId: suspiciousUser.userId,
          userName: suspiciousUser.userName,
          timestamp: suspiciousUser.lastActivity,
          acknowledged: false,
          details: suspiciousUser.indicators,
        })
      })

      // Check for performance issues
      const performanceAlerts = await checkPerformanceIssues(last24Hours, now)
      alerts.push(...performanceAlerts)

      // Check for compliance issues
      const complianceAlerts = await checkComplianceIssues(last24Hours, now)
      alerts.push(...complianceAlerts)

      // Filter alerts based on query parameters
      let filteredAlerts = alerts
      
      if (severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity)
      }
      
      if (type) {
        filteredAlerts = filteredAlerts.filter(alert => alert.type === type)
      }
      
      if (acknowledged !== undefined) {
        filteredAlerts = filteredAlerts.filter(alert => alert.acknowledged === acknowledged)
      }

      // Sort by severity and timestamp
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      filteredAlerts.sort((a, b) => {
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
        if (severityDiff !== 0) return severityDiff
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })

      return NextResponse.json({
        success: true,
        data: filteredAlerts.slice(0, limit),
      })
    } catch (error) {
      console.error('Failed to get user activity alerts:', error)
      
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
        { error: 'Failed to get user activity alerts' },
        { status: 500 }
      )
    }
  },
  {
    permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
  }
)

/**
 * Find users with suspicious activity patterns
 */
async function findSuspiciousUsers(startDate: Date, endDate: Date) {
  const suspiciousUsers = []

  // Get users with high activity
  const highActivityUsers = await prisma.auditLog.groupBy({
    by: ['userId'],
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    _count: {
      id: true,
    },
    having: {
      id: {
        _count: {
          gt: 200, // More than 200 actions in 24 hours
        },
      },
    },
  })

  for (const userActivity of highActivityUsers) {
    const user = await prisma.user.findUnique({
      where: { id: userActivity.userId },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!user) continue

    // Check for additional suspicious indicators
    const userLogs = await prisma.auditLog.findMany({
      where: {
        userId: userActivity.userId,
        createdAt: { gte: startDate, lte: endDate },
      },
    })

    const indicators: Record<string, any> = {}
    let riskLevel = 'medium'

    // Check for multiple IP addresses
    const ipAddresses = [...new Set(userLogs.map(log => log.ipAddress).filter(Boolean))]
    if (ipAddresses.length > 5) {
      indicators.multipleIPs = ipAddresses.length
      riskLevel = 'high'
    }

    // Check for night activity
    const nightActions = userLogs.filter(log => {
      const hour = new Date(log.createdAt).getHours()
      return hour < 6 || hour > 22
    }).length

    if (nightActions > userLogs.length * 0.3) {
      indicators.nightActivity = `${((nightActions / userLogs.length) * 100).toFixed(1)}%`
      riskLevel = 'high'
    }

    // Check for rapid actions (potential bot)
    const actionTimes = userLogs.map(log => log.createdAt.getTime()).sort()
    let rapidActions = 0
    for (let i = 1; i < actionTimes.length; i++) {
      if (actionTimes[i] - actionTimes[i - 1] < 1000) { // Less than 1 second apart
        rapidActions++
      }
    }

    if (rapidActions > 50) {
      indicators.rapidActions = rapidActions
      riskLevel = 'critical'
    }

    suspiciousUsers.push({
      userId: user?.id || '',
      userName: user?.name || '' || 'Unknown',
      description: `Unusual activity pattern detected: ${userActivity._count.id} actions in 24 hours`,
      riskLevel,
      lastActivity: userLogs[0]?.createdAt || endDate,
      indicators,
    })
  }

  return suspiciousUsers
}

/**
 * Check for performance-related issues
 */
async function checkPerformanceIssues(startDate: Date, endDate: Date): Promise<UserActivityAlert[]> {
  const alerts: UserActivityAlert[] = []

  // Check for high error rates
  const totalActions = await prisma.auditLog.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
  })

  const failedActions = await prisma.auditLog.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      details: {
        path: ['success'],
        equals: false,
      },
    },
  })

  const errorRate = totalActions > 0 ? failedActions / totalActions : 0

  if (errorRate > 0.1) { // More than 10% error rate
    alerts.push({
      id: `high-error-rate-${Date.now()}`,
      type: 'performance',
      severity: errorRate > 0.2 ? 'critical' : 'high',
      title: 'High System Error Rate',
      message: `System error rate is ${(errorRate * 100).toFixed(1)}% (${failedActions}/${totalActions} actions failed)`,
      timestamp: endDate,
      acknowledged: false,
      details: {
        errorRate: errorRate,
        totalActions,
        failedActions,
      },
    })
  }

  return alerts
}

/**
 * Check for compliance-related issues
 */
async function checkComplianceIssues(startDate: Date, endDate: Date): Promise<UserActivityAlert[]> {
  const alerts: UserActivityAlert[] = []

  // Check for users without recent activity (potential inactive accounts)
  const inactiveThreshold = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago

  const inactiveUsers = await prisma.user.findMany({
    where: {
      NOT: {
        auditLogs: {
          some: {
            createdAt: { gte: inactiveThreshold },
          },
        },
      },
    },
    select: { id: true, name: true, email: true, role: true },
    take: 10, // Limit to avoid too many alerts
  })

  if (inactiveUsers.length > 0) {
    alerts.push({
      id: `inactive-users-${Date.now()}`,
      type: 'compliance',
      severity: 'medium',
      title: 'Inactive User Accounts Detected',
      message: `${inactiveUsers.length} user accounts have been inactive for more than 30 days`,
      timestamp: endDate,
      acknowledged: false,
      details: {
        inactiveUserCount: inactiveUsers.length,
        users: inactiveUsers.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
      },
    })
  }

  // Check for excessive admin actions
  const adminActions = await prisma.auditLog.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      OR: [
        { action: { contains: 'user.' } },
        { action: { contains: 'system.' } },
        { action: { contains: 'admin.' } },
      ],
    },
  })

  if (adminActions > 100) { // More than 100 admin actions in 24 hours
    alerts.push({
      id: `high-admin-activity-${Date.now()}`,
      type: 'compliance',
      severity: 'medium',
      title: 'High Administrative Activity',
      message: `${adminActions} administrative actions performed in the last 24 hours`,
      timestamp: endDate,
      acknowledged: false,
      details: {
        adminActionCount: adminActions,
      },
    })
  }

  return alerts
}