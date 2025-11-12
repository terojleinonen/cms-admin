/**
 * Admin User Security Details API endpoint
 * Provides detailed security information for a specific user
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

// Check if user has admin permissions
async function requireAdminAccess() {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  if (session.user?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 }
    )
  }

  return null
}

// Calculate security score based on various factors
function calculateSecurityScore(user: any): number {
  let score = 0
  
  // Base score
  score += 20
  
  // Email verified
  if (user?.emailVerified) score += 20
  
  // Two-factor authentication enabled
  if (user.twoFactorEnabled) score += 30
  
  // Recent login (within last 30 days)
  if (user.lastLoginAt && new Date(user.lastLoginAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
    score += 15
  }
  
  // Active sessions (not too many)
  const sessionCount = user.sessions?.length || 0
  if (sessionCount > 0 && sessionCount <= 3) {
    score += 10
  } else if (sessionCount > 5) {
    score -= 10 // Too many sessions might be suspicious
  }
  
  // Account is active
  if (user.isActive) score += 5
  
  return Math.min(100, Math.max(0, score))
}

// GET /api/admin/users/[id]/security - Get user security details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = await requireAdminAccess()
    if (authError) return authError

    const userId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: { code: 'INVALID_ID', message: 'Invalid user ID format' } },
        { status: 400 }
      )
    }

    // Get user with security-related information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          where: {
            isActive: true,
            expiresAt: {
              gt: new Date()
            }
          },
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            expiresAt: true,
            isActive: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        auditLogs: {
          select: {
            id: true,
            action: true,
            resource: true,
            details: true,
            ipAddress: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10 // Last 10 activities
        },
        passwordResetTokens: {
          where: {
            used: false,
            expiresAt: {
              gt: new Date()
            }
          },
          select: {
            createdAt: true,
            expiresAt: true,
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    // Get security events for this user
    // TODO: Implement securityEvent model in Prisma schema
    const securityEvents: any[] = []
    /*
    const securityEvents = await prisma.securityEvent.findMany({
      where: {
        userId: userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: {
        id: true,
        type: true,
        severity: true,
        details: true,
        resolved: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })
    */

    // Calculate security score
    const securityScore = calculateSecurityScore(user)

    // Determine last password change (simplified - would need password history table in real app)
    const lastPasswordChange = user.passwordResetTokens[0]?.createdAt || user.createdAt

    // Prepare security information
    const securityInfo = {
      twoFactorEnabled: user.twoFactorEnabled,
      lastPasswordChange,
      activeSessions: user.sessions,
      recentActivity: user.auditLogs,
      securityEvents,
      securityScore,
      emailVerified: !!user?.emailVerified,
      accountAge: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)), // days
      lastLogin: user.lastLoginAt,
      activeSessionCount: user.sessions.length,
      hasActivePasswordReset: user.passwordResetTokens.length > 0,
    }

    return NextResponse.json({
      success: true,
      security: securityInfo,
    })

  } catch (error) {
    console.error('Error fetching user security details:', error)
    
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch security details',
          timestamp: new Date().toISOString()
        },
        success: false
      },
      { status: 500 }
    )
  }
}