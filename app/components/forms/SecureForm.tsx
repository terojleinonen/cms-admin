'use client'

/**
 * Secure Form Component
 * Provides comprehensive form security with validation, sanitization, and CSRF protection
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { z } from 'zod'
import { 
  SecureFormHandler, 
  SecureFormConfig, 
  FormValidationResult,
  FormSecurityMonitor 
} from '../../lib/secure-form-utils'
import { ClientCSRFManager } from '../../lib/client-security'

interface SecureFormProps {
  schema: z.ZodSchema<any>
  onSubmit: (data: any) => Promise<void> | void
  config?: SecureFormConfig
  className?: string
  children: React.ReactNode
  initialData?: Record<string, any>
  submitUrl?: string
  method?: string
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void
  onSecurityViolation?: (violation: string, details: any) => void
}

interface SecureFormState {
  data: Record<string, any>
  errors: Record<string, string>
  isValid: boolean
  isSubmitting: boolean
  isDirty: boolean
  csrfToken?: string
}

export function SecureForm({
  schema,
  onSubmit,
  config = {},
  className = '',
  children,
  initialData = {},
  submitUrl,
  method = 'POST',
  onValidationChange,
  onSecurityViolation
}: SecureFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const formHandler = useRef<SecureFormHandler>()
  const formLoadTime = useRef<number>(Date.now())
  const autoSaveCleanup = useRef<(() => void) | null>(null)

  const [state, setState] = useState<SecureFormState>({
    data: initialData,
    errors: {},
    isValid: false,
    isSubmitting: false,
    isDirty: false
  })

  // Initialize form handler
  useEffect(() => {
    formHandler.current = new SecureFormHandler(schema, config)
    
    // Setup auto-save if configured
    if (config.autoSave && submitUrl) {
      autoSaveCleanup.current = formHandler.current.setupAutoSave(
        submitUrl,
        () => state.data,
        (success, error) => {
          if (!success && error) {
            console.warn('Auto-save failed:', error)
          }
        }
      )
    }

    // Get CSRF token if protection is enabled
    if (config.csrfProtection !== false) {
      ClientCSRFManager.getToken().then(token => {
        setState(prev => ({ ...prev, csrfToken: token }))
      }).catch(error => {
        console.error('Failed to get CSRF token:', error)
        onSecurityViolation?.('csrf_token_error', { error: error.message })
      })
    }

    return () => {
      formHandler.current?.cleanup()
      autoSaveCleanup.current?.()
    }
  }, [schema, config, submitUrl])

  // Validate form when data changes
  useEffect(() => {
    if (formHandler.current) {
      const validation = formHandler.current.validateForm(state.data)
      setState(prev => ({
        ...prev,
        errors: validation.errors,
        isValid: validation.isValid
      }))
      onValidationChange?.(validation.isValid, validation.errors)
    }
  }, [state.data, onValidationChange])

  // Update field value with validation
  const updateField = useCallback((fieldName: string, value: any) => {
    if (!formHandler.current) return

    // Validate field
    const fieldValidation = formHandler.current.validateField(fieldName, value)
    
    setState(prev => ({
      ...prev,
      data: { ...prev.data, [fieldName]: fieldValidation.sanitizedValue },
      errors: { ...prev.errors, [fieldName]: fieldValidation.error || '' },
      isDirty: true
    }))
  }, [])

  // Handle form submission
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!formHandler.current) return

    // Check for bot behavior
    const submissionData = {
      ...state.data,
      _submissionTime: Date.now(),
      _formLoadTime: formLoadTime.current
    }

    if (FormSecurityMonitor.detectBotBehavior(submissionData)) {
      onSecurityViolation?.('bot_behavior_detected', submissionData)
      return
    }

    // Monitor form activity
    if (!FormSecurityMonitor.monitorFormActivity('secure-form', 'submit')) {
      onSecurityViolation?.('suspicious_activity', { activity: 'submit' })
      return
    }

    setState(prev => ({ ...prev, isSubmitting: true }))

    try {
      if (submitUrl) {
        // Use form handler for API submission
        const result = await formHandler.current.submitForm(
          submitUrl,
          state.data,
          {
            method,
            onValidationError: (errors) => {
              setState(prev => ({ ...prev, errors }))
            }
          }
        )

        if (result.success) {
          await onSubmit(result.data)
        }
      } else {
        // Direct submission
        const validation = formHandler.current.validateForm(state.data)
        if (validation.isValid) {
          await onSubmit(validation.sanitizedData)
        } else {
          setState(prev => ({ ...prev, errors: validation.errors }))
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Submission failed'
      setState(prev => ({
        ...prev,
        errors: { ...prev.errors, _form: errorMessage }
      }))
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }))
    }
  }, [state.data, submitUrl, method, onSubmit, onSecurityViolation])

  // Create form context
  const formContext = {
    data: state.data,
    errors: state.errors,
    isValid: state.isValid,
    isSubmitting: state.isSubmitting,
    isDirty: state.isDirty,
    updateField,
    validateField: (fieldName: string, value: any) => 
      formHandler.current?.validateField(fieldName, value),
    csrfToken: state.csrfToken
  }

  return (
    <SecureFormContext.Provider value={formContext}>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={`secure-form ${className}`}
        noValidate
        autoComplete="off"
        data-form-security="enabled"
      >
        {/* CSRF Token */}
        {state.csrfToken && (
          <input
            type="hidden"
            name="_token"
            value={state.csrfToken}
          />
        )}
        
        {/* Honeypot field for bot detection */}
        <input
          type="text"
          name="_honeypot"
          value=""
          onChange={() => {}}
          style={{
            position: 'absolute',
            left: '-9999px',
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none'
          }}
          tabIndex={-1}
          autoComplete="off"
        />

        {/* Form load time for bot detection */}
        <input
          type="hidden"
          name="_formLoadTime"
          value={formLoadTime.current}
        />

        {children}

        {/* Display form-level errors */}
        {state.errors._form && (
          <div className="form-error text-red-600 text-sm mt-2">
            {state.errors._form}
          </div>
        )}
      </form>
    </SecureFormContext.Provider>
  )
}

