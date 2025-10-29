/**
 * Custom Form Components
 * Lightweight replacements for Headless UI form components
 * Built with Tailwind CSS and native React
 */

'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { ChevronDownIcon, CheckIcon } from './Icons'

// Switch Component
interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Switch({ 
  checked, 
  onChange, 
  label, 
  disabled = false, 
  size = 'md',
  className = '' 
}: SwitchProps) {
  const sizeClasses = {
    sm: 'h-4 w-7',
    md: 'h-5 w-9',
    lg: 'h-6 w-11'
  }

  const thumbSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  const translateClasses = {
    sm: checked ? 'translate-x-3' : 'translate-x-0',
    md: checked ? 'translate-x-4' : 'translate-x-0',
    lg: checked ? 'translate-x-5' : 'translate-x-0'
  }

  return (
    <label className={`flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex ${sizeClasses[size]} items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${checked 
            ? disabled 
              ? 'bg-gray-300' 
              : 'bg-blue-600' 
            : disabled 
              ? 'bg-gray-200' 
              : 'bg-gray-300'
          }
        `}
      >
        <span
          className={`
            ${thumbSizeClasses[size]} inline-block transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out
            ${translateClasses[size]}
          `}
        />
      </button>
      {label && (
        <span className={`ml-3 text-sm ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>
          {label}
        </span>
      )}
    </label>
  )
}

// Select Component
interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  error?: string
}

export function Select({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  error
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(option => option.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          relative w-full cursor-default rounded-md border py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm
          ${error 
            ? 'border-red-300 text-red-900' 
            : 'border-gray-300 text-gray-900'
          }
          ${disabled 
            ? 'bg-gray-50 text-gray-500 cursor-not-allowed' 
            : 'bg-white hover:border-gray-400'
          }
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="block truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDownIcon 
            className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true" 
          />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              onClick={() => !option.disabled && handleSelect(option.value)}
              className={`
                relative w-full cursor-default select-none py-2 pl-3 pr-9 text-left
                ${option.value === value
                  ? 'bg-blue-600 text-white'
                  : option.disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-900 hover:bg-gray-100'
                }
              `}
            >
              <span className={`block truncate ${option.value === value ? 'font-medium' : 'font-normal'}`}>
                {option.label}
              </span>
              {option.value === value && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-white">
                  <CheckIcon className="h-5 w-5" aria-hidden="true" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

// Menu Component (Dropdown)
interface MenuItemProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

function MenuItem({ children, onClick, disabled = false, className = '' }: MenuItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        block w-full px-4 py-2 text-left text-sm transition-colors duration-150
        ${disabled 
          ? 'text-gray-400 cursor-not-allowed' 
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }
        ${className}
      `}
    >
      {children}
    </button>
  )
}

interface MenuProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function Menu({ trigger, children, align = 'right', className = '' }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0'
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {isOpen && (
        <div className={`
          absolute z-10 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none
          ${alignmentClasses[align]}
        `}>
          <div className="py-1">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

// Combobox Component (Searchable Select)
interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
}

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  error?: string
  searchable?: boolean
}

export function Combobox({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Search and select...',
  disabled = false,
  className = '',
  error,
  searchable = true
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const comboboxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find(option => option.value === value)

  const filteredOptions = searchable && query
    ? options.filter(option =>
        option.label.toLowerCase().includes(query.toLowerCase())
      )
    : options

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setQuery('')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    if (!isOpen) setIsOpen(true)
  }

  const displayValue = isOpen && searchable ? query : (selectedOption?.label || '')

  return (
    <div className={`relative ${className}`} ref={comboboxRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={placeholder}
          className={`
            w-full rounded-md border py-2 pl-3 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm
            ${error 
              ? 'border-red-300 text-red-900' 
              : 'border-gray-300 text-gray-900'
            }
            ${disabled 
              ? 'bg-gray-50 text-gray-500 cursor-not-allowed' 
              : 'bg-white'
            }
          `}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="absolute inset-y-0 right-0 flex items-center pr-2"
        >
          <ChevronDownIcon 
            className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true" 
          />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {filteredOptions.length === 0 ? (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
              No options found.
            </div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => !option.disabled && handleSelect(option.value)}
                className={`
                  relative w-full cursor-default select-none py-2 pl-3 pr-9 text-left
                  ${option.value === value
                    ? 'bg-blue-600 text-white'
                    : option.disabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <span className={`block truncate ${option.value === value ? 'font-medium' : 'font-normal'}`}>
                  {option.label}
                </span>
                {option.value === value && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-white">
                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

// Export MenuItem for use with Menu
Menu.Item = MenuItem

// Export all components
export { MenuItem }