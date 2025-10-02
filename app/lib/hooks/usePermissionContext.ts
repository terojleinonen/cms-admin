'use client'

/**
 * Permission Context Hook
 * Provides easy access to permission context with additional utilities
 */

import { useCallback } from 'react'
import { usePermissionContext as useBasePermissionContext } from '@/components/providers/PermissionProvider'
import { usePermissionUpdates, PermissionUpdate } from '@/lib/permission-events'

/**
 * Enhanced permission context hook with additional utilities
 */
export function usePermissionContext() {
  const baseContext = useBasePermissionContext()
  const { subscribe, broadcast } = usePermissionUpdates()

  // Enhanced cache management with event broadcasting
  const invalidateCache = useCallback(() => {
    baseContext.invalidateCache()
    broadcast({
      type: 'CACHE_INVALIDATED',
      timestamp: Date.now()
    })
  }, [baseContext, broadcast])

  const invalidateUserCache = useCallback((userId?: string) => {
    baseContext.invalidateUserCache(userId)
    broadcast({
      type: 'CACHE_INVALIDATED',
      userId: userId || baseContext.user?.id,
      timestamp: Date.now()
    })
  }, [baseContext, broadcast])

  const refreshPermissions = useCallback(async () => {
    await baseContext.refreshPermissions()
    broadcast({
      type: 'CACHE_INVALIDATED',
      userId: baseContext.user?.id,
      timestamp: Date.now()
    })
  }, [baseContext, broadcast])

  // Permission checking with automatic caching
  const checkPermission = useCallback((resource: string, action: string, scope?: string): boolean => {
    return baseContext.canAccess(resource, action, scope)
  }, [baseContext])

  // Batch permission checking for performance
  const checkMultiplePermissions = useCallback((permissions: Array<{ resource: string; action: string; scope?: string }>): boolean[] => {
    return permissions.map(({ resource, action, scope }) => 
      baseContext.canAccess(resource, action, scope)
    )
  }, [baseContext])

  // Check if user has any of the specified permissions (OR logic)
  const hasAnyPermission = useCallback((permissions: Array<{ resource: string; action: string; scope?: string }>): boolean => {
    return permissions.some(({ resource, action, scope }) => 
      baseContext.canAccess(resource, action, scope)
    )
  }, [baseContext])

  // Check if user has all of the specified permissions (AND logic)
  const hasAllPermissions = useCallback((permissions: Array<{ resource: string; action: string; scope?: string }>): boolean => {
    return permissions.every(({ resource, action, scope }) => 
      baseContext.canAccess(resource, action, scope)
    )
  }, [baseContext])

  // Resource ownership checking
  const canAccessOwnResource = useCallback((resource: string, action: string, ownerId?: string): boolean => {
    // First check if user has global permission
    if (baseContext.canAccess(resource, action, 'all')) {
      return true
    }
    
    // Then check if user owns the resource and has 'own' scope permission
    if (ownerId && baseContext.user?.id === ownerId) {
      return baseContext.canAccess(resource, action, 'own')
    }
    
    return false
  }, [baseContext])

  // Permission-based data filtering with caching
  const filterDataByPermissions = useCallback(<T extends { id: string; createdBy?: string }>(
    data: T[],
    resource: string,
    action: string = 'read'
  ): T[] => {
    if (!baseContext.user) return []
    
    return data.filter(item => {
      // Check global permission first
      if (baseContext.canAccess(resource, action, 'all')) {
        return true
      }
      
      // Check ownership-based permission
      if (item.createdBy && baseContext.user?.id === item.createdBy) {
        return baseContext.canAccess(resource, action, 'own')
      }
      
      return false
    })
  }, [baseContext])

  // Get user's effective permissions for a resource
  const getResourcePermissions = useCallback((resource: string): {
    canCreate: boolean
    canRead: boolean
    canUpdate: boolean
    canDelete: boolean
    canManage: boolean
    scope: 'none' | 'own' | 'all'
  } => {
    const canManage = baseContext.canAccess(resource, 'manage', 'all')
    const canCreateAll = baseContext.canAccess(resource, 'create', 'all')
    const canReadAll = baseContext.canAccess(resource, 'read', 'all')
    const canUpdateAll = baseContext.canAccess(resource, 'update', 'all')
    const canDeleteAll = baseContext.canAccess(resource, 'delete', 'all')
    
    const canCreateOwn = baseContext.canAccess(resource, 'create', 'own')
    const canReadOwn = baseContext.canAccess(resource, 'read', 'own')
    const canUpdateOwn = baseContext.canAccess(resource, 'update', 'own')
    const canDeleteOwn = baseContext.canAccess(resource, 'delete', 'own')

    let scope: 'none' | 'own' | 'all' = 'none'
    if (canReadAll || canUpdateAll || canDeleteAll || canManage) {
      scope = 'all'
    } else if (canReadOwn || canUpdateOwn || canDeleteOwn || canCreateOwn) {
      scope = 'own'
    }

    return {
      canCreate: canCreateAll || canCreateOwn,
      canRead: canReadAll || canReadOwn,
      canUpdate: canUpdateAll || canUpdateOwn,
      canDelete: canDeleteAll || canDeleteOwn,
      canManage,
      scope
    }
  }, [baseContext])

  // Subscribe to permission updates with automatic cache invalidation
  const subscribeToUpdates = useCallback((callback?: (update: PermissionUpdate) => void) => {
    return subscribe((update) => {
      // Handle automatic cache invalidation based on update type
      switch (update.type) {
        case 'USER_ROLE_CHANGED':
          if (update.userId === baseContext.user?.id) {
            baseContext.invalidateUserCache()
          }
          break
        case 'PERMISSION_UPDATED':
          if (update.resource) {
            // Invalidate cache for specific resource
            baseContext.invalidateCache()
          } else {
            // Invalidate all cache
            baseContext.invalidateCache()
          }
          break
        case 'USER_DEACTIVATED':
          if (update.userId === baseContext.user?.id) {
            baseContext.invalidateCache()
          }
          break
        case 'CACHE_INVALIDATED':
          // Cache already invalidated by the broadcaster
          break
      }
      
      // Call user-provided callback
      if (callback) {
        callback(update)
      }
    })
  }, [subscribe, baseContext])

  return {
    // All base context methods and properties
    ...baseContext,
    
    // Enhanced cache management
    invalidateCache,
    invalidateUserCache,
    refreshPermissions,
    
    // Enhanced permission checking
    checkPermission,
    checkMultiplePermissions,
    hasAnyPermission,
    hasAllPermissions,
    canAccessOwnResource,
    
    // Data filtering utilities
    filterDataByPermissions,
    getResourcePermissions,
    
    // Real-time updates
    subscribeToUpdates,
    
    // Event broadcasting
    broadcastUpdate: broadcast,
  }
}

