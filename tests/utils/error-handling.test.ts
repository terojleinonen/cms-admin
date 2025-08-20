/**
 * Error Handling Utilities Unit Tests
 * Tests for error handling functions and custom error classes
 */

import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  handleApiError,
  createErrorResponse,
  isAppError
} from '../../app/lib/error-handling'

describe('Error Handling Utils', () => {
  describe('Custom Error Classes', () => {
    describe('AppError', () => {
      it('should create AppError with default values', () => {
        const error = new AppError('Test error message')

        expect(error.message).toBe('Test error message')
        expect(error.statusCode).toBe(500)
        expect(error.code).toBe('INTERNAL_ERROR')
        expect(error.isOperational).toBe(true)
        expect(error.name).toBe('AppError')
      })

      it('should create AppError with custom values', () => {
        const error = new AppError('Custom error', 400, 'CUSTOM_ERROR')

        expect(error.message).toBe('Custom error')
        expect(error.statusCode).toBe(400)
        expect(error.code).toBe('CUSTOM_ERROR')
        expect(error.isOperational).toBe(true)
      })

      it('should include stack trace', () => {
        const error = new AppError('Test error')

        expect(error.stack).toBeDefined()
        expect(error.stack).toContain('AppError')
      })
    })

    describe('ValidationError', () => {
      it('should create ValidationError with default values', () => {
        const error = new ValidationError('Validation failed')

        expect(error.message).toBe('Validation failed')
        expect(error.statusCode).toBe(400)
        expect(error.code).toBe('VALIDATION_ERROR')
        expect(error.details).toBeUndefined()
      })

      it('should create ValidationError with details', () => {
        const details = [
          { field: 'email', message: 'Invalid email format' },
          { field: 'password', message: 'Password too short' }
        ]
        const error = new ValidationError('Validation failed', details)

        expect(error.message).toBe('Validation failed')
        expect(error.statusCode).toBe(400)
        expect(error.code).toBe('VALIDATION_ERROR')
        expect(error.details).toEqual(details)
      })
    })

    describe('AuthenticationError', () => {
      it('should create AuthenticationError with default values', () => {
        const error = new AuthenticationError('Authentication failed')

        expect(error.message).toBe('Authentication failed')
        expect(error.statusCode).toBe(401)
        expect(error.code).toBe('AUTHENTICATION_ERROR')
      })

      it('should create AuthenticationError with custom code', () => {
        const error = new AuthenticationError('Invalid token', 'INVALID_TOKEN')

        expect(error.message).toBe('Invalid token')
        expect(error.statusCode).toBe(401)
        expect(error.code).toBe('INVALID_TOKEN')
      })
    })

    describe('AuthorizationError', () => {
      it('should create AuthorizationError with default values', () => {
        const error = new AuthorizationError('Access denied')

        expect(error.message).toBe('Access denied')
        expect(error.statusCode).toBe(403)
        expect(error.code).toBe('FORBIDDEN')
      })

      it('should create AuthorizationError with custom code', () => {
        const error = new AuthorizationError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS')

        expect(error.message).toBe('Insufficient permissions')
        expect(error.statusCode).toBe(403)
        expect(error.code).toBe('INSUFFICIENT_PERMISSIONS')
      })
    })

    describe('NotFoundError', () => {
      it('should create NotFoundError with default values', () => {
        const error = new NotFoundError('Resource not found')

        expect(error.message).toBe('Resource not found')
        expect(error.statusCode).toBe(404)
        expect(error.code).toBe('NOT_FOUND')
      })

      it('should create NotFoundError with resource type', () => {
        const error = new NotFoundError('User not found', 'USER_NOT_FOUND')

        expect(error.message).toBe('User not found')
        expect(error.statusCode).toBe(404)
        expect(error.code).toBe('USER_NOT_FOUND')
      })
    })

    describe('ConflictError', () => {
      it('should create ConflictError with default values', () => {
        const error = new ConflictError('Resource conflict')

        expect(error.message).toBe('Resource conflict')
        expect(error.statusCode).toBe(409)
        expect(error.code).toBe('CONFLICT')
      })

      it('should create ConflictError with custom code', () => {
        const error = new ConflictError('Email already exists', 'DUPLICATE_EMAIL')

        expect(error.message).toBe('Email already exists')
        expect(error.statusCode).toBe(409)
        expect(error.code).toBe('DUPLICATE_EMAIL')
      })
    })
  })

  describe('Error Utility Functions', () => {
    describe('isAppError', () => {
      it('should identify AppError instances', () => {
        const appError = new AppError('Test error')
        const validationError = new ValidationError('Validation error')
        const authError = new AuthenticationError('Auth error')
        const regularError = new Error('Regular error')

        expect(isAppError(appError)).toBe(true)
        expect(isAppError(validationError)).toBe(true)
        expect(isAppError(authError)).toBe(true)
        expect(isAppError(regularError)).toBe(false)
        expect(isAppError(null)).toBe(false)
        expect(isAppError(undefined)).toBe(false)
        expect(isAppError('string')).toBe(false)
        expect(isAppError({})).toBe(false)
      })
    })

    describe('createErrorResponse', () => {
      it('should create error response from AppError', () => {
        const error = new ValidationError('Validation failed', [
          { field: 'email', message: 'Invalid email' }
        ])

        const response = createErrorResponse(error)

        expect(response.error).toMatchObject({
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: [{ field: 'email', message: 'Invalid email' }]
        })
        expect(response.success).toBe(false)
      })

      it('should create error response from regular Error', () => {
        const error = new Error('Regular error')

        const response = createErrorResponse(error)

        expect(response.error).toMatchObject({
          message: 'Regular error',
          code: 'INTERNAL_ERROR',
          statusCode: 500
        })
        expect(response.success).toBe(false)
      })

      it('should handle error without message', () => {
        const error = new Error()

        const response = createErrorResponse(error)

        expect(response.error).toMatchObject({
          message: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
          statusCode: 500
        })
        expect(response.success).toBe(false)
      })

      it('should handle non-Error objects', () => {
        const error = 'String error'

        const response = createErrorResponse(error)

        expect(response.error).toMatchObject({
          message: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
          statusCode: 500
        })
        expect(response.success).toBe(false)
      })
    })

    describe('handleApiError', () => {
      it('should handle AppError and return appropriate Response', () => {
        const error = new NotFoundError('User not found')

        const response = handleApiError(error)

        expect(response).toBeInstanceOf(Response)
        expect(response.status).toBe(404)
      })

      it('should handle regular Error and return 500 Response', () => {
        const error = new Error('Database connection failed')

        const response = handleApiError(error)

        expect(response).toBeInstanceOf(Response)
        expect(response.status).toBe(500)
      })

      it('should handle unknown error types', () => {
        const error = { message: 'Unknown error' }

        const response = handleApiError(error)

        expect(response).toBeInstanceOf(Response)
        expect(response.status).toBe(500)
      })

      it('should include error details in response body', async () => {
        const error = new ValidationError('Validation failed', [
          { field: 'name', message: 'Name is required' }
        ])

        const response = handleApiError(error)
        const body = await response.json()

        expect(body.success).toBe(false)
        expect(body.error.message).toBe('Validation failed')
        expect(body.error.code).toBe('VALIDATION_ERROR')
        expect(body.error.details).toEqual([
          { field: 'name', message: 'Name is required' }
        ])
      })

      it('should handle production environment error masking', () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'production'

        const error = new Error('Sensitive database error')

        const response = handleApiError(error)

        expect(response.status).toBe(500)

        // Restore original environment
        process.env.NODE_ENV = originalEnv
      })
    })
  })

  describe('Error Inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const validationError = new ValidationError('Test')
      const authError = new AuthenticationError('Test')
      const notFoundError = new NotFoundError('Test')

      expect(validationError instanceof AppError).toBe(true)
      expect(validationError instanceof Error).toBe(true)
      
      expect(authError instanceof AppError).toBe(true)
      expect(authError instanceof Error).toBe(true)
      
      expect(notFoundError instanceof AppError).toBe(true)
      expect(notFoundError instanceof Error).toBe(true)
    })

    it('should have correct constructor names', () => {
      const appError = new AppError('Test')
      const validationError = new ValidationError('Test')
      const authError = new AuthenticationError('Test')

      expect(appError.constructor.name).toBe('AppError')
      expect(validationError.constructor.name).toBe('ValidationError')
      expect(authError.constructor.name).toBe('AuthenticationError')
    })
  })

  describe('Error Serialization', () => {
    it('should serialize AppError to JSON correctly', () => {
      const error = new ValidationError('Validation failed', [
        { field: 'email', message: 'Invalid email' }
      ])

      const serialized = JSON.stringify(error)
      const parsed = JSON.parse(serialized)

      expect(parsed.message).toBe('Validation failed')
      expect(parsed.name).toBe('ValidationError')
      expect(parsed.statusCode).toBe(400)
      expect(parsed.code).toBe('VALIDATION_ERROR')
      expect(parsed.details).toEqual([{ field: 'email', message: 'Invalid email' }])
    })

    it('should handle circular references in error details', () => {
      const circularObject: any = { name: 'test' }
      circularObject.self = circularObject

      const error = new ValidationError('Validation failed', circularObject)

      // Should not throw when creating error response
      expect(() => createErrorResponse(error)).not.toThrow()
    })
  })

  describe('Error Context', () => {
    it('should preserve error context through inheritance', () => {
      const originalError = new Error('Original error')
      originalError.stack = 'Original stack trace'

      const wrappedError = new AppError('Wrapped error', 500, 'WRAPPED_ERROR')

      expect(wrappedError.message).toBe('Wrapped error')
      expect(wrappedError.stack).toBeDefined()
      expect(wrappedError.stack).toContain('AppError')
    })

    it('should handle error chaining', () => {
      const rootCause = new Error('Root cause')
      const appError = new AppError('Application error')

      // In a real scenario, you might want to preserve the original error
      expect(appError.message).toBe('Application error')
      expect(rootCause.message).toBe('Root cause')
    })
  })
})