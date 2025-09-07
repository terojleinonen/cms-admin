/**
 * Error handling utilities and custom error classes for Kin Workspace CMS
 * 
 * This module provides a comprehensive error handling system with:
 * - Custom error classes for different error types
 * - Standardized error response formatting
 * - Error middleware for API routes
 * - Type-safe error handling utilities
 * 
 * The error system follows HTTP status code conventions and provides
 * consistent error responses across the application.
 * 
 * @module ErrorHandling
 * @version 1.0.0
 * @author Kin Workspace CMS Team
 * @since 2024-01-01
 * 
 * @example
 * ```typescript
 * import { ValidationError, handleApiError } from '@/lib/error-handling'
 * 
 * // Throw a validation error
 * throw new ValidationError('Invalid email format', { field: 'email' })
 * 
 * // Handle errors in API routes
 * export async function POST(request: Request) {
 *   try {
 *     // ... your code
 *   } catch (error) {
 *     return handleApiError(error)
 *   }
 * }
 * ```
 */

/**
 * Base application error class
 * 
 * Extends the native Error class with additional properties for HTTP status codes,
 * error codes, and operational error classification. All custom errors should
 * extend this class to maintain consistency.
 * 
 * @class AppError
 * @extends Error
 */
export class AppError extends Error {
  /** HTTP status code associated with this error */
  public readonly statusCode: number
  /** Application-specific error code for client handling */
  public readonly code: string
  /** Whether this is an operational error (expected) vs programming error */
  public readonly isOperational: boolean

  /**
   * Create a new application error
   * 
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code (default: 500)
   * @param code - Application error code (default: 'INTERNAL_ERROR')
   * @param isOperational - Whether this is an operational error (default: true)
   */
  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', isOperational: boolean = true) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational

    // Maintain proper stack trace for debugging
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Convert error to JSON for API responses
   * @returns Serializable error object
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      isOperational: this.isOperational,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    }
  }
}

/**
 * Validation error for input validation failures
 * 
 * Used when user input fails validation rules. Includes detailed
 * validation error information for client-side error display.
 * 
 * @class ValidationError
 * @extends AppError
 */
export class ValidationError extends AppError {
  /** Detailed validation error information */
  public readonly details?: unknown

  /**
   * Create a validation error
   * @param message - Error message
   * @param details - Detailed validation errors (e.g., field-specific errors)
   */
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
    this.details = details
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: this.details
    }
  }
}

/**
 * Authentication error for login/session failures
 * 
 * Used when authentication fails due to invalid credentials,
 * expired sessions, or missing authentication.
 * 
 * @class AuthenticationError
 * @extends AppError
 */
export class AuthenticationError extends AppError {
  /**
   * Create an authentication error
   * @param message - Error message (default: 'Authentication failed')
   * @param code - Specific error code (default: 'AUTHENTICATION_ERROR')
   */
  constructor(message: string = 'Authentication failed', code: string = 'AUTHENTICATION_ERROR') {
    super(message, 401, code)
    this.name = 'AuthenticationError'
  }
}

/**
 * Authorization error for permission failures
 * 
 * Used when an authenticated user lacks sufficient permissions
 * to perform a requested action.
 * 
 * @class AuthorizationError
 * @extends AppError
 */
export class AuthorizationError extends AppError {
  /**
   * Create an authorization error
   * @param message - Error message (default: 'Insufficient permissions')
   * @param code - Specific error code (default: 'FORBIDDEN')
   */
  constructor(message: string = 'Insufficient permissions', code: string = 'FORBIDDEN') {
    super(message, 403, code)
    this.name = 'AuthorizationError'
  }
}

/**
 * Not found error for missing resources
 * 
 * Used when a requested resource (user, product, page, etc.)
 * cannot be found in the system.
 * 
 * @class NotFoundError
 * @extends AppError
 */
export class NotFoundError extends AppError {
  /**
   * Create a not found error
   * @param message - Error message (default: 'Resource not found')
   * @param code - Specific error code (default: 'NOT_FOUND')
   */
  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
    super(message, 404, code)
    this.name = 'NotFoundError'
  }
}

/**
 * Conflict error for resource conflicts
 * 
 * Used when an operation conflicts with the current state of a resource,
 * such as duplicate email addresses or concurrent modifications.
 * 
 * @class ConflictError
 * @extends AppError
 */
export class ConflictError extends AppError {
  /**
   * Create a conflict error
   * @param message - Error message (default: 'Resource conflict')
   * @param code - Specific error code (default: 'CONFLICT')
   */
  constructor(message: string = 'Resource conflict', code: string = 'CONFLICT') {
    super(message, 409, code)
    this.name = 'ConflictError'
  }
}

/**
 * Database error for database operation failures
 * 
 * Used when database operations fail due to connection issues,
 * constraint violations, or other database-related problems.
 * 
 * @class DatabaseError
 * @extends AppError
 */
export class DatabaseError extends AppError {
  /**
   * Create a database error
   * @param message - Error message (default: 'Database operation failed')
   */
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR')
    this.name = 'DatabaseError'
  }
}

/**
 * Check if error is an AppError instance
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Error response formatter
 */
export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: unknown
    timestamp: string
  }
  success?: boolean
}

export function formatErrorResponse(error: AppError | Error): ErrorResponse {
  const isAppError = error instanceof AppError
  
  return {
    error: {
      code: isAppError ? error.code : 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      ...((error instanceof ValidationError && error.details) ? { details: error.details } : {})
    },
    success: false
  }
}

export function createErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString(),
        ...((error instanceof ValidationError && error.details) ? { details: error.details } : {})
      },
      success: false
    }
  }
  
  if (error instanceof Error) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
      },
      success: false
    }
  }
  
  // Handle non-Error objects
  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    },
    success: false
  }
}

/**
 * Error handler middleware for API routes
 */
export function handleApiError(error: unknown): Response {
  console.error('API Error:', error)

  if (error instanceof AppError) {
    return new Response(
      JSON.stringify(formatErrorResponse(error)),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  // Handle unknown errors
  const genericError = new AppError('Internal server error')
  return new Response(
    JSON.stringify(formatErrorResponse(genericError)),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Async error wrapper for API route handlers
 */
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return async (...args: Parameters<T>): Promise<ReturnType<T> | Response> => {
    try {
      return await fn(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}