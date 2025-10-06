'use client'

/**
 * Role Guard Hook
 * React hook for component-level role and permission protection
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { usePermissions, PermissionHook } from './usePermissions'
import { Permission } from '../permissions'

export interface RoleGuardOptions {
  // Role-based access
  allowedRoles?: UserRole[]
  requiredRole?: UserRole
  minimumRole?: UserRole
  
  // Permission-based access
  requiredPermissions?: Permission[]
  requireAllPermissions?: boolean // true = AND logic, false = OR logic
  
  // Redirect options
  redirectTo?: string
  redirectOnUnauthorized?: boolean
  
  // Loading and error handling
  showLoadingState?: boolean
  onUnauthorized?: (reason: string) => void
  onAuthorized?: () => void
  
  // Custom validation
  customValidator?: (permissions: PermissionHook) => boolean
}

export interface RoleGuardResult {
  isAuthorized: boolean
  isLoading: boolean
  user: PermissionHook['user']
  permissions: PermissionHook
  reason?: string
  redirect: () => void
}

/**
 * Hook for role-based component protection
 */
export function useRoleGuard(options: RoleGuardOptions = {}): RoleGuardResult {
  const {
    allowedRoles,
    requiredRole,
    minimumRole,
    requiredPermissions,
    requireAllPermissions = true,
    redirectTo = '/auth/login',
    redirectOnUnauthorized = false,
    showLoadingState = true,
    onUnauthorized,
    onAuthorized,
    customValidator,
  } = options

  const router = useRouter()
  const permissions = usePermissions()
  const [authorizationChecked, setAuthorizationChecked] = useState(false)
  const [reason, setReason] = useState<string>()
  const lastAuthStateRef = useRef<{ authorized: boolean; reason?: string }>({ authorized: false })



  // Redirect function
  const redirect = useCallback(() => {
    if (redirectTo) {
      router.push(redirectTo)
    }
  }, [router, redirectTo])

  // Calculate authorization state directly without complex dependencies
  const authorizationResult = useMemo(() => {
    if (permissions.isLoading) {
      return { authorized: false, reason: undefined, loading: true }
    }

    // Check role requirements
    if (!permissions.isAuthenticated) {
      return { authorized: false, reason: 'Not authenticated', loading: false }
    }

    const userRole = permissions.user?.role

    // Check specific role requirement
    if (requiredRole && userRole !== requiredRole) {
      return { 
        authorized: false, 
        reason: `Required role: ${requiredRole}, current role: ${userRole}`,
        loading: false
      }
    }

    // Check minimum role requirement using role hierarchy
    if (minimumRole) {
      const roleHierarchy = {
        [UserRole.VIEWER]: 1,
        [UserRole.EDITOR]: 2,
        [UserRole.ADMIN]: 3,
      }
      
      const userLevel = userRole ? roleHierarchy[userRole] : 0
      const requiredLevel = roleHierarchy[minimumRole]
      
      if (userLevel < requiredLevel) {
        return { 
          authorized: false, 
          reason: `Minimum role required: ${minimumRole}, current role: ${userRole}`,
          loading: false
        }
      }
    }

    // Check allowed roles
    if (allowedRoles && allowedRoles.length > 0) {
      const hasAllowedRole = allowedRoles.includes(userRole as UserRole)
      if (!hasAllowedRole) {
        return { 
          authorized: false, 
          reason: `Allowed roles: ${allowedRoles.join(', ')}, current role: ${userRole}`,
          loading: false
        }
      }
    }

    // Check permission requirements
    if (requiredPermissions && requiredPermissions.length > 0) {
      if (requireAllPermissions) {
        // AND logic - user must have ALL permissions
        for (const permission of requiredPermissions) {
          if (!permissions.canAccess(permission.resource, permission.action, permission.scope)) {
            return { 
              authorized: false, 
              reason: `Missing required permission: ${permission.resource}.${permission.action}${permission.scope ? `.${permission.scope}` : ''}`,
              loading: false
            }
          }
        }
      } else {
        // OR logic - user must have AT LEAST ONE permission
        const hasAnyPermission = requiredPermissions.some(permission =>
          permissions.canAccess(permission.resource, permission.action, permission.scope)
        )
        
        if (!hasAnyPermission) {
          const permissionStrings = requiredPermissions.map(p => 
            `${p.resource}.${p.action}${p.scope ? `.${p.scope}` : ''}`
          )
          return { 
            authorized: false, 
            reason: `Missing any of required permissions: ${permissionStrings.join(', ')}`,
            loading: false
          }
        }
      }
    }

    // Check custom validation
    if (customValidator) {
      try {
        const isValid = customValidator(permissions)
        if (!isValid) {
          return { 
            authorized: false, 
            reason: 'Custom validation failed',
            loading: false
          }
        }
      } catch (error) {
        console.error('Custom validator error:', error)
        return { 
          authorized: false, 
          reason: 'Custom validation error',
          loading: false
        }
      }
    }

    return { authorized: true, reason: undefined, loading: false }
  }, [
    permissions.isLoading,
    permissions.isAuthenticated,
    permissions.user?.role,
    permissions.canAccess,
    requiredRole,
    minimumRole,
    allowedRoles,
    requiredPermissions,
    requireAllPermissions,
    customValidator
  ])

  // Handle side effects only when authorization state actually changes
  useEffect(() => {
    if (authorizationResult.loading) {
      return
    }

    const currentState = {
      authorized: authorizationResult.authorized,
      reason: authorizationResult.reason
    }

    // Only update state and call callbacks if the authorization state has actually changed
    const hasChanged = 
      lastAuthStateRef.current.authorized !== currentState.authorized ||
      lastAuthStateRef.current.reason !== currentState.reason

    if (hasChanged) {
      setReason(currentState.reason)
      setAuthorizationChecked(true)
      lastAuthStateRef.current = currentState

      if (currentState.authorized) {
        onAuthorized?.()
      } else {
        onUnauthorized?.(currentState.reason || 'Unauthorized')
        
        if (redirectOnUnauthorized) {
          redirect()
        }
      }
    } else if (!authorizationChecked) {
      // First time setup
      setAuthorizationChecked(true)
    }
  }, [
    authorizationResult.authorized, 
    authorizationResult.reason, 
    authorizationResult.loading,
    authorizationChecked,
    redirectOnUnauthorized,
    redirect,
    onAuthorized,
    onUnauthorized
  ])

  const isAuthorized = authorizationResult.authorized

  // Calculate loading state
  const isLoading = useMemo(() => {
    if (!showLoadingState) {
      return false
    }
    
    return authorizationResult.loading || !authorizationChecked
  }, [authorizationResult.loading, authorizationChecked, showLoadingState])

  return {
    isAuthorized,
    isLoading,
    user: permissions.user,
    permissions,
    reason,
    redirect,
  }
}

