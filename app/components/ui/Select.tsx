/**
 * Select Component
 * Reusable select component with validation states
 */

'use client'

import { forwardRef, SelectHTMLAttributes } from 'react'
import { ChevronDownIcon } from './Icons'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[]
  error?: boolean
  fullWidth?: boolean
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, fullWidth = true, options, placeholder, ...props }, ref) => {
    const baseClasses = 'block px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm appearance-none bg-white'
    const widthClasses = fullWidth ? 'w-full' : ''
    const stateClasses = error
      ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
    
    const classes = `${baseClasses} ${widthClasses} ${stateClasses} ${className}`.trim()

    return (
      <div className="relative">
        <select
          ref={ref}
          className={classes}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select