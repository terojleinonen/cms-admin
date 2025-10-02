'use client'

/**
 * UnauthorizedFallback Component
 * Specialized fallback UI components for unauthorized access scenarios
 */

import React from 'react'
import { 
  ShieldExclamationIcon, 
  LockClosedIcon, 
  UserIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  HomeIcon
} from '@heroicons/react/24/outline'
import Button from '../ui/Button'
import { UserRole } from '@prisma/client'

export interface UnauthorizedFallbackProps {
  title?: string
  message?: string
  type?: 'permission' | 'role' | 'authentication' | 'resource' | 'generic'
  showActions?: boolean
  showDetails?: boolean
  className?: string
  requiredRole?: UserRole
  requiredPermission?: string
  currentRole?: UserRole
  resourceType?: string
  onGoBack?: () => void
  onGoHome?: () => void
  onLogin?: () => void
  onContactSupport?: () => void
  customActions?: React.ReactNode
}

/**
 * Main unauthorized fallback component
 */
export default function UnauthorizedFallback({
  title,
  message,
  type = 'generic',
  showActions = true,
  showDetails = false,
  className = '',
  requiredRole,
  requiredPermission,
  currentRole,
  resourceType,
  onGoBack,
  onGoHome,
  onLogin,
  onContactSupport,
  customActions,
}: UnauthorizedFallbackProps) {
  // Type-specific configurations
  const typeConfig = React.useMemo(() => {
    switch (type) {
      case 'permission':
        return {
          icon: ShieldExclamationIcon,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          defaultTitle: 'Permission Denied',
          defaultMessage: 'You do not have the required permissions to access this resource.',
        }
      case 'role':
        return {
          icon: UserIcon,
          iconColor: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          defaultTitle: 'Insufficient Role',
          defaultMessage: 'Your current role does not allow access to this feature.',
        }
      case 'authentication':
        return {
          icon: LockClosedIcon,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          defaultTitle: 'Authentication Required',
          defaultMessage: 'Please sign in to access this resource.',
        }
      case 'resource':
        return {
          icon: ExclamationTriangleIcon,
          iconColor: 'text-orange-500',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          defaultTitle: 'Resource Access Denied',
          defaultMessage: 'You do not have access to this specific resource.',
        }
      default:
        return {
          icon: ShieldExclamationIcon,
          iconColor: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          defaultTitle: 'Access Denied',
          defaultMessage: 'You are not authorized to access this content.',
        }
    }
  }, [type])

  const Icon = typeConfig.icon
  const displayTitle = title || typeConfig.defaultTitle
  const displayMessage = message || typeConfig.defaultMessage

  // Default action handlers
  const handleGoBack = onGoBack || (() => window.history.back())
  const handleGoHome = onGoHome || (() => window.location.href = '/')
  const handleLogin = onLogin || (() => window.location.href = '/auth/login')
  const handleContactSupport = onContactSupport || (() => window.location.href = '/support')

  return (
    <div className={`min-h-[300px] flex items-center justify-center p-6 ${className}`}>
      <div className={`max-w-md w-full rounded-lg border p-6 ${typeConfig.bgColor} ${typeConfig.borderColor}`}>
        <div className="text-center">
          <Icon className={`h-16 w-16 mx-auto mb-4 ${typeConfig.iconColor}`} />
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {displayTitle}
          </h2>
          
          <p className="text-gray-600 mb-4">
            {displayMessage}
          </p>

          {showDetails && (
            <div className="text-left bg-white bg-opacity-50 p-4 rounded-lg mb-4 text-sm space-y-2">
              {requiredRole && (
                <div>
                  <strong>Required Role:</strong> {requiredRole}
                </div>
              )}
              {currentRole && (
                <div>
                  <strong>Current Role:</strong> {currentRole}
                </div>
              )}
              {requiredPermission && (
                <div>
                  <strong>Required Permission:</strong> {requiredPermission}
                </div>
              )}
              {resourceType && (
                <div>
                  <strong>Resource Type:</strong> {resourceType}
                </div>
              )}
            </div>
          )}

          {showActions && (
            <div className="space-y-3">
              {customActions || (
                <>
                  {type === 'authentication' ? (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button onClick={handleLogin}>
                        Sign In
                      </Button>
                      <Button variant="outline" onClick={handleGoBack}>
                        <ArrowLeftIcon className="h-4 w-4 mr-2" />
                        Go Back
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button variant="outline" onClick={handleGoBack}>
                        <ArrowLeftIcon className="h-4 w-4 mr-2" />
                        Go Back
                      </Button>
                      <Button onClick={handleGoHome}>
                        <HomeIcon className="h-4 w-4 mr-2" />
                        Dashboard
                      </Button>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleContactSupport}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Contact Support
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Specialized fallback components for specific scenarios
 */

// Permission denied fallback
export interface PermissionDeniedFallbackProps extends Omit<UnauthorizedFallbackProps, 'type'> {}

export function PermissionDeniedFallback(props: PermissionDeniedFallbackProps) {
  return <UnauthorizedFallback {...props} type="permission" />
}

// Role insufficient fallback
export interface RoleInsufficientFallbackProps extends Omit<UnauthorizedFallbackProps, 'type'> {}

export function RoleInsufficientFallback(props: RoleInsufficientFallbackProps) {
  return <UnauthorizedFallback {...props} type="role" />
}

// Authentication required fallback
export interface AuthenticationRequiredFallbackProps extends Omit<UnauthorizedFallbackProps, 'type'> {}

export function AuthenticationRequiredFallback(props: AuthenticationRequiredFallbackProps) {
  return <UnauthorizedFallback {...props} type="authentication" />
}

// Resource access denied fallback
export interface ResourceAccessDeniedFallbackProps extends Omit<UnauthorizedFallbackProps, 'type'> {}

export function ResourceAccessDeniedFallback(props: ResourceAccessDeniedFallbackProps) {
  return <UnauthorizedFallback {...props} type="resource" />
}

/**
 * Inline unauthorized message for smaller spaces
 */

export interface InlineUnauthorizedProps {
  message?: string
  type?: UnauthorizedFallbackProps['type']
  showIcon?: boolean
  className?: string
}

export function InlineUnauthorized({
  message = 'Access denied',
  type = 'generic',
  showIcon = true,
  className = ''
}: InlineUnauthorizedProps) {
  const typeConfig = React.useMemo(() => {
    switch (type) {
      case 'permission':
        return { icon: ShieldExclamationIcon, color: 'text-red-600 bg-red-50' }
      case 'role':
        return { icon: UserIcon, color: 'text-yellow-600 bg-yellow-50' }
      case 'authentication':
        return { icon: LockClosedIcon, color: 'text-blue-600 bg-blue-50' }
      case 'resource':
        return { icon: ExclamationTriangleIcon, color: 'text-orange-600 bg-orange-50' }
      default:
        return { icon: ShieldExclamationIcon, color: 'text-gray-600 bg-gray-50' }
    }
  }, [type])

  const Icon = typeConfig.icon

  return (
    <div className={`inline-flex items-center px-3 py-2 rounded-md text-sm ${typeConfig.color} ${className}`}>
      {showIcon && <Icon className="h-4 w-4 mr-2" />}
      <span>{message}</span>
    </div>
  )
}

/**
 * Minimal unauthorized placeholder for tight spaces
 */

export interface UnauthorizedPlaceholderProps {
  height?: string
  message?: string
  className?: string
}

export function UnauthorizedPlaceholder({
  height = 'h-32',
  message = 'Access restricted',
  className = ''
}: UnauthorizedPlaceholderProps) {
  return (
    <div className={`${height} flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg ${className}`}>
      <div className="text-center text-gray-500">
        <LockClosedIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  )
}

/**
 * Feature unavailable fallback for disabled features
 */

export interface FeatureUnavailableFallbackProps {
  featureName?: string
  message?: string
  showUpgrade?: boolean
  onUpgrade?: () => void
  className?: string
}

export function FeatureUnavailableFallback({
  featureName = 'This feature',
  message,
  showUpgrade = false,
  onUpgrade,
  className = ''
}: FeatureUnavailableFallbackProps) {
  const displayMessage = message || `${featureName} is not available with your current permissions.`

  return (
    <div className={`text-center py-8 px-4 ${className}`}>
      <div className="max-w-sm mx-auto">
        <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <LockClosedIcon className="h-8 w-8 text-gray-400" />
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Feature Unavailable
        </h3>
        
        <p className="text-gray-600 mb-4">
          {displayMessage}
        </p>

        {showUpgrade && onUpgrade && (
          <Button onClick={onUpgrade}>
            Upgrade Access
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Coming soon fallback for features under development
 */

export interface ComingSoonFallbackProps {
  featureName?: string
  message?: string
  estimatedDate?: string
  className?: string
}

export function ComingSoonFallback({
  featureName = 'This feature',
  message,
  estimatedDate,
  className = ''
}: ComingSoonFallbackProps) {
  const displayMessage = message || `${featureName} is coming soon!`

  return (
    <div className={`text-center py-8 px-4 ${className}`}>
      <div className="max-w-sm mx-auto">
        <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <ExclamationTriangleIcon className="h-8 w-8 text-blue-500" />
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Coming Soon
        </h3>
        
        <p className="text-gray-600 mb-2">
          {displayMessage}
        </p>

        {estimatedDate && (
          <p className="text-sm text-gray-500">
            Expected: {estimatedDate}
          </p>
        )}
      </div>
    </div>
  )
}