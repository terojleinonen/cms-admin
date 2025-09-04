/**
 * User Security Information API
 * Provides detailed security information for admin user management
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

// Check if user has admin permissions
async function requireAdminAccess() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 }
    )
  }

  return null
}

import { Session, AuditLog } from '@prisma/client'

type SecurityUser = {
  emailVerified: Date | null;
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
};

// Calculate security score based on various factors
function calculateSecurityScore(user: SecurityUser, sessions: Session[], auditLogs: AuditLog[]): number {
  let score = 0

  // Base score
  score += 20

  // Email verification
  if (user.emailVerified) {
    score += 20
  }

  // Two-factor authentication
  if (user.twoFactorEnabled) {
    score += 30
  }

  // Recent password change (within last 90 days)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  
  const recentPasswordChange = auditLogs.some(log => 
    log.action === 'PASSWORD_CHANGED' && 
    new Date(log.createdAt) > ninetyDaysAgo
  )
  
  if (recentPasswordChange) {
    score += 15
  }

  // Active sessions (fewer is better for security)
  const activeSessions = sessions.filter(s => s.isActive).length
  if (activeSessions <= 2) {
    score += 10
  } else if (activeSessions <= 5) {
    score += 5
  }

  // Recent login activity
  if (user.lastLoginAt) {
    const daysSinceLogin = Math.floor(
      (Date.now() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysSinceLogin <= 7) {
      score += 5
    }
  }

  return Math.min(100, Math.max(0, score))
}

// GET /api/admin/users/[id]/security - Get user security information
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = await requireAdminAccess()
    if (authError) return authError

    const userId = params.id

    // Get user basic info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    // Get active sessions
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        userId: true,
        token: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get recent security-related audit logs
    const securityActions = [
      'LOGIN',
      'LOGOUT',
      'PASSWORD_CHANGED',
      'TWO_FACTOR_ENABLED',
      'TWO_FACTOR_DISABLED',
      'EMAIL_VERIFIED',
      'FAILED_LOGIN',
      'ACCOUNT_LOCKED',
      'ACCOUNT_UNLOCKED',
      'SESSION_CREATED',
      'SESSION_TERMINATED',
    ]

    const recentActivity = await prisma.auditLog.findMany({
      where: {
        userId,
        action: {
          in: securityActions
        }
      },
      select: {
        id: true,
        userId: true,
        action: true,
        resource: true,
        details: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })

    // Find last password change
    const lastPasswordChange = recentActivity.find(log => log.action === 'PASSWORD_CHANGED')

    // Calculate security score
    const securityScore = calculateSecurityScore(user, sessions, recentActivity)

    // Filter active sessions
    const activeSessions = sessions.filter(session => session.isActive)

    const recommendations: { type: string; title: string; description: string; action: string; }[] = [];
    
    if (!user.twoFactorEnabled) {
      recommendations.push({
        type: 'warning',
        title: 'Enable Two-Factor Authentication',
        description: 'Add an extra layer of security to this account',
        action: 'enable_2fa'
      })
    }

    if (!user.emailVerified) {
      recommendations.push({
        type: 'warning',
        title: 'Verify Email Address',
        description: 'Email verification is required for account recovery',
        action: 'verify_email'
      })
    }

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    if (!lastPasswordChange || new Date(lastPasswordChange.createdAt) < ninetyDaysAgo) {
      recommendations.push({
        type: 'info',
        title: 'Consider Password Update',
        description: 'Password hasn\'t been changed recently',
        action: 'change_password'
      })
    }

    if (activeSessions.length > 5) {
      recommendations.push({
        type: 'warning',
        title: 'Multiple Active Sessions',
        description: `${activeSessions.length} active sessions detected`,
        action: 'review_sessions'
      })
    }

    const securityInfo = {
      twoFactorEnabled: user.twoFactorEnabled,
      lastPasswordChange: lastPasswordChange?.createdAt || user.createdAt,
      activeSessions,
      recentActivity,
      securityScore,
      recommendations: recommendations
    }

    return NextResponse.json({ security: securityInfo })

  } catch (error) {
    console.error('Error fetching user security info:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch security information' } },
      { status: 500 }
    )
  }
}