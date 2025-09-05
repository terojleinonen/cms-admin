/**
 * Session Management Service
 * Handles active session tracking, management, and security features
 */

import { prisma } from './db'
import { randomBytes, createHash } from 'crypto'
import { headers } from 'next/headers'

export interface SessionInfo {
  id: string
  userId: string
  token: string
  expiresAt: Date
  ipAddress: string | null
  userAgent: string | null
  isActive: boolean
  createdAt: Date
  isCurrent?: boolean
}

export interface SuspiciousActivity {
  type: 'MULTIPLE_FAILED_LOGINS' | 'UNUSUAL_LOCATION' | 'CONCURRENT_SESSIONS' | 'BRUTE_FORCE'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  details: Record<string, unknown>
  timestamp: Date
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  expiresAt: Date = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours default
): Promise<string> {
  const headersList = headers()
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null
  const userAgent = headersList.get('user-agent') || null

  // Generate secure session token
  const token = generateSecureToken()
  
  // Create session in database
  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
      ipAddress,
      userAgent,
      isActive: true
    }
  })

  // Update user's last login time
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() }
  })

  return token
}

/**
 * Get active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<SessionInfo[]> {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return sessions.map(session => ({
    ...session,
    isCurrent: false // Will be set by caller if needed
  }))
}

/**
 * Validate and refresh a session
 */
export async function validateSession(token: string): Promise<SessionInfo | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  })

  if (!session || !session.isActive || session.expiresAt < new Date()) {
    return null
  }

  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    expiresAt: session.expiresAt,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    isActive: session.isActive,
    createdAt: session.createdAt
  }
}

/**
 * Invalidate a specific session
 */
export async function invalidateSession(sessionId: string): Promise<boolean> {
  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false }
    })
    return true
  } catch (error) {
    console.error('Error invalidating session:', error)
    return false
  }
}

/**
 * Logout from all devices (invalidate all sessions except current)
 */
export async function logoutFromAllDevices(
  userId: string, 
  currentSessionToken?: string
): Promise<number> {
  const whereClause: unknown = {
    userId,
    isActive: true
  }

  // If current session token is provided, exclude it from invalidation
  if (currentSessionToken) {
    whereClause.token = {
      not: currentSessionToken
    }
  }

  const result = await prisma.session.updateMany({
    where: whereClause,
    data: { isActive: false }
  })

  return result.count
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { isActive: false }
      ]
    },
    data: { isActive: false }
  })

  return result.count
}

/**
 * Detect suspicious activity patterns
 */
export async function detectSuspiciousActivity(userId: string): Promise<SuspiciousActivity[]> {
  const suspiciousActivities: SuspiciousActivity[] = []
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  // Check for multiple concurrent sessions from different IPs
  const activeSessions = await prisma.session.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: now }
    },
    select: {
      ipAddress: true,
      userAgent: true,
      createdAt: true
    }
  })

  const uniqueIPs = new Set(activeSessions.map(s => s.ipAddress).filter(Boolean))
  if (uniqueIPs.size > 3) {
    suspiciousActivities.push({
      type: 'CONCURRENT_SESSIONS',
      severity: 'MEDIUM',
      details: {
        sessionCount: activeSessions.length,
        uniqueIPs: uniqueIPs.size,
        ips: Array.from(uniqueIPs)
      },
      timestamp: now
    })
  }

  // Check for failed login attempts (from audit logs)
  const failedLogins = await prisma.auditLog.findMany({
    where: {
      userId,
      action: 'LOGIN_FAILED',
      createdAt: { gte: oneHourAgo }
    }
  })

  if (failedLogins.length > 5) {
    suspiciousActivities.push({
      type: 'MULTIPLE_FAILED_LOGINS',
      severity: failedLogins.length > 10 ? 'HIGH' : 'MEDIUM',
      details: {
        attemptCount: failedLogins.length,
        timeWindow: '1 hour',
        ips: [...new Set(failedLogins.map(log => log.ipAddress).filter(Boolean))]
      },
      timestamp: now
    })
  }

  // Check for brute force patterns (many failed attempts in short time)
  const recentFailedLogins = await prisma.auditLog.findMany({
    where: {
      userId,
      action: 'LOGIN_FAILED',
      createdAt: { gte: new Date(now.getTime() - 15 * 60 * 1000) } // 15 minutes
    }
  })

  if (recentFailedLogins.length > 10) {
    suspiciousActivities.push({
      type: 'BRUTE_FORCE',
      severity: 'CRITICAL',
      details: {
        attemptCount: recentFailedLogins.length,
        timeWindow: '15 minutes'
      },
      timestamp: now
    })
  }

  return suspiciousActivities
}

/**
 * Lock user account due to suspicious activity
 */
export async function lockUserAccount(
  userId: string, 
  reason: string,
  lockDuration: number = 30 * 60 * 1000 // 30 minutes default
): Promise<void> {
  // Deactivate user account
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false }
  })

  // Invalidate all active sessions
  await prisma.session.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false }
  })

  // Log the account lock
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'ACCOUNT_LOCKED',
      resource: 'USER_ACCOUNT',
      details: {
        reason,
        lockDuration,
        lockedAt: new Date(),
        unlockAt: new Date(Date.now() + lockDuration)
      }
    }
  })
}

/**
 * Generate a secure session token
 */
function generateSecureToken(): string {
  const randomData = randomBytes(32)
  const timestamp = Date.now().toString()
  const combined = Buffer.concat([randomData, Buffer.from(timestamp)])
  return createHash('sha256').update(combined).digest('hex')
}

/**
 * Get session statistics for a user
 */
export async function getSessionStatistics(userId: string) {
  const [activeSessions, totalSessions, recentLogins] = await Promise.all([
    prisma.session.count({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() }
      }
    }),
    prisma.session.count({
      where: { userId }
    }),
    prisma.auditLog.findMany({
      where: {
        userId,
        action: 'LOGIN_SUCCESS',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ])

  return {
    activeSessions,
    totalSessions,
    recentLogins: recentLogins.length,
    lastLogin: recentLogins[0]?.createdAt || null
  }
}