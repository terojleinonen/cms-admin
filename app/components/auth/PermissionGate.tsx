'use client'

/**
 * PermissionGate Component
 * Provides granular permission-based conditional rendering
 */

import React from 'react'
import { UserRole } from '@prisma/client'
import { usePermissions } from '../../lib/hooks/usePermissions'
import { Permission } from '../../lib/permissions'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorMessage } from '../ui/ErrorMessage'
import PermissionErrorBoundary from './PermissionErrorBoundary'
import PermissionLoadingState, { PermissionValidationLoading } from './PermissionLoadingState'
import UnauthorizedFallback, { PermissionDeniedFallback, AuthenticationRequiredFallback } from './UnauthorizedFallback'

export interface PermissionGateProps {
  // Permission-based access
  resource?: string
  action?: string
  scope?: string
  permissions?: Permission[]
  requireAllPermissions?: boolean // true = AND logic, false = OR logic
  
  // Role-based access (alternative to permissions)
  allowedRoles?: UserRole[]
  requiredRole?: UserRole
  minimumRole?: UserRole
  
  // Rendering options
  children: React.ReactNode
  fallback?: React.ReactNode
  showError?: boolean
  errorMessage?: string
  loadingComponent?: React.ReactNode
  
  // Custom validation
  customValidator?: (permissions: ReturnType<typeof usePermissions>) => boolean
  
  // Ownership checking
  resourceOwnerId?: string
  allowOwnerAccess?: boolean
  
  // Callbacks
  onAuthorized?: () => void
  onUnauthorized?: (reason: string) => void
  
  // Enhanced error handling
  enableErrorBoundary?: boolean
  errorBoundaryFallback?: React.ReactNode
  
  // Enhanced loading states
  loadingContext?: 'authentication' | 'authorization' | 'permission' | 'role'
  loadingTimeout?: number
  onLoadingTimeout?: () => void
  
  // Enhanced fallback UI
  fallbackType?: 'permission' | 'role' | 'authentication' | 'resource' | 'generic'
  showFallbackDetails?: boolean
  showFallbackActions?: boolean
}

/**
 * PermissionGate component for granular permission checking
 * More flexible than RoleGuard with fine-grained permission control
 */