// Form context for child components
interface SecureFormContextType {
  data: Record<string, any>
  errors: Record<string, string>
  isValid: boolean
  isSubmitting: boolean
  isDirty: boolean
  updateField: (fieldName: string, value: any) => void
  validateField?: (fieldName: string, value: any) => any
  csrfToken?: string
}

const SecureFormContext = React.createContext<SecureFormContextType | null>(null)

export function useSecureForm() {
  const context = React.useContext(SecureFormContext)
  if (!context) {
    throw new Error('useSecureForm must be used within a SecureForm')
  }
  return context
}

// Secure form field components
interface SecureFieldProps {
  name: string
  type?: string
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
  autoComplete?: string
  maxLength?: number
  pattern?: string
  children?: React.ReactNode
}

export function SecureField({
  name,
  type = 'text',
  placeholder,
  className = '',
  required = false,
  disabled = false,
  autoComplete,
  maxLength,
  pattern,
  children
}: SecureFieldProps) {
  const { data, errors, isSubmitting, updateField } = useSecureForm()
  const inputRef = useRef<HTMLInputElement>(null)

  const value = data[name] || ''
  const error = errors[name]
  const hasError = Boolean(error)

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    updateField(name, event.target.value)
  }, [name, updateField])

  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    // Additional validation on blur if configured
    updateField(name, event.target.value)
  }, [name, updateField])

  useEffect(() => {
    // Setup security attributes
    if (inputRef.current) {
      const input = inputRef.current
      
      // Add security attributes based on field type
      switch (type) {
        case 'email':
          input.setAttribute('spellcheck', 'false')
          break
        case 'password':
          input.setAttribute('spellcheck', 'false')
          input.setAttribute('autocomplete', autoComplete || 'current-password')
          break
        default:
          if (autoComplete) {
            input.setAttribute('autocomplete', autoComplete)
          }
      }

      // Add general security attributes
      input.setAttribute('data-lpignore', 'true')
      input.setAttribute('data-form-type', 'other')
    }
  }, [type, autoComplete])

  return (
    <div className={`secure-field ${hasError ? 'has-error' : ''}`}>
      {children && <label className="field-label">{children}</label>}
      <input
        ref={inputRef}
        type={type}
        name={name}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`field-input ${className} ${hasError ? 'error' : ''}`}
        required={required}
        disabled={disabled || isSubmitting}
        maxLength={maxLength}
        pattern={pattern}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${name}-error` : undefined}
      />
      {hasError && (
        <div id={`${name}-error`} className="field-error text-red-600 text-sm mt-1">
          {error}
        </div>
      )}
    </div>
  )
}

export function SecureTextArea({
  name,
  placeholder,
  className = '',
  required = false,
  disabled = false,
  rows = 4,
  maxLength,
  children
}: SecureFieldProps & { rows?: number }) {
  const { data, errors, isSubmitting, updateField } = useSecureForm()

  const value = data[name] || ''
  const error = errors[name]
  const hasError = Boolean(error)

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateField(name, event.target.value)
  }, [name, updateField])

  return (
    <div className={`secure-field ${hasError ? 'has-error' : ''}`}>
      {children && <label className="field-label">{children}</label>}
      <textarea
        name={name}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`field-input ${className} ${hasError ? 'error' : ''}`}
        required={required}
        disabled={disabled || isSubmitting}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${name}-error` : undefined}
        data-lpignore="true"
        data-form-type="other"
      />
      {hasError && (
        <div id={`${name}-error`} className="field-error text-red-600 text-sm mt-1">
          {error}
        </div>
      )}
    </div>
  )
}

export function SecureSubmitButton({
  children,
  className = '',
  disabled = false,
  loadingText = 'Submitting...'
}: {
  children: React.ReactNode
  className?: string
  disabled?: boolean
  loadingText?: string
}) {
  const { isValid, isSubmitting, isDirty } = useSecureForm()

  return (
    <button
      type="submit"
      className={`secure-submit-button ${className}`}
      disabled={disabled || isSubmitting || !isValid || !isDirty}
      aria-busy={isSubmitting}
    >
      {isSubmitting ? loadingText : children}
    </button>
  )
}