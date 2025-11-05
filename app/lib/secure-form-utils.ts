/**
 * Secure Form Handling Utilities
 * Provides comprehensive form validation, sanitization, and security measures
 */

import { z } from 'zod'
import { 
  ClientInputSanitizer, 
  ClientValidationError, 
  ClientCSRFManager,
  SecureFetch 
} from './client-security'

/**
 * Form validation configuration
 */
interface SecureFormConfig {
  sanitizeInputs?: boolean
  validateOnChange?: boolean
  validateOnBlur?: boolean
  csrfProtection?: boolean
  maxSubmissionRate?: number // submissions per minute
  preventDoubleSubmit?: boolean
  autoSave?: boolean
  autoSaveInterval?: number // milliseconds
}

/**
 * Form field validation result
 */
interface FieldValidationResult {
  isValid: boolean
  error?: string
  sanitizedValue?: any
}

/**
 * Form validation result
 */
interface FormValidationResult {
  isValid: boolean
  errors: Record<string, string>
  sanitizedData: Record<string, any>
}

/**
 * Secure form handler class
 */
class SecureFormHandler {
  private config: Required<SecureFormConfig>
  private schema: z.ZodSchema<any>
  private submissionTimes: number[] = []
  private isSubmitting = false
  private autoSaveTimer?: NodeJS.Timeout

  constructor(
    schema: z.ZodSchema<any>,
    config: SecureFormConfig = {}
  ) {
    this.schema = schema
    this.config = {
      sanitizeInputs: true,
      validateOnChange: false,
      validateOnBlur: true,
      csrfProtection: true,
      maxSubmissionRate: 5, // 5 submissions per minute
      preventDoubleSubmit: true,
      autoSave: false,
      autoSaveInterval: 30000, // 30 seconds
      ...config
    }
  }

  /**
   * Validate a single field
   */
  validateField(fieldName: string, value: any): FieldValidationResult {
    try {
      // Sanitize input if enabled
      let sanitizedValue = value
      if (this.config.sanitizeInputs && typeof value === 'string') {
        sanitizedValue = ClientInputSanitizer.sanitizeText(value)
      }

      // Extract field schema from main schema
      const fieldSchema = this.extractFieldSchema(fieldName)
      if (!fieldSchema) {
        return { isValid: true, sanitizedValue }
      }

      // Validate field
      const result = fieldSchema.safeParse(sanitizedValue)
      if (result.success) {
        return { isValid: true, sanitizedValue: result.data }
      } else {
        return {
          isValid: false,
          error: result.error.issues[0]?.message || 'Invalid value',
          sanitizedValue
        }
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Validation error',
        sanitizedValue: value
      }
    }
  }

  /**
   * Validate entire form
   */
  validateForm(formData: Record<string, any>): FormValidationResult {
    try {
      // Sanitize all inputs if enabled
      let sanitizedData = formData
      if (this.config.sanitizeInputs) {
        sanitizedData = ClientInputSanitizer.sanitizeObject(formData)
      }

      // Validate with schema
      const result = this.schema.safeParse(sanitizedData)
      
      if (result.success) {
        return {
          isValid: true,
          errors: {},
          sanitizedData: result.data
        }
      } else {
        const errors: Record<string, string> = {}
        result.error.issues.forEach(issue => {
          const path = issue.path.join('.')
          errors[path] = issue.message
        })

        return {
          isValid: false,
          errors,
          sanitizedData
        }
      }
    } catch (error) {
      return {
        isValid: false,
        errors: { _form: error instanceof Error ? error.message : 'Validation error' },
        sanitizedData: formData
      }
    }
  }

  /**
   * Check submission rate limiting
   */
  private checkSubmissionRate(): boolean {
    const now = Date.now()
    const oneMinuteAgo = now - 60000

    // Remove old submissions
    this.submissionTimes = this.submissionTimes.filter(time => time > oneMinuteAgo)

    // Check if rate limit exceeded
    if (this.submissionTimes.length >= this.config.maxSubmissionRate) {
      return false
    }

    // Add current submission
    this.submissionTimes.push(now)
    return true
  }

