'use client'

/**
 * ConditionalRender Component
 * Provides complex permission logic and conditional rendering capabilities
 */

import React from 'react'
import { UserRole } from '@prisma/client'
import { usePermissions } from '../../lib/hooks/usePermissions'
import { Permission } from '../../lib/permissions'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorMessage } from '../ui/ErrorMessage'
import PermissionErrorBoundary from './PermissionErrorBoundary'
import PermissionLoadingState from './PermissionLoadingState'
import UnauthorizedFallback from './UnauthorizedFallback'

export type PermissionCondition = (permissions: ReturnType<typeof usePermissions>) => boolean

export interface ConditionalRenderProps {
  // Main condition function
  condition: PermissionCondition
  
  // Rendering options
  children: React.ReactNode
  fallback?: React.ReactNode
  showError?: boolean
  errorMessage?: string
  loadingComponent?: React.ReactNode
  
  // Multiple conditions with logic operators
  conditions?: PermissionCondition[]
  operator?: 'AND' | 'OR' | 'NOT'
  
  // Callbacks
  onConditionMet?: () => void
  onConditionNotMet?: (reason?: string) => void
  
  // Debug mode
  debug?: boolean
  
  // Enhanced error handling
  enableErrorBoundary?: boolean
  errorBoundaryFallback?: React.ReactNode
  
  // Enhanced loading states
  loadingContext?: 'authentication' | 'authorization' | 'permission' | 'role' | 'generic'
  loadingTimeout?: number
  onLoadingTimeout?: () => void
  
  // Enhanced fallback UI
  fallbackType?: 'permission' | 'role' | 'authentication' | 'resource' | 'generic'
  showFallbackDetails?: boolean
  showFallbackActions?: boolean
}

/**
 * ConditionalRender component for complex permission logic
 * Allows custom condition functions and logical operators
 */
