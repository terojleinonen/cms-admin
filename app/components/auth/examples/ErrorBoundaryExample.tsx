'use client'

/**
 * Error Boundary and Fallback Handling Examples
 * Demonstrates the usage of permission error boundaries and fallback UI
 */

import React, { useState } from 'react'
import { UserRole } from '@prisma/client'
import {
  RoleGuard,
  PermissionGate,
  ConditionalRender,
  PermissionErrorBoundary,
  PermissionLoadingState,
  UnauthorizedFallback,
  PermissionDeniedFallback,
  AuthenticationRequiredFallback,
  InlineUnauthorized,
  FeatureUnavailableFallback,
  usePermissionError
} from '../index'

// Example component that can throw permission errors
const ErrorThrowingComponent: React.FC<{ errorType: string }> = ({ errorType }) => {
  const { throwPermissionError, throwAuthenticationError } = usePermissionError()

  const handleClick = () => {
    switch (errorType) {
      case 'permission':
        throwPermissionError(
          'You do not have permission to access this feature',
          'PERMISSION_DENIED',
          {
            requiredPermission: 'products.create',
            userRole: 'VIEWER',
            resource: 'products'
          }
        )
        break
      case 'authentication':
        throwAuthenticationError(
          'Your session has expired. Please sign in again.',
          'SESSION_EXPIRED',
          '/auth/login'
        )
        break
      default:
        throw new Error('Something went wrong')
    }
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-medium mb-2">Error Throwing Component</h3>
      <p className="text-sm text-gray-600 mb-3">
        Click the button to trigger a {errorType} error
      </p>
      <button
        onClick={handleClick}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Trigger {errorType} Error
      </button>
    </div>
  )
}

// Loading state examples
const LoadingStateExamples: React.FC = () => {
  const [loadingType, setLoadingType] = useState<'authentication' | 'authorization' | 'permission' | 'role'>('authentication')

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Loading State Examples</h3>
      
      <div className="flex space-x-2 mb-4">
        {(['authentication', 'authorization', 'permission', 'role'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setLoadingType(type)}
            className={`px-3 py-1 rounded text-sm ${
              loadingType === type 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="border rounded-lg p-4">
        <PermissionLoadingState context={loadingType} />
      </div>
    </div>
  )
}

// Fallback UI examples
const FallbackUIExamples: React.FC = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Fallback UI Examples</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Permission Denied</h4>
          <PermissionDeniedFallback
            message="You need admin privileges to access this feature"
            showDetails={true}
            requiredPermission="admin.manage"
            currentRole={UserRole.VIEWER}
          />
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Authentication Required</h4>
          <AuthenticationRequiredFallback
            message="Please sign in to continue"
          />
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Feature Unavailable</h4>
          <FeatureUnavailableFallback
            featureName="Advanced Analytics"
            showUpgrade={true}
            onUpgrade={() => alert('Upgrade clicked!')}
          />
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Inline Unauthorized</h4>
          <div className="space-y-2">
            <InlineUnauthorized type="permission" />
            <InlineUnauthorized type="authentication" />
            <InlineUnauthorized type="role" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Role guard with error boundary example
const RoleGuardExample: React.FC = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Role Guard with Error Boundary</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Admin Only Content</h4>
          <RoleGuard 
            requiredRole={UserRole.ADMIN}
            showFallbackDetails={true}
            enableErrorBoundary={true}
          >
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800">This content is only visible to admins!</p>
            </div>
          </RoleGuard>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Editor or Higher</h4>
          <RoleGuard 
            minimumRole={UserRole.EDITOR}
            fallbackType="role"
            showFallbackActions={true}
          >
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-800">This content requires editor privileges!</p>
            </div>
          </RoleGuard>
        </div>
      </div>
    </div>
  )
}

// Permission gate example
const PermissionGateExample: React.FC = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Permission Gate Examples</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Create Products</h4>
          <PermissionGate 
            resource="products" 
            action="create"
            showFallbackDetails={true}
          >
            <div className="p-4 bg-purple-50 border border-purple-200 rounded">
              <p className="text-purple-800">Product creation form would be here!</p>
            </div>
          </PermissionGate>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Manage Users</h4>
          <PermissionGate 
            resource="users" 
            action="manage"
            fallbackType="permission"
          >
            <div className="p-4 bg-orange-50 border border-orange-200 rounded">
              <p className="text-orange-800">User management interface!</p>
            </div>
          </PermissionGate>
        </div>
      </div>
    </div>
  )
}

// Error boundary examples
const ErrorBoundaryExamples: React.FC = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Error Boundary Examples</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Permission Error</h4>
          <PermissionErrorBoundary showErrorDetails={true}>
            <ErrorThrowingComponent errorType="permission" />
          </PermissionErrorBoundary>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Authentication Error</h4>
          <PermissionErrorBoundary>
            <ErrorThrowingComponent errorType="authentication" />
          </PermissionErrorBoundary>
        </div>
      </div>
    </div>
  )
}

// Main example component
export default function ErrorBoundaryExample() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Permission Error Boundary & Fallback Examples
        </h1>
        <p className="text-gray-600">
          Comprehensive examples of error handling and fallback UI for permission systems
        </p>
      </div>

      <LoadingStateExamples />
      <FallbackUIExamples />
      <RoleGuardExample />
      <PermissionGateExample />
      <ErrorBoundaryExamples />

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">Key Features Demonstrated</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• <strong>Error Boundaries:</strong> Graceful error handling for permission failures</li>
          <li>• <strong>Loading States:</strong> Context-aware loading indicators for different permission checks</li>
          <li>• <strong>Fallback UI:</strong> User-friendly unauthorized access messages with actions</li>
          <li>• <strong>Role Guards:</strong> Component-level access control with enhanced error handling</li>
          <li>• <strong>Permission Gates:</strong> Granular permission checking with detailed feedback</li>
          <li>• <strong>Accessibility:</strong> Proper ARIA attributes and screen reader support</li>
        </ul>
      </div>
    </div>
  )
}