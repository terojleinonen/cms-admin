/**
 * Input Component
 * Reusable input component with validation states
 */

'use client'

import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  fullWidth?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, fullWidth = true, ...props }, ref) => {
    const baseClasses = 'block px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 sm:text-sm'
    const widthClasses = fullWidth ? 'w-full' : ''
    const stateClasses = error
      ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
    
    const classes = `${baseClasses} ${widthClasses} ${stateClasses} ${className}`.trim()

    return (
      <input
        ref={ref}
        className={classes}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export default Input