/**
 * Database service for permission system
 * Handles database operations using existing Prisma models
 */

import { db } from './db';
import { isAuditLogDetails, safeExtract, isString } from './type-guards';

/**
 * Permission Cache Database Service
 * Uses in-memory cache since permissionCache model doesn't exist
 */
export class PermissionCacheDB {
  private static cache = new Map<string, { result: boolean; expiresAt: Date }>();

  private static getCacheKey(userId: string, resource: string, action: string, scope?: string): string {
    return `${userId}:${resource}:${action}:${scope || ''}`;
  }

  /**
   * Get cached permission result
   */
  static async get(
    userId: string,
    resource: string,
    action: string,
    scope?: string
  ): Promise<boolean | null> {
    try {
      const key = this.getCacheKey(userId, resource, action, scope);
      const cached = this.cache.get(key);

      if (!cached) return null;

      // Check if expired
      if (cached.expiresAt < new Date()) {
        this.cache.delete(key);
        return null;
      }

      return cached.result;
    } catch (error) {
      console.error('Error getting permission cache:', error);
      return null;
    }
  }

  /**
   * Set cached permission result
   */
  static async set(
    userId: string,
    resource: string,
    action: string,
    result: boolean,
    ttlMs: number = 5 * 60 * 1000, // 5 minutes default
    scope?: string
  ): Promise<void> {
    try {
      const key = this.getCacheKey(userId, resource, action, scope);
      const expiresAt = new Date(Date.now() + ttlMs);

      this.cache.set(key, { result, expiresAt });
    } catch (error) {
      console.error('Error setting permission cache:', error);
    }
  }

  /**
   * Delete specific cache entry
   */
  static async delete(
    userId: string,
    resource: string,
    action: string,
    scope?: string
  ): Promise<void> {
    try {
      const key = this.getCacheKey(userId, resource, action, scope);
      this.cache.delete(key);
    } catch (error) {
      console.error('Error deleting permission cache:', error);
    }
  }

  /**
   * Invalidate all cache entries for a user
   */
  static async invalidateUser(userId: string): Promise<void> {
    try {
      for (const [key] of this.cache) {
        if (key.startsWith(`${userId}:`)) {
          this.cache.delete(key);
        }
      }
    } catch (error) {
      console.error('Error invalidating user cache:', error);
    }
  }

  /**
   * Invalidate all cache entries for a resource
   */
  static async invalidateResource(resource: string): Promise<void> {
    try {
      for (const [key] of this.cache) {
        const parts = key.split(':');
        if (parts[1] === resource) {
          this.cache.delete(key);
        }
      }
    } catch (error) {
      console.error('Error invalidating resource cache:', error);
    }
  }