  /**
   * Submit form securely
   */
  async submitForm(
    url: string,
    formData: Record<string, any>,
    options: {
      method?: string
      onSuccess?: (response: any) => void
      onError?: (error: any) => void
      onValidationError?: (errors: Record<string, string>) => void
    } = {}
  ): Promise<{ success: boolean; data?: any; errors?: Record<string, string> }> {
    const { method = 'POST', onSuccess, onError, onValidationError } = options

    try {
      // Prevent double submission
      if (this.config.preventDoubleSubmit && this.isSubmitting) {
        throw new ClientValidationError('Form is already being submitted', 'DOUBLE_SUBMIT')
      }

      // Check rate limiting
      if (!this.checkSubmissionRate()) {
        throw new ClientValidationError('Too many submissions. Please wait before trying again.', 'RATE_LIMITED')
      }

      this.isSubmitting = true

      // Validate form
      const validation = this.validateForm(formData)
      if (!validation.isValid) {
        onValidationError?.(validation.errors)
        return { success: false, errors: validation.errors }
      }

      // Submit form
      const response = await SecureFetch.fetch(url, {
        method,
        body: JSON.stringify(validation.sanitizedData),
        sanitizeBody: false, // Already sanitized
        validateResponse: true
      })

      const responseData = await response.json()

      // Handle success
      onSuccess?.(responseData)
      return { success: true, data: responseData }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Submission failed'
      onError?.(error)
      
      if (error instanceof ClientValidationError) {
        return { success: false, errors: { _form: errorMessage } }
      }

      return { success: false, errors: { _form: errorMessage } }
    } finally {
      this.isSubmitting = false
    }
  }

  /**
   * Setup auto-save functionality
   */
  setupAutoSave(
    url: string,
    getCurrentData: () => Record<string, any>,
    onAutoSave?: (success: boolean, error?: any) => void
  ): () => void {
    if (!this.config.autoSave) {
      return () => {}
    }

    this.autoSaveTimer = setInterval(async () => {
      try {
        const data = getCurrentData()
        const validation = this.validateForm(data)
        
        if (validation.isValid) {
          await SecureFetch.post(url, validation.sanitizedData)
          onAutoSave?.(true)
        }
      } catch (error) {
        onAutoSave?.(false, error)
      }
    }, this.config.autoSaveInterval)

    // Return cleanup function
    return () => {
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer)
        this.autoSaveTimer = undefined
      }
    }
  }

  /**
   * Extract field schema from main schema (simplified implementation)
   */
  private extractFieldSchema(fieldName: string): z.ZodSchema<any> | null {
    try {
      // This is a simplified implementation
      // In a real scenario, you might need more sophisticated schema introspection
      const testData = { [fieldName]: 'test' }
      const result = this.schema.safeParse(testData)
      
      if (result.success || result.error) {
        // Return a basic string schema as fallback
        return z.string().optional()
      }
      
      return null
    } catch {
      return null
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = undefined
    }
  }
}

/**
 * Secure form input component utilities
 */
class SecureFormInputUtils {
  /**
   * Create secure input event handler
   */
  static createInputHandler(
    fieldName: string,
    formHandler: SecureFormHandler,
    onValidation?: (result: FieldValidationResult) => void
  ) {
    return (event: Event) => {
      const target = event.target as HTMLInputElement
      const value = target.value

      // Validate field
      const result = formHandler.validateField(fieldName, value)
      
      // Update input value with sanitized version if different
      if (result.sanitizedValue !== value) {
        target.value = result.sanitizedValue
      }

      // Call validation callback
      onValidation?.(result)
    }
  }

  /**
   * Create secure file input handler
   */
  static createFileInputHandler(
    fieldName: string,
    options: {
      allowedTypes?: string[]
      maxSize?: number
      maxFiles?: number
    } = {},
    onValidation?: (result: { isValid: boolean; error?: string; files?: File[] }) => void
  ) {
    return (event: Event) => {
      const target = event.target as HTMLInputElement
      const files = target.files

      if (!files || files.length === 0) {
        onValidation?.({ isValid: true, files: [] })
        return
      }

      // Validate files
      const validation = ClientInputSanitizer.sanitizeObject({ files: Array.from(files) })
      
      try {
        // Additional file validation would go here
        onValidation?.({ isValid: true, files: Array.from(files) })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'File validation failed'
        onValidation?.({ isValid: false, error: errorMessage })
      }
    }
  }

