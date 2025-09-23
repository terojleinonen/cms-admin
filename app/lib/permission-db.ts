/**
 * Database service for permission system
 * Handles database operations for permission cache, security events, and role changes
 */

import { PrismaClient } from '@prisma/client';
import { Permission } from './permissions';

// Initialize Prisma client
let prisma: PrismaClient;

// Allow injection of Prisma client for testing
export function setPrismaClient(client: PrismaClient) {
  prisma = client;
}

// Initialize default Prisma client
if (!prisma) {
  prisma = new PrismaClient();
}

/**
 * Permission Cache Database Service
 */
export class PermissionCacheDB {
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
      const cached = await prisma.permissionCache.findUnique({
        where: {
          userId_resource_action_scope: {
            userId,
            resource,
            action,
            scope: scope || null
          }
        }
      });

      if (!cached) return null;

      // Check if expired
      if (cached.expiresAt < new Date()) {
        // Delete expired entry
        await this.delete(userId, resource, action, scope);
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
      const expiresAt = new Date(Date.now() + ttlMs);

      await prisma.permissionCache.upsert({
        where: {
          userId_resource_action_scope: {
            userId,
            resource,
            action,
            scope: scope || null
          }
        },
        update: {
          result,
          expiresAt,
          createdAt: new Date()
        },
        create: {
          userId,
          resource,
          action,
          scope: scope || null,
          result,
          expiresAt
        }
      });
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
      await prisma.permissionCache.delete({
        where: {
          userId_resource_action_scope: {
            userId,
            resource,
            action,
            scope: scope || null
          }
        }
      });
    } catch (error) {
      // Ignore not found errors
      if (error instanceof Error && !error.message.includes('Record to delete does not exist')) {
        console.error('Error deleting permission cache:', error);
      }
    }
  }

  /**
   * Invalidate all cache entries for a user
   */
  static async invalidateUser(userId: string): Promise<void> {
    try {
      await prisma.permissionCache.deleteMany({
        where: { userId }
      });
    } catch (error) {
      console.error('Error invalidating user cache:', error);
    }
  }

  /**
   * Invalidate all cache entries for a resource
   */
  static async invalidateResource(resource: string): Promise<void> {
    try {
      await prisma.permissionCache.deleteMany({
        where: { resource }
      });
    } catch (error) {
      console.error('Error invalidating resource cache:', error);
    }
  }

  /**
   * Clear all expired cache entries
   */
  static async clearExpired(): Promise<number> {
    try {
      const result = await prisma.permissionCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });
      return result.count;
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
      const [totalEntries, expiredEntries, userCounts] = await Promise.all([
        prisma.permissionCache.count(),
        prisma.permissionCache.count({
          where: {
            expiresAt: {
              lt: new Date()
            }
          }
        }),
        prisma.permissionCache.groupBy({
          by: ['userId'],
          _count: {
            userId: true
          },
          orderBy: {
            _count: {
              userId: 'desc'
            }
          },
          take: 10
        })
      ]);

      return {
        totalEntries,
        expiredEntries,
        userCounts: userCounts.map(item => ({
          userId: item.userId,
          count: item._count.userId
        }))
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
 */
export class SecurityEventDB {
  /**
   * Create a security event
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
      const securityEvent = await prisma.securityEvent.create({
        data: {
          type: event.type,
          severity: event.severity || 'MEDIUM',
          userId: event.userId,
          resource: event.resource,
          action: event.action,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          details: event.details
        }
      });
      return securityEvent.id;
    } catch (error) {
      console.error('Error creating security event:', error);
      throw error;
    }
  }

  /**
   * Get security events with pagination
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
        resolved,
        startDate,
        endDate
      } = options;

      const where: any = {};
      
      if (type) where.type = type;
      if (severity) where.severity = severity;
      if (userId) where.userId = userId;
      if (resolved !== undefined) where.resolved = resolved;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [events, total] = await Promise.all([
        prisma.securityEvent.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            resolver: {
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
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.securityEvent.count({ where })
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
   * Resolve a security event
   */
  static async resolve(eventId: string, resolvedBy: string): Promise<void> {
    try {
      await prisma.securityEvent.update({
        where: { id: eventId },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy
        }
      });
    } catch (error) {
      console.error('Error resolving security event:', error);
      throw error;
    }
  }

  /**
   * Get security event statistics
   */
  static async getStats(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        totalEvents,
        unresolvedEvents,
        eventsByType,
        eventsBySeverity,
        recentTrends
      ] = await Promise.all([
        prisma.securityEvent.count({
          where: {
            createdAt: { gte: startDate }
          }
        }),
        prisma.securityEvent.count({
          where: {
            resolved: false,
            createdAt: { gte: startDate }
          }
        }),
        prisma.securityEvent.groupBy({
          by: ['type'],
          _count: { type: true },
          where: {
            createdAt: { gte: startDate }
          },
          orderBy: {
            _count: { type: 'desc' }
          }
        }),
        prisma.securityEvent.groupBy({
          by: ['severity'],
          _count: { severity: true },
          where: {
            createdAt: { gte: startDate }
          }
        }),
        prisma.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM security_events
          WHERE created_at >= ${startDate}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        `
      ]);

      return {
        totalEvents,
        unresolvedEvents,
        eventsByType: eventsByType.map(item => ({
          type: item.type,
          count: item._count.type
        })),
        eventsBySeverity: eventsBySeverity.map(item => ({
          severity: item.severity,
          count: item._count.severity
        })),
        recentTrends
      };
    } catch (error) {
      console.error('Error getting security event stats:', error);
      throw error;
    }
  }
}

/**
 * Role Change History Database Service
 */
export class RoleChangeHistoryDB {
  /**
   * Record a role change
   */
  static async recordChange(
    userId: string,
    oldRole: string,
    newRole: string,
    changedBy?: string,
    reason?: string
  ): Promise<string> {
    try {
      const roleChange = await prisma.roleChangeHistory.create({
        data: {
          userId,
          oldRole,
          newRole,
          changedBy,
          reason
        }
      });
      return roleChange.id;
    } catch (error) {
      console.error('Error recording role change:', error);
      throw error;
    }
  }

  /**
   * Get role change history for a user
   */
  static async getUserHistory(userId: string, limit: number = 50) {
    try {
      const history = await prisma.roleChangeHistory.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          changer: {
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

      return history;
    } catch (error) {
      console.error('Error getting user role history:', error);
      throw error;
    }
  }

  /**
   * Get all role changes with pagination
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

      const where: any = {};
      
      if (userId) where.userId = userId;
      if (changedBy) where.changedBy = changedBy;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [changes, total] = await Promise.all([
        prisma.roleChangeHistory.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            changer: {
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
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.roleChangeHistory.count({ where })
      ]);

      return {
        changes,
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
   * Get role change statistics
   */
  static async getStats(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        totalChanges,
        changesByRole,
        recentTrends
      ] = await Promise.all([
        prisma.roleChangeHistory.count({
          where: {
            createdAt: { gte: startDate }
          }
        }),
        prisma.roleChangeHistory.groupBy({
          by: ['newRole'],
          _count: { newRole: true },
          where: {
            createdAt: { gte: startDate }
          },
          orderBy: {
            _count: { newRole: 'desc' }
          }
        }),
        prisma.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM role_change_history
          WHERE created_at >= ${startDate}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        `
      ]);

      return {
        totalChanges,
        changesByRole: changesByRole.map(item => ({
          role: item.newRole,
          count: item._count.newRole
        })),
        recentTrends
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
    await prisma.permissionCache.deleteMany();
  }

  async getStats() {
    return await PermissionCacheDB.getStats();
  }

  async cleanupExpired(): Promise<number> {
    return await PermissionCacheDB.clearExpired();
  }
}

// Export the Prisma client for other uses
export { prisma };

// Cleanup function for graceful shutdown
export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
}