/**
 * Comprehensive API Security Hardening
 * Provides input validation, sanitization, CSRF protection, and security headers
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SecurityService } from './security'
import { rateLimit, rateLimitConfigs } from './rate-limit'

// Server-safe HTML sanitization
let DOMPurify: any = null;

// Only import DOMPurify on the server side
if (typeof window === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    DOMPurify = require('isomorphic-dompurify');
  } catch (error) {
    console.warn('DOMPurify not available, using basic sanitization');
  }
}

// Security configuration
export const SECURITY_CONFIG = {
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  maxStringLength: 10000,
  maxArrayLength: 1000,
  maxObjectDepth: 10,
  allowedFileTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv'
  ],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  csrfTokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
}

// Common validation schemas
export const commonSchemas = {
  id: z.string().uuid('Invalid ID format'),
  email: z.string().email('Invalid email format').max(255),
  name: z.string().min(1).max(255).regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Invalid characters in name'),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9\-]+$/, 'Invalid slug format'),
  url: z.string().url('Invalid URL format').max(2048),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/\d/, 'Password must contain number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain special character'),
  text: z.string().max(SECURITY_CONFIG.maxStringLength),
  richText: z.string().max(SECURITY_CONFIG.maxStringLength * 2),
  number: z.number().finite('Invalid number'),
  positiveNumber: z.number().positive('Must be positive number'),
  integer: z.number().int('Must be integer'),
  boolean: z.boolean(),
  date: z.string().datetime('Invalid date format'),
  array: z.array(z.any()).max(SECURITY_CONFIG.maxArrayLength),
}

// Input sanitization functions
export class InputSanitizer {
  /**
   * Sanitize HTML content
   */
  static sanitizeHTML(input: string): string {
    if (DOMPurify) {
      return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false,
      });
    }
    
    // Fallback: remove all HTML tags and potentially dangerous protocols (strict fallback)
    // Repeatedly apply replacements until the string stabilizes (prevents incomplete multi-character sanitization)
    let sanitized = input;
    let previous;
    do {
      previous = sanitized;
      sanitized = sanitized
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .replace(/data:/gi, '')      // Remove data: URLs
        .replace(/vbscript:/gi, '');  // Remove vbscript: URLs
    } while (sanitized !== previous);
    return sanitized.trim();
  }

  /**
   * Sanitize plain text
   */
  static sanitizeText(input: string): string {
    // Repeatedly apply replacements until the string stabilizes (prevents incomplete multi-character sanitization)
    let sanitized = input;
    let previous;
    do {
      previous = sanitized;
      sanitized = sanitized
        .replace(/[<>]/g, '') // Remove all angle brackets to prevent incomplete tag removal
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .replace(/data:/gi, '') // Remove data: URLs
        .replace(/vbscript:/gi, ''); // Remove vbscript: URLs
    } while (sanitized !== previous);
    return sanitized.trim();
  }

  /**
   * Sanitize SQL input (basic protection)
   */
  static sanitizeSQL(input: string): string {
    return input
      .replace(/['";\\]/g, '') // Remove SQL injection characters
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove SQL block comments
      .replace(/\*\//g, '')
      .trim()
  }

  /**
   * Sanitize file name
   */
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9\-_.]/g, '') // Only allow safe characters
      .replace(/\.{2,}/g, '.') // Remove multiple dots
      .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
      .substring(0, 255) // Limit length
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject(obj: any, depth = 0): any {
    if (depth > SECURITY_CONFIG.maxObjectDepth) {
      throw new Error('Object depth limit exceeded')
    }

    if (obj === null || obj === undefined) {
      return obj
    }

    if (typeof obj === 'string') {
      return this.sanitizeText(obj)
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj
    }

    if (Array.isArray(obj)) {
      if (obj.length > SECURITY_CONFIG.maxArrayLength) {
        throw new Error('Array length limit exceeded')
      }
      return obj.map(item => this.sanitizeObject(item, depth + 1))
    }

    if (typeof obj === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeText(key)
        sanitized[sanitizedKey] = this.sanitizeObject(value, depth + 1)
      }
      return sanitized
    }

    return obj
  }
}

// CSRF Protection
export class CSRFProtection {
  private static tokens = new Map<string, { token: string; expires: number }>()

  /**
   * Generate CSRF token
   */
  static generateToken(sessionId: string): string {
    const token = crypto.randomUUID()
    const expires = Date.now() + SECURITY_CONFIG.csrfTokenExpiry

    this.tokens.set(sessionId, { token, expires })
    
    // Clean up expired tokens
    this.cleanupExpiredTokens()
    
    return token
  }

