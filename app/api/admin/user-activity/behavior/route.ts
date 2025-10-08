/**
 * User Behavior Analysis API
 * Provides advanced user behavior pattern analysis and risk assessment
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const behaviorQuerySchema = z.object({
  timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
  minRiskScore: z.coerce.number().min(0).max(100).optional(),
  userId: z.string().optional(),
})

interface UserBehaviorData {
  userId: string
  userName: string
  userEmail: string
  userRole: string
  totalActions: number
  loginCount: number
  failedLoginCount: number
  resourcesAccessed: string[]
  actionsPerformed: Record<string, number>
  timeDistribution: Record<string, number>
  ipAddresses: string[]
  userAgents: string[]
  securityEvents: number
  adminActions: number
  dataExports: number
  lastActivity: Date
  firstActivity: Date
}

/**
 * GET /api/admin/user-activity/behavior
 * Get user behavior analysis and risk patterns
 */
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    try {
      const { searchParams } = new URL(request.url)
      const params = Object.fromEntries(searchParams.entries())
      const { timeRange, minRiskScore, userId } = behaviorQuerySchema.parse(params)

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

      // Get comparison period for trend analysis
      const comparisonStartDate = new Date(startDate)
      const comparisonEndDate = new Date(startDate)
      const periodLength = startDate.getTime() - comparisonStartDate.getTime()
      comparisonStartDate.setTime(comparisonStartDate.getTime() - periodLength)

      // Get users with activity in the period
      const activeUserIds = await prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startDate, lte: now },
          ...(userId && { userId }),
        },
      }).then(result => result.map(r => r.userId))

      const behaviorPatterns = await Promise.all(
        activeUserIds.map(async (userId) => {
          // Get user info
          const userInfo = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true },
          })

          if (!userInfo) return null

          // Get user's activity logs
          const userLogs = await prisma.auditLog.findMany({
            where: {
              userId,
              createdAt: { gte: startDate, lte: now },
            },
            orderBy: { createdAt: 'desc' },
          })

          // Get comparison period logs for trend analysis
          const comparisonLogs = await prisma.auditLog.findMany({
            where: {
              userId,
              createdAt: { gte: comparisonStartDate, lte: comparisonEndDate },
            },
          })

          if (userLogs.length === 0) return null

          // Analyze user behavior
          const behaviorData = analyzeUserBehavior(userLogs, userInfo)
          const comparisonData = analyzeUserBehavior(comparisonLogs, userInfo)
          
          // Calculate risk score and patterns
          const riskAnalysis = calculateRiskScore(behaviorData)
          const trends = calculateTrends(behaviorData, comparisonData)
          const patterns = identifyPatterns(behaviorData, riskAnalysis.riskScore)

          return {
            userId: userInfo.id,
            userName: userInfo.name || 'Unknown',
            userEmail: userInfo.email || 'Unknown',
            userRole: userInfo.role,
            pattern: patterns.pattern,
            riskScore: riskAnalysis.riskScore,
            confidence: riskAnalysis.confidence,
            indicators: riskAnalysis.indicators,
            recommendations: patterns.recommendations,
            lastAnalyzed: now,
            trends,
          }
        })
      )

      // Filter out null results and apply minimum risk score filter
      const validPatterns = behaviorPatterns
        .filter((pattern): pattern is NonNullable<typeof pattern> => pattern !== null)
        .filter(pattern => !minRiskScore || pattern.riskScore >= minRiskScore)
        .sort((a, b) => b.riskScore - a.riskScore)

      return NextResponse.json({
        success: true,
        data: validPatterns,
      })
    } catch (error) {
      console.error('Failed to get behavior analysis:', error)
      
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
        { error: 'Failed to get behavior analysis' },
        { status: 500 }
      )
    }
  },
  {
    permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
  }
)

/**
 * Analyze user behavior from audit logs
 */
