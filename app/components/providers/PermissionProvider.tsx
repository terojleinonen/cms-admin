'use client'

/**
 * Permission Provider Component
 * Provides permission context throughout the application with caching and real-time updates
 */

import React, { createContext, useContext, ReactNode, useCallback, useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { User } from '@/lib/types'
import { Permission, permissionService } from '@/lib/permissions'
import { PermissionHook } from '@/lib/hooks/usePermissions'

interface PermissionCache {
  [key: string]: {
    result: boolean
    timestamp: number
    ttl: number
  }
}

interface PermissionContextType {
  // Basic permission checks
  canAccess: (resource: string, action: string, scope?: string) => boolean
  canManage: (resource: string) => boolean
  canCreate: (resource: string) => boolean
  canRead: (resource: string, scope?: string) => boolean
  canUpdate: (resource: string, scope?: string) => boolean
  canDelete: (resource: string, scope?: string) => boolean
  
  // Role checks
  isAdmin: () => boolean
  isEditor: () => boolean
  isViewer: () => boolean
  hasRole: (role: string) => boolean
  hasMinimumRole: (minimumRole: string) => boolean
  
  // Route checks
  canAccessRoute: (route: string) => boolean
  
  // UI helpers
  filterByPermissions: (items: any[], getResource: (item: any) => string, action?: string) => any[]
  
  // Resource-specific permissions
  canCreateProduct: () => boolean
  canReadProduct: (ownerId?: string) => boolean
  canUpdateProduct: (ownerId?: string) => boolean
  canDeleteProduct: (ownerId?: string) => boolean
  
  canCreateCategory: () => boolean
  canReadCategory: () => boolean
  canUpdateCategory: () => boolean
  canDeleteCategory: () => boolean
  
  canCreatePage: () => boolean
  canReadPage: (ownerId?: string) => boolean
  canUpdatePage: (ownerId?: string) => boolean
  canDeletePage: (ownerId?: string) => boolean
  
  canCreateMedia: () => boolean
  canReadMedia: (ownerId?: string) => boolean
  canUpdateMedia: (ownerId?: string) => boolean
  canDeleteMedia: (ownerId?: string) => boolean
  
  canCreateUser: () => boolean
  canReadUser: (targetUserId?: string) => boolean
  canUpdateUser: (targetUserId?: string) => boolean
  canDeleteUser: (targetUserId?: string) => boolean
  
  canReadOrder: () => boolean
  canUpdateOrder: () => boolean
  
  canReadAnalytics: () => boolean
  canReadSecurityLogs: () => boolean
  canManageSecurity: () => boolean
  canReadSettings: () => boolean
  canUpdateSettings: () => boolean
  canManageSettings: () => boolean
  
  // User and session info
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Cache management
  invalidateCache: () => void
  invalidateUserCache: (userId?: string) => void
  refreshPermissions: () => Promise<void>
  
  // Real-time updates
  subscribeToPermissionUpdates: (callback: (update: PermissionUpdate) => void) => () => void
  
  // Cache statistics
  getCacheStats: () => { size: number; hitRate: number }
}

interface PermissionUpdate {
  type: 'USER_ROLE_CHANGED' | 'PERMISSION_UPDATED' | 'USER_DEACTIVATED'
  userId?: string
  resource?: string
  timestamp: number
}

interface PermissionProviderProps {
  children: ReactNode
  enableRealTimeUpdates?: boolean
  cacheConfig?: {
    ttl?: number
    maxSize?: number
  }
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

/**
 * Provider component that wraps the app and provides permission context
 */
export function PermissionProvider({ 
  children, 
  enableRealTimeUpdates = true,
  cacheConfig = { ttl: 5 * 60 * 1000, maxSize: 1000 } // 5 minutes TTL, max 1000 entries
}: PermissionProviderProps) {
  const { data: session, status } = useSession()
  const [permissionCache, setPermissionCache] = useState<PermissionCache>({})
  const [cacheHits, setCacheHits] = useState(0)
  const [cacheMisses, setCacheMisses] = useState(0)
  const [updateSubscribers, setUpdateSubscribers] = useState<Set<(update: PermissionUpdate) => void>>(new Set())
  
  const user = session?.user as User | null

  // Generate cache key for permission
  const getCacheKey = useCallback((resource: string, action: string, scope?: string, userId?: string): string => {
    const targetUserId = userId || user?.id || 'anonymous'
    return `${targetUserId}:${resource}:${action}:${scope || 'default'}`
  }, [user?.id])

  // Check if cache entry is valid
  const isCacheValid = useCallback((entry: PermissionCache[string]): boolean => {
    return Date.now() - entry.timestamp < entry.ttl
  }, [])

  // Get permission from cache
  const getFromCache = useCallback((key: string): boolean | null => {
    const entry = permissionCache[key]
    if (!entry) return null
    
    if (isCacheValid(entry)) {
      setCacheHits(prev => prev + 1)
      return entry.result
    } else {
      // Remove expired entry
      setPermissionCache(prev => {
        const newCache = { ...prev }
        delete newCache[key]
        return newCache
      })
      return null
    }
  }, [permissionCache, isCacheValid])

  // Set permission in cache
  const setInCache = useCallback((key: string, result: boolean): void => {
    setCacheMisses(prev => prev + 1)
    
    setPermissionCache(prev => {
      const newCache = { ...prev }
      
      // Implement LRU eviction if cache is too large
      const entries = Object.entries(newCache)
      if (entries.length >= (cacheConfig.maxSize || 1000)) {
        // Remove oldest entries (simple LRU)
        const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
        const toRemove = sortedEntries.slice(0, Math.floor(entries.length * 0.1)) // Remove 10% oldest
        toRemove.forEach(([keyToRemove]) => {
          delete newCache[keyToRemove]
        })
      }
      
      newCache[key] = {
        result,
        timestamp: Date.now(),
        ttl: cacheConfig.ttl || 5 * 60 * 1000
      }
      
      return newCache
    })
  }, [cacheConfig])

  // Core permission checking with caching
  const canAccess = useCallback((resource: string, action: string, scope?: string): boolean => {
    if (!user) return false
    
    const cacheKey = getCacheKey(resource, action, scope)
    const cached = getFromCache(cacheKey)
    
    if (cached !== null) {
      return cached
    }
    
    // Compute permission
    const result = permissionService.hasPermission(user, { resource, action, scope })
    setInCache(cacheKey, result)
    
    return result
  }, [user, getCacheKey, getFromCache, setInCache])

  // Derived permission methods
  const canManage = useCallback((resource: string): boolean => {
    return canAccess(resource, 'manage')
  }, [canAccess])

  const canCreate = useCallback((resource: string): boolean => {
    return canAccess(resource, 'create')
  }, [canAccess])

  const canRead = useCallback((resource: string, scope?: string): boolean => {
    return canAccess(resource, 'read', scope)
  }, [canAccess])

  const canUpdate = useCallback((resource: string, scope?: string): boolean => {
    return canAccess(resource, 'update', scope)
  }, [canAccess])

  const canDelete = useCallback((resource: string, scope?: string): boolean => {
    return canAccess(resource, 'delete', scope)
  }, [canAccess])

  // Role checks
  const isAdmin = useCallback((): boolean => {
    return user?.role === 'ADMIN'
  }, [user])

  const isEditor = useCallback((): boolean => {
    return user?.role === 'ADMIN' || user?.role === 'EDITOR'
  }, [user])

  const isViewer = useCallback((): boolean => {
    return user?.role === 'ADMIN' || user?.role === 'EDITOR' || user?.role === 'VIEWER'
  }, [user])

  const hasRole = useCallback((role: string): boolean => {
    return user?.role === role
  }, [user])

  const hasMinimumRole = useCallback((minimumRole: string): boolean => {
    if (!user?.role) return false
    const roleHierarchy = { 'VIEWER': 1, 'EDITOR': 2, 'ADMIN': 3 }
    return (roleHierarchy[user.role as keyof typeof roleHierarchy] || 0) >= 
           (roleHierarchy[minimumRole as keyof typeof roleHierarchy] || 0)
  }, [user])

  // Route checks
  const canAccessRoute = useCallback((route: string): boolean => {
    return permissionService.canUserAccessRoute(user, route)
  }, [user])

  // UI helpers - simplified to avoid generic syntax issues
  const filterByPermissions = useCallback((
    items: any[],
    getResource: (item: any) => string,
    action: string = 'read'
  ): any[] => {
    return permissionService.filterByPermissions(user, items, getResource, action)
  }, [user])

  // Resource-specific permissions (using the cached canAccess method)
  const canCreateProduct = useCallback((): boolean => canAccess('products', 'create'), [canAccess])
  const canReadProduct = useCallback((ownerId?: string): boolean => {
    if (canAccess('products', 'read', 'all')) return true
    if (ownerId && user?.id === ownerId) return canAccess('products', 'read', 'own')
    return canAccess('products', 'read')
  }, [canAccess, user])
  const canUpdateProduct = useCallback((ownerId?: string): boolean => {
    if (canAccess('products', 'update', 'all')) return true
    if (ownerId && user?.id === ownerId) return canAccess('products', 'update', 'own')
    return false
  }, [canAccess, user])
  const canDeleteProduct = useCallback((ownerId?: string): boolean => {
    if (canAccess('products', 'delete', 'all')) return true
    if (ownerId && user?.id === ownerId) return canAccess('products', 'delete', 'own')
    return false
  }, [canAccess, user])

  // Category permissions
  const canCreateCategory = useCallback((): boolean => canAccess('categories', 'create'), [canAccess])
  const canReadCategory = useCallback((): boolean => canAccess('categories', 'read'), [canAccess])
  const canUpdateCategory = useCallback((): boolean => canAccess('categories', 'update'), [canAccess])
  const canDeleteCategory = useCallback((): boolean => canAccess('categories', 'delete'), [canAccess])

  // Page permissions
  const canCreatePage = useCallback((): boolean => canAccess('pages', 'create'), [canAccess])
  const canReadPage = useCallback((ownerId?: string): boolean => {
    if (canAccess('pages', 'read', 'all')) return true
    if (ownerId && user?.id === ownerId) return canAccess('pages', 'read', 'own')
    return false
  }, [canAccess, user])
  const canUpdatePage = useCallback((ownerId?: string): boolean => {
    if (canAccess('pages', 'update', 'all')) return true
    if (ownerId && user?.id === ownerId) return canAccess('pages', 'update', 'own')
    return false
  }, [canAccess, user])
  const canDeletePage = useCallback((ownerId?: string): boolean => {
    if (canAccess('pages', 'delete', 'all')) return true
    if (ownerId && user?.id === ownerId) return canAccess('pages', 'delete', 'own')
    return false
  }, [canAccess, user])

  // Media permissions
  const canCreateMedia = useCallback((): boolean => canAccess('media', 'create'), [canAccess])
  const canReadMedia = useCallback((ownerId?: string): boolean => {
    if (canAccess('media', 'read', 'all')) return true
    if (ownerId && user?.id === ownerId) return canAccess('media', 'read', 'own')
    return false
  }, [canAccess, user])
  const canUpdateMedia = useCallback((ownerId?: string): boolean => {
    if (canAccess('media', 'update', 'all')) return true
    if (ownerId && user?.id === ownerId) return canAccess('media', 'update', 'own')
    return false
  }, [canAccess, user])
  const canDeleteMedia = useCallback((ownerId?: string): boolean => {
    if (canAccess('media', 'delete', 'all')) return true
    if (ownerId && user?.id === ownerId) return canAccess('media', 'delete', 'own')
    return false
  }, [canAccess, user])

  // User management permissions
  const canCreateUser = useCallback((): boolean => canAccess('users', 'create'), [canAccess])
  const canReadUser = useCallback((targetUserId?: string): boolean => {
    if (canAccess('users', 'read', 'all')) return true
    if (targetUserId && user?.id === targetUserId) return canAccess('users', 'read', 'own')
    return false
  }, [canAccess, user])
  const canUpdateUser = useCallback((targetUserId?: string): boolean => {
    if (canAccess('users', 'update', 'all')) return true
    if (targetUserId && user?.id === targetUserId) return canAccess('profile', 'manage', 'own')
    return false
  }, [canAccess, user])
  const canDeleteUser = useCallback((targetUserId?: string): boolean => {
    if (!isAdmin()) return false
    if (user?.id === targetUserId) return false
    return canAccess('users', 'delete', 'all')
  }, [canAccess, user, isAdmin])

  // Order permissions
  const canReadOrder = useCallback((): boolean => canAccess('orders', 'read'), [canAccess])
  const canUpdateOrder = useCallback((): boolean => canAccess('orders', 'update'), [canAccess])

  // Analytics permissions
  const canReadAnalytics = useCallback((): boolean => canAccess('analytics', 'read'), [canAccess])

  // Security permissions
  const canReadSecurityLogs = useCallback((): boolean => canAccess('security', 'read'), [canAccess])
  const canManageSecurity = useCallback((): boolean => canAccess('security', 'manage'), [canAccess])

  // Settings permissions
  const canReadSettings = useCallback((): boolean => canAccess('settings', 'read'), [canAccess])
  const canUpdateSettings = useCallback((): boolean => canAccess('settings', 'update'), [canAccess])
  const canManageSettings = useCallback((): boolean => canAccess('settings', 'manage'), [canAccess])

  // Cache management methods
  const invalidateCache = useCallback((): void => {
    setPermissionCache({})
    setCacheHits(0)
    setCacheMisses(0)
  }, [])

  const invalidateUserCache = useCallback((userId?: string): void => {
    const targetUserId = userId || user?.id
    if (!targetUserId) return

    setPermissionCache(prev => {
      const newCache = { ...prev }
      Object.keys(newCache).forEach(key => {
        if (key.startsWith(`${targetUserId}:`)) {
          delete newCache[key]
        }
      })
      return newCache
    })
  }, [user?.id])

  const refreshPermissions = useCallback(async (): Promise<void> => {
    if (!user) return
    
    // Invalidate current user's cache
    invalidateUserCache()
    
    // Optionally warm cache with common permissions
    const commonPermissions: Permission[] = [
      { resource: 'products', action: 'read' },
      { resource: 'products', action: 'create' },
      { resource: 'categories', action: 'read' },
      { resource: 'pages', action: 'read' },
      { resource: 'media', action: 'read' },
      { resource: 'orders', action: 'read' },
      { resource: 'analytics', action: 'read' },
      { resource: 'settings', action: 'read' },
    ]
    
    // Pre-compute and cache common permissions
    commonPermissions.forEach(permission => {
      const result = permissionService.hasPermission(user, permission)
      const cacheKey = getCacheKey(permission.resource, permission.action, permission.scope)
      setInCache(cacheKey, result)
    })
  }, [user, invalidateUserCache, getCacheKey, setInCache])

  // Real-time update subscription
  const subscribeToPermissionUpdates = useCallback((callback: (update: PermissionUpdate) => void): (() => void) => {
    setUpdateSubscribers(prev => new Set(prev).add(callback))
    
    return () => {
      setUpdateSubscribers(prev => {
        const newSet = new Set(prev)
        newSet.delete(callback)
        return newSet
      })
    }
  }, [])

  // Broadcast permission updates to subscribers
  const broadcastUpdate = useCallback((update: PermissionUpdate): void => {
    updateSubscribers.forEach(callback => {
      try {
        callback(update)
      } catch (error) {
        console.error('Error in permission update callback:', error)
      }
    })
  }, [updateSubscribers])

  // Cache statistics
  const getCacheStats = useCallback(() => {
    const totalRequests = cacheHits + cacheMisses
    return {
      size: Object.keys(permissionCache).length,
      hitRate: totalRequests > 0 ? cacheHits / totalRequests : 0
    }
  }, [permissionCache, cacheHits, cacheMisses])

  // Clear cache when user changes
  useEffect(() => {
    if (status === 'loading') return
    
    // Clear cache when user changes (login/logout/role change)
    setPermissionCache({})
    setCacheHits(0)
    setCacheMisses(0)
    
    // Refresh permissions for new user
    if (user) {
      // Inline the refresh logic to avoid dependency issues
      const commonPermissions: Permission[] = [
        { resource: 'products', action: 'read' },
        { resource: 'products', action: 'create' },
        { resource: 'categories', action: 'read' },
        { resource: 'pages', action: 'read' },
        { resource: 'media', action: 'read' },
        { resource: 'orders', action: 'read' },
        { resource: 'analytics', action: 'read' },
        { resource: 'settings', action: 'read' },
      ]
      
      // Pre-compute and cache common permissions
      commonPermissions.forEach(permission => {
        const result = permissionService.hasPermission(user, permission)
        const targetUserId = user?.id || 'anonymous'
        const cacheKey = `${targetUserId}:${permission.resource}:${permission.action}:${permission.scope || 'default'}`
        
        setPermissionCache(prev => ({
          ...prev,
          [cacheKey]: {
            result,
            timestamp: Date.now(),
            ttl: cacheConfig.ttl || 5 * 60 * 1000
          }
        }))
      })
    }
  }, [user?.id, user?.role, status, cacheConfig.ttl]) // Simplified dependencies

  // Set up real-time updates (if enabled)
  useEffect(() => {
    if (!enableRealTimeUpdates || !user) return

    // In a real implementation, this would connect to WebSocket or Server-Sent Events
    // For now, we'll simulate with a polling mechanism or event listeners
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'permission_update') {
        try {
          const update: PermissionUpdate = JSON.parse(event.newValue || '{}')
          
          // Handle different types of updates
          switch (update.type) {
            case 'USER_ROLE_CHANGED':
              if (update.userId === user.id) {
                // Inline invalidateUserCache logic to avoid dependency issues
                setPermissionCache(prev => {
                  const newCache = { ...prev }
                  Object.keys(newCache).forEach(key => {
                    if (key.startsWith(`${user.id}:`)) {
                      delete newCache[key]
                    }
                  })
                  return newCache
                })
                
                // Broadcast update
                updateSubscribers.forEach(callback => {
                  try {
                    callback(update)
                  } catch (error) {
                    console.error('Error in permission update callback:', error)
                  }
                })
              }
              break
            case 'PERMISSION_UPDATED':
              if (update.resource) {
                // Invalidate cache for specific resource
                setPermissionCache(prev => {
                  const newCache = { ...prev }
                  Object.keys(newCache).forEach(key => {
                    if (key.includes(`:${update.resource}:`)) {
                      delete newCache[key]
                    }
                  })
                  return newCache
                })
              }
              
              // Broadcast update
              updateSubscribers.forEach(callback => {
                try {
                  callback(update)
                } catch (error) {
                  console.error('Error in permission update callback:', error)
                }
              })
              break
            case 'USER_DEACTIVATED':
              if (update.userId === user.id) {
                // Inline invalidateCache logic
                setPermissionCache({})
                setCacheHits(0)
                setCacheMisses(0)
                
                // Broadcast update
                updateSubscribers.forEach(callback => {
                  try {
                    callback(update)
                  } catch (error) {
                    console.error('Error in permission update callback:', error)
                  }
                })
              }
              break
          }
        } catch (error) {
          console.error('Error parsing permission update:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [enableRealTimeUpdates, user?.id, updateSubscribers]) // Simplified dependencies

  const contextValue: PermissionContextType = {
    // Basic permission checks
    canAccess,
    canManage,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    
    // Role checks
    isAdmin,
    isEditor,
    isViewer,
    hasRole,
    hasMinimumRole,
    
    // Route checks
    canAccessRoute,
    
    // UI helpers
    filterByPermissions,
    
    // Resource-specific permissions
    canCreateProduct,
    canReadProduct,
    canUpdateProduct,
    canDeleteProduct,
    
    canCreateCategory,
    canReadCategory,
    canUpdateCategory,
    canDeleteCategory,
    
    canCreatePage,
    canReadPage,
    canUpdatePage,
    canDeletePage,
    
    canCreateMedia,
    canReadMedia,
    canUpdateMedia,
    canDeleteMedia,
    
    canCreateUser,
    canReadUser,
    canUpdateUser,
    canDeleteUser,
    
    canReadOrder,
    canUpdateOrder,
    
    canReadAnalytics,
    canReadSecurityLogs,
    canManageSecurity,
    canReadSettings,
    canUpdateSettings,
    canManageSettings,
    
    // User and session info
    user,
    isAuthenticated: !!user,
    isLoading: status === 'loading',
    
    // Cache management
    invalidateCache,
    invalidateUserCache,
    refreshPermissions,
    
    // Real-time updates
    subscribeToPermissionUpdates,
    
    // Cache statistics
    getCacheStats,
  }

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  )
}

/**
 * Hook to use permission context
 */
export function usePermissionContext(): PermissionContextType {
  const context = useContext(PermissionContext)
  
  if (context === undefined) {
    throw new Error('usePermissionContext must be used within a PermissionProvider')
  }
  
  return context
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermissions<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: Permission[]
) {
  return function PermissionWrappedComponent(props: P) {
    const { canAccess, user } = usePermissionContext()
    
    const hasRequiredPermissions = requiredPermissions.every(permission =>
      canAccess(permission.resource, permission.action, permission.scope)
    )
    
    if (!user || !hasRequiredPermissions) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You don't have permission to access this resource.</p>
          </div>
        </div>
      )
    }
    
    return <Component {...props} />
  }
}