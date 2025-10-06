'use client'

/**
 * Comprehensive Permission Hooks
 * React hooks for permission checking and role-based access control
 */

import { useSession } from 'next-auth/react'
import { useMemo, useCallback } from 'react'
import { UserRole } from '@prisma/client'
import { User } from '../types'
import { Permission, permissionService } from '../permissions'

export interface PermissionHook {
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
  hasRole: (role: UserRole) => boolean
  hasMinimumRole: (minimumRole: UserRole) => boolean
  
  // Route checks
  canAccessRoute: (route: string) => boolean
  
  // UI helpers
  filterByPermissions: <T>(items: T[], getResource: (item: T) => string, action?: string) => T[]
  
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
}

/**
 * Main permission hook with comprehensive permission checking
 */
export function usePermissions(): PermissionHook {
  const { data: session, status } = useSession()
  
  const user = useMemo(() => {
    if (!session?.user) return null
    return session.user as User
  }, [session])

  const isAuthenticated = useMemo(() => !!user, [user])
  const isLoading = useMemo(() => status === 'loading', [status])

  // Role hierarchy for minimum role checks
  const roleHierarchy = useMemo(() => ({
    [UserRole.VIEWER]: 1,
    [UserRole.EDITOR]: 2,
    [UserRole.ADMIN]: 3,
  }), [])

  // Basic permission checks - memoized to prevent infinite re-renders
  const canAccess = useCallback((resource: string, action: string, scope?: string): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource, action, scope })
  }, [user])

  const canManage = useCallback((resource: string): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource, action: 'manage' })
  }, [user])

  const canCreate = useCallback((resource: string): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource, action: 'create' })
  }, [user])

  const canRead = useCallback((resource: string, scope?: string): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource, action: 'read', scope })
  }, [user])

  const canUpdate = useCallback((resource: string, scope?: string): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource, action: 'update', scope })
  }, [user])

  const canDelete = useCallback((resource: string, scope?: string): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource, action: 'delete', scope })
  }, [user])

  // Role checks
  const isAdmin = useCallback((): boolean => {
    return user?.role === UserRole.ADMIN
  }, [user])

  const isEditor = useCallback((): boolean => {
    return user?.role === UserRole.EDITOR || user?.role === UserRole.ADMIN
  }, [user])

  const isViewer = useCallback((): boolean => {
    return user?.role === UserRole.VIEWER || user?.role === UserRole.EDITOR || user?.role === UserRole.ADMIN
  }, [user])

  const hasRole = useCallback((role: UserRole): boolean => {
    return user?.role === role
  }, [user])

  const hasMinimumRole = useCallback((minimumRole: UserRole): boolean => {
    if (!user?.role) return false
    return roleHierarchy[user.role] >= roleHierarchy[minimumRole]
  }, [user, roleHierarchy])

  // Route checks
  const canAccessRoute = useCallback((route: string): boolean => {
    return permissionService.canUserAccessRoute(user, route)
  }, [user])

  // UI helpers
  const filterByPermissions = useCallback(<T>(
    items: T[],
    getResource: (item: T) => string,
    action: string = 'read'
  ): T[] => {
    return permissionService.filterByPermissions(user, items, getResource, action)
  }, [user])

  // Resource-specific permissions
  const canCreateProduct = useCallback((): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource: 'products', action: 'create' })
  }, [user])

  const canReadProduct = useCallback((ownerId?: string): boolean => {
    if (!user) return false
    if (permissionService.hasPermission(user, { resource: 'products', action: 'read', scope: 'all' })) return true
    if (ownerId && user.id === ownerId) {
      return permissionService.hasPermission(user, { resource: 'products', action: 'read', scope: 'own' })
    }
    return permissionService.hasPermission(user, { resource: 'products', action: 'read' })
  }, [user])

  const canUpdateProduct = useCallback((ownerId?: string): boolean => {
    if (!user) return false
    if (permissionService.hasPermission(user, { resource: 'products', action: 'update', scope: 'all' })) return true
    if (ownerId && user.id === ownerId) {
      return permissionService.hasPermission(user, { resource: 'products', action: 'update', scope: 'own' })
    }
    return false
  }, [user])

  const canDeleteProduct = useCallback((ownerId?: string): boolean => {
    if (!user) return false
    if (permissionService.hasPermission(user, { resource: 'products', action: 'delete', scope: 'all' })) return true
    if (ownerId && user.id === ownerId) {
      return permissionService.hasPermission(user, { resource: 'products', action: 'delete', scope: 'own' })
    }
    return false
  }, [user])

  // Category permissions
  const canCreateCategory = useCallback((): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource: 'categories', action: 'create' })
  }, [user])

  const canReadCategory = useCallback((): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource: 'categories', action: 'read' })
  }, [user])

  const canUpdateCategory = useCallback((): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource: 'categories', action: 'update' })
  }, [user])

  const canDeleteCategory = useCallback((): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource: 'categories', action: 'delete' })
  }, [user])

  // Page permissions
  const canCreatePage = useCallback((): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource: 'pages', action: 'create' })
  }, [user])

  const canReadPage = useCallback((ownerId?: string): boolean => {
    if (!user) return false
    if (permissionService.hasPermission(user, { resource: 'pages', action: 'read', scope: 'all' })) return true
    if (ownerId && user.id === ownerId) {
      return permissionService.hasPermission(user, { resource: 'pages', action: 'read', scope: 'own' })
    }
    return false
  }, [user])

  const canUpdatePage = useCallback((ownerId?: string): boolean => {
    if (!user) return false
    if (permissionService.hasPermission(user, { resource: 'pages', action: 'update', scope: 'all' })) return true
    if (ownerId && user.id === ownerId) {
      return permissionService.hasPermission(user, { resource: 'pages', action: 'update', scope: 'own' })
    }
    return false
  }, [user])

  const canDeletePage = useCallback((ownerId?: string): boolean => {
    if (!user) return false
    if (permissionService.hasPermission(user, { resource: 'pages', action: 'delete', scope: 'all' })) return true
    if (ownerId && user.id === ownerId) {
      return permissionService.hasPermission(user, { resource: 'pages', action: 'delete', scope: 'own' })
    }
    return false
  }, [user])

  // Media permissions
  const canCreateMedia = useCallback((): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource: 'media', action: 'create' })
  }, [user])

  const canReadMedia = useCallback((ownerId?: string): boolean => {
    if (!user) return false
    if (permissionService.hasPermission(user, { resource: 'media', action: 'read', scope: 'all' })) return true
    if (ownerId && user.id === ownerId) {
      return permissionService.hasPermission(user, { resource: 'media', action: 'read', scope: 'own' })
    }
    return false
  }, [user])

  const canUpdateMedia = useCallback((ownerId?: string): boolean => {
    if (!user) return false
    if (permissionService.hasPermission(user, { resource: 'media', action: 'update', scope: 'all' })) return true
    if (ownerId && user.id === ownerId) {
      return permissionService.hasPermission(user, { resource: 'media', action: 'update', scope: 'own' })
    }
    return false
  }, [user])

  const canDeleteMedia = useCallback((ownerId?: string): boolean => {
    if (!user) return false
    if (permissionService.hasPermission(user, { resource: 'media', action: 'delete', scope: 'all' })) return true
    if (ownerId && user.id === ownerId) {
      return permissionService.hasPermission(user, { resource: 'media', action: 'delete', scope: 'own' })
    }
    return false
  }, [user])

  // User management permissions
  const canCreateUser = useCallback((): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource: 'users', action: 'create' })
  }, [user])

  const canReadUser = useCallback((targetUserId?: string): boolean => {
    if (!user) return false
    if (permissionService.hasPermission(user, { resource: 'users', action: 'read', scope: 'all' })) return true
    if (targetUserId && user.id === targetUserId) {
      return permissionService.hasPermission(user, { resource: 'users', action: 'read', scope: 'own' })
    }
    return false
  }, [user])

  const canUpdateUser = useCallback((targetUserId?: string): boolean => {
    if (!user) return false
    if (permissionService.hasPermission(user, { resource: 'users', action: 'update', scope: 'all' })) return true
    if (targetUserId && user.id === targetUserId) {
      return permissionService.hasPermission(user, { resource: 'profile', action: 'manage', scope: 'own' })
    }
    return false
  }, [user])

  const canDeleteUser = useCallback((targetUserId?: string): boolean => {
    if (!user) return false
    // Only admins can delete users, and they can't delete themselves
    if (user.role !== UserRole.ADMIN) return false
    if (user.id === targetUserId) return false
    return permissionService.hasPermission(user, { resource: 'users', action: 'delete', scope: 'all' })
  }, [user])

  // Order permissions
  const canReadOrder = useCallback((): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource: 'orders', action: 'read' })
  }, [user])

  const canUpdateOrder = useCallback((): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource: 'orders', action: 'update' })
  }, [user])

  // Analytics permissions
  const canReadAnalytics = useCallback((): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource: 'analytics', action: 'read' })
  }, [user])

  // Security permissions
  const canReadSecurityLogs = useCallback((): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource: 'security', action: 'read' })
  }, [user])

  const canManageSecurity = useCallback((): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource: 'security', action: 'manage' })
  }, [user])

  // Settings permissions
  const canReadSettings = useCallback((): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource: 'settings', action: 'read' })
  }, [user])

  const canUpdateSettings = useCallback((): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource: 'settings', action: 'update' })
  }, [user])

  const canManageSettings = useCallback((): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource: 'settings', action: 'manage' })
  }, [user])

  return {
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
    isAuthenticated,
    isLoading,
  }
}