/**
 * Hook for permission-based conditional rendering
 */
export function usePermissionGuard(
  resource: string,
  action: string,
  scope?: string
): {
  canAccess: boolean
  isLoading: boolean
  user: any
} {
  const { canAccess, isLoading, user } = usePermissionContext()
  
  return {
    canAccess: canAccess(resource, action, scope),
    isLoading,
    user
  }
}

/**
 * Hook for resource ownership checking
 */
export function useResourceOwnership<T extends { id: string; createdBy?: string }>(
  resource: T | null,
  resourceType: string
): {
  isOwner: boolean
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
  canAccess: boolean
} {
  const { user, canAccessOwnResource } = usePermissionContext()
  
  const isOwner = !!(resource?.createdBy && user?.id === resource.createdBy)
  
  return {
    isOwner,
    canRead: canAccessOwnResource(resourceType, 'read', resource?.createdBy),
    canUpdate: canAccessOwnResource(resourceType, 'update', resource?.createdBy),
    canDelete: canAccessOwnResource(resourceType, 'delete', resource?.createdBy),
    canAccess: canAccessOwnResource(resourceType, 'read', resource?.createdBy)
  }
}

/**
 * Hook for batch permission checking with caching
 */
export function useBatchPermissions(
  permissions: Array<{ resource: string; action: string; scope?: string }>
): {
  results: boolean[]
  hasAny: boolean
  hasAll: boolean
  isLoading: boolean
} {
  const { checkMultiplePermissions, hasAnyPermission, hasAllPermissions, isLoading } = usePermissionContext()
  
  const results = checkMultiplePermissions(permissions)
  
  return {
    results,
    hasAny: hasAnyPermission(permissions),
    hasAll: hasAllPermissions(permissions),
    isLoading
  }
}