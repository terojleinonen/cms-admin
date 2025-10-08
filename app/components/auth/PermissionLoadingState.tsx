'use client'

/**
 * PermissionLoadingState Component
 * Specialized loading states for permission checks with different contexts
 */

import React from 'react'
import { ShieldCheckIcon, UserIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { LoadingSpinner } from '../ui/LoadingSpinner'

export interface PermissionLoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fullPage?: boolean
  className?: string
  context?: 'authentication' | 'authorization' | 'permission' | 'role' | 'generic'
  showIcon?: boolean
  timeout?: number
  onTimeout?: () => void
}

/**
 * Main permission loading state component
 */
export default function PermissionLoadingState({ 
  message,
  size = 'md',
  fullPage = false,
  className = '',
  context = 'generic',
  showIcon = true,
  timeout,
  onTimeout,
}: PermissionLoadingStateProps) {
  // Handle timeout
  React.useEffect(() => {
    if (timeout && onTimeout) {
      const timer = setTimeout(onTimeout, timeout)
      return () => clearTimeout(timer)
    }
  }, [timeout, onTimeout])

  // Context-specific configurations
  const contextConfig = React.useMemo(() => {
    switch (context) {
      case 'authentication':
        return {
          icon: UserIcon,
          defaultMessage: 'Verifying authentication...',
          iconColor: 'text-blue-500',
          spinnerColor: 'blue' as const,
        }
      case 'authorization':
        return {
          icon: LockClosedIcon,
          defaultMessage: 'Checking authorization...',
          iconColor: 'text-yellow-500',
          spinnerColor: 'blue' as const,
        }
      case 'permission':
        return {
          icon: ShieldCheckIcon,
          defaultMessage: 'Validating permissions...',
          iconColor: 'text-green-500',
          spinnerColor: 'blue' as const,
        }
      case 'role':
        return {
          icon: UserIcon,
          defaultMessage: 'Loading user role...',
          iconColor: 'text-purple-500',
          spinnerColor: 'blue' as const,
        }
      default:
        return {
          icon: ShieldCheckIcon,
          defaultMessage: 'Loading...',
          iconColor: 'text-gray-500',
          spinnerColor: 'blue' as const,
        }
    }
  }, [context])

  const Icon = contextConfig.icon
  const displayMessage = message || contextConfig.defaultMessage

  const containerClasses = fullPage 
    ? 'fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50'
    : 'flex items-center justify-center py-8'

  return (
    <div className={`${containerClasses} ${className}`} role="status" aria-live="polite">
      <div className="text-center">
        <div className="flex items-center justify-center mb-3">
          <LoadingSpinner size={size} color={contextConfig.spinnerColor} className="mr-3" />
          {showIcon && (
            <Icon className={`h-6 w-6 ${contextConfig.iconColor}`} />
          )}
        </div>
        <p className="text-gray-600 text-sm font-medium">{displayMessage}</p>
      </div>
    </div>
  )
}

/**
 * Specialized loading components for different contexts
 */

// Authentication loading
export interface AuthenticationLoadingProps extends Omit<PermissionLoadingStateProps, 'context'> {}

export function AuthenticationLoading(props: AuthenticationLoadingProps) {
  return <PermissionLoadingState {...props} context="authentication" />
}

// Authorization loading
export interface AuthorizationLoadingProps extends Omit<PermissionLoadingStateProps, 'context'> {}

export function AuthorizationLoading(props: AuthorizationLoadingProps) {
  return <PermissionLoadingState {...props} context="authorization" />
}

// Permission validation loading
export interface PermissionValidationLoadingProps extends Omit<PermissionLoadingStateProps, 'context'> {}

export function PermissionValidationLoading(props: PermissionValidationLoadingProps) {
  return <PermissionLoadingState {...props} context="permission" />
}

// Role loading
export interface RoleLoadingProps extends Omit<PermissionLoadingStateProps, 'context'> {}

export function RoleLoading(props: RoleLoadingProps) {
  return <PermissionLoadingState {...props} context="role" />
}

/**
 * Inline loading states for smaller components
 */

export interface InlinePermissionLoadingProps {
  message?: string
  className?: string
  context?: PermissionLoadingStateProps['context']
}

