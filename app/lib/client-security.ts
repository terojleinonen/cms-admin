/**
 * Client-Side Security Utilities
 * Provides input validation, sanitization, and security measures for the frontend
 */

// Security configuration for client-side validation
const CLIENT_SECURITY_CONFIG = {
  maxStringLength: 10000,
  maxArrayLength: 1000,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedDocumentTypes: ['application/pdf', 'text/plain', 'text/csv'],
  dangerousPatterns: [
    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /on\w+\s*=/gi,
    // Data URLs that could be dangerous
    /data:text\/html/gi,
    /data:application\/javascript/gi,
  ],
  suspiciousKeywords: [
    'script', 'javascript', 'vbscript', 'onload', 'onerror', 'onclick',
    'eval', 'function', 'constructor', 'prototype', '__proto__'
  ]
}

/**
 * Client-side input sanitization utilities
 */
class ClientInputSanitizer {
  /**
   * Sanitize HTML content with strict rules
   */
  static sanitizeHTML(input: string, allowedTags: string[] = []): string {
    if (typeof input !== 'string') {
      return String(input)
    }

    const defaultAllowedTags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    const allowed = allowedTags.length > 0 ? allowedTags : defaultAllowedTags
    
    // Create a temporary DOM element to parse HTML safely
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = input
    
    // Remove all script tags and their content
    const scripts = tempDiv.querySelectorAll('script')
    scripts.forEach(script => script.remove())
    
    // Remove dangerous tags
    const dangerousTags = ['object', 'embed', 'iframe', 'form', 'input', 'meta', 'link', 'style']
    dangerousTags.forEach(tag => {
      const elements = tempDiv.querySelectorAll(tag)
      elements.forEach(el => el.remove())
    })
    
    // Remove event handlers from all elements
    const allElements = tempDiv.querySelectorAll('*')
    allElements.forEach(el => {
      // Remove all event handler attributes
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name)
        }
      })
      
      // Remove dangerous attributes
      const dangerousAttrs = ['style', 'background', 'src', 'href']
      dangerousAttrs.forEach(attr => {
        if (el.hasAttribute(attr)) {
          const value = el.getAttribute(attr)
          if (value && (value.includes('javascript:') || value.includes('data:') || value.includes('vbscript:'))) {
            el.removeAttribute(attr)
          }
        }
      })
    })
    
    // If no tags are allowed, strip all HTML
    if (allowed.length === 0) {
      return tempDiv.textContent || tempDiv.innerText || ''
    }
    
    // Remove non-allowed tags
    const allTags = tempDiv.querySelectorAll('*')
    allTags.forEach(el => {
      if (!allowed.includes(el.tagName.toLowerCase())) {
        // Replace with text content
        const textNode = document.createTextNode(el.textContent || '')
        el.parentNode?.replaceChild(textNode, el)
      }
    })
    
    return tempDiv.innerHTML.trim()
  }

  /**
   * Sanitize plain text with comprehensive security checks
   */
  static sanitizeText(input: string): string {
    if (typeof input !== 'string') {
      return String(input)
    }

    let sanitized = input
      // Remove HTML tags completely
      .replace(/<[^>]*>/g, '')
      // Remove dangerous protocols
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      // Remove potential XSS vectors
      .replace(/on\w+\s*=/gi, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()

    // Check for suspicious patterns
    for (const pattern of CLIENT_SECURITY_CONFIG.dangerousPatterns) {
      if (pattern.test(sanitized)) {
        throw new ClientValidationError('Input contains potentially dangerous content', 'DANGEROUS_CONTENT')
      }
    }

    return sanitized
  }

  /**
   * Sanitize email addresses
   */
  static sanitizeEmail(email: string): string {
    const sanitized = email.toLowerCase().trim()
    
    // Basic email validation regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(sanitized)) {
      throw new ClientValidationError('Invalid email format', 'INVALID_EMAIL')
    }

    // Additional security checks
    if (sanitized.includes('..') || sanitized.includes('--')) {
      throw new ClientValidationError('Invalid email format', 'INVALID_EMAIL')
    }

    return sanitized
  }

  /**
   * Sanitize URLs
   */
  static sanitizeURL(url: string): string {
    const sanitized = url.trim()

    // Basic URL validation regex
    const urlRegex = /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[^\s]*)?$/
    if (!urlRegex.test(sanitized)) {
      throw new ClientValidationError('Invalid URL format', 'INVALID_URL')
    }

    // Check for dangerous protocols
    if (/^(javascript|data|vbscript|file|ftp):/i.test(sanitized)) {
      throw new ClientValidationError('Dangerous URL protocol', 'DANGEROUS_URL')
    }

    return sanitized
  }

  /**
   * Sanitize file names
   */
  static sanitizeFileName(fileName: string): string {
    return fileName
      // Remove dangerous characters
      .replace(/[^a-zA-Z0-9\-_.]/g, '')
      // Remove multiple dots
      .replace(/\.{2,}/g, '.')
      // Remove leading/trailing dots and spaces
      .replace(/^[\s.]+|[\s.]+$/g, '')
      // Limit length
      .substring(0, 255)
  }

  /**
   * Check for suspicious content patterns
   */
  static containsSuspiciousContent(input: string): boolean {
    const lowerInput = input.toLowerCase()
    
    // Check for suspicious keywords
    for (const keyword of CLIENT_SECURITY_CONFIG.suspiciousKeywords) {
      if (lowerInput.includes(keyword)) {
        return true
      }
    }

    // Check for dangerous patterns
    for (const pattern of CLIENT_SECURITY_CONFIG.dangerousPatterns) {
      if (pattern.test(input)) {
        return true
      }
    }

    return false
  }

  /**
   * Deep sanitize objects recursively
   */
  static sanitizeObject(obj: any, depth = 0): any {
    if (depth > 10) {
      throw new ClientValidationError('Object nesting too deep', 'OBJECT_TOO_DEEP')
    }

    if (obj === null || obj === undefined) {
      return obj
    }

    if (typeof obj === 'string') {
      return this.sanitizeText(obj)
    }

    if (typeof obj === 'number') {
      if (!Number.isFinite(obj)) {
        throw new ClientValidationError('Invalid number value', 'INVALID_NUMBER')
      }
      return obj
    }

    if (typeof obj === 'boolean') {
      return obj
    }

    if (Array.isArray(obj)) {
      if (obj.length > CLIENT_SECURITY_CONFIG.maxArrayLength) {
        throw new ClientValidationError('Array too large', 'ARRAY_TOO_LARGE')
      }
      return obj.map(item => this.sanitizeObject(item, depth + 1))
    }

    if (typeof obj === 'object') {
      const sanitized: any = {}
      const keys = Object.keys(obj)
      
      if (keys.length > 100) { // Prevent object bombs
        throw new ClientValidationError('Too many object properties', 'OBJECT_TOO_LARGE')
      }

      for (const [key, value] of Object.entries(obj)) {
        // Sanitize the key
        const sanitizedKey = this.sanitizeText(key)
        
        // Check for prototype pollution
        if (['__proto__', 'constructor', 'prototype'].includes(sanitizedKey)) {
          continue // Skip dangerous keys
        }

        sanitized[sanitizedKey] = this.sanitizeObject(value, depth + 1)
      }
      return sanitized
    }

    return obj
  }
}