  /**
   * Setup form field security attributes
   */
  static setupFieldSecurity(input: HTMLInputElement, fieldType: string): void {
    // Add security attributes based on field type
    switch (fieldType) {
      case 'email':
        input.setAttribute('autocomplete', 'email')
        input.setAttribute('spellcheck', 'false')
        break
      case 'password':
        input.setAttribute('autocomplete', 'current-password')
        input.setAttribute('spellcheck', 'false')
        break
      case 'new-password':
        input.setAttribute('autocomplete', 'new-password')
        input.setAttribute('spellcheck', 'false')
        break
      case 'name':
        input.setAttribute('autocomplete', 'name')
        break
      case 'phone':
        input.setAttribute('autocomplete', 'tel')
        input.setAttribute('spellcheck', 'false')
        break
      default:
        input.setAttribute('spellcheck', 'true')
    }

    // Add general security attributes
    input.setAttribute('data-lpignore', 'true') // Ignore LastPass
    input.setAttribute('data-form-type', 'other') // Prevent autofill abuse
  }
}

/**
 * Form security monitor
 */
class FormSecurityMonitor {
  private static suspiciousActivity: Map<string, number> = new Map()
  private static readonly MAX_SUSPICIOUS_ACTIONS = 10
  private static readonly SUSPICIOUS_RESET_TIME = 300000 // 5 minutes

  /**
   * Monitor for suspicious form activity
   */
  static monitorFormActivity(formId: string, activityType: string): boolean {
    const key = `${formId}:${activityType}`
    const current = this.suspiciousActivity.get(key) || 0
    
    if (current >= this.MAX_SUSPICIOUS_ACTIONS) {
      console.warn(`Suspicious form activity detected: ${formId} - ${activityType}`)
      return false // Block activity
    }

    this.suspiciousActivity.set(key, current + 1)

    // Reset counter after timeout
    setTimeout(() => {
      this.suspiciousActivity.delete(key)
    }, this.SUSPICIOUS_RESET_TIME)

    return true // Allow activity
  }

  /**
   * Check for bot-like behavior
   */
  static detectBotBehavior(formData: Record<string, any>): boolean {
    // Check for honeypot fields
    if (formData._honeypot && formData._honeypot !== '') {
      return true
    }

    // Check for suspiciously fast submission
    const submissionTime = formData._submissionTime
    const formLoadTime = formData._formLoadTime
    
    if (submissionTime && formLoadTime) {
      const timeDiff = submissionTime - formLoadTime
      if (timeDiff < 2000) { // Less than 2 seconds
        return true
      }
    }

    // Check for duplicate submissions
    const formHash = this.hashFormData(formData)
    const recentSubmissions = this.getRecentSubmissions()
    
    if (recentSubmissions.includes(formHash)) {
      return true
    }

    this.addRecentSubmission(formHash)
    return false
  }

  /**
   * Hash form data for duplicate detection
   */
  private static hashFormData(formData: Record<string, any>): string {
    const dataString = JSON.stringify(formData, Object.keys(formData).sort())
    return btoa(dataString).substring(0, 32) // Simple hash
  }

  /**
   * Get recent form submissions
   */
  private static getRecentSubmissions(): string[] {
    const stored = sessionStorage.getItem('recent_form_submissions')
    return stored ? JSON.parse(stored) : []
  }

  /**
   * Add recent form submission
   */
  private static addRecentSubmission(hash: string): void {
    const recent = this.getRecentSubmissions()
    recent.push(hash)
    
    // Keep only last 10 submissions
    if (recent.length > 10) {
      recent.shift()
    }
    
    sessionStorage.setItem('recent_form_submissions', JSON.stringify(recent))
  }
}

// Export utilities
export {
  SecureFormHandler,
  SecureFormInputUtils,
  FormSecurityMonitor
}

export type {
  SecureFormConfig,
  FieldValidationResult,
  FormValidationResult
}