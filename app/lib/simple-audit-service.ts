/**
 * Simplified Audit Service
 * Logs only essential security events without comprehensive tracking
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Essential audit actions only
export const ESSENTIAL_AUDIT_ACTIONS = {
  // Authentication events
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  LOGIN_FAILED: 'auth.login_failed',
  
  // Critical user events
  USER_CREATED: 'user.created',
  USER_DELETED: 'user.deleted',
  ROLE_CHANGED: 'user.role_changed',
  
  // Security events
  PERMISSION_DENIED: 'security.permission_denied',
  UNAUTHORIZED_ACCESS: 'security.unauthorized_access',
  
  // System events
  SETTINGS_CHANGED: 'system.settings_changed',
} as const;

export type EssentialAuditAction = typeof ESSENTIAL_AUDIT_ACTIONS[keyof typeof ESSENTIAL_AUDIT_ACTIONS];

export interface SimpleAuditLogEntry {
  userId: string;
  action: EssentialAuditAction;
  resource: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Simplified Audit Service
 * Only logs critical security events
 */
export class SimpleAuditService {
  private prisma: PrismaClient | Prisma.TransactionClient;

  constructor(prisma: PrismaClient | Prisma.TransactionClient) {
    this.prisma = prisma;
  }

  /**
   * Log essential audit entry
   */
  async log(entry: SimpleAuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          details: entry.details as Prisma.InputJsonValue || undefined,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw error to avoid breaking main flow
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(
    userId: string,
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED',
    ipAddress?: string,
    userAgent?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      userId,
      action: ESSENTIAL_AUDIT_ACTIONS[action],
      resource: 'user',
      details,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log user management events
   */
  async logUser(
    userId: string,
    targetUserId: string,
    action: 'USER_CREATED' | 'USER_DELETED' | 'ROLE_CHANGED',
    details?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: ESSENTIAL_AUDIT_ACTIONS[action],
      resource: 'user',
      details: { ...details, targetUserId },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log security events
   */
  async logSecurity(
    userId: string,
    action: 'PERMISSION_DENIED' | 'UNAUTHORIZED_ACCESS',
    resource: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: ESSENTIAL_AUDIT_ACTIONS[action],
      resource,
      details,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log system events
   */
  async logSystem(
    userId: string,
    action: 'SETTINGS_CHANGED',
    details?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: ESSENTIAL_AUDIT_ACTIONS[action],
      resource: 'system',
      details,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Get recent audit logs (simplified)
   */
  async getRecentLogs(limit: number = 50): Promise<any[]> {
    try {
      return await this.prisma.auditLog.findMany({
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
      });
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      return [];
    }
  }

  /**
   * Clean up old audit logs (simplified retention)
   */
  async cleanup(retentionDays: number = 90): Promise<{ deletedCount: number }> {
    try {
      const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));

      const result = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      console.log(`Cleaned up ${result.count} audit logs older than ${retentionDays} days`);
      return { deletedCount: result.count };
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error);
      return { deletedCount: 0 };
    }
  }
}

// Create and export singleton instance
import { prisma } from './db';
export const simpleAuditService = new SimpleAuditService(prisma);

/**
 * Simple audit log function for direct use in API routes
 */
export async function auditLog(params: {
  userId: string;
  action: EssentialAuditAction;
  resource: string;
  details?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  try {
    // Extract IP and User Agent from request if provided
    let ipAddress: string | undefined;
    let userAgent: string | undefined;
    
    if (params.request) {
      const forwarded = params.request.headers.get('x-forwarded-for');
      const realIp = params.request.headers.get('x-real-ip');
      const cfConnectingIp = params.request.headers.get('cf-connecting-ip');
      
      ipAddress = forwarded?.split(',')[0] || realIp || cfConnectingIp || undefined;
      userAgent = params.request.headers.get('user-agent') || undefined;
    }
    
    await simpleAuditService.log({
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      details: params.details,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking the main flow
  }
}