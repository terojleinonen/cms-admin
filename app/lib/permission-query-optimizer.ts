/**
 * Permission Query Optimizer
 * 
 * Optimizes database queries for permission checks to improve performance
 * Requirements: 6.1, 6.2
 */

import { db } from './db'
import { UserRole, Prisma } from '@prisma/client'

interface QueryStats {
  query: string
  executionTime: number
  rowsReturned: number
  cacheHit: boolean
}

interface OptimizationConfig {
  enableQueryCache: boolean
  cacheTimeout: number
  batchSize: number
  enableIndexHints: boolean
}

export class PermissionQueryOptimizer {
  private config: OptimizationConfig
  private queryCache = new Map<string, { result: any; timestamp: number }>()
  private queryStats: QueryStats[] = []

  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      enableQueryCache: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      batchSize: 100,
      enableIndexHints: true,
      ...config
    }
  }

  /**
   * Optimized user permission lookup
   */
  async getUserPermissions(userId: string): Promise<any> {
    const cacheKey = `user_permissions_${userId}`
    
    // Check cache first
    if (this.config.enableQueryCache) {
      const cached = this.getCachedResult(cacheKey)
      if (cached) {
        this.recordQueryStats('getUserPermissions (cached)', 0, 1, true)
        return cached
      }
    }

    const startTime = Date.now()

    try {
      // Optimized query with selective fields and joins
      const result = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          isActive: true,
          // Only include permission-related fields
          createdAt: true,
          updatedAt: true
        }
      })

      const executionTime = Date.now() - startTime
      this.recordQueryStats('getUserPermissions', executionTime, result ? 1 : 0, false)

      // Cache the result
      if (this.config.enableQueryCache && result) {
        this.setCachedResult(cacheKey, result)
      }

      return result
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordQueryStats('getUserPermissions (error)', executionTime, 0, false)
      throw error
    }
  }

  /**
   * Batch permission checks for multiple users
   */
  async batchUserPermissions(userIds: string[]): Promise<Map<string, any>> {
    const startTime = Date.now()
    const results = new Map<string, any>()

    try {
      // Process in batches to avoid overwhelming the database
      const batches = this.chunkArray(userIds, this.config.batchSize)
      
      for (const batch of batches) {
        const batchResults = await db.user.findMany({
          where: {
            id: { in: batch },
            isActive: true
          },
          select: {
            id: true,
            role: true,
            isActive: true
          }
        })

        // Map results by user ID
        batchResults.forEach(user => {
          results.set(user.id, user)
        })
      }

      const executionTime = Date.now() - startTime
      this.recordQueryStats('batchUserPermissions', executionTime, results.size, false)

      return results
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordQueryStats('batchUserPermissions (error)', executionTime, 0, false)
      throw error
    }
  }

  /**
   * Optimized role-based resource filtering
   */
  async getAccessibleResources(userId: string, resourceType: string): Promise<string[]> {
    const cacheKey = `accessible_resources_${userId}_${resourceType}`
    
    if (this.config.enableQueryCache) {
      const cached = this.getCachedResult(cacheKey)
      if (cached) {
        this.recordQueryStats('getAccessibleResources (cached)', 0, cached.length, true)
        return cached
      }
    }

    const startTime = Date.now()

    try {
      // Get user role first
      const user = await this.getUserPermissions(userId)
      if (!user) {
        return []
      }

      let accessibleResources: string[] = []

      // Optimize based on role - avoid complex queries for simple cases
      switch (user.role) {
        case UserRole.ADMIN:
          // Admins can access all resources - get all IDs efficiently
          accessibleResources = await this.getAllResourceIds(resourceType)
          break
          
        case UserRole.EDITOR:
          // Editors can access most resources except user management
          if (resourceType === 'users') {
            accessibleResources = [] // No user management access
          } else {
            accessibleResources = await this.getAllResourceIds(resourceType)
          }
          break
          
        case UserRole.VIEWER:
          // Viewers can read all but modify none
          accessibleResources = await this.getAllResourceIds(resourceType)
          break
          
        default:
          accessibleResources = []
      }

      const executionTime = Date.now() - startTime
      this.recordQueryStats('getAccessibleResources', executionTime, accessibleResources.length, false)

      // Cache the result
      if (this.config.enableQueryCache) {
        this.setCachedResult(cacheKey, accessibleResources)
      }

      return accessibleResources
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordQueryStats('getAccessibleResources (error)', executionTime, 0, false)
      throw error
    }
  }

  /**
   * Optimized permission cache lookup
   */
  async getCachedPermission(userId: string, resource: string, action: string): Promise<boolean | null> {
    const startTime = Date.now()

    try {
      const result = await db.permissionCache.findFirst({
        where: {
          userId,
          resource,
          action,
          expiresAt: {
            gt: new Date()
          }
        },
        select: {
          result: true
        }
      })

      const executionTime = Date.now() - startTime
      this.recordQueryStats('getCachedPermission', executionTime, result ? 1 : 0, false)

      return result?.result ?? null
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordQueryStats('getCachedPermission (error)', executionTime, 0, false)
      return null
    }
  }

  /**
   * Batch insert permission cache entries
   */
  async batchSetCachedPermissions(entries: Array<{
    userId: string
    resource: string
    action: string
    result: boolean
    expiresAt: Date
  }>): Promise<void> {
    const startTime = Date.now()

    try {
      // Use batch insert for better performance
      await db.permissionCache.createMany({
        data: entries,
        skipDuplicates: true
      })

      const executionTime = Date.now() - startTime
      this.recordQueryStats('batchSetCachedPermissions', executionTime, entries.length, false)
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordQueryStats('batchSetCachedPermissions (error)', executionTime, 0, false)
      throw error
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<number> {
    const startTime = Date.now()

    try {
      const result = await db.permissionCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })

      const executionTime = Date.now() - startTime
      this.recordQueryStats('cleanupExpiredCache', executionTime, result.count, false)

      return result.count
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordQueryStats('cleanupExpiredCache (error)', executionTime, 0, false)
      throw error
    }
  }

  /**
   * Get query performance statistics
   */
  getQueryStats(): QueryStats[] {
    return [...this.queryStats]
  }

  /**
   * Clear query statistics
   */
  clearQueryStats(): void {
    this.queryStats = []
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    if (this.queryStats.length === 0) return 0
    
    const cacheHits = this.queryStats.filter(stat => stat.cacheHit).length
    return (cacheHits / this.queryStats.length) * 100
  }

  /**
   * Get average query execution time
   */
  getAverageExecutionTime(): number {
    if (this.queryStats.length === 0) return 0
    
    const totalTime = this.queryStats.reduce((sum, stat) => sum + stat.executionTime, 0)
    return totalTime / this.queryStats.length
  }

  /**
   * Private helper methods
   */
  private async getAllResourceIds(resourceType: string): Promise<string[]> {
    // This would be implemented based on the specific resource type
    // For now, return empty array as placeholder
    switch (resourceType) {
      case 'products':
        const products = await db.product.findMany({ select: { id: true } })
        return products.map(p => p.id)
      
      case 'categories':
        const categories = await db.category.findMany({ select: { id: true } })
        return categories.map(c => c.id)
      
      case 'orders':
        const orders = await db.order.findMany({ select: { id: true } })
        return orders.map(o => o.id)
      
      default:
        return []
    }
  }

  private getCachedResult(key: string): any | null {
    const cached = this.queryCache.get(key)
    if (!cached) return null
    
    // Check if cache has expired
    if (Date.now() - cached.timestamp > this.config.cacheTimeout) {
      this.queryCache.delete(key)
      return null
    }
    
    return cached.result
  }

  private setCachedResult(key: string, result: any): void {
    this.queryCache.set(key, {
      result,
      timestamp: Date.now()
    })
  }

  private recordQueryStats(query: string, executionTime: number, rowsReturned: number, cacheHit: boolean): void {
    this.queryStats.push({
      query,
      executionTime,
      rowsReturned,
      cacheHit
    })

    // Keep only last 1000 stats to prevent memory issues
    if (this.queryStats.length > 1000) {
      this.queryStats = this.queryStats.slice(-1000)
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

/**
 * Global optimizer instance
 */
export const permissionQueryOptimizer = new PermissionQueryOptimizer()

/**
 * Utility functions for query optimization
 */
export const queryOptimizationUtils = {
  /**
   * Create optimized query builder
   */
  createOptimizedQuery: (baseQuery: any) => {
    // Add query optimization hints and configurations
    return baseQuery
  },

  /**
   * Analyze query performance
   */
  analyzeQueryPerformance: () => {
    const stats = permissionQueryOptimizer.getQueryStats()
    return {
      totalQueries: stats.length,
      averageExecutionTime: permissionQueryOptimizer.getAverageExecutionTime(),
      cacheHitRate: permissionQueryOptimizer.getCacheHitRate(),
      slowQueries: stats.filter(s => s.executionTime > 100).length
    }
  },

  /**
   * Optimize database indexes
   */
  suggestIndexOptimizations: () => {
    return [
      'CREATE INDEX IF NOT EXISTS idx_permission_cache_user_resource ON permission_cache(user_id, resource, action)',
      'CREATE INDEX IF NOT EXISTS idx_permission_cache_expires ON permission_cache(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_user_role_active ON users(role, is_active)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp)'
    ]
  }
}