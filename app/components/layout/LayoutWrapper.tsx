/**
 * Layout wrapper component
 * Handles switching between auth layout and admin layout based on route
 * Includes error boundaries and fallback UI
 */

'use client'

import { usePathname } from 'next/navigation'
import AdminLayout from './AdminLayout'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { Suspense } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts'

interface LayoutWrapperProps {
  children: React.ReactNode
}

// Loading fallback for auth pages
function AuthLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

// Loading fallback for admin pages
function AdminLoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar skeleton */}
        <div className="w-64 bg-white shadow-sm">
          <div className="p-6">
            <div className="h-8 bg-gray-200 rounded animate-pulse mb-6"></div>
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-6 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Main content skeleton */}
        <div className="flex-1 p-8">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6 animate-pulse"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Error fallback for auth pages
function AuthErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Authentication Error
        </h1>
        <p className="text-gray-600 mb-6">
          There was a problem with the authentication system. Please try refreshing the page.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Refresh Page
        </button>
      </div>
    </div>
  )
}

// Error fallback for admin pages
function AdminErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Application Error
        </h1>
        <p className="text-gray-600 mb-6">
          There was a problem loading the admin interface. Please try refreshing the page or contact support.
        </p>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh Page
          </button>
          <button
            type="button"
            onClick={() => window.location.href = '/'}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname()
  
  // Use simple layout for auth pages
  if (pathname.startsWith('/auth/')) {
    return (
      <ErrorBoundary fallback={<AuthErrorFallback />}>
        <Suspense fallback={<AuthLoadingFallback />}>
          <div className="min-h-screen">
            {children}
          </div>
        </Suspense>
      </ErrorBoundary>
    )
  }
  
  // Use admin layout for all other pages
  return (
    <ErrorBoundary fallback={<AdminErrorFallback />}>
      <Suspense fallback={<AdminLoadingFallback />}>
        <AdminLayout>
          {children}
        </AdminLayout>
        <KeyboardShortcuts />
      </Suspense>
    </ErrorBoundary>
  )
}