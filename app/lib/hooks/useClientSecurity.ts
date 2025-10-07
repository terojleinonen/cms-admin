'use client'

/**
 * Client Security Hooks
 * React hooks for client-side security features
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  ClientCSRFManager, 
  ClientInputSanitizer, 
  ClientValidationError,
  SecureFetch 
} from '../client-security'
import { SecureFormHandler, SecureFormConfig } from '../secure-form-utils'
import { z } from 'zod'

/**
 * Hook for CSRF token management
 */
export function useCSRFToken() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshToken = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const newToken = await ClientCSRFManager.getToken()
      setToken(newToken)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get CSRF token'
      setError(errorMessage)
      console.error('CSRF token error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshToken()
  }, [refreshToken])

  const clearToken = useCallback(() => {
    ClientCSRFManager.clearToken()
    setToken(null)
  }, [])

  return {
    token,
    loading,
    error,
    refreshToken,
    clearToken
  }
}

/**
 * Hook for secure form handling
 */
export function useSecureForm<T>(
  schema: z.ZodSchema<T>,
  config: SecureFormConfig = {}
) {
  const formHandler = useRef<SecureFormHandler>()
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize form handler
  useEffect(() => {
    formHandler.current = new SecureFormHandler(schema, config)
    setIsInitialized(true)

    return () => {
      formHandler.current?.cleanup()
    }
  }, [schema, config])

  const validateField = useCallback((fieldName: string, value: any) => {
    if (!formHandler.current) {
      return { isValid: false, error: 'Form not initialized' }
    }
    return formHandler.current.validateField(fieldName, value)
  }, [])

  const validateForm = useCallback((formData: Record<string, any>) => {
    if (!formHandler.current) {
      return { isValid: false, errors: { _form: 'Form not initialized' }, sanitizedData: formData }
    }
    return formHandler.current.validateForm(formData)
  }, [])

  const submitForm = useCallback(async (
    url: string,
    formData: Record<string, any>,
    options: {
      method?: string
      onSuccess?: (response: any) => void
      onError?: (error: any) => void
      onValidationError?: (errors: Record<string, string>) => void
    } = {}
  ) => {
    if (!formHandler.current) {
      throw new Error('Form not initialized')
    }
    return formHandler.current.submitForm(url, formData, options)
  }, [])

  const setupAutoSave = useCallback((
    url: string,
    getCurrentData: () => Record<string, any>,
    onAutoSave?: (success: boolean, error?: any) => void
  ) => {
    if (!formHandler.current) {
      return () => {}
    }
    return formHandler.current.setupAutoSave(url, getCurrentData, onAutoSave)
  }, [])

  return {
    isInitialized,
    validateField,
    validateForm,
    submitForm,
    setupAutoSave
  }
}

/**
 * Hook for input sanitization
 */
export function useInputSanitizer() {
  const sanitizeText = useCallback((input: string) => {
    try {
      return ClientInputSanitizer.sanitizeText(input)
    } catch (error) {
      console.warn('Input sanitization failed:', error)
      return input // Return original if sanitization fails
    }
  }, [])

  const sanitizeHTML = useCallback((input: string, allowedTags?: string[]) => {
    try {
      return ClientInputSanitizer.sanitizeHTML(input, allowedTags)
    } catch (error) {
      console.warn('HTML sanitization failed:', error)
      return input // Return original if sanitization fails
    }
  }, [])

  const sanitizeEmail = useCallback((email: string) => {
    try {
      return ClientInputSanitizer.sanitizeEmail(email)
    } catch (error) {
      throw new ClientValidationError('Invalid email format', 'INVALID_EMAIL')
    }
  }, [])

  const sanitizeURL = useCallback((url: string) => {
    try {
      return ClientInputSanitizer.sanitizeURL(url)
    } catch (error) {
      throw new ClientValidationError('Invalid URL format', 'INVALID_URL')
    }
  }, [])

  const sanitizeObject = useCallback((obj: any) => {
    try {
      return ClientInputSanitizer.sanitizeObject(obj)
    } catch (error) {
      console.warn('Object sanitization failed:', error)
      return obj // Return original if sanitization fails
    }
  }, [])

  const containsSuspiciousContent = useCallback((input: string) => {
    return ClientInputSanitizer.containsSuspiciousContent(input)
  }, [])

  return {
    sanitizeText,
    sanitizeHTML,
    sanitizeEmail,
    sanitizeURL,
    sanitizeObject,
    containsSuspiciousContent
  }
}