/**
 * XSS prevention utilities for client-side
 */
class ClientXSSPrevention {
  private static xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi,
    /expression\s*\(/gi,
    /url\s*\(/gi,
    /@import/gi,
    /binding\s*:/gi
  ]

  /**
   * Check if input contains XSS attempts
   */
  static containsXSS(input: string): boolean {
    for (const pattern of this.xssPatterns) {
      if (pattern.test(input)) {
        return true
      }
    }
    return false
  }

  /**
   * Sanitize input to prevent XSS
   */
  static sanitizeForXSS(input: string): string {
    if (this.containsXSS(input)) {
      throw new ClientValidationError('Input contains potential XSS', 'XSS_DETECTED')
    }

    // Use DOM-based sanitization for better security
    const tempDiv = document.createElement('div')
    tempDiv.textContent = input
    return tempDiv.innerHTML
  }
}

/**
 * File upload validation with security checks
 */
class ClientFileValidator {
  /**
   * Validate file upload with security checks
   */
  static validateFile(
    file: File,
    options: {
      allowedTypes?: string[]
      maxSize?: number
      checkContent?: boolean
    } = {}
  ): { valid: true } | { valid: false; error: string; code: string } {
    const {
      allowedTypes = [...CLIENT_SECURITY_CONFIG.allowedImageTypes, ...CLIENT_SECURITY_CONFIG.allowedDocumentTypes],
      maxSize = CLIENT_SECURITY_CONFIG.maxFileSize,
      checkContent = true
    } = options

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds limit of ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
        code: 'FILE_TOO_LARGE'
      }
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} not allowed`,
        code: 'FILE_TYPE_NOT_ALLOWED'
      }
    }

    // Sanitize and validate file name
    const sanitizedName = ClientInputSanitizer.sanitizeFileName(file.name)
    if (sanitizedName !== file.name || !sanitizedName) {
      return {
        valid: false,
        error: 'Invalid characters in file name',
        code: 'INVALID_FILE_NAME'
      }
    }

    // Check for dangerous file extensions
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.js', '.vbs', 
      '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl'
    ]
    
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    if (dangerousExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: 'File type not allowed for security reasons',
        code: 'DANGEROUS_FILE_TYPE'
      }
    }

    return { valid: true }
  }

  /**
   * Validate multiple files
   */
  static validateFiles(
    files: FileList | File[],
    options: {
      allowedTypes?: string[]
      maxSize?: number
      maxFiles?: number
      checkContent?: boolean
    } = {}
  ): { valid: true; files: File[] } | { valid: false; error: string; code: string } {
    const { maxFiles = 10 } = options
    const fileArray = Array.from(files)

    if (fileArray.length > maxFiles) {
      return {
        valid: false,
        error: `Too many files. Maximum ${maxFiles} files allowed`,
        code: 'TOO_MANY_FILES'
      }
    }

    for (const file of fileArray) {
      const validation = this.validateFile(file, options)
      if (!validation.valid) {
        return validation
      }
    }

    return { valid: true, files: fileArray }
  }
}

/**
 * CSRF token management for client-side
 */
class ClientCSRFManager {
  private static token: string | null = null
  private static tokenExpiry: number | null = null

  /**
   * Get CSRF token from meta tag or fetch from server
   */
  static async getToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token
    }

    // Try to get token from meta tag first
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (metaToken) {
      this.token = metaToken
      this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      return metaToken
    }

    // Fetch token from server
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token')
      }

      const data = await response.json()
      this.token = data.token
      this.tokenExpiry = data.expires

      return data.token
    } catch (error) {
      console.error('Failed to get CSRF token:', error)
      throw new ClientValidationError('Failed to get CSRF token', 'CSRF_TOKEN_ERROR')
    }
  }

  /**
   * Add CSRF token to request headers
   */
  static async addTokenToHeaders(headers: HeadersInit = {}): Promise<HeadersInit> {
    const token = await this.getToken()
    return {
      ...headers,
      'X-CSRF-Token': token,
    }
  }

  /**
   * Add CSRF token to form data
   */
  static async addTokenToFormData(formData: FormData): Promise<FormData> {
    const token = await this.getToken()
    formData.append('_token', token)
    return formData
  }

  /**
   * Clear cached token (e.g., on logout)
   */
  static clearToken(): void {
    this.token = null
    this.tokenExpiry = null
  }
}

/**
 * Custom validation error class for client-side
 */
class ClientValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public field?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ClientValidationError'
  }
}

/**
 * Secure fetch wrapper with automatic CSRF protection
 */
class SecureFetch {
  /**
   * Secure fetch with automatic CSRF token and input sanitization
   */
  static async fetch(
    url: string,
    options: RequestInit & {
      sanitizeBody?: boolean
      validateResponse?: boolean
    } = {}
  ): Promise<Response> {
    const {
      sanitizeBody = true,
      validateResponse = true,
      ...fetchOptions
    } = options

    // Add CSRF token to headers for state-changing requests
    const method = fetchOptions.method?.toUpperCase() || 'GET'
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      fetchOptions.headers = await ClientCSRFManager.addTokenToHeaders(fetchOptions.headers)
    }

    // Sanitize request body if it's JSON
    if (sanitizeBody && fetchOptions.body && typeof fetchOptions.body === 'string') {
      try {
        const bodyData = JSON.parse(fetchOptions.body)
        const sanitizedData = ClientInputSanitizer.sanitizeObject(bodyData)
        fetchOptions.body = JSON.stringify(sanitizedData)
      } catch (error) {
        // If it's not JSON, leave it as is
      }
    }

    // Add security headers
    fetchOptions.headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...fetchOptions.headers,
    }

    // Make the request
    const response = await fetch(url, fetchOptions)

    // Validate response if requested
    if (validateResponse && !response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ClientValidationError(
        errorData.error?.message || `Request failed with status ${response.status}`,
        errorData.error?.code || 'REQUEST_FAILED',
        undefined,
        errorData
      )
    }

    return response
  }

  /**
   * Secure POST request
   */
  static async post(url: string, data: any, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    })
  }

  /**
   * Secure PUT request
   */
  static async put(url: string, data: any, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    })
  }

  /**
   * Secure PATCH request
   */
  static async patch(url: string, data: any, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    })
  }

  /**
   * Secure DELETE request
   */
  static async delete(url: string, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      method: 'DELETE',
      ...options,
    })
  }
}

// Export all utilities
export {
  CLIENT_SECURITY_CONFIG,
  ClientInputSanitizer,
  ClientXSSPrevention,
  ClientFileValidator,
  ClientCSRFManager,
  ClientValidationError,
  SecureFetch
}