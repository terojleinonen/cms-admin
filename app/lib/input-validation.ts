/**
 * Comprehensive Server-Side Input Validation System
 * Provides advanced validation, sanitization, and security measures
 * for all API endpoints and user inputs
 */

import { z } from 'zod'
import { NextRequest } from 'next/server'
// Using built-in validation instead of external dependencies

// Security configuration for input validation
export const INPUT_VALIDATION_CONFIG = {
  maxStringLength: 10000,
  maxArrayLength: 1000,
  maxObjectDepth: 10,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedDocumentTypes: ['application/pdf', 'text/plain', 'text/csv'],
  dangerousPatterns: [
    // SQL injection patterns (only check in suspicious contexts)
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|INTO|SET|WHERE|VALUES)\b)/i,
    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    // Path traversal
    /\.\.\//g,
    /\.\.\\/g,
  ],
  suspiciousKeywords: [
    'script', 'javascript', 'vbscript', 'onload', 'onerror', 'onclick',
    'eval', 'function', 'constructor', 'prototype', '__proto__',
    'select', 'insert', 'update', 'delete', 'drop', 'create', 'alter',
    'union', 'exec', 'execute', 'sp_', 'xp_'
  ]
}

/**
 * Advanced input sanitization utilities
 */
export class AdvancedInputSanitizer {
  /**
   * Sanitize HTML content with strict rules
   */
  static sanitizeHTML(input: string, allowedTags?: string[]): string {
    const defaultAllowedTags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    const allowed = allowedTags || defaultAllowedTags
    
    // Simple HTML sanitization - remove all tags except allowed ones
    let sanitized = input
      // Remove script tags and content
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      // Remove dangerous tags
      .replace(/<(object|embed|iframe|form|input|meta|link)[^>]*>/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      // Remove javascript: and data: protocols
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      // Remove style attributes
      .replace(/style\s*=\s*["'][^"']*["']/gi, '')
    
    // If no tags are allowed, strip all HTML
    if (allowed.length === 0) {
      sanitized = sanitized.replace(/<[^>]*>/g, '')
    }
    
    return sanitized.trim()
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
      // Remove SQL injection attempts
      .replace(/['";\\]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      // Remove path traversal attempts
      .replace(/\.\.\//g, '')
      .replace(/\.\.\\/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()

    // Check for suspicious patterns
    for (const pattern of INPUT_VALIDATION_CONFIG.dangerousPatterns) {
      if (pattern.test(sanitized)) {
        throw new ValidationError('Input contains potentially dangerous content', 'DANGEROUS_CONTENT')
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
      throw new ValidationError('Invalid email format', 'INVALID_EMAIL')
    }

    // Additional security checks
    if (sanitized.includes('..') || sanitized.includes('--')) {
      throw new ValidationError('Invalid email format', 'INVALID_EMAIL')
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
      throw new ValidationError('Invalid URL format', 'INVALID_URL')
    }

    // Check for dangerous protocols
    if (/^(javascript|data|vbscript|file|ftp):/i.test(sanitized)) {
      throw new ValidationError('Dangerous URL protocol', 'DANGEROUS_URL')
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
   * Sanitize phone numbers
   */
  static sanitizePhone(phone: string): string {
    const sanitized = phone.replace(/[^\d+\-\s()]/g, '').trim()
    
    // Basic phone validation - at least 10 digits
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/
    if (!phoneRegex.test(sanitized)) {
      throw new ValidationError('Invalid phone number format', 'INVALID_PHONE')
    }

    return sanitized
  }

  /**
   * Deep sanitize objects recursively
   */
  static sanitizeObject(obj: any, depth = 0): any {
    if (depth > INPUT_VALIDATION_CONFIG.maxObjectDepth) {
      throw new ValidationError('Object nesting too deep', 'OBJECT_TOO_DEEP')
    }

    if (obj === null || obj === undefined) {
      return obj
    }

    if (typeof obj === 'string') {
      return this.sanitizeText(obj)
    }

    if (typeof obj === 'number') {
      if (!Number.isFinite(obj)) {
        throw new ValidationError('Invalid number value', 'INVALID_NUMBER')
      }
      return obj
    }

    if (typeof obj === 'boolean') {
      return obj
    }

    if (Array.isArray(obj)) {
      if (obj.length > INPUT_VALIDATION_CONFIG.maxArrayLength) {
        throw new ValidationError('Array too large', 'ARRAY_TOO_LARGE')
      }
      return obj.map(item => this.sanitizeObject(item, depth + 1))
    }

    if (typeof obj === 'object') {
      const sanitized: any = {}
      const keys = Object.keys(obj)
      
      if (keys.length > 100) { // Prevent object bombs
        throw new ValidationError('Too many object properties', 'OBJECT_TOO_LARGE')
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

  /**
   * Check for suspicious content patterns
   */
  static containsSuspiciousContent(input: string): boolean {
    const lowerInput = input.toLowerCase()
    
    // Check for suspicious keywords
    for (const keyword of INPUT_VALIDATION_CONFIG.suspiciousKeywords) {
      if (lowerInput.includes(keyword)) {
        return true
      }
    }

    // Check for dangerous patterns
    for (const pattern of INPUT_VALIDATION_CONFIG.dangerousPatterns) {
      if (pattern.test(input)) {
        return true
      }
    }

    return false
  }
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public field?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * SQL injection prevention utilities
 */
export class SQLInjectionPrevention {
  private static sqlKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'EXEC', 'EXECUTE', 'UNION', 'SCRIPT', 'DECLARE', 'CAST', 'CONVERT',
    'SUBSTRING', 'ASCII', 'CHAR', 'NCHAR', 'NVARCHAR', 'VARCHAR',
    'WAITFOR', 'DELAY', 'sp_', 'xp_', 'OPENROWSET', 'OPENDATASOURCE'
  ]

  private static sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|INTO|SET|WHERE|VALUES)\b)/i,
    /(\b(OR|AND)\b.*['"].*['"].*=.*['"].*['"])/i,
    /(UNION.*SELECT)/i,
    /(['"].*;\s*(DROP|DELETE|INSERT|UPDATE))/i,
    /(\/\*.*\*\/)/g,
    /(--.*$)/gm,
    /(\bsp_\w+|\bxp_\w+)/i
  ]

  /**
   * Check if input contains SQL injection attempts
   */
  static containsSQLInjection(input: string): boolean {
    // Check for SQL injection patterns
    for (const pattern of this.sqlPatterns) {
      if (pattern.test(input)) {
        return true
      }
    }

    // Check for common SQL injection indicators
    const indicators = [
      /'\s*(OR|AND)\s*'?\d*'?\s*=\s*'?\d*'?/i,
      /'\s*;\s*(DROP|DELETE|INSERT|UPDATE)/i,
      /UNION.*SELECT/i,
      /--.*$/m,
      /\/\*.*\*\//
    ]

    for (const indicator of indicators) {
      if (indicator.test(input)) {
        return true
      }
    }

    return false
  }

  /**
   * Check if SQL keyword appears in suspicious context
   */
  private static isSuspiciousContext(context: string, keyword: string): boolean {
    const suspiciousIndicators = ['=', ';', '--', '/*', '*/', 'OR', 'AND', 'UNION', 'WHERE', 'FROM']
    
    for (const indicator of suspiciousIndicators) {
      if (context.includes(indicator)) {
        return true
      }
    }

    return false
  }

  /**
   * Sanitize input to prevent SQL injection
   */
  static sanitizeForSQL(input: string): string {
    if (this.containsSQLInjection(input)) {
      throw new ValidationError('Input contains potential SQL injection', 'SQL_INJECTION_DETECTED')
    }

    return input
      .replace(/['";\\]/g, '') // Remove SQL metacharacters
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove SQL block comments start
      .replace(/\*\//g, '') // Remove SQL block comments end
      .trim()
  }
}

/**
 * XSS prevention utilities
 */
export class XSSPrevention {
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

  private static dangerousAttributes = [
    'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
    'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset',
    'onselect', 'onunload', 'onbeforeunload', 'onresize',
    'onscroll', 'ondrag', 'ondrop', 'onkeydown', 'onkeyup',
    'onkeypress', 'style', 'background', 'expression'
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

    // Check for dangerous attributes
    for (const attr of this.dangerousAttributes) {
      if (new RegExp('\\b' + attr + '\\s*=', 'i').test(input)) {
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
      throw new ValidationError('Input contains potential XSS', 'XSS_DETECTED')
    }

    // Simple XSS sanitization - remove all HTML tags and dangerous content
    // Repeat tag removal until fully sanitized
    let sanitized = input;
    let previous;
    do {
      previous = sanitized;
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    } while (sanitized !== previous);
    return sanitized
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/on\w+\s*=/gi, '')
  }
}

/**
 * Enhanced validation schemas with security checks
 */
export const secureValidationSchemas = {
  // Secure string validation
  secureString: (maxLength = 255) => z.string()
    .max(maxLength, 'String too long (max ' + maxLength + ' characters)')
    .refine(
      (val) => !AdvancedInputSanitizer.containsSuspiciousContent(val),
      { message: 'Input contains suspicious content' }
    )
    .refine(
      (val) => !SQLInjectionPrevention.containsSQLInjection(val),
      { message: 'Input contains potential SQL injection' }
    )
    .refine(
      (val) => !XSSPrevention.containsXSS(val),
      { message: 'Input contains potential XSS' }
    )
    .transform(AdvancedInputSanitizer.sanitizeText),

  // Secure email validation
  secureEmail: z.string()
    .trim()
    .toLowerCase()
    .email('Invalid email format')
    .max(255, 'Email too long'),

  // Secure URL validation
  secureURL: z.string()
    .url('Invalid URL format')
    .max(2048, 'URL too long')
    .transform(AdvancedInputSanitizer.sanitizeURL),

  // Secure HTML validation
  secureHTML: (allowedTags?: string[]) => z.string()
    .max(INPUT_VALIDATION_CONFIG.maxStringLength, 'HTML content too long')
    .transform((val) => AdvancedInputSanitizer.sanitizeHTML(val, allowedTags)),

  // Secure phone validation
  securePhone: z.string()
    .max(20, 'Phone number too long')
    .transform(AdvancedInputSanitizer.sanitizePhone),

  // Secure file name validation
  secureFileName: z.string()
    .max(255, 'File name too long')
    .transform(AdvancedInputSanitizer.sanitizeFileName),

  // Secure number validation
  secureNumber: z.number()
    .finite('Invalid number')
    .refine((val) => !isNaN(val), { message: 'Invalid number value' }),

  // Secure integer validation
  secureInteger: z.number()
    .int('Must be integer')
    .finite('Invalid integer'),

  // Secure boolean validation
  secureBoolean: z.boolean()
    .or(z.string().transform((val) => val === 'true'))
    .or(z.number().transform((val) => val === 1)),

  // Secure date validation
  secureDate: z.string()
    .datetime('Invalid date format')
    .or(z.date())
    .transform((val) => new Date(val)),

  // Secure array validation
  secureArray: <T>(itemSchema: z.ZodSchema<T>, maxLength = INPUT_VALIDATION_CONFIG.maxArrayLength) =>
    z.array(itemSchema)
      .max(maxLength, 'Array too large (max ' + maxLength + ' items)'),

  // Secure object validation
  secureObject: <T>(schema: z.ZodSchema<T>) => schema
    .refine(
      (val) => {
        try {
          AdvancedInputSanitizer.sanitizeObject(val)
          return true
        } catch {
          return false
        }
      },
      { message: 'Object contains invalid or dangerous content' }
    )
    .transform((val) => AdvancedInputSanitizer.sanitizeObject(val)),
}

/**
 * Request validation middleware with comprehensive security
 */
export async function validateSecureRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
  options: {
    sanitizeBody?: boolean
    checkSQLInjection?: boolean
    checkXSS?: boolean
    maxBodySize?: number
  } = {}
): Promise<{ success: true; data: T } | { success: false; error: string; code: string; details?: any }> {
  try {
    const {
      sanitizeBody = true,
      checkSQLInjection = true,
      checkXSS = true,
      maxBodySize = INPUT_VALIDATION_CONFIG.maxFileSize
    } = options

    // Check content length
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > maxBodySize) {
      return {
        success: false,
        error: 'Request body too large',
        code: 'BODY_TOO_LARGE'
      }
    }

    // Get and parse body
    let body: any
    try {
      const bodyText = await request.text()
      
      if (bodyText.length > maxBodySize) {
        return {
          success: false,
          error: 'Request body too large',
          code: 'BODY_TOO_LARGE'
        }
      }

      // Security checks on raw body
      if (checkSQLInjection && SQLInjectionPrevention.containsSQLInjection(bodyText)) {
        return {
          success: false,
          error: 'Request contains potential SQL injection',
          code: 'SQL_INJECTION_DETECTED'
        }
      }

      if (checkXSS && XSSPrevention.containsXSS(bodyText)) {
        return {
          success: false,
          error: 'Request contains potential XSS',
          code: 'XSS_DETECTED'
        }
      }

      body = JSON.parse(bodyText)
    } catch (error) {
      return {
        success: false,
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON'
      }
    }

    // Sanitize body if requested
    if (sanitizeBody) {
      try {
        body = AdvancedInputSanitizer.sanitizeObject(body)
      } catch (error) {
        if (error instanceof ValidationError) {
          return {
            success: false,
            error: error.message,
            code: error.code
          }
        }
        throw error
      }
    }

    // Validate with schema
    const result = schema.safeParse(body)

    if (!result.success) {
      return {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_FAILED',
        details: result.error.flatten().fieldErrors
      }
    }

    return {
      success: true,
      data: result.data
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation error',
      code: 'VALIDATION_ERROR'
    }
  }
}

/**
 * Validate query parameters with security checks
 */
export function validateSecureQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string; code: string; details?: any } {
  try {
    const params: Record<string, any> = {}
    
    for (const [key, value] of searchParams.entries()) {
      // Sanitize key and value
      const sanitizedKey = AdvancedInputSanitizer.sanitizeText(key)
      const sanitizedValue = AdvancedInputSanitizer.sanitizeText(value)
      
      // Security checks
      if (SQLInjectionPrevention.containsSQLInjection(sanitizedValue)) {
        return {
          success: false,
          error: 'Query parameter contains potential SQL injection',
          code: 'SQL_INJECTION_DETECTED'
        }
      }

      if (XSSPrevention.containsXSS(sanitizedValue)) {
        return {
          success: false,
          error: 'Query parameter contains potential XSS',
          code: 'XSS_DETECTED'
        }
      }

      params[sanitizedKey] = sanitizedValue
    }

    // Validate with schema
    const result = schema.safeParse(params)

    if (!result.success) {
      return {
        success: false,
        error: 'Query validation failed',
        code: 'QUERY_VALIDATION_FAILED',
        details: result.error.flatten().fieldErrors
      }
    }

    return {
      success: true,
      data: result.data
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Query validation error',
      code: 'QUERY_VALIDATION_ERROR'
    }
  }
}

/**
 * File upload validation with security checks
 */
export function validateSecureFileUpload(
  file: File,
  options: {
    allowedTypes?: string[]
    maxSize?: number
    checkContent?: boolean
  } = {}
): { valid: true } | { valid: false; error: string; code: string } {
  const {
    allowedTypes = [...INPUT_VALIDATION_CONFIG.allowedImageTypes, ...INPUT_VALIDATION_CONFIG.allowedDocumentTypes],
    maxSize = INPUT_VALIDATION_CONFIG.maxFileSize,
    checkContent = true
  } = options

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds limit of ' + (maxSize / 1024 / 1024) + 'MB',
      code: 'FILE_TOO_LARGE'
    }
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'File type ' + file.type + ' not allowed',
      code: 'FILE_TYPE_NOT_ALLOWED'
    }
  }

  // Sanitize and validate file name
  const sanitizedName = AdvancedInputSanitizer.sanitizeFileName(file.name)
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

// Classes are already exported individually above