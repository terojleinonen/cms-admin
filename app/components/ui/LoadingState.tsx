/**
 * Consolidated Loading Components
 * Unified loading indicators with different sizes and states
 */

'use client'

import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  color?: 'blue' | 'gray' | 'white'
}

export function LoadingSpinner({ 
  size = 'md', 
  className = '',
  color = 'blue'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  }

  const colorClasses = {
    blue: 'border-gray-300 border-t-blue-600',
    gray: 'border-gray-300 border-t-gray-600',
    white: 'border-gray-600 border-t-white',
  }

  return (
    <div 
      className={`animate-spin rounded-full border-2 ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fullPage?: boolean
  className?: string
  showSpinner?: boolean
}

export default function LoadingState({ 
  message = 'Loading...', 
  size = 'lg',
  fullPage = false,
  className = '',
  showSpinner = true
}: LoadingStateProps) {
  const containerClasses = fullPage 
    ? 'fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50'
    : 'flex items-center justify-center py-12'

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="text-center">
        {showSpinner && <LoadingSpinner size={size} className="mx-auto mb-4" />}
        {message && <p className="text-gray-600 text-sm">{message}</p>}
      </div>
    </div>
  )
}

// Inline loading component for buttons and small spaces
export function InlineLoading({ 
  size = 'sm', 
  className = '' 
}: { 
  size?: 'sm' | 'md'
  className?: string 
}) {
  return (
    <LoadingSpinner 
      size={size} 
      className={`inline-block ${className}`}
    />
  )
}

// Loading overlay for forms and content areas
export function LoadingOverlay({ 
  message = 'Loading...', 
  className = '' 
}: { 
  message?: string
  className?: string 
}) {
  return (
    <div className={`absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center ${className}`}>
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-2" />
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  )
}