/**
 * Audit Logging Service
 * Comprehensive audit trail system for tracking user actions, security events,
 * and system changes with filtering, search, and retention capabilities
 */

import { PrismaClient, AuditLog, User } from '@prisma/client'
import { auditLogCreateSchema, auditLogFiltersSchema, sanitizeAuditLogDetails } from './user-validation-schemas'
import { z } from 'zod'

// Audit action categories
export const AUDIT_ACTIONS = {
  // Authentication actions
  AUTH: {
    LOGIN: 'auth.login',
    LOGOUT: 'auth.logout',
    LOGIN_FAILED: 'auth.login_failed',
    PASSWORD_CHANGED: 'auth.password_changed',
    TWO_FACTOR_ENABLED: 'auth.two_factor_enabled',
    TWO_FACTOR_DISABLED: 'auth.two_factor_disabled',
    SESSION_TERMINATED: 'auth.session_terminated',
  },
  
  // User management actions
  USER: {
    CREATED: 'user.created',
    UPDATED: 'user.updated',
    DELETED: 'user.deleted',
    ACTIVATED: 'user.activated',
    DEACTIVATED: 'user.deactivated',
    ROLE_CHANGED: 'user.role_changed',
    PROFILE_UPDATED: 'user.profile_updated',
    PREFERENCES_UPDATED: 'user.preferences_updated',
  },
  
  // Security actions
  SECURITY: {
    SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
    ACCOUNT_LOCKED: 'security.account_locked',
    ACCOUNT_UNLOCKED: 'security.account_unlocked',
    PERMISSION_DENIED: 'security.permission_denied',
    DATA_EXPORT: 'security.data_export',
    BULK_OPERATION: 'security.bulk_operation',
  },
  
  // System actions
  SYSTEM: {
    BACKUP_CREATED: 'system.backup_created',
    BACKUP_RESTORED: 'system.backup_restored',
    SETTINGS_CHANGED: 'system.settings_changed',
    MAINTENANCE_MODE: 'system.maintenance_mode',
    DATA_CLEANUP_PERFORMED: 'system.data_cleanup_performed',
  },
} as const

// Resource types
export const AUDIT_RESOURCES = {
  USER: 'user',
  SESSION: 'session',
  PREFERENCES: 'preferences',
  PRODUCT: 'product',
  CATEGORY: 'category',
  MEDIA: 'media',
  PAGE: 'page',
  SYSTEM: 'system',
} as const

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS][keyof typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS]]
export type AuditResource = typeof AUDIT_RESOURCES[keyof typeof AUDIT_RESOURCES]

export interface AuditLogEntry {
  userId: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

export interface AuditLogWithUser extends AuditLog {
  user: Pick<User, 'id' | 'name' | 'email' | 'role'>
}

export interface AuditLogFilters {
  userId?: string
  action?: string
  resource?: string
  severity?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

export interface AuditLogStats {
  totalLogs: number
  actionBreakdown: Record<string, number>
  resourceBreakdown: Record<string, number>
  severityBreakdown: Record<string, number>
  recentActivity: AuditLogWithUser[]
}

/**
 * Audit Logging Service
 */
export class AuditService {
  private static instance: AuditService | null = null
  private prisma: PrismaClient
  private retentionDays: number

  private constructor(prisma: PrismaClient, retentionDays: number = 365) {
    this.prisma = prisma
    this.retentionDays = retentionDays
  }

  static getInstance(prisma: PrismaClient, retentionDays?: number): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService(prisma, retentionDays)
    }
    return AuditService.instance
  }