  /**
   * Validate CSRF token
   */
  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId)
    
    if (!stored) {
      return false
    }

    if (Date.now() > stored.expires) {
      this.tokens.delete(sessionId)
      return false
    }

    return stored.token === token
  }

  /**
   * Clean up expired tokens
   */
  private static cleanupExpiredTokens(): void {
    const now = Date.now()
    for (const [sessionId, data] of this.tokens.entries()) {
      if (now > data.expires) {
        this.tokens.delete(sessionId)
      }
    }
  }
}

// Request validation middleware
export interface SecurityValidationOptions {
  requireCSRF?: boolean
  maxRequestSize?: number
  allowedMethods?: string[]
  customValidation?: (request: NextRequest) => Promise<boolean>
  skipRateLimit?: boolean
  rateLimitConfig?: 'public' | 'sensitive' | { limit: number; windowMs: number }
}

/**
 * Comprehensive API security middleware
 */
export function withAPISecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: SecurityValidationOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const securityService = SecurityService.getInstance()
    const startTime = Date.now()
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const method = request.method
    const pathname = new URL(request.url).pathname

    try {
      // 1. Method validation
      if (options.allowedMethods && !options.allowedMethods.includes(method)) {
        await securityService.logSecurityEvent(
          'blocked_request',
          'medium',
          `Method not allowed: ${method}`,
          ip,
          { method, pathname, reason: 'method_not_allowed' },
          undefined,
          userAgent
        )
        
        return NextResponse.json(
          {
            error: {
              code: 'METHOD_NOT_ALLOWED',
              message: `Method ${method} not allowed`,
              timestamp: new Date().toISOString(),
            },
            success: false,
          },
          { 
            status: 405,
            headers: {
              'Allow': options.allowedMethods.join(', '),
              ...getSecurityHeaders()
            }
          }
        )
      }

      // 2. Rate limiting
      if (!options.skipRateLimit) {
        const rateLimitConfig = typeof options.rateLimitConfig === 'string' 
          ? rateLimitConfigs[options.rateLimitConfig]
          : options.rateLimitConfig || rateLimitConfigs.public

        const rateLimitResult = await rateLimit(request, rateLimitConfig)
        
        if (!rateLimitResult.success) {
          await securityService.logSecurityEvent(
            'rate_limit_exceeded',
            'medium',
            'Rate limit exceeded',
            ip,
            { 
              limit: rateLimitResult.limit,
              retryAfter: rateLimitResult.retryAfter,
              pathname 
            },
            undefined,
            userAgent
          )

          return NextResponse.json(
            {
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests',
                retryAfter: rateLimitResult.retryAfter,
                timestamp: new Date().toISOString(),
              },
              success: false,
            },
            { 
              status: 429,
              headers: {
                'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
                'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': Math.ceil(rateLimitResult.reset / 1000).toString(),
                ...getSecurityHeaders()
              }
            }
          )
        }
      }

      // 3. Request size validation
      const contentLength = request.headers.get('content-length')
      const maxSize = options.maxRequestSize || SECURITY_CONFIG.maxRequestSize
      
      if (contentLength && parseInt(contentLength) > maxSize) {
        await securityService.logSecurityEvent(
          'blocked_request',
          'medium',
          'Request size too large',
          ip,
          { contentLength: parseInt(contentLength), maxSize, pathname },
          undefined,
          userAgent
        )

        return NextResponse.json(
          {
            error: {
              code: 'REQUEST_TOO_LARGE',
              message: 'Request size exceeds limit',
              maxSize,
              timestamp: new Date().toISOString(),
            },
            success: false,
          },
          { 
            status: 413,
            headers: getSecurityHeaders()
          }
        )
      }

      // 4. Content-Type validation for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const contentType = request.headers.get('content-type')
        
        if (!contentType || (!contentType.includes('application/json') && 
                            !contentType.includes('multipart/form-data') &&
                            !contentType.includes('application/x-www-form-urlencoded'))) {
          await securityService.logSecurityEvent(
            'input_validation_failed',
            'medium',
            'Invalid content type',
            ip,
            { contentType, method, pathname },
            undefined,
            userAgent
          )

          return NextResponse.json(
            {
              error: {
                code: 'INVALID_CONTENT_TYPE',
                message: 'Invalid or missing content type',
                timestamp: new Date().toISOString(),
              },
              success: false,
            },
            { 
              status: 400,
              headers: getSecurityHeaders()
            }
          )
        }
      }

      // 5. CSRF protection for state-changing operations
      if (options.requireCSRF && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrfToken = request.headers.get('x-csrf-token')
        const sessionId = request.headers.get('x-session-id') || 'anonymous'

        if (!csrfToken || !CSRFProtection.validateToken(sessionId, csrfToken)) {
          await securityService.logSecurityEvent(
            'csrf_violation',
            'high',
            'CSRF token validation failed',
            ip,
            { method, pathname, hasToken: !!csrfToken },
            undefined,
            userAgent
          )

          return NextResponse.json(
            {
              error: {
                code: 'CSRF_TOKEN_INVALID',
                message: 'CSRF token validation failed',
                timestamp: new Date().toISOString(),
              },
              success: false,
            },
            { 
              status: 403,
              headers: getSecurityHeaders()
            }
          )
        }
      }

      // 6. Custom validation
      if (options.customValidation) {
        const isValid = await options.customValidation(request)
        if (!isValid) {
          await securityService.logSecurityEvent(
            'input_validation_failed',
            'medium',
            'Custom validation failed',
            ip,
            { method, pathname },
            undefined,
            userAgent
          )

          return NextResponse.json(
            {
              error: {
                code: 'VALIDATION_FAILED',
                message: 'Request validation failed',
                timestamp: new Date().toISOString(),
              },
              success: false,
            },
            { 
              status: 400,
              headers: getSecurityHeaders()
            }
          )
        }
      }

      // 7. Execute the handler
      const response = await handler(request)

      // 8. Add security headers to response
      const securityHeaders = getSecurityHeaders()
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      // 9. Log successful request
      const duration = Date.now() - startTime
      await securityService.logSecurityEvent(
        'api_request',
        'low',
        'API request processed successfully',
        ip,
        { method, pathname, duration, status: response.status },
        undefined,
        userAgent
      )

      return response

    } catch (error) {
      // Log security error
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      await securityService.logSecurityEvent(
        'api_request',
        'high',
        `API request failed: ${errorMessage}`,
        ip,
        { method, pathname, duration, error: errorMessage },
        undefined,
        userAgent
      )

      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            timestamp: new Date().toISOString(),
          },
          success: false,
        },
        { 
          status: 500,
          headers: getSecurityHeaders()
        }
      )
    }
  }
}

