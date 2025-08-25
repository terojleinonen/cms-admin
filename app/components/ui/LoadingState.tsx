/**
 * LoadingState Component
 * Full-page or section loading state with spinner and message
 */

'use client'

import LoadingSpinner from './LoadingSpinner'

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fullPage?: boolean
  className?: string
}

export default function LoadingState({ 
  message = 'Loading...', 
  size = 'lg',
  fullPage = false,
  className = ''
}: LoadingStateProps) {
  const containerClasses = fullPage 
    ? 'fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50'
    : 'flex items-center justify-center py-12'

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="text-center">
        <LoadingSpinner size={size} className="mx-auto mb-4" />
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  )
}