/**
 * Hook for secure API requests
 */
export function useSecureAPI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(async (
    url: string,
    options: RequestInit & {
      sanitizeBody?: boolean
      validateResponse?: boolean
    } = {}
  ) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await SecureFetch.fetch(url, options)
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Request failed'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const get = useCallback(async (url: string, options: RequestInit = {}) => {
    return request(url, { method: 'GET', ...options })
  }, [request])

  const post = useCallback(async (url: string, data: any, options: RequestInit = {}) => {
    return request(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    })
  }, [request])

  const put = useCallback(async (url: string, data: any, options: RequestInit = {}) => {
    return request(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    })
  }, [request])

  const patch = useCallback(async (url: string, data: any, options: RequestInit = {}) => {
    return request(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options
    })
  }, [request])

  const del = useCallback(async (url: string, options: RequestInit = {}) => {
    return request(url, { method: 'DELETE', ...options })
  }, [request])

  return {
    loading,
    error,
    request,
    get,
    post,
    put,
    patch,
    delete: del
  }
}

/**
 * Hook for security monitoring
 */
export function useSecurityMonitor() {
  const [violations, setViolations] = useState<Array<{
    type: string
    timestamp: number
    details: any
  }>>([])

  const reportViolation = useCallback((type: string, details: any) => {
    const violation = {
      type,
      timestamp: Date.now(),
      details
    }

    setViolations(prev => [...prev.slice(-9), violation]) // Keep last 10 violations

    // Log to console for debugging
    console.warn('Security violation detected:', violation)

    // In a real application, you might want to send this to a monitoring service
    // reportToSecurityService(violation)
  }, [])

  const clearViolations = useCallback(() => {
    setViolations([])
  }, [])

  const getViolationCount = useCallback((type?: string) => {
    if (type) {
      return violations.filter(v => v.type === type).length
    }
    return violations.length
  }, [violations])

  const getRecentViolations = useCallback((minutes: number = 5) => {
    const cutoff = Date.now() - (minutes * 60 * 1000)
    return violations.filter(v => v.timestamp > cutoff)
  }, [violations])

  return {
    violations,
    reportViolation,
    clearViolations,
    getViolationCount,
    getRecentViolations
  }
}

/**
 * Hook for content security policy monitoring
 */
export function useCSPMonitor() {
  const [violations, setViolations] = useState<Array<{
    blockedURI: string
    violatedDirective: string
    timestamp: number
  }>>([])

  useEffect(() => {
    const handleCSPViolation = (event: SecurityPolicyViolationEvent) => {
      const violation = {
        blockedURI: event.blockedURI,
        violatedDirective: event.violatedDirective,
        timestamp: Date.now()
      }

      setViolations(prev => [...prev.slice(-19), violation]) // Keep last 20 violations

      // Log CSP violation
      console.warn('CSP Violation:', violation)
    }

    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', handleCSPViolation)

    return () => {
      document.removeEventListener('securitypolicyviolation', handleCSPViolation)
    }
  }, [])

  const clearViolations = useCallback(() => {
    setViolations([])
  }, [])

  return {
    violations,
    clearViolations
  }
}

/**
 * Hook for detecting suspicious user behavior
 */
export function useBehaviorMonitor() {
  const [suspiciousActivity, setSuspiciousActivity] = useState(0)
  const activityRef = useRef<number[]>([])

  const recordActivity = useCallback((activityType: string) => {
    const now = Date.now()
    activityRef.current.push(now)

    // Keep only activities from the last minute
    activityRef.current = activityRef.current.filter(time => now - time < 60000)

    // Check for suspicious rapid activity
    if (activityRef.current.length > 20) { // More than 20 activities per minute
      setSuspiciousActivity(prev => prev + 1)
      console.warn('Suspicious rapid activity detected:', activityType)
    }
  }, [])

  const resetSuspiciousActivity = useCallback(() => {
    setSuspiciousActivity(0)
    activityRef.current = []
  }, [])

  const isSuspicious = suspiciousActivity > 3

  return {
    suspiciousActivity,
    isSuspicious,
    recordActivity,
    resetSuspiciousActivity
  }
}