/**
 * Permission Cache Warming Utilities
 * 
 * Provides utilities to pre-populate permission cache for improved performance
 * Requirements: 6.1, 6.2
 */

import { db } from './db'
import { PermissionService } from './permissions'
import { UserRole } from '@prisma/client'

interface CacheWarmingConfig {
  batchSize: number
  maxConcurrency: number
  priorityUsers: string[]
  commonResources: string[]
  commonActions: string[]
}

interface WarmingStats {
  totalUsers: number
  processedUsers: number
  cacheEntries: number
  duration: number
  errors: string[]
}

export class PermissionCacheWarmer {
  private permissionService: PermissionService
  private config: CacheWarmingConfig

  constructor(permissionService: PermissionService, config?: Partial<CacheWarmingConfig>) {
    this.permissionService = permissionService
    this.config = {
      batchSize: 50,
      maxConcurrency: 5,
      priorityUsers: [],
      commonResources: ['products', 'categories', 'orders', 'users', 'analytics'],
      commonActions: ['read', 'create', 'update', 'delete', 'manage'],
      ...config
    }
  }

  /**
   * Warm cache for all active users
   */
  async warmAllUsers(): Promise<WarmingStats> {
    const startTime = Date.now()
    const stats: WarmingStats = {
      totalUsers: 0,
      processedUsers: 0,
      cacheEntries: 0,
      duration: 0,
      errors: []
    }

    try {
      // Get all active users
      const users = await db.user.findMany({
        where: {
          isActive: true
        },
        select: {
          id: true,
          role: true,
          email: true
        }
      })

      stats.totalUsers = users.length

      // Process users in batches
      const batches = this.chunkArray(users, this.config.batchSize)
      
      for (const batch of batches) {
        const promises = batch.map(user => this.warmUserCache(user.id, user.role))
        const results = await Promise.allSettled(promises)
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            stats.processedUsers++
            stats.cacheEntries += result.value
          } else {
            stats.errors.push(`User ${batch[index].email}: ${result.reason}`)
          }
        })
      }

      stats.duration = Date.now() - startTime
      return stats
    } catch (error) {
      stats.errors.push(`Cache warming failed: ${error}`)
      stats.duration = Date.now() - startTime
      return stats
    }
  }

  /**
   * Warm cache for priority users (admins, frequent users)
   */
  async warmPriorityUsers(): Promise<WarmingStats> {
    const startTime = Date.now()
    const stats: WarmingStats = {
      totalUsers: 0,
      processedUsers: 0,
      cacheEntries: 0,
      duration: 0,
      errors: []
    }

    try {
      // Get priority users (admins + configured priority list)
      const users = await db.user.findMany({
        where: {
          OR: [
            { role: UserRole.ADMIN },
            { id: { in: this.config.priorityUsers } }
          ],
          isActive: true
        },
        select: {
          id: true,
          role: true,
          email: true
        }
      })

      stats.totalUsers = users.length

      // Process with higher concurrency for priority users
      const promises = users.map(user => this.warmUserCache(user.id, user.role))
      const results = await Promise.allSettled(promises)

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          stats.processedUsers++
          stats.cacheEntries += result.value
        } else {
          stats.errors.push(`User ${users[index].email}: ${result.reason}`)
        }
      })

      stats.duration = Date.now() - startTime
      return stats
    } catch (error) {
      stats.errors.push(`Priority cache warming failed: ${error}`)
      stats.duration = Date.now() - startTime
      return stats
    }
  }

  /**
   * Warm cache for specific user
   */
  async warmUserCache(userId: string, role: UserRole): Promise<number> {
    let cacheEntries = 0

    try {
      // Get role-specific permissions to warm
      const permissions = this.getPermissionsToWarm(role)

      for (const permission of permissions) {
        try {
          // Check permission to populate cache
          await this.permissionService.hasPermission(
            { id: userId, role } as any,
            permission
          )
          cacheEntries++
        } catch (error) {
          // Continue warming other permissions even if one fails
          console.warn(`Failed to warm permission ${permission.resource}:${permission.action} for user ${userId}`)
        }
      }

      return cacheEntries
    } catch (error) {
      throw new Error(`Failed to warm cache for user ${userId}: ${error}`)
    }
  }

  /**
   * Warm cache for new user registration
   */
  async warmNewUser(userId: string, role: UserRole): Promise<void> {
    try {
      await this.warmUserCache(userId, role)
      
      // Log cache warming for monitoring
      console.log(`Cache warmed for new user ${userId} with role ${role}`)
    } catch (error) {
      console.error(`Failed to warm cache for new user ${userId}:`, error)
    }
  }

  /**
   * Warm cache after role change
   */
  async warmAfterRoleChange(userId: string, newRole: UserRole): Promise<void> {
    try {
      // Invalidate existing cache first
      await this.permissionService.invalidateUserCache(userId)
      
      // Warm with new role permissions
      await this.warmUserCache(userId, newRole)
      
      console.log(`Cache warmed for user ${userId} after role change to ${newRole}`)
    } catch (error) {
      console.error(`Failed to warm cache after role change for user ${userId}:`, error)
    }
  }

  /**
   * Schedule periodic cache warming
   */
  schedulePeriodicWarming(intervalHours: number = 6): NodeJS.Timeout {
    const intervalMs = intervalHours * 60 * 60 * 1000
    
    return setInterval(async () => {
      try {
        console.log('Starting scheduled cache warming...')
        const stats = await this.warmPriorityUsers()
        console.log('Scheduled cache warming completed:', stats)
      } catch (error) {
        console.error('Scheduled cache warming failed:', error)
      }
    }, intervalMs)
  }

  /**
   * Get permissions to warm based on role
   */
  private getPermissionsToWarm(role: UserRole) {
    const permissions = []

    for (const resource of this.config.commonResources) {
      for (const action of this.config.commonActions) {
        // Only warm permissions that the role might have
        if (this.shouldWarmPermission(role, resource, action)) {
          permissions.push({ resource, action })
        }
      }
    }

    return permissions
  }

  /**
   * Determine if permission should be warmed for role
   */
  private shouldWarmPermission(role: UserRole, resource: string, action: string): boolean {
    switch (role) {
      case UserRole.ADMIN:
        return true // Admins can access everything
      
      case UserRole.EDITOR:
        // Editors can manage content but not users/analytics
        if (resource === 'users' && action !== 'read') return false
        if (resource === 'analytics' && action !== 'read') return false
        return true
      
      case UserRole.VIEWER:
        // Viewers can only read
        return action === 'read'
      
      default:
        return false
    }
  }

  /**
   * Utility to chunk array into batches
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

/**
 * Factory function to create cache warmer instance
 */
export function createCacheWarmer(config?: Partial<CacheWarmingConfig>): PermissionCacheWarmer {
  const permissionService = new PermissionService()
  return new PermissionCacheWarmer(permissionService, config)
}

/**
 * Utility functions for common warming scenarios
 */
export const cacheWarmingUtils = {
  /**
   * Warm cache on application startup
   */
  async warmOnStartup(): Promise<void> {
    const warmer = createCacheWarmer()
    try {
      console.log('Warming permission cache on startup...')
      const stats = await warmer.warmPriorityUsers()
      console.log('Startup cache warming completed:', stats)
    } catch (error) {
      console.error('Startup cache warming failed:', error)
    }
  },

  /**
   * Warm cache for user login
   */
  async warmOnLogin(userId: string, role: UserRole): Promise<void> {
    const warmer = createCacheWarmer()
    try {
      await warmer.warmUserCache(userId, role)
    } catch (error) {
      console.error(`Failed to warm cache on login for user ${userId}:`, error)
    }
  },

  /**
   * Get cache warming statistics
   */
  async getCacheStats(): Promise<{ size: number; hitRate: number }> {
    // This would integrate with the actual cache implementation
    // For now, return placeholder stats
    return {
      size: 0,
      hitRate: 0
    }
  }
}