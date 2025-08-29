/**
 * Security Monitoring API
 * Handles security monitoring and suspicious activity detection
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth-config'
import { 
  detectSuspiciousActivity, 
  lockUserAccount,
  getSessionStatistics
} from '@/app/lib/session-management'
import { getPasswordResetStatistics } from '@/app/lib/password-reset'
import { logAuditEvent } from '@/app/lib/audit-service'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'

const securityActionSchema = z.object({
  action: z.enum(['lock_account', 'unlock_account', 'force_logout']),
  reason: z.string().optional(),
  lockDuration: z.number().optional()
})

/**
 * GET /api/users/[id]/security/monitoring
 * Get security monitoring data for a user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = params.id
    const currentUserId = session.user.id
    const userRole = session.user.role

    // Only admins can view security monitoring for other users
    if (userId !== currentUserId && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get comprehensive security data
    const [
      suspiciousActivity,
      sessionStats,
      passwordResetStats,
      recentSecurityEvents,
      user
    ] = await Promise.all([
      detectSuspiciousActivity(userId),
      getSessionStatistics(userId),
      getPasswordResetStatistics('week'),
      prisma.auditLog.findMany({
        where: {
          userId,
          action: {
            in: [
              'LOGIN_FAILED',
              'PASSWORD_CHANGED',
              'TWO_FACTOR_ENABLED',
              'TWO_FACTOR_DISABLED',
              'ACCOUNT_LOCKED',
              'SUSPICIOUS_ACTIVITY_DETECTED'
            ]
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          lastLoginAt: true,
          twoFactorEnabled: true
        }
      })
    ])

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Calculate security score
    const securityScore = calculateSecurityScore({
      twoFactorEnabled: user.twoFactorEnabled,
      suspiciousActivityCount: suspiciousActivity.length,
      recentFailedLogins: recentSecurityEvents.filter(e => e.action === 'LOGIN_FAILED').length,
      activeSessions: sessionStats.activeSessions
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        twoFactorEnabled: user.twoFactorEnabled
      },
      securityScore,
      suspiciousActivity,
      sessionStatistics: sessionStats,
      passwordResetStatistics: passwordResetStats,
      recentSecurityEvents,
      recommendations: generateSecurityRecommendations({
        user,
        suspiciousActivity,
        sessionStats,
        recentSecurityEvents
      })
    })
  } catch (error) {
    console.error('Error fetching security monitoring data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users/[id]/security/monitoring
 * Perform security actions (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const userId = params.id
    const body = await request.json()
    const validation = securityActionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { action, reason, lockDuration } = validation.data
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.ip || null
    const userAgent = request.headers.get('user-agent') || null

    switch (action) {
      case 'lock_account': {
        await lockUserAccount(
          userId, 
          reason || 'Manual lock by administrator',
          lockDuration || 30 * 60 * 1000 // 30 minutes default
        )

        await logAuditEvent({
          userId: session.user.id,
          action: 'ADMIN_ACCOUNT_LOCKED',
          resource: 'USER_ACCOUNT',
          details: { 
            targetUserId: userId,
            reason,
            lockDuration
          },
          ipAddress,
          userAgent
        })

        return NextResponse.json({
          success: true,
          message: 'Account locked successfully'
        })
      }

      case 'unlock_account': {
        await prisma.user.update({
          where: { id: userId },
          data: { isActive: true }
        })

        await logAuditEvent({
          userId: session.user.id,
          action: 'ADMIN_ACCOUNT_UNLOCKED',
          resource: 'USER_ACCOUNT',
          details: { 
            targetUserId: userId,
            reason
          },
          ipAddress,
          userAgent
        })

        return NextResponse.json({
          success: true,
          message: 'Account unlocked successfully'
        })
      }

      case 'force_logout': {
        const invalidatedCount = await prisma.session.updateMany({
          where: { userId, isActive: true },
          data: { isActive: false }
        })

        await logAuditEvent({
          userId: session.user.id,
          action: 'ADMIN_FORCE_LOGOUT',
          resource: 'USER_SESSION',
          details: { 
            targetUserId: userId,
            invalidatedSessions: invalidatedCount.count,
            reason
          },
          ipAddress,
          userAgent
        })

        return NextResponse.json({
          success: true,
          message: `Forced logout from ${invalidatedCount.count} sessions`
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error performing security action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Calculate security score based on various factors
 */
function calculateSecurityScore(factors: {
  twoFactorEnabled: boolean
  suspiciousActivityCount: number
  recentFailedLogins: number
  activeSessions: number
}): { score: number; level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } {
  let score = 100

  // Deduct points for security issues
  if (!factors.twoFactorEnabled) score -= 20
  if (factors.suspiciousActivityCount > 0) score -= factors.suspiciousActivityCount * 15
  if (factors.recentFailedLogins > 3) score -= (factors.recentFailedLogins - 3) * 10
  if (factors.activeSessions > 5) score -= (factors.activeSessions - 5) * 5

  score = Math.max(0, score)

  let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  if (score >= 80) level = 'HIGH'
  else if (score >= 60) level = 'MEDIUM'
  else if (score >= 40) level = 'LOW'
  else level = 'CRITICAL'

  return { score, level }
}

/**
 * Generate security recommendations based on user data
 */
function generateSecurityRecommendations(data: {
  user: any
  suspiciousActivity: any[]
  sessionStats: any
  recentSecurityEvents: any[]
}): string[] {
  const recommendations: string[] = []

  if (!data.user.twoFactorEnabled) {
    recommendations.push('Enable two-factor authentication for enhanced security')
  }

  if (data.suspiciousActivity.length > 0) {
    recommendations.push('Review recent suspicious activity and consider changing password')
  }

  if (data.sessionStats.activeSessions > 5) {
    recommendations.push('Review active sessions and logout from unused devices')
  }

  const recentFailedLogins = data.recentSecurityEvents.filter(e => e.action === 'LOGIN_FAILED')
  if (recentFailedLogins.length > 3) {
    recommendations.push('Multiple failed login attempts detected - consider changing password')
  }

  if (recommendations.length === 0) {
    recommendations.push('Your account security looks good!')
  }

  return recommendations
}