  /**
   * Clear all expired cache entries
   */
  static async clearExpired(): Promise<number> {
    try {
      const now = new Date();
      let count = 0;
      
      for (const [key, value] of this.cache) {
        if (value.expiresAt < now) {
          this.cache.delete(key);
          count++;
        }
      }
      
      return count;
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    userCounts: { userId: string; count: number }[];
  }> {
    try {
      const now = new Date();
      const userCounts = new Map<string, number>();
      let totalEntries = 0;
      let expiredEntries = 0;

      for (const [key, value] of this.cache) {
        totalEntries++;
        
        if (value.expiresAt < now) {
          expiredEntries++;
        }

        const userId = key.split(':')[0];
        userCounts.set(userId, (userCounts.get(userId) || 0) + 1);
      }

      return {
        totalEntries,
        expiredEntries,
        userCounts: Array.from(userCounts.entries())
          .map(([userId, count]) => ({ userId, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        userCounts: []
      };
    }
  }
}

/**
 * Security Events Database Service
 * Uses AuditLog model to track security events since securityEvent model doesn't exist
 */
export class SecurityEventDB {
  /**
   * Create a security event using AuditLog
   */
  static async create(event: {
    type: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    userId?: string;
    resource?: string;
    action?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, any>;
  }): Promise<string> {
    try {
      const auditLog = await db.auditLog.create({
        data: {
          userId: event.userId || 'system',
          action: `SECURITY_EVENT_${event.type}`,
          resource: event.resource || 'security',
          details: {
            type: event.type,
            severity: event.severity || 'MEDIUM',
            ...event.details
          },
          ipAddress: event.ipAddress,
          userAgent: event.userAgent
        }
      });
      return auditLog.id;
    } catch (error) {
      console.error('Error creating security event:', error);
      throw error;
    }
  }

  /**
   * Get security events with pagination using AuditLog
   */
  static async getEvents(options: {
    page?: number;
    limit?: number;
    type?: string;
    severity?: string;
    userId?: string;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        type,
        severity,
        userId,
        startDate,
        endDate
      } = options;

      const where: any = {
        action: { startsWith: 'SECURITY_EVENT_' }
      };
      
      if (type) where.details = { path: ['type'], equals: type };
      if (severity) where.details = { path: ['severity'], equals: severity };
      if (userId) where.userId = userId;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [events, total] = await Promise.all([
        db.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip: (page - 1) * limit,
          take: limit
        }),
        db.auditLog.count({ where })
      ]);

      return {
        events,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting security events:', error);
      throw error;
    }
  }

  /**
   * Resolve a security event (mark in details)
   */
  static async resolve(eventId: string, resolvedBy: string): Promise<void> {
    try {
      const event = await db.auditLog.findUnique({
        where: { id: eventId }
      });

      if (event) {
        await db.auditLog.update({
          where: { id: eventId },
          data: {
            details: {
              ...event.details as object,
              resolved: true,
              resolvedAt: new Date(),
              resolvedBy
            }
          }
        });
      }
    } catch (error) {
      console.error('Error resolving security event:', error);
      throw error;
    }
  }

  /**
   * Get security event statistics using AuditLog
   */
  static async getStats(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const events = await db.auditLog.findMany({
        where: {
          action: { startsWith: 'SECURITY_EVENT_' },
          createdAt: { gte: startDate }
        },
        select: {
          details: true,
          createdAt: true
        }
      });

      const totalEvents = events.length;
      const unresolvedEvents = events.filter(e => {
        const details = isAuditLogDetails(e.details) ? e.details : {};
        return !details.resolved;
      }).length;
      
      const eventsByType = new Map<string, number>();
      const eventsBySeverity = new Map<string, number>();
      
      events.forEach(event => {
        const details = isAuditLogDetails(event.details) ? event.details : {};
        const type = safeExtract(details, 'type', isString, 'UNKNOWN');
        const severity = safeExtract(details, 'severity', isString, 'MEDIUM');
        
        eventsByType.set(type, (eventsByType.get(type) || 0) + 1);
        eventsBySeverity.set(severity, (eventsBySeverity.get(severity) || 0) + 1);
      });

      return {
        totalEvents,
        unresolvedEvents,
        eventsByType: Array.from(eventsByType.entries()).map(([type, count]) => ({ type, count })),
        eventsBySeverity: Array.from(eventsBySeverity.entries()).map(([severity, count]) => ({ severity, count })),
        recentTrends: []
      };
    } catch (error) {
      console.error('Error getting security event stats:', error);
      throw error;
    }
  }
}

/**
 * Role Change History Database Service
 * Uses AuditLog model to track role changes since roleChangeHistory model doesn't exist
 */
export class RoleChangeHistoryDB {
  /**
   * Record a role change using AuditLog
   */
  static async recordChange(
    userId: string,
    oldRole: string,
    newRole: string,
    changedBy?: string,
    reason?: string
  ): Promise<string> {
    try {
      const auditLog = await db.auditLog.create({
        data: {
          userId: changedBy || 'system',
          action: 'ROLE_CHANGE',
          resource: 'user',
          details: {
            targetUserId: userId,
            oldRole,
            newRole,
            changedBy,
            reason
          }
        }
      });
      return auditLog.id;
    } catch (error) {
      console.error('Error recording role change:', error);
      throw error;
    }
  }

