'use client'

/**
 * Role Guard Hook
 * React hook for component-level role and permission protection
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
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

  // Check if user meets role requirements
  const checkRoleRequirements = useCallback((): { authorized: boolean; reason?: string } => {
    if (!permissions.isAuthenticated) {
      return { authorized: false, reason: 'Not authenticated' }
    }

    // Check specific role requirement
    if (requiredRole && !permissions.hasRole(requiredRole)) {
      return { 
        authorized: false, 
        reason: `Required role: ${requiredRole}, current role: ${permissions.user?.role}` 
      }
    }

    // Check minimum role requirement
    if (minimumRole && !permissions.hasMinimumRole(minimumRole)) {
      return { 
        authorized: false, 
        reason: `Minimum role required: ${minimumRole}, current role: ${permissions.user?.role}` 
      }
    }

    // Check allowed roles
    if (allowedRoles && allowedRoles.length > 0) {
      const hasAllowedRole = allowedRoles.some(role => permissions.hasRole(role))
      if (!hasAllowedRole) {
        return { 
          authorized: false, 
          reason: `Allowed roles: ${allowedRoles.join(', ')}, current role: ${permissions.user?.role}` 
        }
      }
    }

    return { authorized: true }
  }, [permissions, requiredRole, minimumRole, allowedRoles])

  // Check if user meets permission requirements
  const checkPermissionRequirements = useCallback((): { authorized: boolean; reason?: string } => {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return { authorized: true }
    }

    if (requireAllPermissions) {
      // AND logic - user must have ALL permissions
      for (const permission of requiredPermissions) {
        if (!permissions.canAccess(permission.resource, permission.action, permission.scope)) {
          return { 
            authorized: false, 
            reason: `Missing required permission: ${permission.resource}.${permission.action}${permission.scope ? `.${permission.scope}` : ''}` 
          }
        }
      }
      return { authorized: true }
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
          reason: `Missing any of required permissions: ${permissionStrings.join(', ')}` 
        }
      }
      
      return { authorized: true }
    }
  }, [permissions, requiredPermissions, requireAllPermissions])

  // Check custom validation
  const checkCustomValidation = useCallback((): { authorized: boolean; reason?: string } => {
    if (!customValidator) {
      return { authorized: true }
    }

    try {
      const isValid = customValidator(permissions)
      return { 
        authorized: isValid, 
        reason: isValid ? undefined : 'Custom validation failed' 
      }
    } catch (error) {
      console.error('Custom validator error:', error)
      return { 
        authorized: false, 
        reason: 'Custom validation error' 
      }
    }
  }, [permissions, customValidator])

  // Main authorization check
  const checkAuthorization = useCallback((): { authorized: boolean; reason?: string } => {
    // Check role requirements
    const roleCheck = checkRoleRequirements()
    if (!roleCheck.authorized) {
      return roleCheck
    }

    // Check permission requirements
    const permissionCheck = checkPermissionRequirements()
    if (!permissionCheck.authorized) {
      return permissionCheck
    }

    // Check custom validation
    const customCheck = checkCustomValidation()
    if (!customCheck.authorized) {
      return customCheck
    }

    return { authorized: true }
  }, [checkRoleRequirements, checkPermissionRequirements, checkCustomValidation])

  // Redirect function
  const redirect = useCallback(() => {
    if (redirectTo) {
      router.push(redirectTo)
    }
  }, [router, redirectTo])

  // Main authorization effect
  useEffect(() => {
    if (permissions.isLoading) {
      return
    }

    const { authorized, reason: authReason } = checkAuthorization()
    
    setReason(authReason)
    setAuthorizationChecked(true)

    if (authorized) {
      onAuthorized?.()
    } else {
      onUnauthorized?.(authReason || 'Unauthorized')
      
      if (redirectOnUnauthorized) {
        redirect()
      }
    }
  }, [
    permissions.isLoading,
    permissions.user,
    permissions.isAuthenticated,
    checkAuthorization,
    onAuthorized,
    onUnauthorized,
    redirectOnUnauthorized,
    redirect
  ])

  // Calculate final authorization state
  const isAuthorized = useMemo(() => {
    if (permissions.isLoading || !authorizationChecked) {
      return false
    }
    
    const { authorized } = checkAuthorization()
    return authorized
  }, [permissions.isLoading, authorizationChecked, checkAuthorization])

  // Calculate loading state
  const isLoading = useMemo(() => {
    if (!showLoadingState) {
      return false
    }
    
    return permissions.isLoading || !authorizationChecked
  }, [permissions.isLoading, authorizationChecked, showLoadingState])

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