export function InlinePermissionLoading({ 
  message = 'Loading...', 
  className = '',
  context = 'generic'
}: InlinePermissionLoadingProps) {
  const contextConfig = React.useMemo(() => {
    switch (context) {
      case 'authentication':
        return { iconColor: 'text-blue-500' }
      case 'authorization':
        return { iconColor: 'text-yellow-500' }
      case 'permission':
        return { iconColor: 'text-green-500' }
      case 'role':
        return { iconColor: 'text-purple-500' }
      default:
        return { iconColor: 'text-gray-500' }
    }
  }, [context])

  return (
    <div className={`flex items-center space-x-2 ${className}`} role="status" aria-live="polite">
      <LoadingSpinner size="sm" />
      <span className={`text-sm ${contextConfig.iconColor}`}>{message}</span>
    </div>
  )
}

/**
 * Skeleton loading states for permission-gated content
 */

export interface PermissionSkeletonProps {
  lines?: number
  className?: string
  showAvatar?: boolean
  showButton?: boolean
}

export function PermissionSkeleton({ 
  lines = 3, 
  className = '',
  showAvatar = false,
  showButton = false
}: PermissionSkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`} role="status" aria-live="polite">
      <div className="flex items-start space-x-4">
        {showAvatar && (
          <div className="rounded-full bg-gray-200 h-10 w-10"></div>
        )}
        <div className="flex-1 space-y-2">
          {Array.from({ length: lines }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              {index === lines - 1 && (
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              )}
            </div>
          ))}
          {showButton && (
            <div className="h-8 bg-gray-200 rounded w-24 mt-4"></div>
          )}
        </div>
      </div>
      <span className="sr-only">Loading permission-gated content...</span>
    </div>
  )
}

/**
 * Progressive loading component that shows different states
 */

export interface ProgressivePermissionLoadingProps {
  stage: 'authentication' | 'authorization' | 'permission' | 'content'
  className?: string
}

export function ProgressivePermissionLoading({ 
  stage, 
  className = '' 
}: ProgressivePermissionLoadingProps) {
  const stages = [
    { key: 'authentication', label: 'Authenticating user', icon: UserIcon },
    { key: 'authorization', label: 'Checking authorization', icon: LockClosedIcon },
    { key: 'permission', label: 'Validating permissions', icon: ShieldCheckIcon },
    { key: 'content', label: 'Loading content', icon: ShieldCheckIcon },
  ]

  const currentStageIndex = stages.findIndex(s => s.key === stage)

  return (
    <div className={`py-8 ${className}`} role="status" aria-live="polite">
      <div className="max-w-md mx-auto">
        <div className="space-y-4">
          {stages.map((stageItem, index) => {
            const Icon = stageItem.icon
            const isActive = index === currentStageIndex
            const isCompleted = index < currentStageIndex
            const isPending = index > currentStageIndex

            return (
              <div key={stageItem.key} className="flex items-center space-x-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted 
                    ? 'bg-green-100 text-green-600' 
                    : isActive 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : isActive ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  isCompleted 
                    ? 'text-green-600' 
                    : isActive 
                    ? 'text-blue-600' 
                    : 'text-gray-400'
                }`}>
                  {stageItem.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Timeout loading component that shows a message after a delay
 */

export interface TimeoutPermissionLoadingProps extends PermissionLoadingStateProps {
  timeoutMessage?: string
  timeoutDuration?: number
}

export function TimeoutPermissionLoading({
  timeoutMessage = 'This is taking longer than expected...',
  timeoutDuration = 5000,
  ...props
}: TimeoutPermissionLoadingProps) {
  const [showTimeout, setShowTimeout] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimeout(true)
    }, timeoutDuration)

    return () => clearTimeout(timer)
  }, [timeoutDuration])

  return (
    <div>
      <PermissionLoadingState {...props} />
      {showTimeout && (
        <div className="mt-4 text-center">
          <p className="text-sm text-yellow-600 bg-yellow-50 px-4 py-2 rounded-md inline-block">
            {timeoutMessage}
          </p>
        </div>
      )}
    </div>
  )
}