/**
 * Permission Event Broadcasting System
 * Handles real-time permission updates across the application
 */

export interface PermissionUpdate {
  type: 'USER_ROLE_CHANGED' | 'PERMISSION_UPDATED' | 'USER_DEACTIVATED' | 'CACHE_INVALIDATED'
  userId?: string
  resource?: string
  timestamp: number
  metadata?: Record<string, unknown>
}

/**
 * Permission Event Broadcaster
 * Manages broadcasting permission updates across browser tabs and components
 */
export class PermissionEventBroadcaster {
  private static instance: PermissionEventBroadcaster
  private listeners: Set<(update: PermissionUpdate) => void> = new Set()

  static getInstance(): PermissionEventBroadcaster {
    if (!PermissionEventBroadcaster.instance) {
      PermissionEventBroadcaster.instance = new PermissionEventBroadcaster()
    }
    return PermissionEventBroadcaster.instance
  }

  /**
   * Subscribe to permission updates
   */
  subscribe(callback: (update: PermissionUpdate) => void): () => void {
    this.listeners.add(callback)
    
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Broadcast permission update to all listeners and other tabs
   */
  broadcast(update: PermissionUpdate): void {
    // Broadcast to local listeners
    this.listeners.forEach(callback => {
      try {
        callback(update)
      } catch (error) {
        console.error('Error in permission update listener:', error)
      }
    })

    // Broadcast to other tabs via localStorage
    try {
      localStorage.setItem('permission_update', JSON.stringify(update))
      // Clear immediately to allow repeated broadcasts of the same event
      setTimeout(() => {
        localStorage.removeItem('permission_update')
      }, 100)
    } catch (error) {
      console.warn('Failed to broadcast permission update via localStorage:', error)
    }
  }

  /**
   * Broadcast user role change
   */
  broadcastUserRoleChange(userId: string, oldRole: string, newRole: string): void {
    this.broadcast({
      type: 'USER_ROLE_CHANGED',
      userId,
      timestamp: Date.now(),
      metadata: { oldRole, newRole }
    })
  }

  /**
   * Broadcast permission configuration update
   */
  broadcastPermissionUpdate(resource?: string): void {
    this.broadcast({
      type: 'PERMISSION_UPDATED',
      resource,
      timestamp: Date.now()
    })
  }

  /**
   * Broadcast user deactivation
   */
  broadcastUserDeactivation(userId: string): void {
    this.broadcast({
      type: 'USER_DEACTIVATED',
      userId,
      timestamp: Date.now()
    })
  }

  /**
   * Broadcast cache invalidation
   */
  broadcastCacheInvalidation(userId?: string, resource?: string): void {
    this.broadcast({
      type: 'CACHE_INVALIDATED',
      userId,
      resource,
      timestamp: Date.now()
    })
  }
}

/**
 * Server-side permission update utilities
 * These would be called from API routes when permissions change
 */
export class ServerPermissionEvents {
  private static broadcaster = PermissionEventBroadcaster.getInstance()

  /**
   * Notify clients when user role changes
   */
  static async notifyUserRoleChange(userId: string, oldRole: string, newRole: string): Promise<void> {
    // In a real implementation, this would use WebSocket or Server-Sent Events
    // For now, we'll use the localStorage mechanism
    this.broadcaster.broadcastUserRoleChange(userId, oldRole, newRole)

    // Also invalidate server-side caches
    try {
      const { enhancedPermissionService } = await import('./permissions')
      await enhancedPermissionService.invalidateUserCache(userId)
    } catch (error) {
      console.error('Failed to invalidate server-side permission cache:', error)
    }
  }

  /**
   * Notify clients when permissions are updated
   */
  static async notifyPermissionUpdate(resource?: string): Promise<void> {
    this.broadcaster.broadcastPermissionUpdate(resource)

    // Invalidate server-side caches for the resource
    try {
      const { enhancedPermissionService } = await import('./permissions')
      if (resource) {
        await enhancedPermissionService.invalidateResourceCache(resource)
      } else {
        await enhancedPermissionService.clearCache()
      }
    } catch (error) {
      console.error('Failed to invalidate server-side permission cache:', error)
    }
  }

  /**
   * Notify clients when user is deactivated
   */
  static async notifyUserDeactivation(userId: string): Promise<void> {
    this.broadcaster.broadcastUserDeactivation(userId)

    // Invalidate all caches for the user
    try {
      const { enhancedPermissionService } = await import('./permissions')
      await enhancedPermissionService.invalidateUserCache(userId)
    } catch (error) {
      console.error('Failed to invalidate server-side permission cache:', error)
    }
  }
}

/**
 * React hook for listening to permission updates
 */
import { useEffect } from 'react'

export function usePermissionUpdates(
  onUpdate?: (update: PermissionUpdate) => void
): {
  subscribe: (callback: (update: PermissionUpdate) => void) => () => void
  broadcast: (update: PermissionUpdate) => void
} {
  const broadcaster = PermissionEventBroadcaster.getInstance()

  // Set up the provided callback if any
  useEffect(() => {
    if (!onUpdate) return

    const unsubscribe = broadcaster.subscribe(onUpdate)
    return unsubscribe
  }, [onUpdate, broadcaster])

  return {
    subscribe: (callback: (update: PermissionUpdate) => void) => broadcaster.subscribe(callback),
    broadcast: (update: PermissionUpdate) => broadcaster.broadcast(update)
  }
}

// Export singleton instance
export const permissionEventBroadcaster = PermissionEventBroadcaster.getInstance()