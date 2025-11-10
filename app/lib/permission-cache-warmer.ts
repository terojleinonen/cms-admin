/**
 * Permission Cache Warmer
 * Pre-loads and caches permission data for improved performance
 */

import { UserRole } from '@prisma/client'
import { prisma } from './db'

export interface CacheWarmerConfig {
  enabled: boolean
  interval: number // milliseconds
  preloadRoles: UserRole[]
}

export interface CacheWarmer {
  start(): void
  stop(): void
  warmCache(): Promise<void>
  isRunning(): boolean
}

class PermissionCacheWarmer implements CacheWarmer {
  private config: CacheWarmerConfig
  private intervalId: NodeJS.Timeout | null = null
  private cache: Map<string, any> = new Map()

  constructor(config: CacheWarmerConfig) {
    this.config = config
  }

  start() {
    if (this.intervalId || !this.config.enabled) {
      return
    }

    // Initial warm
    this.warmCache()

    // Set up interval
    this.intervalId = setInterval(() => {
      this.warmCache()
    }, this.config.interval)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  async warmCache(): Promise<void> {
    try {
      // Pre-load user permissions for configured roles
      for (const role of this.config.preloadRoles) {
        const users = await prisma.user.findMany({
          where: { role, isActive: true },
          select: {
            id: true,
            role: true,
            email: true
          },
          take: 100 // Limit to prevent overload
        })

        // Cache user data
        users.forEach(user => {
          this.cache.set(`user:${user.id}`, user)
        })
      }

      // Pre-load common permission checks
      const commonPermissions = [
        'products:read',
        'products:write',
        'categories:read',
        'categories:write',
        'orders:read'
      ]

      commonPermissions.forEach(permission => {
        this.cache.set(`permission:${permission}`, true)
      })
    } catch (error) {
      console.error('Cache warming error:', error)
    }
  }

  isRunning(): boolean {
    return this.intervalId !== null
  }

  getCache() {
    return this.cache
  }
}

export function createCacheWarmer(config?: Partial<CacheWarmerConfig>): CacheWarmer {
  const defaultConfig: CacheWarmerConfig = {
    enabled: process.env.NODE_ENV === 'production',
    interval: 5 * 60 * 1000, // 5 minutes
    preloadRoles: [UserRole.ADMIN, UserRole.EDITOR],
    ...config
  }

  return new PermissionCacheWarmer(defaultConfig)
}

// Singleton instance
let globalCacheWarmer: CacheWarmer | null = null

export function getGlobalCacheWarmer(): CacheWarmer {
  if (!globalCacheWarmer) {
    globalCacheWarmer = createCacheWarmer()
  }
  return globalCacheWarmer
}
