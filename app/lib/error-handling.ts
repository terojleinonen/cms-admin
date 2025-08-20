/**
 * Error handling utilities and custom error classes
 */

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', isOperational: boolean = true) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      isOperational: this.isOperational,
      stack: this.stack
    }
  }
}

export class ValidationError extends AppError {
  public readonly details?: any

  constructor(message: string, details?: any) {
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

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', code: string = 'AUTHENTICATION_ERROR') {
    super(message, 401, code)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', code: string = 'FORBIDDEN') {
    super(message, 403, code)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
    super(message, 404, code)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', code: string = 'CONFLICT') {
    super(message, 409, code)
    this.name = 'ConflictError'
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR')
    this.name = 'DatabaseError'
  }
}

/**
 * Check if error is an AppError instance
 */
export function isAppError(error: any): error is AppError {
  return error instanceof AppError
}

/**
 * Error response formatter
 */
export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: any
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
      ...(isAppError && error.details && { details: error.details })
    },
    success: false
  }
}

export function createErrorResponse(error: any): ErrorResponse {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString(),
        ...(error.details && { details: error.details })
      },
      success: false
    }
  }
  
  if (error instanceof Error) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        statusCode: 500,
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
      statusCode: 500,
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
export function asyncHandler(fn: Function) {
  return async (...args: any[]) => {
    try {
      return await fn(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}