  /**
   * Get role change history for a user using AuditLog
   */
  static async getUserHistory(userId: string, limit: number = 50) {
    try {
      const history = await db.auditLog.findMany({
        where: {
          action: 'ROLE_CHANGE',
          details: {
            path: ['targetUserId'],
            equals: userId
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return history.map(log => {
        const details = isAuditLogDetails(log.details) ? log.details : {};
        return {
          id: log.id,
          userId: safeExtract(details, 'targetUserId', isString),
          oldRole: safeExtract(details, 'oldRole', isString),
          newRole: safeExtract(details, 'newRole', isString),
          changedBy: safeExtract(details, 'changedBy', isString),
          reason: safeExtract(details, 'reason', isString),
          createdAt: log.createdAt,
          user: log.user,
          changer: log.user // The user who made the change
        };
      });
    } catch (error) {
      console.error('Error getting user role history:', error);
      throw error;
    }
  }

  /**
   * Get all role changes with pagination using AuditLog
   */
  static async getAllChanges(options: {
    page?: number;
    limit?: number;
    userId?: string;
    changedBy?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        userId,
        changedBy,
        startDate,
        endDate
      } = options;

      const where: any = {
        action: 'ROLE_CHANGE'
      };
      
      if (userId) {
        where.details = { path: ['targetUserId'], equals: userId };
      }
      if (changedBy) {
        where.userId = changedBy;
      }
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [changes, total] = await Promise.all([
        db.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip: (page - 1) * limit,
          take: limit
        }),
        db.auditLog.count({ where })
      ]);

      return {
        changes: changes.map(log => {
          const details = isAuditLogDetails(log.details) ? log.details : {};
          return {
            id: log.id,
            userId: safeExtract(details, 'targetUserId', isString),
            oldRole: safeExtract(details, 'oldRole', isString),
            newRole: safeExtract(details, 'newRole', isString),
            changedBy: safeExtract(details, 'changedBy', isString),
            reason: safeExtract(details, 'reason', isString),
            createdAt: log.createdAt,
            user: log.user,
            changer: log.user
          };
        }),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting role changes:', error);
      throw error;
    }
  }

  /**
   * Get role change statistics using AuditLog
   */
  static async getStats(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const changes = await db.auditLog.findMany({
        where: {
          action: 'ROLE_CHANGE',
          createdAt: { gte: startDate }
        },
        select: {
          details: true,
          createdAt: true
        }
      });

      const totalChanges = changes.length;
      const changesByRole = new Map<string, number>();
      
      changes.forEach(change => {
        const details = isAuditLogDetails(change.details) ? change.details : {};
        const newRole = safeExtract(details, 'newRole', isString);
        if (newRole) {
          changesByRole.set(newRole, (changesByRole.get(newRole) || 0) + 1);
        }
      });

      return {
        totalChanges,
        changesByRole: Array.from(changesByRole.entries()).map(([role, count]) => ({ role, count })),
        recentTrends: []
      };
    } catch (error) {
      console.error('Error getting role change stats:', error);
      throw error;
    }
  }
}

/**
 * Database-backed Permission Cache for production use
 */
export class DatabasePermissionCache {
  private readonly ttl: number;

  constructor(ttlMs: number = 5 * 60 * 1000) {
    this.ttl = ttlMs;
  }

  async get(userId: string, resource: string, action: string, scope?: string): Promise<boolean | null> {
    return await PermissionCacheDB.get(userId, resource, action, scope);
  }

  async set(userId: string, resource: string, action: string, result: boolean, scope?: string): Promise<void> {
    await PermissionCacheDB.set(userId, resource, action, result, this.ttl, scope);
  }

  async invalidateUser(userId: string): Promise<void> {
    await PermissionCacheDB.invalidateUser(userId);
  }

  async invalidateResource(resource: string): Promise<void> {
    await PermissionCacheDB.invalidateResource(resource);
  }

  async clear(): Promise<void> {
    // Clear all cache entries (use with caution)
    PermissionCacheDB['cache'].clear();
  }

  async getStats() {
    return await PermissionCacheDB.getStats();
  }

  async cleanupExpired(): Promise<number> {
    return await PermissionCacheDB.clearExpired();
  }
}

// Cleanup function for graceful shutdown
export async function disconnectDB(): Promise<void> {
  await db.$disconnect();
}

/*
*
 * Set custom Prisma client (for testing)
 */
let customPrismaClient: any = null;

export function setPrismaClient(client: any): void {
  customPrismaClient = client;
}

export function getPrismaClient(): any {
  return customPrismaClient || db;
}

export function resetPrismaClient(): void {
  customPrismaClient = null;
}
