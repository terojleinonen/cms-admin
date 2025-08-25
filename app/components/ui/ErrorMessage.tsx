/**
 * ErrorMessage Component
 * Reusable error message display component
 */

'use client'

import { ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface ErrorMessageProps {
  title?: string
  message: string
  details?: string
  onDismiss?: () => void
  className?: string
  variant?: 'error' | 'warning'
}

export default function ErrorMessage({
  title = 'Error',
  message,
  details,
  onDismiss,
  className = '',
  variant = 'error'
}: ErrorMessageProps) {
  const variantClasses = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  }
  
  const iconClasses = {
    error: 'text-red-400',
    warning: 'text-yellow-400'
  }

  return (
    <div className={`rounded-md border p-4 ${variantClasses[variant]} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationCircleIcon className={`h-5 w-5 ${iconClasses[variant]}`} />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <div className="mt-1 text-sm">
            <p>{message}</p>
            {details && (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">
                  Show details
                </summary>
                <pre className="mt-2 text-xs whitespace-pre-wrap bg-white bg-opacity-50 p-2 rounded">
                  {details}
                </pre>
              </details>
            )}
          </div>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className={`inline-flex rounded-md p-1.5 hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  variant === 'error' 
                    ? 'text-red-500 hover:bg-red-100 focus:ring-red-600' 
                    : 'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600'
                }`}
              >
                <span className="sr-only">Dismiss</span>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}