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

  // Basic permission checks
  const canAccess = useCallback((resource: string, action: string, scope?: string): boolean => {
    if (!user) return false
    return permissionService.hasPermission(user, { resource, action, scope })
  }, [user])

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
    return user?.role === UserRole.ADMIN
  }, [user])

  const isEditor = useCallback((): boolean => {
    return user?.role === UserRole.EDITOR || isAdmin()
  }, [user, isAdmin])

  const isViewer = useCallback((): boolean => {
    return user?.role === UserRole.VIEWER || isEditor()
  }, [user, isEditor])

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
    return canAccess('products', 'create')
  }, [canAccess])

  const canReadProduct = useCallback((ownerId?: string): boolean => {
    if (canAccess('products', 'read', 'all')) return true
    if (ownerId && user?.id === ownerId) {
      return canAccess('products', 'read', 'own')
    }
    return canAccess('products', 'read')
  }, [canAccess, user])

  const canUpdateProduct = useCallback((ownerId?: string): boolean => {
    if (canAccess('products', 'update', 'all')) return true
    if (ownerId && user?.id === ownerId) {
      return canAccess('products', 'update', 'own')
    }
    return false
  }, [canAccess, user])

  const canDeleteProduct = useCallback((ownerId?: string): boolean => {
    if (canAccess('products', 'delete', 'all')) return true
    if (ownerId && user?.id === ownerId) {
      return canAccess('products', 'delete', 'own')
    }
    return false
  }, [canAccess, user])

  // Category permissions
  const canCreateCategory = useCallback((): boolean => {
    return canAccess('categories', 'create')
  }, [canAccess])

  const canReadCategory = useCallback((): boolean => {
    return canAccess('categories', 'read')
  }, [canAccess])

  const canUpdateCategory = useCallback((): boolean => {
    return canAccess('categories', 'update')
  }, [canAccess])

  const canDeleteCategory = useCallback((): boolean => {
    return canAccess('categories', 'delete')
  }, [canAccess])

  // Page permissions
  const canCreatePage = useCallback((): boolean => {
    return canAccess('pages', 'create')
  }, [canAccess])

  const canReadPage = useCallback((ownerId?: string): boolean => {
    if (canAccess('pages', 'read', 'all')) return true
    if (ownerId && user?.id === ownerId) {
      return canAccess('pages', 'read', 'own')
    }
    return false
  }, [canAccess, user])

  const canUpdatePage = useCallback((ownerId?: string): boolean => {
    if (canAccess('pages', 'update', 'all')) return true
    if (ownerId && user?.id === ownerId) {
      return canAccess('pages', 'update', 'own')
    }
    return false
  }, [canAccess, user])

  const canDeletePage = useCallback((ownerId?: string): boolean => {
    if (canAccess('pages', 'delete', 'all')) return true
    if (ownerId && user?.id === ownerId) {
      return canAccess('pages', 'delete', 'own')
    }
    return false
  }, [canAccess, user])

  // Media permissions
  const canCreateMedia = useCallback((): boolean => {
    return canAccess('media', 'create')
  }, [canAccess])

  const canReadMedia = useCallback((ownerId?: string): boolean => {
    if (canAccess('media', 'read', 'all')) return true
    if (ownerId && user?.id === ownerId) {
      return canAccess('media', 'read', 'own')
    }
    return false
  }, [canAccess, user])

  const canUpdateMedia = useCallback((ownerId?: string): boolean => {
    if (canAccess('media', 'update', 'all')) return true
    if (ownerId && user?.id === ownerId) {
      return canAccess('media', 'update', 'own')
    }
    return false
  }, [canAccess, user])

  const canDeleteMedia = useCallback((ownerId?: string): boolean => {
    if (canAccess('media', 'delete', 'all')) return true
    if (ownerId && user?.id === ownerId) {
      return canAccess('media', 'delete', 'own')
    }
    return false
  }, [canAccess, user])

  // User management permissions
  const canCreateUser = useCallback((): boolean => {
    return canAccess('users', 'create')
  }, [canAccess])

  const canReadUser = useCallback((targetUserId?: string): boolean => {
    if (canAccess('users', 'read', 'all')) return true
    if (targetUserId && user?.id === targetUserId) {
      return canAccess('users', 'read', 'own')
    }
    return false
  }, [canAccess, user])

  const canUpdateUser = useCallback((targetUserId?: string): boolean => {
    if (canAccess('users', 'update', 'all')) return true
    if (targetUserId && user?.id === targetUserId) {
      return canAccess('profile', 'manage', 'own')
    }
    return false
  }, [canAccess, user])

  const canDeleteUser = useCallback((targetUserId?: string): boolean => {
    // Only admins can delete users, and they can't delete themselves
    if (!isAdmin()) return false
    if (user?.id === targetUserId) return false
    return canAccess('users', 'delete', 'all')
  }, [canAccess, user, isAdmin])

  // Order permissions
  const canReadOrder = useCallback((): boolean => {
    return canAccess('orders', 'read')
  }, [canAccess])

  const canUpdateOrder = useCallback((): boolean => {
    return canAccess('orders', 'update')
  }, [canAccess])

  // Analytics permissions
  const canReadAnalytics = useCallback((): boolean => {
    return canAccess('analytics', 'read')
  }, [canAccess])

  // Security permissions
  const canReadSecurityLogs = useCallback((): boolean => {
    return canAccess('security', 'read')
  }, [canAccess])

  const canManageSecurity = useCallback((): boolean => {
    return canAccess('security', 'manage')
  }, [canAccess])

  // Settings permissions
  const canReadSettings = useCallback((): boolean => {
    return canAccess('settings', 'read')
  }, [canAccess])

  const canUpdateSettings = useCallback((): boolean => {
    return canAccess('settings', 'update')
  }, [canAccess])

  const canManageSettings = useCallback((): boolean => {
    return canAccess('settings', 'manage')
  }, [canAccess])

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