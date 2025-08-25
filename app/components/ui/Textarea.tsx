/**
 * Textarea Component
 * Reusable textarea component with validation states
 */

'use client'

import { forwardRef, TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  fullWidth?: boolean
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, fullWidth = true, resize = 'vertical', ...props }, ref) => {
    const baseClasses = 'block px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 sm:text-sm'
    const widthClasses = fullWidth ? 'w-full' : ''
    const resizeClasses = `resize-${resize}`
    const stateClasses = error
      ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
    
    const classes = `${baseClasses} ${widthClasses} ${resizeClasses} ${stateClasses} ${className}`.trim()

    return (
      <textarea
        ref={ref}
        className={classes}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'

export default Textarea