/**
 * Validate and sanitize request body
 */
export async function validateAndSanitizeBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string; details?: any }> {
  try {
    // Get request body
    const body = await request.json()

    // Check for potential JSON bombs
    const bodyString = JSON.stringify(body)
    if (bodyString.length > SECURITY_CONFIG.maxRequestSize) {
      return {
        success: false,
        error: 'Request body too large'
      }
    }

    // Sanitize the body
    const sanitizedBody = InputSanitizer.sanitizeObject(body)

    // Validate with schema
    const result = schema.safeParse(sanitizedBody)

    if (!result.success) {
      return {
        success: false,
        error: 'Validation failed',
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
      error: error instanceof Error ? error.message : 'Invalid request body'
    }
  }
}

/**
 * Get comprehensive security headers
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // XSS protection
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // DNS prefetch control
    'X-DNS-Prefetch-Control': 'off',
    
    // Download options
    'X-Download-Options': 'noopen',
    
    // Cross-domain policies
    'X-Permitted-Cross-Domain-Policies': 'none',
    
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "media-src 'self'",
      "object-src 'none'",
      "child-src 'none'",
      "worker-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "manifest-src 'self'"
    ].join('; '),
    
    // HSTS (only in production)
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }),
    
    // Remove server information
    'Server': '',
    
    // API-specific headers
    'X-API-Version': '1.0',
    'X-Security-Monitored': 'true',
    'X-Timestamp': new Date().toISOString(),
  }
}

/**
 * File upload security validation
 */
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > SECURITY_CONFIG.maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds limit of ${SECURITY_CONFIG.maxFileSize / 1024 / 1024}MB`
    }
  }

  // Check file type
  if (!SECURITY_CONFIG.allowedFileTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed`
    }
  }

  // Check file name
  const sanitizedName = InputSanitizer.sanitizeFileName(file.name)
  if (sanitizedName !== file.name) {
    return {
      valid: false,
      error: 'Invalid characters in file name'
    }
  }

  // Check for potential malicious files
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.js', '.vbs', '.jar']
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  
  if (dangerousExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: 'File type not allowed for security reasons'
    }
  }

  return { valid: true }
}

/**
 * Create standardized error response
 */
export function createSecurityErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      success: false,
    },
    { 
      status,
      headers: getSecurityHeaders()
    }
  )
}