function analyzeUserBehavior(logs: any[], userInfo: any): UserBehaviorData {
  const loginCount = logs.filter(log => log.action === 'auth.login').length
  const failedLoginCount = logs.filter(log => log.action === 'auth.login_failed').length
  const resourcesAccessed = [...new Set(logs.map(log => log.resource).filter(Boolean))]
  
  // Count actions performed
  const actionsPerformed: Record<string, number> = {}
  logs.forEach(log => {
    actionsPerformed[log.action] = (actionsPerformed[log.action] || 0) + 1
  })

  // Analyze time distribution
  const timeDistribution: Record<string, number> = {
    'night': 0,    // 00:00 - 06:00
    'morning': 0,  // 06:00 - 12:00
    'afternoon': 0, // 12:00 - 18:00
    'evening': 0,  // 18:00 - 24:00
  }

  logs.forEach(log => {
    const hour = new Date(log.createdAt).getHours()
    if (hour < 6) timeDistribution.night++
    else if (hour < 12) timeDistribution.morning++
    else if (hour < 18) timeDistribution.afternoon++
    else timeDistribution.evening++
  })

  // Get unique IP addresses and user agents
  const ipAddresses = [...new Set(logs.map(log => log.ipAddress).filter(Boolean))]
  const userAgents = [...new Set(logs.map(log => log.userAgent).filter(Boolean))]

  // Count security-related events
  const securityEvents = logs.filter(log => 
    log.action.includes('security.') || 
    log.action.includes('permission.denied') ||
    log.action.includes('auth.failed')
  ).length

  // Count administrative actions
  const adminActions = logs.filter(log => 
    log.action.includes('user.') || 
    log.action.includes('system.') ||
    log.action.includes('admin.')
  ).length

  // Count data exports
  const dataExports = logs.filter(log => 
    log.action.includes('export') || 
    log.action.includes('download')
  ).length

  return {
    userId: userInfo.id,
    userName: userInfo.name || 'Unknown',
    userEmail: userInfo.email || 'Unknown',
    userRole: userInfo.role,
    totalActions: logs.length,
    loginCount,
    failedLoginCount,
    resourcesAccessed,
    actionsPerformed,
    timeDistribution,
    ipAddresses,
    userAgents,
    securityEvents,
    adminActions,
    dataExports,
    lastActivity: logs[0]?.createdAt || new Date(),
    firstActivity: logs[logs.length - 1]?.createdAt || new Date(),
  }
}

/**
 * Calculate risk score and identify risk indicators
 */
function calculateRiskScore(data: UserBehaviorData): {
  riskScore: number
  confidence: number
  indicators: string[]
} {
  let riskScore = 0
  const indicators: string[] = []
  let confidence = 0.8 // Base confidence

  // Failed login attempts (high risk)
  if (data.failedLoginCount > 5) {
    riskScore += 25
    indicators.push(`High failed login attempts (${data.failedLoginCount})`)
    confidence += 0.1
  } else if (data.failedLoginCount > 2) {
    riskScore += 10
    indicators.push(`Multiple failed login attempts (${data.failedLoginCount})`)
  }

  // Excessive resource access
  if (data.resourcesAccessed.length > 15) {
    riskScore += 15
    indicators.push(`Accessing many resources (${data.resourcesAccessed.length})`)
  }

  // High activity volume
  if (data.totalActions > 500) {
    riskScore += 10
    indicators.push(`Very high activity volume (${data.totalActions} actions)`)
  }

  // Security events
  if (data.securityEvents > 10) {
    riskScore += 20
    indicators.push(`Multiple security events (${data.securityEvents})`)
    confidence += 0.1
  } else if (data.securityEvents > 5) {
    riskScore += 10
    indicators.push(`Some security events (${data.securityEvents})`)
  }

  // Administrative actions (moderate risk for non-admin users)
  if (data.userRole !== 'ADMIN' && data.adminActions > 5) {
    riskScore += 15
    indicators.push(`Non-admin performing admin actions (${data.adminActions})`)
    confidence += 0.1
  }

  // Multiple IP addresses (potential account sharing)
  if (data.ipAddresses.length > 5) {
    riskScore += 10
    indicators.push(`Multiple IP addresses (${data.ipAddresses.length})`)
  }

  // Night activity (outside business hours)
  const totalNightActivity = data.timeDistribution.night
  const nightActivityRatio = totalNightActivity / data.totalActions
  if (nightActivityRatio > 0.3) {
    riskScore += 8
    indicators.push(`High night activity (${(nightActivityRatio * 100).toFixed(1)}%)`)
  }

  // Data exports
  if (data.dataExports > 10) {
    riskScore += 12
    indicators.push(`Multiple data exports (${data.dataExports})`)
  }

  // Multiple user agents (potential bot activity)
  if (data.userAgents.length > 3) {
    riskScore += 8
    indicators.push(`Multiple user agents (${data.userAgents.length})`)
  }

  return {
    riskScore: Math.min(100, riskScore),
    confidence: Math.min(1, confidence),
    indicators,
  }
}

