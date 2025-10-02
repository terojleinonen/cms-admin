'use client'

/**
 * Specialized Guard Components
 * Task 17: Create specialized guard components for common access patterns
 */

import React from 'react'
import { UserRole } from '@prisma/client'
import { usePermissions } from '../../lib/hooks/usePermissions'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorMessage } from '../ui/ErrorMessage'

// Base guard interface for common props
interface BaseGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  showError?: boolean
  errorMessage?: string
  loadingComponent?: React.ReactNode
  onAuthorized?: () => void
  onUnauthorized?: (reason: string) => void
}

/**
 * AdminOnly Component
 * Renders content only for users with ADMIN role
 * Requirements: 3.1, 3.2
 */
export interface AdminOnlyProps extends BaseGuardProps {}

export function AdminOnly({
  children,
  fallback = null,
  showError = false,
  errorMessage,
  loadingComponent,
  onAuthorized,
  onUnauthorized,
}: AdminOnlyProps) {
  const permissions = usePermissions()

  // Calculate authorization state
  const { isAuthorized, reason } = React.useMemo(() => {
    if (permissions.isLoading) {
      return { isAuthorized: false, reason: 'Loading...' }
    }

    if (!permissions.isAuthenticated) {
      return { isAuthorized: false, reason: 'Not authenticated' }
    }

    if (!permissions.isAdmin()) {
      return { 
        isAuthorized: false, 
        reason: `Admin role required, current role: ${permissions.user?.role}` 
      }
    }

    return { isAuthorized: true, reason: undefined }
  }, [permissions])

  // Handle callbacks
  React.useEffect(() => {
    if (permissions.isLoading) return

    if (isAuthorized) {
      onAuthorized?.()
    } else {
      onUnauthorized?.(reason || 'Admin access required')
    }
  }, [isAuthorized, reason, onAuthorized, onUnauthorized, permissions.isLoading])

  // Show loading state
  if (permissions.isLoading) {
    return loadingComponent || <LoadingSpinner size="sm" />
  }

  // Show error if unauthorized and showError is true
  if (!isAuthorized && showError) {
    const message = errorMessage || reason || 'Admin access required'
    return <ErrorMessage message={message} />
  }

  // Render children if authorized, fallback otherwise
  return isAuthorized ? <>{children}</> : <>{fallback}</>
}

/**
 * OwnerOrAdmin Component
 * Renders content for resource owners or admin users
 * Requirements: 3.1, 3.2
 */
export interface OwnerOrAdminProps extends BaseGuardProps {
  resourceOwnerId: string
  currentUserId?: string // Optional override for current user ID
}

export function OwnerOrAdmin({
  resourceOwnerId,
  currentUserId,
  children,
  fallback = null,
  showError = false,
  errorMessage,
  loadingComponent,
  onAuthorized,
  onUnauthorized,
}: OwnerOrAdminProps) {
  const permissions = usePermissions()

  // Calculate authorization state
  const { isAuthorized, reason } = React.useMemo(() => {
    if (permissions.isLoading) {
      return { isAuthorized: false, reason: 'Loading...' }
    }

    if (!permissions.isAuthenticated) {
      return { isAuthorized: false, reason: 'Not authenticated' }
    }

    // Admin users have access to everything
    if (permissions.isAdmin()) {
      return { isAuthorized: true, reason: undefined }
    }

    // Check if user owns the resource
    const userId = currentUserId || permissions.user?.id
    if (userId === resourceOwnerId) {
      return { isAuthorized: true, reason: undefined }
    }

    return { 
      isAuthorized: false, 
      reason: `Access denied. Must be resource owner or admin. Current role: ${permissions.user?.role}` 
    }
  }, [permissions, resourceOwnerId, currentUserId])

  // Handle callbacks
  React.useEffect(() => {
    if (permissions.isLoading) return

    if (isAuthorized) {
      onAuthorized?.()
    } else {
      onUnauthorized?.(reason || 'Owner or admin access required')
    }
  }, [isAuthorized, reason, onAuthorized, onUnauthorized, permissions.isLoading])

  // Show loading state
  if (permissions.isLoading) {
    return loadingComponent || <LoadingSpinner size="sm" />
  }

  // Show error if unauthorized and showError is true
  if (!isAuthorized && showError) {
    const message = errorMessage || reason || 'Owner or admin access required'
    return <ErrorMessage message={message} />
  }

  // Render children if authorized, fallback otherwise
  return isAuthorized ? <>{children}</> : <>{fallback}</>
}

/**
 * FeatureFlag Component
 * Renders content based on feature flag configuration
 * Requirements: 3.1, 3.2
 */
export interface FeatureFlagProps extends BaseGuardProps {
  feature: string
  enabledFeatures?: string[]
  featureConfig?: Record<string, boolean>
  requireAuthentication?: boolean
  minimumRole?: UserRole
}

