/**
 * Comprehensive Validation Middleware
 * Provides server-side input validation, sanitization, and security checks
 * for all API endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  validateSecureRequest, 
  validateSecureQuery, 
  ValidationError,
  AdvancedInputSanitizer,
  SQLInjectionPrevention,
  XSSPrevention
} from './input-validation'
import { SecurityService } from './security'
import { getSecurityHeaders } from './api-security'

export interface ValidationMiddlewareOptions {
  bodySchema?: z.ZodSchema<any>
  querySchema?: z.ZodSchema<any>
  paramsSchema?: z.ZodSchema<any>
  requireBody?: boolean
  sanitizeInputs?: boolean
  checkSQLInjection?: boolean
  checkXSS?: boolean
  maxBodySize?: number
  allowedMethods?: string[]
  customValidation?: (request: NextRequest, data: any) => Promise<boolean | string>
}

export interface ValidatedRequestData {
  body?: any
  query?: any
  params?: any
}

/**
 * Main validation middleware wrapper
 */
export function withInputValidation(
  handler: (request: NextRequest, data: ValidatedRequestData) => Promise<NextResponse>,
  options: ValidationMiddlewareOptions = {}
) {
  return async (request: NextRequest, context?: { params: any }): Promise<NextResponse> => {
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
        
        return createValidationErrorResponse(
          'METHOD_NOT_ALLOWED',
          `Method ${method} not allowed`,
          405,
          { allowedMethods: options.allowedMethods }
        )
      }

      const validatedData: ValidatedRequestData = {}

      // 2. Validate request body
      if (options.bodySchema || options.requireBody) {
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
          if (options.bodySchema) {
            const bodyValidation = await validateSecureRequest(request, options.bodySchema, {
              sanitizeBody: options.sanitizeInputs ?? true,
              checkSQLInjection: options.checkSQLInjection ?? true,
              checkXSS: options.checkXSS ?? true,
              maxBodySize: options.maxBodySize
            })

            if (!bodyValidation.success) {
              await securityService.logSecurityEvent(
                'input_validation_failed',
                'medium',
                `Body validation failed: ${bodyValidation.error}`,
                ip,
                { 
                  method, 
                  pathname, 
                  error: bodyValidation.error,
                  code: bodyValidation.code,
                  details: bodyValidation.details 
                },
                undefined,
                userAgent
              )

              return createValidationErrorResponse(
                bodyValidation.code,
                bodyValidation.error,
                400,
                bodyValidation.details
              )
            }

            validatedData.body = bodyValidation.data
          }
        } else if (options.requireBody) {
          return createValidationErrorResponse(
            'BODY_REQUIRED',
            'Request body is required for this endpoint',
            400
          )
        }
      }

      // 3. Validate query parameters
      if (options.querySchema) {
        const url = new URL(request.url)
        const queryValidation = validateSecureQuery(url.searchParams, options.querySchema)

        if (!queryValidation.success) {
          await securityService.logSecurityEvent(
            'input_validation_failed',
            'medium',
            `Query validation failed: ${queryValidation.error}`,
            ip,
            { 
              method, 
              pathname, 
              error: queryValidation.error,
              code: queryValidation.code,
              details: queryValidation.details 
            },
            undefined,
            userAgent
          )

          return createValidationErrorResponse(
            queryValidation.code,
            queryValidation.error,
            400,
            queryValidation.details
          )
        }

        validatedData.query = queryValidation.data
      }

      // 4. Validate URL parameters
      if (options.paramsSchema && context?.params) {
        try {
          // Sanitize params
          const sanitizedParams = AdvancedInputSanitizer.sanitizeObject(context.params)
          
          // Validate with schema
          const paramsResult = options.paramsSchema.safeParse(sanitizedParams)
          
          if (!paramsResult.success) {
            await securityService.logSecurityEvent(
              'input_validation_failed',
              'medium',
              'URL parameters validation failed',
              ip,
              { 
                method, 
                pathname, 
                params: context.params,
                errors: paramsResult.error.flatten().fieldErrors 
              },
              undefined,
              userAgent
            )

            return createValidationErrorResponse(
              'PARAMS_VALIDATION_FAILED',
              'URL parameters validation failed',
              400,
              paramsResult.error.flatten().fieldErrors
            )
          }

          validatedData.params = paramsResult.data
        } catch (error) {
          if (error instanceof ValidationError) {
            return createValidationErrorResponse(
              error.code,
              error.message,
              400
            )
          }
          throw error
        }
      }

      // 5. Custom validation
      if (options.customValidation) {
        try {
          const customResult = await options.customValidation(request, validatedData)
          
          if (customResult !== true) {
            const errorMessage = typeof customResult === 'string' ? customResult : 'Custom validation failed'
            
            await securityService.logSecurityEvent(
              'input_validation_failed',
              'medium',
              `Custom validation failed: ${errorMessage}`,
              ip,
              { method, pathname, data: validatedData },
              undefined,
              userAgent
            )

            return createValidationErrorResponse(
              'CUSTOM_VALIDATION_FAILED',
              errorMessage,
              400
            )
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Custom validation error'
          
          await securityService.logSecurityEvent(
            'input_validation_failed',
            'high',
            `Custom validation error: ${errorMessage}`,
            ip,
            { method, pathname, error: errorMessage },
            undefined,
            userAgent
          )

          return createValidationErrorResponse(
            'CUSTOM_VALIDATION_ERROR',
            'Custom validation failed',
            500
          )
        }
      }

      // 6. Execute the handler with validated data
      const response = await handler(request, validatedData)

      // 7. Add security headers
      const securityHeaders = getSecurityHeaders()
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      // 8. Log successful validation
      const duration = Date.now() - startTime
      await securityService.logSecurityEvent(
        'input_validation_success',
        'low',
        'Input validation completed successfully',
        ip,
        { method, pathname, duration, status: response.status },
        undefined,
        userAgent
      )

      return response

    } catch (error) {
      // Log validation error
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      await securityService.logSecurityEvent(
        'input_validation_error',
        'high',
        `Input validation error: ${errorMessage}`,
        ip,
        { method, pathname, duration, error: errorMessage },
        undefined,
        userAgent
      )

      return createValidationErrorResponse(
        'VALIDATION_ERROR',
        'Input validation failed',
        500
      )
    }
  }
}