export function ConditionalRender({
  condition,
  children,
  fallback = null,
  showError = false,
  errorMessage,
  loadingComponent,
  conditions = [],
  operator = 'AND',
  onConditionMet,
  onConditionNotMet,
  debug = false,
  enableErrorBoundary = true,
  errorBoundaryFallback,
  loadingContext = 'generic',
  loadingTimeout,
  onLoadingTimeout,
  fallbackType = 'generic',
  showFallbackDetails = false,
  showFallbackActions = true,
}: ConditionalRenderProps) {
  const permissions = usePermissions()

  // Evaluate single condition
  const evaluateCondition = React.useCallback((cond: PermissionCondition): boolean => {
    try {
      return cond(permissions)
    } catch (error) {
      if (debug) {
        console.error('Condition evaluation error:', error)
      }
      return false
    }
  }, [permissions, debug])

  // Evaluate multiple conditions with logical operators
  const evaluateConditions = React.useCallback((): boolean => {
    const allConditions = [condition, ...conditions]
    
    if (debug) {
      console.log(`Evaluating ${allConditions.length} conditions with ${operator} operator`)
    }

    switch (operator) {
      case 'AND':
        return allConditions.every(cond => evaluateCondition(cond))
      
      case 'OR':
        return allConditions.some(cond => evaluateCondition(cond))
      
      case 'NOT':
        // NOT operator applies to the first condition only
        return !evaluateCondition(condition)
      
      default:
        return evaluateCondition(condition)
    }
  }, [condition, conditions, operator, evaluateCondition, debug])

  // Calculate final condition result
  const conditionMet = React.useMemo(() => {
    if (permissions.isLoading) {
      return false
    }
    
    const result = evaluateConditions()
    
    if (debug) {
      console.log('Condition result:', result)
    }
    
    return result
  }, [permissions.isLoading, evaluateConditions, debug])

  // Handle callbacks
  React.useEffect(() => {
    if (permissions.isLoading) return

    if (conditionMet) {
      onConditionMet?.()
    } else {
      onConditionNotMet?.('Condition not met')
    }
  }, [conditionMet, onConditionMet, onConditionNotMet, permissions.isLoading])

  // Enhanced loading state with context and timeout
  if (permissions.isLoading) {
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

  // Enhanced condition not met handling
  if (!conditionMet) {
    // Show error message if showError is true
    if (showError) {
      const message = errorMessage || 'Access condition not met'
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
        message={errorMessage || 'Access condition not met'}
        showDetails={showFallbackDetails}
        showActions={showFallbackActions}
        currentRole={permissions.user?.role}
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

  // Render children if condition met
  return <>{children}</>
}

/**
 * Pre-built condition functions for common use cases
 */

// Role-based conditions
export const RoleConditions = {
  isAdmin: (permissions: ReturnType<typeof usePermissions>) => permissions.isAdmin(),
  isEditor: (permissions: ReturnType<typeof usePermissions>) => permissions.isEditor(),
  isViewer: (permissions: ReturnType<typeof usePermissions>) => permissions.isViewer(),
  
  hasRole: (role: UserRole) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.hasRole(role),
  
  hasMinimumRole: (minimumRole: UserRole) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.hasMinimumRole(minimumRole),
  
  hasAnyRole: (roles: UserRole[]) => (permissions: ReturnType<typeof usePermissions>) => 
    roles.some(role => permissions.hasRole(role)),
}

// Permission-based conditions
export const PermissionConditions = {
  canAccess: (resource: string, action: string, scope?: string) => 
    (permissions: ReturnType<typeof usePermissions>) => 
      permissions.canAccess(resource, action, scope),
  
  canManage: (resource: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canManage(resource),
  
  canCreate: (resource: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canCreate(resource),
  
  canRead: (resource: string, scope?: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canRead(resource, scope),
  
  canUpdate: (resource: string, scope?: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canUpdate(resource, scope),
  
  canDelete: (resource: string, scope?: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canDelete(resource, scope),
  
  hasAllPermissions: (perms: Permission[]) => (permissions: ReturnType<typeof usePermissions>) => 
    perms.every(p => permissions.canAccess(p.resource, p.action, p.scope)),
  
  hasAnyPermission: (perms: Permission[]) => (permissions: ReturnType<typeof usePermissions>) => 
    perms.some(p => permissions.canAccess(p.resource, p.action, p.scope)),
}

// Resource-specific conditions
export const ResourceConditions = {
  // Product conditions
  canCreateProduct: (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canCreateProduct(),
  
  canReadProduct: (ownerId?: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canReadProduct(ownerId),
  
  canUpdateProduct: (ownerId?: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canUpdateProduct(ownerId),
  
  canDeleteProduct: (ownerId?: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canDeleteProduct(ownerId),
  
  // Category conditions
  canCreateCategory: (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canCreateCategory(),
  
  canUpdateCategory: (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canUpdateCategory(),
  
  canDeleteCategory: (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canDeleteCategory(),
  
  // Page conditions
  canCreatePage: (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canCreatePage(),
  
  canReadPage: (ownerId?: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canReadPage(ownerId),
  
  canUpdatePage: (ownerId?: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canUpdatePage(ownerId),
  
  canDeletePage: (ownerId?: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canDeletePage(ownerId),
  
  // Media conditions
  canCreateMedia: (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canCreateMedia(),
  
  canUpdateMedia: (ownerId?: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canUpdateMedia(ownerId),
  
  canDeleteMedia: (ownerId?: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canDeleteMedia(ownerId),
  
  // User conditions
  canCreateUser: (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canCreateUser(),
  
  canReadUser: (targetUserId?: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canReadUser(targetUserId),
  
  canUpdateUser: (targetUserId?: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canUpdateUser(targetUserId),
  
  canDeleteUser: (targetUserId?: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.canDeleteUser(targetUserId),
}

// Ownership conditions
export const OwnershipConditions = {
  isOwner: (resourceOwnerId: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.user?.id === resourceOwnerId,
  
  isOwnerOrAdmin: (resourceOwnerId: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.user?.id === resourceOwnerId || permissions.isAdmin(),
  
  isOwnerOrEditor: (resourceOwnerId: string) => (permissions: ReturnType<typeof usePermissions>) => 
    permissions.user?.id === resourceOwnerId || permissions.isEditor(),
}

// Authentication conditions
export const AuthConditions = {
  isAuthenticated: (permissions: ReturnType<typeof usePermissions>) => 
    permissions.isAuthenticated,
  
  isNotAuthenticated: (permissions: ReturnType<typeof usePermissions>) => 
    !permissions.isAuthenticated,
  
  hasUser: (permissions: ReturnType<typeof usePermissions>) => 
    !!permissions.user,
}

// Time-based conditions
export const TimeConditions = {
  isBusinessHours: () => {
    const now = new Date()
    const hour = now.getHours()
    return hour >= 9 && hour < 17 // 9 AM to 5 PM
  },
  
  isWeekday: () => {
    const now = new Date()
    const day = now.getDay()
    return day >= 1 && day <= 5 // Monday to Friday
  },
  
  isAfterDate: (date: Date) => () => new Date() > date,
  
  isBeforeDate: (date: Date) => () => new Date() < date,
}

/**
 * Specialized ConditionalRender components for common patterns
 */

// AND logic for multiple conditions
export interface AndConditionsProps extends Omit<ConditionalRenderProps, 'conditions' | 'operator'> {
  conditions: PermissionCondition[]
}

export function AndConditions({ conditions, ...props }: AndConditionsProps) {
  return <ConditionalRender {...props} conditions={conditions} operator="AND" />
}

// OR logic for multiple conditions
export interface OrConditionsProps extends Omit<ConditionalRenderProps, 'conditions' | 'operator'> {
  conditions: PermissionCondition[]
}

export function OrConditions({ conditions, ...props }: OrConditionsProps) {
  return <ConditionalRender {...props} conditions={conditions} operator="OR" />
}

// NOT logic for condition negation
export interface NotConditionProps extends Omit<ConditionalRenderProps, 'operator'> {
  // Inherits all props from ConditionalRenderProps except operator
}

export function NotCondition(props: NotConditionProps) {
  return <ConditionalRender {...props} operator="NOT" />
}

// Complex business logic conditions
export interface BusinessRuleProps extends Omit<ConditionalRenderProps, 'condition'> {
  rule: 'business_hours' | 'weekdays_only' | 'admin_or_owner' | 'editor_or_higher'
  resourceOwnerId?: string
}

export function BusinessRule({ rule, resourceOwnerId, ...props }: BusinessRuleProps) {
  const condition = React.useMemo((): PermissionCondition => {
    switch (rule) {
      case 'business_hours':
        return () => TimeConditions.isBusinessHours()
      
      case 'weekdays_only':
        return () => TimeConditions.isWeekday()
      
      case 'admin_or_owner':
        return (permissions) => 
          resourceOwnerId ? OwnershipConditions.isOwnerOrAdmin(resourceOwnerId)(permissions) : false
      
      case 'editor_or_higher':
        return RoleConditions.hasMinimumRole(UserRole.EDITOR)
      
      default:
        return () => false
    }
  }, [rule, resourceOwnerId])

  return <ConditionalRender {...props} condition={condition} />
}

// Feature flag conditional rendering
export interface FeatureToggleProps extends Omit<ConditionalRenderProps, 'condition'> {
  feature: string
  enabledFeatures?: string[]
}

export function FeatureToggle({ feature, enabledFeatures = [], ...props }: FeatureToggleProps) {
  const condition = React.useCallback(() => {
    return enabledFeatures.includes(feature)
  }, [feature, enabledFeatures])

  return <ConditionalRender {...props} condition={condition} />
}