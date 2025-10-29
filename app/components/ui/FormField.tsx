/**
 * FormField Component
 * Reusable form field wrapper with validation and error handling
 */

'use client'

import { ReactNode } from 'react'
import { ExclamationCircleIcon } from './Icons'

interface FormFieldProps {
  label?: string
  name: string
  error?: string | string[]
  required?: boolean
  helpText?: string
  children: ReactNode
  className?: string
}

export default function FormField({
  label,
  name,
  error,
  required,
  helpText,
  children,
  className = ''
}: FormFieldProps) {
  const hasError = error && (Array.isArray(error) ? error.length > 0 : error.length > 0)
  const errorMessages = Array.isArray(error) ? error : error ? [error] : []

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {children}
        {hasError && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>

      {hasError && (
        <div className="space-y-1">
          {errorMessages.map((message, index) => (
            <p key={index} className="text-sm text-red-600 flex items-center">
              <ExclamationCircleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
              {message}
            </p>
          ))}
        </div>
      )}

      {helpText && !hasError && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  )
}