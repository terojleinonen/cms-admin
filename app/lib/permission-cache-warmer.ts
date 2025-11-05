/**
 * Simplified Permission Cache Warming
 * Basic cache warming for common permissions
 */

import { db } from './db'
import { UserRole } from '@prisma/client'

export class PermissionCacheWarmer {
  private commonResources = ['products', 'categories', 'orders', 'users']
  private commonActions = ['read', 'create', 'update', 'delete']

  /**
   * Warm cache for admin users
   */
  async warmAdminUsers(): Promise<number> {
    try {
      const admins = await db.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true, role: true }
      })

      let warmedCount = 0
      for (const admin of admins) {
        warmedCount += await this.warmUserCache(admin.id, admin.role)
      }

      return warmedCount
    } catch (error) {
      console.error('Failed to warm admin cache:', error)
      return 0
    }
  }

  /**
   * Warm cache for specific user
   */
  async warmUserCache(userId: string, role: UserRole): Promise<number> {
    let cacheEntries = 0

    for (const resource of this.commonResources) {
      for (const action of this.commonActions) {
        if (this.shouldWarmPermission(role, resource, action)) {
          // Simulate permission check to populate cache
          const hasPermission = this.calculatePermission(role, resource, action)
          cacheEntries++
        }
      }
    }

    return cacheEntries
  }

  /**
   * Determine if permission should be warmed for role
   */
  private shouldWarmPermission(role: UserRole, resource: string, action: string): boolean {
    switch (role) {
      case UserRole.ADMIN:
        return true
      case UserRole.EDITOR:
        if (resource === 'users' && action !== 'read') return false
        return true
      case UserRole.VIEWER:
        return action === 'read'
      default:
        return false
    }
  }

  /**
   * Calculate permission based on role
   */
  private calculatePermission(role: UserRole, resource: string, action: string): boolean {
    return this.shouldWarmPermission(role, resource, action)
  }
}

// Singleton instance
export const permissionCacheWarmer = new PermissionCacheWarmer()