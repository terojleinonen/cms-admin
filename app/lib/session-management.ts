/**
 * Session Management Service
 * Comprehensive session handling for user authentication, security monitoring,
 * and session lifecycle management with support for multiple devices
 */

import { PrismaClient, Session, User } from '@prisma/client'
import { sessionSchema, sessionTerminationSchema } from './user-validation-schemas'
import { getAuditService } from './audit-service'
import crypto from 'crypto'
import { z } from 'zod'

export interface SessionInfo {
  id: string
  userId: string
  token: string
  expiresAt: Date
  ipAddress?: string
  userAgent?: string
  isActive: boolean
  createdAt: Date
  isCurrent?: boolean
  deviceInfo?: DeviceInfo
  location?: LocationInfo
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  browser: string
  os: string
  version?: string
}

export interface LocationInfo {
  country?: string
  region?: string
  city?: string
  timezone?: string
}

export interface SessionStats {
  totalSessions: number
  activeSessions: number
  expiredSessions: number
  deviceBreakdown: Record<string, number>
  locationBreakdown: Record<string, number>
  recentSessions: SessionInfo[]
}

export interface SessionSecurityEvent {
  type: 'suspicious_location' | 'multiple_devices' | 'concurrent_sessions' | 'expired_token'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  sessionId: string
  userId: string
  details: Record<string, any>
}

/**
 * Session Management Service
 */
export class SessionManagementService {
  private static instance: SessionManagementService | null = null
  private prisma: PrismaClient
  private defaultExpirationHours: number
  private maxSessionsPerUser: number
  private auditService: any

  private constructor(
    prisma: PrismaClient,
    defaultExpirationHours: number = 24 * 7, // 7 days
    maxSessionsPerUser: number = 10
  ) {
    this.prisma = prisma
    this.defaultExpirationHours = defaultExpirationHours
    this.maxSessionsPerUser = maxSessionsPerUser
    this.auditService = getAuditService(prisma)
  }