/**
 * Specialized validation middleware for different endpoint types
 */

/**
 * Validation middleware for CRUD operations
 */
export function withCRUDValidation<
  TCreate = any,
  TUpdate = any,
  TQuery = any,
  TParams = any
>(schemas: {
  create?: z.ZodSchema<TCreate>
  update?: z.ZodSchema<TUpdate>
  query?: z.ZodSchema<TQuery>
  params?: z.ZodSchema<TParams>
}) {
  return (
    handler: (request: NextRequest, data: ValidatedRequestData) => Promise<NextResponse>
  ) => {
    return withInputValidation((request, data) => {
      return handler(request, data)
    }, {
      bodySchema: getSchemaForMethod(schemas, 'POST'), // Default to create schema
      querySchema: schemas.query,
      paramsSchema: schemas.params,
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      sanitizeInputs: true,
      checkSQLInjection: true,
      checkXSS: true,
      customValidation: async (request, data) => {
        // Dynamically validate based on method
        const method = request.method
        if (method === 'POST' && schemas.create) {
          const result = schemas.create.safeParse(data.body)
          if (!result.success) {
            return `Create validation failed: ${result.error.message}`
          }
        } else if (['PUT', 'PATCH'].includes(method) && schemas.update) {
          const result = schemas.update.safeParse(data.body)
          if (!result.success) {
            return `Update validation failed: ${result.error.message}`
          }
        }
        return true
      }
    })
  }
}

/**
 * Validation middleware for authentication endpoints
 */