export function PermissionGate({
  resource,
  action,
  scope,
  permissions,
  requireAllPermissions = true,
  allowedRoles,
  requiredRole,
  minimumRole,
  children,
  fallback = null,
  showError = false,
  errorMessage,
  loadingComponent,
  customValidator,
  resourceOwnerId,
  allowOwnerAccess = true,
  onAuthorized,
  onUnauthorized,
  enableErrorBoundary = true,
  errorBoundaryFallback,
  loadingContext = 'permission',
  loadingTimeout,
  onLoadingTimeout,
  fallbackType = 'permission',
  showFallbackDetails = false,
  showFallbackActions = true,
}: PermissionGateProps) {
  const permissionHook = usePermissions()

  // Role hierarchy for minimum role checks
  const roleHierarchy = React.useMemo(() => ({
    [UserRole.VIEWER]: 1,
    [UserRole.EDITOR]: 2,
    [UserRole.ADMIN]: 3,
  }), [])

  // Check role-based access
  const checkRoleAccess = React.useCallback((): { authorized: boolean; reason?: string } => {
    if (!permissionHook.isAuthenticated) {
      return { authorized: false, reason: 'Not authenticated' }
    }

    // Check specific role requirement
    if (requiredRole && !permissionHook.hasRole(requiredRole)) {
      return { 
        authorized: false, 
        reason: `Required role: ${requiredRole}, current role: ${permissionHook.user?.role}` 
      }
    }

    // Check minimum role requirement
    if (minimumRole && !permissionHook.hasMinimumRole(minimumRole)) {
      return { 
        authorized: false, 
        reason: `Minimum role required: ${minimumRole}, current role: ${permissionHook.user?.role}` 
      }
    }

    // Check allowed roles
    if (allowedRoles && allowedRoles.length > 0) {
      const hasAllowedRole = allowedRoles.some(role => permissionHook.hasRole(role))
      if (!hasAllowedRole) {
        return { 
          authorized: false, 
          reason: `Allowed roles: ${allowedRoles.join(', ')}, current role: ${permissionHook.user?.role}` 
        }
      }
    }

    return { authorized: true }
  }, [permissionHook, requiredRole, minimumRole, allowedRoles])

  // Check permission-based access
  const checkPermissionAccess = React.useCallback((): { authorized: boolean; reason?: string } => {
    // Build permissions array
    const permissionsToCheck: Permission[] = []
    
    // Add single permission if provided
    if (resource && action) {
      permissionsToCheck.push({ resource, action, scope })
    }
    
    // Add multiple permissions if provided
    if (permissions && permissions.length > 0) {
      permissionsToCheck.push(...permissions)
    }

    // If no permissions specified, allow access
    if (permissionsToCheck.length === 0) {
      return { authorized: true }
    }

    if (requireAllPermissions) {
      // AND logic - user must have ALL permissions
      for (const permission of permissionsToCheck) {
        if (!permissionHook.canAccess(permission.resource, permission.action, permission.scope)) {
          return { 
            authorized: false, 
            reason: `Missing required permission: ${permission.resource}.${permission.action}${permission.scope ? `.${permission.scope}` : ''}` 
          }
        }
      }
      return { authorized: true }
    } else {
      // OR logic - user must have AT LEAST ONE permission
      const hasAnyPermission = permissionsToCheck.some(permission =>
        permissionHook.canAccess(permission.resource, permission.action, permission.scope)
      )
      
      if (!hasAnyPermission) {
        const permissionStrings = permissionsToCheck.map(p => 
          `${p.resource}.${p.action}${p.scope ? `.${p.scope}` : ''}`
        )
        return { 
          authorized: false, 
          reason: `Missing any of required permissions: ${permissionStrings.join(', ')}` 
        }
      }
      
      return { authorized: true }
    }
  }, [permissionHook, resource, action, scope, permissions, requireAllPermissions])

  // Check ownership access
  const checkOwnershipAccess = React.useCallback((): { authorized: boolean; reason?: string } => {
    if (!allowOwnerAccess || !resourceOwnerId) {
      return { authorized: true }
    }

    // If user owns the resource, they have access
    if (permissionHook.user?.id === resourceOwnerId) {
      return { authorized: true }
    }

    return { authorized: true } // Don't block here, let other checks handle it
  }, [permissionHook.user, resourceOwnerId, allowOwnerAccess])

  // Check custom validation
  const checkCustomValidation = React.useCallback((): { authorized: boolean; reason?: string } => {
    if (!customValidator) {
      return { authorized: true }
    }

    try {
      const isValid = customValidator(permissionHook)
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
  }, [permissionHook, customValidator])

  // Main authorization check
  const checkAuthorization = React.useCallback((): { authorized: boolean; reason?: string } => {
    // Check role requirements first
    const roleCheck = checkRoleAccess()
    if (!roleCheck.authorized) {
      return roleCheck
    }

    // Check permission requirements
    const permissionCheck = checkPermissionAccess()
    if (!permissionCheck.authorized) {
      // If permission check fails but user owns resource, allow access
      if (allowOwnerAccess && resourceOwnerId && permissionHook.user?.id === resourceOwnerId) {
        return { authorized: true }
      }
      return permissionCheck
    }

    // Check ownership requirements
    const ownershipCheck = checkOwnershipAccess()
    if (!ownershipCheck.authorized) {
      return ownershipCheck
    }

    // Check custom validation
    const customCheck = checkCustomValidation()
    if (!customCheck.authorized) {
      return customCheck
    }

    return { authorized: true }
  }, [checkRoleAccess, checkPermissionAccess, checkOwnershipAccess, checkCustomValidation, allowOwnerAccess, resourceOwnerId, permissionHook.user])

  // Calculate authorization state
  const { authorized, reason } = React.useMemo(() => {
    if (permissionHook.isLoading) {
      return { authorized: false, reason: 'Loading...' }
    }
    
    return checkAuthorization()
  }, [permissionHook.isLoading, checkAuthorization])

  // Handle callbacks
  React.useEffect(() => {
    if (permissionHook.isLoading) return

    if (authorized) {
      onAuthorized?.()
    } else {
      onUnauthorized?.(reason || 'Unauthorized')
    }
  }, [authorized, reason, onAuthorized, onUnauthorized, permissionHook.isLoading])

  // Enhanced loading state with context and timeout
  if (permissionHook.isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>
    }
    
    return (
      <PermissionLoadingState
        context={loadingContext}
        timeout={loadingTimeout}
        onTimeout={onLoadingTimeout}
        size="sm"
      />
    )
  }

  // Enhanced unauthorized handling
  if (!authorized) {
    // Show error message if showError is true
    if (showError) {
      const message = errorMessage || reason || 'You do not have permission to access this content'
      return <ErrorMessage message={message} />
    }

    // Use custom fallback if provided
    if (fallback) {
      return <>{fallback}</>
    }

    // Determine fallback type based on reason
    let determinedFallbackType = fallbackType
    if (reason?.includes('Not authenticated')) {
      determinedFallbackType = 'authentication'
    } else if (reason?.includes('role')) {
      determinedFallbackType = 'role'
    }

    // Use enhanced unauthorized fallback
    return (
      <UnauthorizedFallback
        type={determinedFallbackType}
        message={errorMessage || reason}
        showDetails={showFallbackDetails}
        showActions={showFallbackActions}
        requiredRole={requiredRole || minimumRole}
        currentRole={permissionHook.user?.role}
        requiredPermission={resource && action ? `${resource}.${action}${scope ? `.${scope}` : ''}` : undefined}
        resourceType={resource}
      />
    )
  }

  // Wrap children with error boundary if enabled
  if (enableErrorBoundary) {
    return (
      <PermissionErrorBoundary fallback={errorBoundaryFallback}>
        {children}
      </PermissionErrorBoundary>
    )
  }

  // Render children if authorized
  return <>{children}</>
}