  static getInstance(
    prisma: PrismaClient,
    defaultExpirationHours?: number,
    maxSessionsPerUser?: number
  ): SessionManagementService {
    if (!SessionManagementService.instance) {
      SessionManagementService.instance = new SessionManagementService(
        prisma,
        defaultExpirationHours,
        maxSessionsPerUser
      )
    }
    return SessionManagementService.instance
  }

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    expirationHours?: number
  ): Promise<SessionInfo> {
    try {
      // Generate secure session token
      const token = this.generateSecureToken()
      
      // Calculate expiration date
      const expiresAt = new Date(
        Date.now() + (expirationHours || this.defaultExpirationHours) * 60 * 60 * 1000
      )

      // Check if user has too many active sessions
      await this.enforceSessionLimit(userId)

      // Create session in database
      const session = await this.prisma.session.create({
        data: {
          userId,
          token,
          expiresAt,
          ipAddress,
          userAgent,
          isActive: true,
        },
      })

      // Parse device and location info
      const deviceInfo = this.parseUserAgent(userAgent)
      const locationInfo = await this.getLocationInfo(ipAddress)

      // Log session creation
      await this.auditService.logAuth(
        userId,
        'LOGIN',
        {
          sessionId: session.id,
          deviceInfo,
          locationInfo,
        },
        ipAddress,
        userAgent
      )

      // Check for security events
      await this.checkSessionSecurity(userId, session.id, ipAddress, deviceInfo, locationInfo)

      return {
        ...session,
        deviceInfo,
        location: locationInfo,
      }
    } catch (error) {
      console.error('Failed to create session:', error)
      throw new Error(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate and refresh a session
   */
  async validateSession(token: string, ipAddress?: string): Promise<SessionInfo | null> {
    try {
      const session = await this.prisma.session.findUnique({
        where: { token },
        include: {
          user: {
            select: {
              id: true,
              isActive: true,
            },
          },
        },
      })

      if (!session || !session.isActive || !session.user.isActive) {
        return null
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await this.terminateSession(session.id, 'expired')
        return null
      }

      // Update last activity (optional - can be done periodically to reduce DB writes)
      // await this.updateSessionActivity(session.id, ipAddress)

      const deviceInfo = this.parseUserAgent(session.userAgent || undefined)
      const locationInfo = await this.getLocationInfo(session.ipAddress || undefined)

      return {
        ...session,
        ipAddress: session.ipAddress || undefined,
        userAgent: session.userAgent || undefined,
        deviceInfo,
        location: locationInfo,
      }
    } catch (error) {
      console.error('Failed to validate session:', error)
      return null
    }
  }

  /**
   * Terminate a session
   */
  async terminateSession(
    sessionId: string,
    reason: 'logout' | 'expired' | 'security' | 'admin' = 'logout'
  ): Promise<void> {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
      })

      if (!session) {
        return
      }

      // Deactivate session
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { isActive: false },
      })

      // Log session termination
      await this.auditService.logAuth(
        session.userId,
        'LOGOUT',
        {
          sessionId,
          reason,
        },
        session.ipAddress,
        session.userAgent
      )
    } catch (error) {
      console.error('Failed to terminate session:', error)
      throw new Error(`Failed to terminate session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Terminate multiple sessions
   */
  async terminateSessions(
    sessionIds: string[],
    reason: 'logout' | 'security' | 'admin' = 'logout'
  ): Promise<{ terminated: number }> {
    try {
      const validatedData = sessionTerminationSchema.parse({
        sessionIds,
        terminateAll: false,
      })

      // Get sessions for audit logging
      const sessions = await this.prisma.session.findMany({
        where: {
          id: { in: validatedData.sessionIds },
          isActive: true,
        },
      })

      // Deactivate sessions
      const result = await this.prisma.session.updateMany({
        where: {
          id: { in: validatedData.sessionIds },
          isActive: true,
        },
        data: { isActive: false },
      })

      // Log session terminations
      for (const session of sessions) {
        await this.auditService.logAuth(
          session.userId,
          'SESSION_TERMINATED',
          {
            sessionId: session.id,
            reason,
            terminatedCount: result.count,
          },
          session.ipAddress,
          session.userAgent
        )
      }

      return { terminated: result.count }
    } catch (error) {
      console.error('Failed to terminate sessions:', error)
      throw new Error(`Failed to terminate sessions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Terminate all sessions for a user except current
   */
  async terminateAllUserSessions(
    userId: string,
    excludeSessionId?: string,
    reason: 'security' | 'admin' | 'user_request' = 'user_request'
  ): Promise<{ terminated: number }> {
    try {
      const where: any = {
        userId,
        isActive: true,
      }

      if (excludeSessionId) {
        where.id = { not: excludeSessionId }
      }

      // Get sessions for audit logging
      const sessions = await this.prisma.session.findMany({ where })

      // Deactivate sessions
      const result = await this.prisma.session.updateMany({
        where,
        data: { isActive: false },
      })

      // Log bulk session termination
      await this.auditService.logSecurity(
        userId,
        'BULK_OPERATION',
        {
          operation: 'terminate_all_sessions',
          reason,
          terminatedCount: result.count,
          excludedSession: excludeSessionId,
        }
      )

      return { terminated: result.count }
    } catch (error) {
      console.error('Failed to terminate all user sessions:', error)
      throw new Error(`Failed to terminate all user sessions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(
    userId: string,
    includeInactive: boolean = false
  ): Promise<SessionInfo[]> {
    try {
      const where: any = { userId }
      
      if (!includeInactive) {
        where.isActive = true
      }

      const sessions = await this.prisma.session.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      })

      return sessions.map(session => ({
        ...session,
        deviceInfo: this.parseUserAgent(session.userAgent || undefined),
        location: undefined, // Location lookup is expensive, do it on demand
      }))
    } catch (error) {
      console.error('Failed to get user sessions:', error)
      throw new Error(`Failed to get user sessions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(userId?: string): Promise<SessionStats> {
    try {
      const where: any = {}
      if (userId) {
        where.userId = userId
      }

      // Get session counts
      const [totalSessions, activeSessions] = await Promise.all([
        this.prisma.session.count({ where }),
        this.prisma.session.count({ where: { ...where, isActive: true } }),
      ])

      const expiredSessions = totalSessions - activeSessions

      // Get recent sessions with device info
      const recentSessions = await this.prisma.session.findMany({
        where: { ...where, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      // Parse device and location breakdown
      const deviceBreakdown: Record<string, number> = {}
      const locationBreakdown: Record<string, number> = {}

      const sessionInfos = recentSessions.map(session => {
        const deviceInfo = this.parseUserAgent(session.userAgent || undefined)
        
        // Count device types
        deviceBreakdown[deviceInfo.type] = (deviceBreakdown[deviceInfo.type] || 0) + 1
        
        // Count by IP (simplified location)
        if (session.ipAddress) {
          locationBreakdown[session.ipAddress] = (locationBreakdown[session.ipAddress] || 0) + 1
        }

        return {
          ...session,
          deviceInfo,
        }
      })

      return {
        totalSessions,
        activeSessions,
        expiredSessions,
        deviceBreakdown,
        locationBreakdown,
        recentSessions: sessionInfos.map(s => ({
          ...s,
          ipAddress: s.ipAddress || undefined,
          userAgent: s.userAgent || undefined
        })),
      }
    } catch (error) {
      console.error('Failed to get session stats:', error)
      throw new Error(`Failed to get session stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<{ deletedCount: number }> {
    try {
      const result = await this.prisma.session.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isActive: false, createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, // 30 days old inactive sessions
          ],
        },
      })

      console.log(`Cleaned up ${result.count} expired sessions`)

      return { deletedCount: result.count }
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error)
      throw new Error(`Failed to cleanup expired sessions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate secure session token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Enforce session limit per user
   */
  private async enforceSessionLimit(userId: string): Promise<void> {
    const activeSessions = await this.prisma.session.count({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    })

    if (activeSessions >= this.maxSessionsPerUser) {
      // Remove oldest sessions
      const oldestSessions = await this.prisma.session.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: { createdAt: 'asc' },
        take: activeSessions - this.maxSessionsPerUser + 1,
      })

      await this.prisma.session.updateMany({
        where: {
          id: { in: oldestSessions.map(s => s.id) },
        },
        data: { isActive: false },
      })

      // Log session limit enforcement
      await this.auditService.logSecurity(
        userId,
        'BULK_OPERATION',
        {
          operation: 'enforce_session_limit',
          removedSessions: oldestSessions.length,
          maxSessions: this.maxSessionsPerUser,
        }
      )
    }
  }

  /**
   * Parse user agent string to extract device info
   */
  private parseUserAgent(userAgent?: string): DeviceInfo {
    if (!userAgent) {
      return {
        type: 'unknown',
        browser: 'Unknown',
        os: 'Unknown',
      }
    }

    const ua = userAgent.toLowerCase()
    
    // Detect device type
    let type: DeviceInfo['type'] = 'desktop'
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      type = 'mobile'
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      type = 'tablet'
    }

    // Detect browser
    let browser = 'Unknown'
    if (ua.includes('chrome')) browser = 'Chrome'
    else if (ua.includes('firefox')) browser = 'Firefox'
    else if (ua.includes('safari')) browser = 'Safari'
    else if (ua.includes('edge')) browser = 'Edge'
    else if (ua.includes('opera')) browser = 'Opera'

    // Detect OS
    let os = 'Unknown'
    if (ua.includes('windows')) os = 'Windows'
    else if (ua.includes('mac')) os = 'macOS'
    else if (ua.includes('linux')) os = 'Linux'
    else if (ua.includes('android')) os = 'Android'
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'

    return { type, browser, os }
  }

  /**
   * Get location info from IP address (placeholder - integrate with IP geolocation service)
   */
  private async getLocationInfo(ipAddress?: string): Promise<LocationInfo | undefined> {
    if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1') {
      return undefined
    }

    // TODO: Integrate with IP geolocation service (e.g., MaxMind, IPinfo, etc.)
    // For now, return undefined
    return undefined
  }

  /**
   * Check for session security events
   */
  private async checkSessionSecurity(
    userId: string,
    sessionId: string,
    ipAddress?: string,
    deviceInfo?: DeviceInfo,
    locationInfo?: LocationInfo
  ): Promise<void> {
    try {
      const events: SessionSecurityEvent[] = []

      // Check for multiple concurrent sessions
      const activeSessions = await this.prisma.session.count({
        where: {
          userId,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      })

      if (activeSessions > 3) {
        events.push({
          type: 'concurrent_sessions',
          severity: 'medium',
          message: `User has ${activeSessions} concurrent active sessions`,
          sessionId,
          userId,
          details: { activeSessionCount: activeSessions },
        })
      }

      // Check for multiple device types
      const recentSessions = await this.prisma.session.findMany({
        where: {
          userId,
          isActive: true,
          createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
        },
      })

      const deviceTypes = new Set(
        recentSessions.map(s => this.parseUserAgent(s.userAgent || undefined).type)
      )

      if (deviceTypes.size > 2) {
        events.push({
          type: 'multiple_devices',
          severity: 'low',
          message: `User accessed from ${deviceTypes.size} different device types in 24 hours`,
          sessionId,
          userId,
          details: { deviceTypes: Array.from(deviceTypes) },
        })
      }

      // Log security events
      for (const event of events) {
        await this.auditService.logSecurity(
          userId,
          'SUSPICIOUS_ACTIVITY',
          {
            securityEvent: event.type,
            severity: event.severity,
            message: event.message,
            sessionId,
            ...event.details,
          },
          ipAddress
        )
      }
    } catch (error) {
      console.error('Failed to check session security:', error)
    }
  }

  /**
   * Update session activity timestamp (optional optimization)
   */
  private async updateSessionActivity(sessionId: string, ipAddress?: string): Promise<void> {
    try {
      // Only update if last update was more than 5 minutes ago to reduce DB writes
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        select: { id: true, createdAt: true },
      })

      if (session && Date.now() - session.createdAt.getTime() > 5 * 60 * 1000) {
        await this.prisma.session.update({
          where: { id: sessionId },
          data: { 
            // Note: Prisma automatically updates updatedAt
            ipAddress: ipAddress || undefined,
          },
        })
      }
    } catch (error) {
      console.error('Failed to update session activity:', error)
    }
  }
}

/**
 * Session middleware for Next.js API routes
 */
export function createSessionMiddleware(sessionService: SessionManagementService) {
  return async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.sessionToken

    if (token) {
      const session = await sessionService.validateSession(
        token,
        req.ip || req.connection.remoteAddress
      )

      if (session) {
        req.session = session
        req.user = { id: session.userId }
      }
    }

    next()
  }
}

// Export singleton instance (to be initialized with Prisma client)
let sessionServiceInstance: SessionManagementService | null = null

export function getSessionService(prisma: PrismaClient): SessionManagementService {
  if (!sessionServiceInstance) {
    sessionServiceInstance = SessionManagementService.getInstance(prisma)
  }
  return sessionServiceInstance
}

/**
 * Utility functions for session management
 */

/**
 * Generate session cookie options
 */
export function getSessionCookieOptions(secure: boolean = process.env.NODE_ENV === 'production') {
  return {
    httpOnly: true,
    secure,
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  }
}

/**
 * Extract IP address from request
 */
export function getClientIP(req: any): string | undefined {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.ip
}

/**
 * Format session duration for display
 */
export function formatSessionDuration(createdAt: Date, expiresAt: Date): string {
  const now = new Date()
  const duration = expiresAt.getTime() - now.getTime()
  
  if (duration <= 0) {
    return 'Expired'
  }
  
  const days = Math.floor(duration / (24 * 60 * 60 * 1000))
  const hours = Math.floor((duration % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  const minutes = Math.floor((duration % (60 * 60 * 1000)) / (60 * 1000))
  
  if (days > 0) {
    return `${days}d ${hours}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}