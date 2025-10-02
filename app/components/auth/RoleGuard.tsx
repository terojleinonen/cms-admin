'use client'

/**
 * RoleGuard Component
 * Provides role-based conditional rendering with comprehensive access control
 */

import React from 'react'
import { UserRole } from '@prisma/client'
import { useRoleGuard, RoleGuardOptions } from '../../lib/hooks/useRoleGuard'
import { Permission } from '../../lib/permissions'
import LoadingSpinner from '../ui/LoadingSpinner'
import ErrorMessage from '../ui/ErrorMessage'
import PermissionErrorBoundary from './PermissionErrorBoundary'
import PermissionLoadingState, { AuthorizationLoading } from './PermissionLoadingState'
import UnauthorizedFallback, { RoleInsufficientFallback, PermissionDeniedFallback } from './UnauthorizedFallback'

export interface RoleGuardProps extends Omit<RoleGuardOptions, 'redirectOnUnauthorized' | 'onUnauthorized' | 'onAuthorized'> {
  children: React.ReactNode
  fallback?: React.ReactNode
  showError?: boolean
  errorMessage?: string
  loadingComponent?: React.ReactNode
  onUnauthorized?: (reason: string) => void
  onAuthorized?: () => void
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
 * RoleGuard component for role-based rendering
 * Conditionally renders children based on user roles and permissions
 */
export function RoleGuard({
  children,
  fallback = null,
  showError = false,
  errorMessage,
  loadingComponent,
  onUnauthorized,
  onAuthorized,
  enableErrorBoundary = true,
  errorBoundaryFallback,
  loadingContext = 'authorization',
  loadingTimeout,
  onLoadingTimeout,
  fallbackType = 'role',
  showFallbackDetails = false,
  showFallbackActions = true,
  ...guardOptions
}: RoleGuardProps) {
  const { isAuthorized, isLoading, reason } = useRoleGuard({
    ...guardOptions,
    redirectOnUnauthorized: false,
    onUnauthorized,
    onAuthorized,
  })

  // Enhanced loading state with context and timeout
  if (isLoading) {
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
  if (!isAuthorized) {
    // Show error message if showError is true
    if (showError) {
      const message = errorMessage || reason || 'You do not have permission to access this content'
      return <ErrorMessage message={message} />
    }

    // Use custom fallback if provided
    if (fallback) {
      return <>{fallback}</>
    }

    // Use enhanced unauthorized fallback
    return (
      <UnauthorizedFallback
        type={fallbackType}
        message={errorMessage || reason}
        showDetails={showFallbackDetails}
        showActions={showFallbackActions}
        requiredRole={guardOptions.requiredRole}
        // Extract current role from reason if available
        currentRole={reason?.includes('current role:') ? 
          reason.split('current role:')[1]?.trim() as UserRole : undefined}
        requiredPermission={guardOptions.requiredPermissions?.[0] ? 
          `${guardOptions.requiredPermissions[0].resource}.${guardOptions.requiredPermissions[0].action}` : undefined}
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
 * Specialized RoleGuard components for common use cases
 */

// Admin only access
export interface AdminOnlyProps extends Omit<RoleGuardProps, 'requiredRole'> {}

export function AdminOnly(props: AdminOnlyProps) {
  return <RoleGuard {...props} requiredRole={UserRole.ADMIN} />
}

// Editor or higher access
export interface EditorOrHigherProps extends Omit<RoleGuardProps, 'minimumRole'> {}

export function EditorOrHigher(props: EditorOrHigherProps) {
  return <RoleGuard {...props} minimumRole={UserRole.EDITOR} />
}

// Viewer or higher access (authenticated users)
export interface ViewerOrHigherProps extends Omit<RoleGuardProps, 'minimumRole'> {}

export function ViewerOrHigher(props: ViewerOrHigherProps) {
  return <RoleGuard {...props} minimumRole={UserRole.VIEWER} />
}

// Multiple roles allowed
export interface MultiRoleGuardProps extends Omit<RoleGuardProps, 'allowedRoles'> {
  roles: UserRole[]
}

export function MultiRoleGuard({ roles, ...props }: MultiRoleGuardProps) {
  return <RoleGuard {...props} allowedRoles={roles} />
}

/**
 * Resource-specific role guards
 */

// Product management guards
export interface ProductGuardProps extends Omit<RoleGuardProps, 'requiredPermissions'> {
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  scope?: string
}

export function ProductGuard({ action, scope, ...props }: ProductGuardProps) {
  const permission: Permission = { resource: 'products', action, scope }
  return <RoleGuard {...props} requiredPermissions={[permission]} />
}

// Category management guards
export interface CategoryGuardProps extends Omit<RoleGuardProps, 'requiredPermissions'> {
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  scope?: string
}

export function CategoryGuard({ action, scope, ...props }: CategoryGuardProps) {
  const permission: Permission = { resource: 'categories', action, scope }
  return <RoleGuard {...props} requiredPermissions={[permission]} />
}

// Page management guards
export interface PageGuardProps extends Omit<RoleGuardProps, 'requiredPermissions'> {
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  scope?: string
}

export function PageGuard({ action, scope, ...props }: PageGuardProps) {
  const permission: Permission = { resource: 'pages', action, scope }
  return <RoleGuard {...props} requiredPermissions={[permission]} />
}

// Media management guards
export interface MediaGuardProps extends Omit<RoleGuardProps, 'requiredPermissions'> {
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  scope?: string
}

export function MediaGuard({ action, scope, ...props }: MediaGuardProps) {
  const permission: Permission = { resource: 'media', action, scope }
  return <RoleGuard {...props} requiredPermissions={[permission]} />
}

// User management guards
export interface UserGuardProps extends Omit<RoleGuardProps, 'requiredPermissions'> {
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  scope?: string
}

export function UserGuard({ action, scope, ...props }: UserGuardProps) {
  const permission: Permission = { resource: 'users', action, scope }
  return <RoleGuard {...props} requiredPermissions={[permission]} />
}

// Analytics access guard
export interface AnalyticsGuardProps extends Omit<RoleGuardProps, 'requiredPermissions'> {}

export function AnalyticsGuard(props: AnalyticsGuardProps) {
  const permission: Permission = { resource: 'analytics', action: 'read' }
  return <RoleGuard {...props} requiredPermissions={[permission]} />
}

// Security management guards
export interface SecurityGuardProps extends Omit<RoleGuardProps, 'requiredPermissions'> {
  action?: 'read' | 'manage'
}

export function SecurityGuard({ action = 'read', ...props }: SecurityGuardProps) {
  const permission: Permission = { resource: 'security', action }
  return <RoleGuard {...props} requiredPermissions={[permission]} />
}

// Settings management guards
export interface SettingsGuardProps extends Omit<RoleGuardProps, 'requiredPermissions'> {
  action?: 'read' | 'update' | 'manage'
}

export function SettingsGuard({ action = 'read', ...props }: SettingsGuardProps) {
  const permission: Permission = { resource: 'settings', action }
  return <RoleGuard {...props} requiredPermissions={[permission]} />
}

/**
 * Ownership-based guards for resource-specific access
 */

export interface OwnershipGuardProps extends RoleGuardProps {
  resourceOwnerId?: string
  allowOwnerAccess?: boolean
}

export function OwnershipGuard({ 
  resourceOwnerId, 
  allowOwnerAccess = true, 
  customValidator,
  ...props 
}: OwnershipGuardProps) {
  const enhancedValidator = React.useCallback((permissions: any) => {
    // First check custom validator if provided
    if (customValidator && !customValidator(permissions)) {
      return false
    }

    // If owner access is allowed and user owns the resource
    if (allowOwnerAccess && resourceOwnerId && permissions.user?.id === resourceOwnerId) {
      return true
    }

    // Otherwise rely on standard permission checking
    return true
  }, [customValidator, allowOwnerAccess, resourceOwnerId])

  return <RoleGuard {...props} customValidator={enhancedValidator} />
}

/**
 * Feature flag guard for feature-based access control
 */

export interface FeatureFlagGuardProps extends Omit<RoleGuardProps, 'customValidator'> {
  feature: string
  enabledFeatures?: string[]
}

export function FeatureFlagGuard({ 
  feature, 
  enabledFeatures = [], 
  ...props 
}: FeatureFlagGuardProps) {
  const featureValidator = React.useCallback(() => {
    return enabledFeatures.includes(feature)
  }, [feature, enabledFeatures])

  return <RoleGuard {...props} customValidator={featureValidator} />
}