/**
 * Simplified role guard hooks for common use cases
 */

// Admin only access
export function useAdminGuard(options: Omit<RoleGuardOptions, 'requiredRole'> = {}): RoleGuardResult {
  return useRoleGuard({
    ...options,
    requiredRole: UserRole.ADMIN,
  })
}

// Editor or higher access
export function useEditorGuard(options: Omit<RoleGuardOptions, 'minimumRole'> = {}): RoleGuardResult {
  return useRoleGuard({
    ...options,
    minimumRole: UserRole.EDITOR,
  })
}

// Viewer or higher access (authenticated users)
export function useViewerGuard(options: Omit<RoleGuardOptions, 'minimumRole'> = {}): RoleGuardResult {
  return useRoleGuard({
    ...options,
    minimumRole: UserRole.VIEWER,
  })
}

// Permission-based guard
export function usePermissionGuard(
  requiredPermissions: Permission[],
  options: Omit<RoleGuardOptions, 'requiredPermissions'> = {}
): RoleGuardResult {
  return useRoleGuard({
    ...options,
    requiredPermissions,
  })
}

// Resource-specific guards
export function useProductGuard(
  action: 'create' | 'read' | 'update' | 'delete' | 'manage',
  options: Omit<RoleGuardOptions, 'requiredPermissions'> = {}
): RoleGuardResult {
  return usePermissionGuard([{ resource: 'products', action }], options)
}

export function useCategoryGuard(
  action: 'create' | 'read' | 'update' | 'delete' | 'manage',
  options: Omit<RoleGuardOptions, 'requiredPermissions'> = {}
): RoleGuardResult {
  return usePermissionGuard([{ resource: 'categories', action }], options)
}

export function usePageGuard(
  action: 'create' | 'read' | 'update' | 'delete' | 'manage',
  options: Omit<RoleGuardOptions, 'requiredPermissions'> = {}
): RoleGuardResult {
  return usePermissionGuard([{ resource: 'pages', action }], options)
}

export function useMediaGuard(
  action: 'create' | 'read' | 'update' | 'delete' | 'manage',
  options: Omit<RoleGuardOptions, 'requiredPermissions'> = {}
): RoleGuardResult {
  return usePermissionGuard([{ resource: 'media', action }], options)
}

export function useUserGuard(
  action: 'create' | 'read' | 'update' | 'delete' | 'manage',
  options: Omit<RoleGuardOptions, 'requiredPermissions'> = {}
): RoleGuardResult {
  return usePermissionGuard([{ resource: 'users', action }], options)
}

export function useAnalyticsGuard(
  options: Omit<RoleGuardOptions, 'requiredPermissions'> = {}
): RoleGuardResult {
  return usePermissionGuard([{ resource: 'analytics', action: 'read' }], options)
}

export function useSecurityGuard(
  action: 'read' | 'manage' = 'read',
  options: Omit<RoleGuardOptions, 'requiredPermissions'> = {}
): RoleGuardResult {
  return usePermissionGuard([{ resource: 'security', action }], options)
}

export function useSettingsGuard(
  action: 'read' | 'update' | 'manage' = 'read',
  options: Omit<RoleGuardOptions, 'requiredPermissions'> = {}
): RoleGuardResult {
  return usePermissionGuard([{ resource: 'settings', action }], options)
}