/**
 * Calculate trends by comparing current and previous periods
 */
function calculateTrends(current: UserBehaviorData, previous: UserBehaviorData): {
  activityTrend: 'increasing' | 'decreasing' | 'stable'
  riskTrend: 'increasing' | 'decreasing' | 'stable'
  accessPatternChange: boolean
} {
  // Activity trend
  let activityTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  if (current.totalActions > previous.totalActions * 1.2) {
    activityTrend = 'increasing'
  } else if (current.totalActions < previous.totalActions * 0.8) {
    activityTrend = 'decreasing'
  }

  // Risk trend (simplified)
  const currentRisk = calculateRiskScore(current).riskScore
  const previousRisk = calculateRiskScore(previous).riskScore
  let riskTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  if (currentRisk > previousRisk + 10) {
    riskTrend = 'increasing'
  } else if (currentRisk < previousRisk - 10) {
    riskTrend = 'decreasing'
  }

  // Access pattern change
  const currentResources = new Set(current.resourcesAccessed)
  const previousResources = new Set(previous.resourcesAccessed)
  const intersection = new Set([...currentResources].filter(r => previousResources.has(r)))
  const union = new Set([...currentResources, ...previousResources])
  const similarity = intersection.size / union.size
  const accessPatternChange = similarity < 0.7 // 70% similarity threshold

  return {
    activityTrend,
    riskTrend,
    accessPatternChange,
  }
}

/**
 * Identify behavior patterns and provide recommendations
 */
function identifyPatterns(data: UserBehaviorData, riskScore: number): {
  pattern: 'normal' | 'suspicious' | 'anomalous' | 'high_risk'
  recommendations: string[]
} {
  const recommendations: string[] = []

  let pattern: 'normal' | 'suspicious' | 'anomalous' | 'high_risk' = 'normal'

  if (riskScore >= 60) {
    pattern = 'high_risk'
    recommendations.push('Immediate security review required')
    recommendations.push('Consider temporary access restriction')
    recommendations.push('Enable enhanced monitoring')
  } else if (riskScore >= 40) {
    pattern = 'suspicious'
    recommendations.push('Enhanced monitoring recommended')
    recommendations.push('Review recent activities')
    recommendations.push('Verify user identity')
  } else if (riskScore >= 20) {
    pattern = 'anomalous'
    recommendations.push('Monitor for continued anomalous behavior')
    recommendations.push('Review access patterns')
  } else {
    recommendations.push('Continue regular monitoring')
  }

  // Specific recommendations based on behavior
  if (data.failedLoginCount > 3) {
    recommendations.push('Enable two-factor authentication')
    recommendations.push('Review password security')
  }

  if (data.ipAddresses.length > 3) {
    recommendations.push('Verify legitimate access locations')
    recommendations.push('Consider IP-based restrictions')
  }

  if (data.timeDistribution.night / data.totalActions > 0.2) {
    recommendations.push('Review after-hours access policy')
  }

  if (data.dataExports > 5) {
    recommendations.push('Review data export permissions')
    recommendations.push('Monitor data access patterns')
  }

  return {
    pattern,
    recommendations: [...new Set(recommendations)], // Remove duplicates
  }
}