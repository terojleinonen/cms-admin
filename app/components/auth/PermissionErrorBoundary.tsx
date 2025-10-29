'use client'

/**
 * PermissionErrorBoundary Component
 * Specialized error boundary for permission-related errors with graceful fallbacks
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ShieldExclamationIcon, ExclamationTriangleIcon } from '../ui/Icons'
import Button from '../ui/Button'
import { ErrorMessage } from '../ui/ErrorMessage'

// Permission-specific error types
export class PermissionError extends Error {
  constructor(
    message: string,
    public code: 'PERMISSION_DENIED' | 'INSUFFICIENT_ROLE' | 'RESOURCE_NOT_FOUND' | 'PERMISSION_CHECK_FAILED',
    public requiredPermission?: string,
    public userRole?: string,
    public resource?: string
  ) {
    super(message)
    this.name = 'PermissionError'
  }
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: 'NOT_AUTHENTICATED' | 'SESSION_EXPIRED' | 'INVALID_TOKEN',
    public redirectUrl?: string
  ) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showErrorDetails?: boolean
  enableRetry?: boolean
  enableRefresh?: boolean
  customErrorHandler?: (error: Error) => ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  retryCount: number
}

export default class PermissionErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false, 
      retryCount: 0 
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PermissionErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({ errorInfo })
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log permission errors for monitoring
    if (error instanceof PermissionError || error instanceof AuthenticationError) {
      this.logPermissionError(error, errorInfo)
    }
  }

  private logPermissionError = (error: PermissionError | AuthenticationError, errorInfo: ErrorInfo) => {
    // In a real application, this would send to your logging service
    const logData = {
      type: error.name,
      code: error.code,
      message: error.message,
      timestamp: new Date().toISOString(),
      componentStack: errorInfo.componentStack,
      ...(error instanceof PermissionError && {
        requiredPermission: error.requiredPermission,
        userRole: error.userRole,
        resource: error.resource,
      }),
      ...(error instanceof AuthenticationError && {
        redirectUrl: error.redirectUrl,
      }),
    }

    console.warn('Permission Error Logged:', logData)
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({ 
        hasError: false, 
        error: undefined, 
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1 
      }))
    }
  }

  handleRefresh = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: 0 
    })
  }

  renderPermissionError = (error: PermissionError) => {
    const { showErrorDetails = false } = this.props

    return (
      <div className="min-h-[300px] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <ShieldExclamationIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            {error.message || 'You do not have permission to access this resource.'}
          </p>
          
          {showErrorDetails && (
            <div className="text-left bg-red-50 p-4 rounded-lg mb-4 text-sm">
              <div className="space-y-1">
                <div><strong>Error Code:</strong> {error.code}</div>
                {error.requiredPermission && (
                  <div><strong>Required Permission:</strong> {error.requiredPermission}</div>
                )}
                {error.userRole && (
                  <div><strong>Current Role:</strong> {error.userRole}</div>
                )}
                {error.resource && (
                  <div><strong>Resource:</strong> {error.resource}</div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
            <Button 
              onClick={() => window.location.href = '/'}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  renderAuthenticationError = (error: AuthenticationError) => {
    return (
      <div className="min-h-[300px] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <ShieldExclamationIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">
            {error.message || 'Please sign in to access this resource.'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => window.location.href = error.redirectUrl || '/auth/login'}
            >
              Sign In
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  renderGenericError = (error: Error) => {
    const { showErrorDetails = false, enableRetry = true, enableRefresh = true } = this.props
    const canRetry = enableRetry && this.state.retryCount < this.maxRetries

    return (
      <div className="min-h-[300px] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">
            An unexpected error occurred while checking permissions. Please try again.
          </p>
          
          {showErrorDetails && process.env.NODE_ENV === 'development' && (
            <details className="text-left bg-gray-100 p-4 rounded-lg mb-4">
              <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                Error Details
              </summary>
              <pre className="text-xs text-red-600 whitespace-pre-wrap">
                {error.stack}
              </pre>
              {this.state.errorInfo && (
                <pre className="text-xs text-gray-600 whitespace-pre-wrap mt-2">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </details>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {canRetry && (
              <Button onClick={this.handleRetry}>
                Try Again ({this.maxRetries - this.state.retryCount} left)
              </Button>
            )}
            {enableRefresh && (
              <Button 
                variant="outline" 
                onClick={this.handleRefresh}
              >
                Refresh Page
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={this.handleReset}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    )
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom error handler if provided
      if (this.props.customErrorHandler) {
        return this.props.customErrorHandler(this.state.error)
      }

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Handle specific error types
      if (this.state.error instanceof PermissionError) {
        return this.renderPermissionError(this.state.error)
      }

      if (this.state.error instanceof AuthenticationError) {
        return this.renderAuthenticationError(this.state.error)
      }

      // Handle generic errors
      return this.renderGenericError(this.state.error)
    }

    return this.props.children
  }
}

/**
 * Higher-order component for wrapping components with permission error boundary
 */
export function withPermissionErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <PermissionErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </PermissionErrorBoundary>
  )

  WrappedComponent.displayName = `withPermissionErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Hook for throwing permission errors that will be caught by the error boundary
 */
export function usePermissionError() {
  const throwPermissionError = React.useCallback((
    message: string,
    code: PermissionError['code'] = 'PERMISSION_DENIED',
    details?: {
      requiredPermission?: string
      userRole?: string
      resource?: string
    }
  ) => {
    throw new PermissionError(
      message,
      code,
      details?.requiredPermission,
      details?.userRole,
      details?.resource
    )
  }, [])

  const throwAuthenticationError = React.useCallback((
    message: string,
    code: AuthenticationError['code'] = 'NOT_AUTHENTICATED',
    redirectUrl?: string
  ) => {
    throw new AuthenticationError(message, code, redirectUrl)
  }, [])

  return {
    throwPermissionError,
    throwAuthenticationError,
  }
}