  /**
   * Log an audit entry
   */
  async log(entry: AuditLogEntry): Promise<AuditLog> {
    try {
      // Validate the entry
      const validatedEntry = auditLogCreateSchema.parse({
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        details: entry.details ? sanitizeAuditLogDetails(entry.details) : null,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      })

      // Add resource ID to details if provided
      if (entry.resourceId) {
        validatedEntry.details = {
          ...validatedEntry.details,
          resourceId: entry.resourceId,
        }
      }

      // Add severity to details if provided
      if (entry.severity) {
        validatedEntry.details = {
          ...validatedEntry.details,
          severity: entry.severity,
        }
      }

      // Create the audit log entry
      const auditLog = await this.prisma.auditLog.create({
        data: {
          ...validatedEntry,
          details: validatedEntry.details || undefined
        },
      })

      // Check for suspicious activity patterns
      await this.checkSuspiciousActivity(entry.userId, entry.action, entry.ipAddress)

      return auditLog
    } catch (error) {
      console.error('Failed to create audit log:', error)
      throw new Error(`Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(
    userId: string,
    action: keyof typeof AUDIT_ACTIONS.AUTH,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action: AUDIT_ACTIONS.AUTH[action],
      resource: AUDIT_RESOURCES.USER,
      resourceId: userId,
      details,
      ipAddress,
      userAgent,
      severity: action === 'LOGIN_FAILED' ? 'medium' : 'low',
    })
  }

  /**
   * Log user management events
   */
  async logUser(
    userId: string,
    targetUserId: string,
    action: keyof typeof AUDIT_ACTIONS.USER,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action: AUDIT_ACTIONS.USER[action],
      resource: AUDIT_RESOURCES.USER,
      resourceId: targetUserId,
      details,
      ipAddress,
      userAgent,
      severity: ['DELETED', 'ROLE_CHANGED'].includes(action) ? 'high' : 'medium',
    })
  }

  /**
   * Log security events
   */
  async logSecurity(
    userId: string,
    action: keyof typeof AUDIT_ACTIONS.SECURITY,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action: AUDIT_ACTIONS.SECURITY[action],
      resource: AUDIT_RESOURCES.SYSTEM,
      details,
      ipAddress,
      userAgent,
      severity: ['SUSPICIOUS_ACTIVITY', 'ACCOUNT_LOCKED'].includes(action) ? 'critical' : 'high',
    })
  }

  /**
   * Log system events
   */
  async logSystem(
    userId: string,
    action: keyof typeof AUDIT_ACTIONS.SYSTEM,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action: AUDIT_ACTIONS.SYSTEM[action],
      resource: AUDIT_RESOURCES.SYSTEM,
      details,
      ipAddress,
      userAgent,
      severity: 'medium',
    })
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getLogs(filters: AuditLogFilters = {}): Promise<{
    logs: AuditLogWithUser[]
    total: number
    page: number
    totalPages: number
  }> {
    try {
      // Validate filters
      const validatedFilters = auditLogFiltersSchema.parse(filters)

      // Build where clause
      const where: unknown = {}

      if (validatedFilters.userId) {
        where.userId = validatedFilters.userId
      }

      if (validatedFilters.action) {
        where.action = {
          contains: validatedFilters.action,
          mode: 'insensitive',
        }
      }

      if (validatedFilters.resource) {
        where.resource = validatedFilters.resource
      }

      if (validatedFilters.startDate || validatedFilters.endDate) {
        where.createdAt = {}
        if (validatedFilters.startDate) {
          where.createdAt.gte = validatedFilters.startDate
        }
        if (validatedFilters.endDate) {
          where.createdAt.lte = validatedFilters.endDate
        }
      }

      // Get total count
      const total = await this.prisma.auditLog.count({ where })

      // Calculate pagination
      const page = validatedFilters.page
      const limit = validatedFilters.limit
      const skip = (page - 1) * limit
      const totalPages = Math.ceil(total / limit)

      // Get logs with user information
      const logs = await this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      })

      return {
        logs,
        total,
        page,
        totalPages,
      }
    } catch (error) {
      console.error('Failed to get audit logs:', error)
      throw new Error(`Failed to get audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get audit log statistics
   */
  async getStats(days: number = 30): Promise<AuditLogStats> {
    try {
      const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))

      // Get total logs count
      const totalLogs = await this.prisma.auditLog.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      })

      // Get action breakdown
      const actionStats = await this.prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        _count: {
          action: true,
        },
      })

      const actionBreakdown = actionStats.reduce((acc, stat) => {
        acc[stat.action] = stat._count.action
        return acc
      }, {} as Record<string, number>)

      // Get resource breakdown
      const resourceStats = await this.prisma.auditLog.groupBy({
        by: ['resource'],
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        _count: {
          resource: true,
        },
      })

      const resourceBreakdown = resourceStats.reduce((acc, stat) => {
        acc[stat.resource] = stat._count.resource
        return acc
      }, {} as Record<string, number>)

      // Get severity breakdown (from details)
      const allLogs = await this.prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          details: true,
        },
      })

      const severityBreakdown = allLogs.reduce((acc, log) => {
        const severity = (log.details as any)?.severity || 'low'
        acc[severity] = (acc[severity] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Get recent activity
      const recentActivity = await this.prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - (24 * 60 * 60 * 1000)), // Last 24 hours
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      })

      return {
        totalLogs,
        actionBreakdown,
        resourceBreakdown,
        severityBreakdown,
        recentActivity,
      }
    } catch (error) {
      console.error('Failed to get audit stats:', error)
      throw new Error(`Failed to get audit stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get user activity timeline
   */
  async getUserActivity(
    userId: string,
    days: number = 30,
    limit: number = 50
  ): Promise<AuditLogWithUser[]> {
    try {
      const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))

      const logs = await this.prisma.auditLog.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      })

      return logs
    } catch (error) {
      console.error('Failed to get user activity:', error)
      throw new Error(`Failed to get user activity: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  private async checkSuspiciousActivity(
    userId: string,
    action: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000))

      // Check for multiple failed login attempts
      if (action === AUDIT_ACTIONS.AUTH.LOGIN_FAILED) {
        const failedAttempts = await this.prisma.auditLog.count({
          where: {
            userId,
            action: AUDIT_ACTIONS.AUTH.LOGIN_FAILED,
            createdAt: {
              gte: oneHourAgo,
            },
          },
        })

        if (failedAttempts >= 5) {
          await this.logSecurity(
            userId,
            'SUSPICIOUS_ACTIVITY',
            {
              reason: 'Multiple failed login attempts',
              count: failedAttempts,
              timeWindow: '1 hour',
            },
            ipAddress
          )
        }
      }

      // Check for multiple IP addresses
      if (ipAddress) {
        const recentIPs = await this.prisma.auditLog.findMany({
          where: {
            userId,
            createdAt: {
              gte: oneHourAgo,
            },
            ipAddress: {
              not: null,
            },
          },
          select: {
            ipAddress: true,
          },
          distinct: ['ipAddress'],
        })

        if (recentIPs.length >= 3) {
          await this.logSecurity(
            userId,
            'SUSPICIOUS_ACTIVITY',
            {
              reason: 'Multiple IP addresses in short time',
              ipAddresses: recentIPs.map(log => log.ipAddress),
              timeWindow: '1 hour',
            },
            ipAddress
          )
        }
      }

      // Check for rapid successive actions
      const recentActions = await this.prisma.auditLog.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(now.getTime() - (5 * 60 * 1000)), // Last 5 minutes
          },
        },
      })

      if (recentActions >= 20) {
        await this.logSecurity(
          userId,
          'SUSPICIOUS_ACTIVITY',
          {
            reason: 'Rapid successive actions',
            count: recentActions,
            timeWindow: '5 minutes',
          },
          ipAddress
        )
      }
    } catch (error) {
      console.error('Failed to check suspicious activity:', error)
    }
  }

  /**
   * Export audit logs for compliance
   */
  async exportLogs(
    filters: AuditLogFilters = {},
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const { logs } = await this.getLogs({ ...filters, limit: 10000 })

      if (format === 'csv') {
        const headers = [
          'ID',
          'User ID',
          'User Name',
          'User Email',
          'Action',
          'Resource',
          'Details',
          'IP Address',
          'User Agent',
          'Created At',
        ]

        const rows = logs.map(log => [
          log.id,
          log.userId,
          log.user.name,
          log.user.email,
          log.action,
          log.resource,
          JSON.stringify(log.details || {}),
          log.ipAddress || '',
          log.userAgent || '',
          log.createdAt.toISOString(),
        ])

        return [headers, ...rows].map(row => row.join(',')).join('\n')
      }

      return JSON.stringify(logs, null, 2)
    } catch (error) {
      console.error('Failed to export audit logs:', error)
      throw new Error(`Failed to export audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanup(): Promise<{ deletedCount: number }> {
    try {
      const cutoffDate = new Date(Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000))

      const result = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      })

      console.log(`Cleaned up ${result.count} audit logs older than ${this.retentionDays} days`)

      return { deletedCount: result.count }
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error)
      throw new Error(`Failed to cleanup audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get security alerts based on audit logs
   */
  async getSecurityAlerts(days: number = 7): Promise<Array<{
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    count: number
    users: string[]
    lastOccurrence: Date
  }>> {
    try {
      const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))
      const alerts: Array<{
        type: string
        severity: 'low' | 'medium' | 'high' | 'critical'
        message: string
        count: number
        users: string[]
        lastOccurrence: Date
      }> = []

      // Failed login attempts
      const failedLogins = await this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          action: AUDIT_ACTIONS.AUTH.LOGIN_FAILED,
          createdAt: {
            gte: startDate,
          },
        },
        _count: {
          userId: true,
        },
        _max: {
          createdAt: true,
        },
      })

      const highFailedLogins = failedLogins.filter(stat => stat._count.userId >= 5)
      if (highFailedLogins.length > 0) {
        alerts.push({
          type: 'failed_logins',
          severity: 'high',
          message: `${highFailedLogins.length} users with multiple failed login attempts`,
          count: highFailedLogins.reduce((sum, stat) => sum + stat._count.userId, 0),
          users: highFailedLogins.map(stat => stat.userId),
          lastOccurrence: new Date(Math.max(...highFailedLogins.map(stat => stat._max.createdAt?.getTime() || 0))),
        })
      }

      // Suspicious activity
      const suspiciousActivity = await this.prisma.auditLog.findMany({
        where: {
          action: AUDIT_ACTIONS.SECURITY.SUSPICIOUS_ACTIVITY,
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          userId: true,
          createdAt: true,
        },
      })

      if (suspiciousActivity.length > 0) {
        const uniqueUsers = [...new Set(suspiciousActivity.map(log => log.userId))]
        alerts.push({
          type: 'suspicious_activity',
          severity: 'critical',
          message: `${suspiciousActivity.length} suspicious activity events detected`,
          count: suspiciousActivity.length,
          users: uniqueUsers,
          lastOccurrence: new Date(Math.max(...suspiciousActivity.map(log => log.createdAt.getTime()))),
        })
      }

      return alerts.sort((a, b) => b.lastOccurrence.getTime() - a.lastOccurrence.getTime())
    } catch (error) {
      console.error('Failed to get security alerts:', error)
      throw new Error(`Failed to get security alerts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

/**
 * Audit logging middleware for Express/Next.js
 */
export function createAuditMiddleware(auditService: AuditService) {
  return async (req: unknown, res: unknown, next: unknown) => {
    // Store original end function
    const originalEnd = res.end

    // Override end function to log after response
    res.end = function(chunk: unknown, encoding: unknown) {
      // Call original end function
      originalEnd.call(this, chunk, encoding)

      // Log the request if user is authenticated
      if (req.user?.id && req.method !== 'GET') {
        const action = `${req.method.toLowerCase()}.${req.route?.path || req.url}`
        
        auditService.log({
          userId: req.user.id,
          action,
          resource: 'api',
          details: {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            body: req.body,
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
        }).catch(error => {
          console.error('Failed to log audit entry:', error)
        })
      }
    }

    next()
  }
}

// Export singleton instance (to be initialized with Prisma client)
let auditServiceInstance: AuditService | null = null

export function getAuditService(prisma: PrismaClient): AuditService {
  if (!auditServiceInstance) {
    auditServiceInstance = AuditService.getInstance(prisma)
  }
  return auditServiceInstance
}

/**
 * Simple audit log function for direct use in API routes
 */
export async function auditLog(params: {
  userId: string
  action: string
  resource: string
  details?: Record<string, any>
  request?: Request
}): Promise<void> {
  try {
    const { prisma } = await import('./db')
    
    // Extract IP and User Agent from request if provided
    let ipAddress: string | undefined
    let userAgent: string | undefined
    
    if (params.request) {
      // Try to get IP from various headers
      const forwarded = params.request.headers.get('x-forwarded-for')
      const realIp = params.request.headers.get('x-real-ip')
      const cfConnectingIp = params.request.headers.get('cf-connecting-ip')
      
      ipAddress = forwarded?.split(',')[0] || realIp || cfConnectingIp || undefined
      userAgent = params.request.headers.get('user-agent') || undefined
    }
    
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        details: params.details || undefined,
        ipAddress,
        userAgent
      }
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw error to avoid breaking the main flow
  }
}