/**
 * Specialized PermissionGate components for common use cases
 */

// Simple resource-action gate
export interface ResourceGateProps extends Omit<PermissionGateProps, 'resource' | 'action'> {
  resource: string
  action: string
}

export function ResourceGate({ resource, action, ...props }: ResourceGateProps) {
  return <PermissionGate {...props} resource={resource} action={action} />
}

// Multiple permissions gate with OR logic
export interface AnyPermissionGateProps extends Omit<PermissionGateProps, 'permissions' | 'requireAllPermissions'> {
  permissions: Permission[]
}

export function AnyPermissionGate({ permissions, ...props }: AnyPermissionGateProps) {
  return <PermissionGate {...props} permissions={permissions} requireAllPermissions={false} />
}

// Multiple permissions gate with AND logic
export interface AllPermissionsGateProps extends Omit<PermissionGateProps, 'permissions' | 'requireAllPermissions'> {
  permissions: Permission[]
}

export function AllPermissionsGate({ permissions, ...props }: AllPermissionsGateProps) {
  return <PermissionGate {...props} permissions={permissions} requireAllPermissions={true} />
}

// Owner or admin access gate
export interface OwnerOrAdminGateProps extends Omit<PermissionGateProps, 'allowedRoles' | 'allowOwnerAccess'> {
  resourceOwnerId: string
}

export function OwnerOrAdminGate({ resourceOwnerId, ...props }: OwnerOrAdminGateProps) {
  return (
    <PermissionGate 
      {...props} 
      allowedRoles={[UserRole.ADMIN]} 
      resourceOwnerId={resourceOwnerId}
      allowOwnerAccess={true}
      requireAllPermissions={false}
    />
  )
}

// Feature-based access gate
export interface FeatureGateProps extends Omit<PermissionGateProps, 'customValidator'> {
  feature: string
  enabledFeatures?: string[]
}

export function FeatureGate({ 
  feature, 
  enabledFeatures = [], 
  ...props 
}: FeatureGateProps) {
  const featureValidator = React.useCallback(() => {
    return enabledFeatures.includes(feature)
  }, [feature, enabledFeatures])

  return <PermissionGate {...props} customValidator={featureValidator} />
}

/**
 * Utility gates for common patterns
 */

// Authenticated user gate
export interface AuthenticatedGateProps extends Omit<PermissionGateProps, 'customValidator'> {
  // Inherits all props from PermissionGateProps except customValidator
}

export function AuthenticatedGate(props: AuthenticatedGateProps) {
  const authValidator = React.useCallback((permissions: ReturnType<typeof usePermissions>) => {
    return permissions.isAuthenticated
  }, [])

  return <PermissionGate {...props} customValidator={authValidator} />
}

// Admin or owner gate for user management
export interface UserManagementGateProps extends Omit<PermissionGateProps, 'customValidator'> {
  targetUserId: string
}

export function UserManagementGate({ targetUserId, ...props }: UserManagementGateProps) {
  const userValidator = React.useCallback((permissions: ReturnType<typeof usePermissions>) => {
    // Admin can manage any user
    if (permissions.isAdmin()) return true
    
    // User can manage their own profile
    if (permissions.user?.id === targetUserId) return true
    
    return false
  }, [targetUserId])

  return <PermissionGate {...props} customValidator={userValidator} />
}

// Content creation gate (editor or higher)
export interface ContentCreationGateProps extends Omit<PermissionGateProps, 'minimumRole'> {}

export function ContentCreationGate(props: ContentCreationGateProps) {
  return <PermissionGate {...props} minimumRole={UserRole.EDITOR} />
}

// System administration gate (admin only)
export interface SystemAdminGateProps extends Omit<PermissionGateProps, 'requiredRole'> {}

export function SystemAdminGate(props: SystemAdminGateProps) {
  return <PermissionGate {...props} requiredRole={UserRole.ADMIN} />
}