export function withAuthValidation<T>(schema: z.ZodSchema<T>) {
  return (
    handler: (request: NextRequest, data: ValidatedRequestData) => Promise<NextResponse>
  ) => {
    return withInputValidation(handler, {
      bodySchema: schema,
      requireBody: true,
      allowedMethods: ['POST'],
      sanitizeInputs: true,
      checkSQLInjection: true,
      checkXSS: true,
      customValidation: async (request, data) => {
        // Additional auth-specific validation
        if (data.body?.password && data.body.password.length < 8) {
          return 'Password must be at least 8 characters long'
        }
        return true
      }
    })
  }
}

/**
 * Validation middleware for file upload endpoints
 */
export function withFileUploadValidation(options: {
  allowedTypes?: string[]
  maxSize?: number
  maxFiles?: number
}) {
  return (
    handler: (request: NextRequest, data: ValidatedRequestData) => Promise<NextResponse>
  ) => {
    return withInputValidation(handler, {
      allowedMethods: ['POST', 'PUT'],
      customValidation: async (request) => {
        const contentType = request.headers.get('content-type')
        
        if (!contentType?.includes('multipart/form-data')) {
          return 'File upload requires multipart/form-data content type'
        }

        // Additional file validation would be done in the handler
        // since we can't access FormData in middleware easily
        return true
      }
    })
  }
}

/**
 * Validation middleware for search endpoints
 */
export function withSearchValidation<T>(querySchema: z.ZodSchema<T>) {
  return (
    handler: (request: NextRequest, data: ValidatedRequestData) => Promise<NextResponse>
  ) => {
    return withInputValidation(handler, {
      querySchema,
      allowedMethods: ['GET'],
      sanitizeInputs: true,
      checkSQLInjection: true,
      checkXSS: true,
      customValidation: async (request, data) => {
        // Prevent search query bombs
        if (data.query?.q && data.query.q.length > 1000) {
          return 'Search query too long'
        }
        return true
      }
    })
  }
}

/**
 * Helper function to get appropriate schema based on HTTP method
 */
function getSchemaForMethod(schemas: {
  create?: z.ZodSchema<any>
  update?: z.ZodSchema<any>
}, method?: string) {
  if (method === 'POST' && schemas.create) {
    return schemas.create
  }
  if (['PUT', 'PATCH'].includes(method || '') && schemas.update) {
    return schemas.update
  }
  return schemas.create || schemas.update
}

/**
 * Create standardized validation error response
 */
function createValidationErrorResponse(
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

/**
 * Validation utilities for common patterns
 */
export const validationUtils = {
  /**
   * Create ID parameter validation schema
   */
  idParam: () => z.object({
    id: z.string().uuid('Invalid ID format')
  }),

  /**
   * Create pagination query validation schema
   */
  paginationQuery: () => z.object({
    page: z.string().transform(Number).pipe(z.number().int().positive()).default(1),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  /**
   * Create search query validation schema
   */
  searchQuery: () => z.object({
    q: z.string().min(1).max(255).optional(),
    filters: z.record(z.string(), z.string()).optional(),
  }),

  /**
   * Create file upload validation schema
   */
  fileUpload: () => z.object({
    fileName: z.string().min(1).max(255),
    fileSize: z.number().positive().max(10 * 1024 * 1024), // 10MB
    mimeType: z.string().min(1),
  }),

  /**
   * Validate bulk operation request
   */
  bulkOperation: <T>(itemSchema: z.ZodSchema<T>) => z.object({
    items: z.array(itemSchema).min(1).max(100),
    operation: z.string().min(1),
  }),
}

/**
 * Export validation middleware types
 */
export type ValidationMiddleware = ReturnType<typeof withInputValidation>
export type CRUDValidationMiddleware = ReturnType<typeof withCRUDValidation>
export type AuthValidationMiddleware = ReturnType<typeof withAuthValidation>
export type FileUploadValidationMiddleware = ReturnType<typeof withFileUploadValidation>
export type SearchValidationMiddleware = ReturnType<typeof withSearchValidation>