/**
 * Security Dashboard API
 * Provides security metrics and monitoring data for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/has-permission'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin permission
    if (!hasPermission(session.user as any, 'admin')) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get security metrics
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      recentLogins,
      failedLoginAttempts
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.auditLog.count({
        where: {
          action: 'LOGIN',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      prisma.auditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ])

    // Get recent security events
    const recentEvents = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['LOGIN', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PERMISSION_DENIED']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        action: true,
        userId: true,
        metadata: true,
        createdAt: true
      }
    })

    // Calculate security score (simple algorithm)
    const securityScore = calculateSecurityScore({
      totalUsers,
      activeUsers,
      inactiveUsers,
      failedLoginAttempts,
      recentLogins
    })

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          recentLogins,
          failedLoginAttempts,
          securityScore
        },
        recentEvents,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Security dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateSecurityScore(metrics: {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  failedLoginAttempts: number
  recentLogins: number
}): number {
  let score = 100

  // Deduct points for failed login attempts
  if (metrics.failedLoginAttempts > 10) {
    score -= Math.min(30, metrics.failedLoginAttempts * 2)
  }

  // Deduct points for high ratio of inactive users
  if (metrics.totalUsers > 0) {
    const inactiveRatio = metrics.inactiveUsers / metrics.totalUsers
    if (inactiveRatio > 0.3) {
      score -= Math.min(20, inactiveRatio * 50)
    }
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)))
}