export function FeatureFlag({
  feature,
  enabledFeatures = [],
  featureConfig = {},
  requireAuthentication = false,
  minimumRole,
  children,
  fallback = null,
  showError = false,
  errorMessage,
  loadingComponent,
  onAuthorized,
  onUnauthorized,
}: FeatureFlagProps) {
  const permissions = usePermissions()

  // Calculate authorization state
  const { isAuthorized, reason } = React.useMemo(() => {
    if (permissions.isLoading && requireAuthentication) {
      return { isAuthorized: false, reason: 'Loading...' }
    }

    // Check authentication requirement
    if (requireAuthentication && !permissions.isAuthenticated) {
      return { isAuthorized: false, reason: 'Authentication required for this feature' }
    }

    // Check minimum role requirement
    if (minimumRole && !permissions.hasMinimumRole(minimumRole)) {
      return { 
        isAuthorized: false, 
        reason: `Minimum role required: ${minimumRole}, current role: ${permissions.user?.role}` 
      }
    }

    // Check feature flag in config object (takes precedence)
    if (Object.prototype.hasOwnProperty.call(featureConfig, feature)) {
      const isEnabled = featureConfig[feature]
      if (!isEnabled) {
        return { isAuthorized: false, reason: `Feature '${feature}' is disabled` }
      }
      return { isAuthorized: true, reason: undefined }
    }

    // Check feature flag in enabled features array
    if (enabledFeatures.length > 0) {
      const isEnabled = enabledFeatures.includes(feature)
      if (!isEnabled) {
        return { isAuthorized: false, reason: `Feature '${feature}' is not enabled` }
      }
      return { isAuthorized: true, reason: undefined }
    }

    // If no feature configuration provided, default to enabled
    return { isAuthorized: true, reason: undefined }
  }, [permissions, feature, enabledFeatures, featureConfig, requireAuthentication, minimumRole])

  // Handle callbacks
  React.useEffect(() => {
    if (permissions.isLoading && requireAuthentication) return

    if (isAuthorized) {
      onAuthorized?.()
    } else {
      onUnauthorized?.(reason || `Feature '${feature}' is not available`)
    }
  }, [isAuthorized, reason, onAuthorized, onUnauthorized, permissions.isLoading, requireAuthentication, feature])

  // Show loading state
  if (permissions.isLoading && requireAuthentication) {
    return loadingComponent || <LoadingSpinner size="sm" />
  }

  // Show error if unauthorized and showError is true
  if (!isAuthorized && showError) {
    const message = errorMessage || reason || `Feature '${feature}' is not available`
    return <ErrorMessage message={message} />
  }

  // Render children if authorized, fallback otherwise
  return isAuthorized ? <>{children}</> : <>{fallback}</>
}

/**
 * Utility function to get feature configuration from environment or config
 */
export function getFeatureConfig(): Record<string, boolean> {
  // In a real application, this would read from environment variables,
  // database, or external configuration service
  return {
    // Example feature flags
    'advanced-analytics': process.env.NEXT_PUBLIC_FEATURE_ADVANCED_ANALYTICS === 'true',
    'beta-features': process.env.NEXT_PUBLIC_FEATURE_BETA === 'true',
    'experimental-ui': process.env.NEXT_PUBLIC_FEATURE_EXPERIMENTAL_UI === 'true',
    'premium-features': process.env.NEXT_PUBLIC_FEATURE_PREMIUM === 'true',
    'debug-mode': process.env.NODE_ENV === 'development',
  }
}

/**
 * Hook to use feature flags with configuration
 */
export function useFeatureFlags() {
  const [featureConfig, setFeatureConfig] = React.useState<Record<string, boolean>>(() => 
    getFeatureConfig()
  )

  const isFeatureEnabled = React.useCallback((feature: string): boolean => {
    return featureConfig[feature] ?? false
  }, [featureConfig])

  const updateFeatureConfig = React.useCallback((newConfig: Record<string, boolean>) => {
    setFeatureConfig(prev => ({ ...prev, ...newConfig }))
  }, [])

  return {
    featureConfig,
    isFeatureEnabled,
    updateFeatureConfig,
  }
}

/**
 * Higher-order component for feature flag wrapping
 */
export function withFeatureFlag<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: string,
  options: Omit<FeatureFlagProps, 'feature' | 'children'> = {}
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component'
  
  const WithFeatureFlagComponent = (props: P) => (
    <FeatureFlag feature={feature} {...options}>
      <WrappedComponent {...props} />
    </FeatureFlag>
  )
  
  WithFeatureFlagComponent.displayName = `withFeatureFlag(${displayName})`
  
  return WithFeatureFlagComponent
}

/**
 * Higher-order component for admin-only wrapping
 */
export function withAdminOnly<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<AdminOnlyProps, 'children'> = {}
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component'
  
  const WithAdminOnlyComponent = (props: P) => (
    <AdminOnly {...options}>
      <WrappedComponent {...props} />
    </AdminOnly>
  )
  
  WithAdminOnlyComponent.displayName = `withAdminOnly(${displayName})`
  
  return WithAdminOnlyComponent
}

/**
 * Higher-order component for owner-or-admin wrapping
 */
export function withOwnerOrAdmin<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  getResourceOwnerId: (props: P) => string,
  options: Omit<OwnerOrAdminProps, 'children' | 'resourceOwnerId'> = {}
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component'
  
  const WithOwnerOrAdminComponent = (props: P) => {
    const resourceOwnerId = getResourceOwnerId(props)
    
    return (
      <OwnerOrAdmin resourceOwnerId={resourceOwnerId} {...options}>
        <WrappedComponent {...props} />
      </OwnerOrAdmin>
    )
  }
  
  WithOwnerOrAdminComponent.displayName = `withOwnerOrAdmin(${displayName})`
  
  return WithOwnerOrAdminComponent
}