/**
 * User Activity Metrics API
 * Provides real-time user activity metrics and analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const metricsQuerySchema = z.object({
  timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
})

/**
 * GET /api/admin/user-activity/metrics
 * Get real-time user activity metrics
 */
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    try {
      const { searchParams } = new URL(request.url)
      const params = Object.fromEntries(searchParams.entries())
      const { timeRange } = metricsQuerySchema.parse(params)

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

      // Get basic user metrics
      const [totalUsers, activeUsers, totalSessions] = await Promise.all([
        prisma.user.count(),
        prisma.auditLog.groupBy({
          by: ['userId'],
          where: {
            createdAt: { gte: startDate, lte: now },
          },
        }).then(result => result.length),
        prisma.auditLog.count({
          where: {
            action: 'auth.login',
            createdAt: { gte: startDate, lte: now },
          },
        }),
      ])

      // Get online users (active in last 15 minutes)
      const onlineThreshold = new Date(now.getTime() - 15 * 60 * 1000)
      const onlineUsers = await prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: onlineThreshold, lte: now },
        },
      }).then(result => result.length)

      // Get activity metrics
      const totalActions = await prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate, lte: now },
        },
      })

      const failedActions = await prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate, lte: now },
          details: {
            path: ['success'],
            equals: false,
          },
        },
      })

      const securityAlerts = await prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate, lte: now },
          action: { contains: 'security.' },
        },
      })

      const permissionDenials = await prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate, lte: now },
          action: 'permission.denied',
        },
      })

      // Calculate actions per minute
      const timeRangeMinutes = (now.getTime() - startDate.getTime()) / (1000 * 60)
      const actionsPerMinute = totalActions / timeRangeMinutes

      // Get session duration data
      const sessionLogs = await prisma.auditLog.findMany({
        where: {
          OR: [
            { action: 'auth.login' },
            { action: 'auth.logout' },
          ],
          createdAt: { gte: startDate, lte: now },
        },
        orderBy: { createdAt: 'asc' },
      })

      // Calculate average session duration
      let totalSessionDuration = 0
      let sessionCount = 0
      const userSessions: Record<string, Date> = {}

      sessionLogs.forEach(log => {
        if (log.action === 'auth.login') {
          userSessions[log.userId] = log.createdAt
        } else if (log.action === 'auth.logout' && userSessions[log.userId]) {
          const sessionDuration = log.createdAt.getTime() - userSessions[log.userId].getTime()
          totalSessionDuration += sessionDuration
          sessionCount++
          delete userSessions[log.userId]
        }
      })

      const averageSessionDuration = sessionCount > 0 ? totalSessionDuration / sessionCount / 1000 : 0

      // Get top resources
      const resourceAccess = await prisma.auditLog.groupBy({
        by: ['resource'],
        where: {
          createdAt: { gte: startDate, lte: now },
          resource: { not: null },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      })

      const topResources = await Promise.all(
        resourceAccess.map(async (resource) => {
          const uniqueUsers = await prisma.auditLog.groupBy({
            by: ['userId'],
            where: {
              resource: resource.resource,
              createdAt: { gte: startDate, lte: now },
            },
          }).then(result => result.length)

          return {
            resource: resource.resource || 'unknown',
            accessCount: resource._count.id,
            uniqueUsers,
          }
        })
      )

      // Get top actions
      const actionStats = await prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          createdAt: { gte: startDate, lte: now },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      })

      const topActions = await Promise.all(
        actionStats.map(async (action) => {
          const successCount = await prisma.auditLog.count({
            where: {
              action: action.action,
              createdAt: { gte: startDate, lte: now },
              NOT: {
                details: {
                  path: ['success'],
                  equals: false,
                },
              },
            },
          })

          return {
            action: action.action,
            count: action._count.id,
            successRate: action._count.id > 0 ? successCount / action._count.id : 0,
          }
        })
      )

      // Get risk distribution (simplified calculation)
      const userRisks = await prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startDate, lte: now },
        },
        _count: {
          id: true,
        },
      })

      const riskDistribution = { low: 0, medium: 0, high: 0, critical: 0 }
      
      for (const userRisk of userRisks) {
        const failedLogins = await prisma.auditLog.count({
          where: {
            userId: userRisk.userId,
            action: 'auth.login_failed',
            createdAt: { gte: startDate, lte: now },
          },
        })

        const securityActions = await prisma.auditLog.count({
          where: {
            userId: userRisk.userId,
            action: { contains: 'security.' },
            createdAt: { gte: startDate, lte: now },
          },
        })

        // Simple risk calculation
        let riskScore = failedLogins * 10 + securityActions * 5
        if (userRisk._count.id > 100) riskScore += 10

        if (riskScore >= 50) riskDistribution.critical++
        else if (riskScore >= 30) riskDistribution.high++
        else if (riskScore >= 15) riskDistribution.medium++
        else riskDistribution.low++
      }

      // Get geographic distribution (simplified - based on IP if available)
      const geographicData = await prisma.auditLog.findMany({
        where: {
          createdAt: { gte: startDate, lte: now },
          ipAddress: { not: null },
        },
        select: {
          ipAddress: true,
          userId: true,
        },
      })

      // Simplified geographic distribution
      const geographicDistribution = [
        { country: 'Unknown', city: 'Unknown', userCount: new Set(geographicData.map(d => d.userId)).size, sessionCount: geographicData.length }
      ]

      // Get device distribution (simplified - based on user agent)
      const deviceData = await prisma.auditLog.findMany({
        where: {
          createdAt: { gte: startDate, lte: now },
          userAgent: { not: null },
        },
        select: {
          userAgent: true,
        },
      })

      const deviceCounts: Record<string, number> = {}
      deviceData.forEach(d => {
        const device = d.userAgent?.includes('Mobile') ? 'Mobile' : 
                     d.userAgent?.includes('Tablet') ? 'Tablet' : 'Desktop'
        deviceCounts[device] = (deviceCounts[device] || 0) + 1
      })

      const totalDeviceCount = Object.values(deviceCounts).reduce((sum, count) => sum + count, 0)
      const deviceDistribution = Object.entries(deviceCounts).map(([device, count]) => ({
        device,
        count,
        percentage: totalDeviceCount > 0 ? (count / totalDeviceCount) * 100 : 0,
      }))

      // Get hourly activity
      const hourlyActivity = Array.from({ length: 24 }, (_, hour) => {
        const hourStart = new Date(startDate)
        hourStart.setHours(hour, 0, 0, 0)
        const hourEnd = new Date(hourStart)
        hourEnd.setHours(hour + 1, 0, 0, 0)

        return {
          hour,
          actionCount: 0,
          userCount: 0,
        }
      })

      // Populate hourly data (simplified for demo)
      const hourlyLogs = await prisma.auditLog.findMany({
        where: {
          createdAt: { gte: startDate, lte: now },
        },
        select: {
          createdAt: true,
          userId: true,
        },
      })

      hourlyLogs.forEach(log => {
        const hour = log.createdAt.getHours()
        if (hourlyActivity[hour]) {
          hourlyActivity[hour].actionCount++
        }
      })

      // Calculate unique users per hour (simplified)
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(startDate)
        hourStart.setHours(hour, 0, 0, 0)
        const hourEnd = new Date(hourStart)
        hourEnd.setHours(hour + 1, 0, 0, 0)

        const uniqueUsers = await prisma.auditLog.groupBy({
          by: ['userId'],
          where: {
            createdAt: { gte: hourStart, lte: hourEnd },
          },
        }).then(result => result.length)

        hourlyActivity[hour].userCount = uniqueUsers
      }

      const metrics = {
        totalUsers,
        activeUsers,
        onlineUsers,
        totalSessions,
        averageSessionDuration,
        totalActions,
        actionsPerMinute,
        failedActions,
        securityAlerts,
        permissionDenials,
        topResources,
        topActions,
        riskDistribution,
        geographicDistribution,
        deviceDistribution,
        hourlyActivity,
      }

      return NextResponse.json({
        success: true,
        data: metrics,
      })
    } catch (error) {
      console.error('Failed to get user activity metrics:', error)
      
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
        { error: 'Failed to get user activity metrics' },
        { status: 500 }
      )
    }
  },
  {
    permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
  }
)