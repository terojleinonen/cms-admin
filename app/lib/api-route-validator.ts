/**
 * API Route Validation Utility
 * Provides easy-to-use validation decorators and utilities for API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withInputValidation, ValidationMiddlewareOptions } from './validation-middleware'
import { withAPISecurity, SecurityValidationOptions } from './api-security'
import { withApiPermissions } from './api-permission-middleware'
import { validationSchemas } from './validation-schemas'
import { secureValidationSchemas } from './input-validation'

/**
 * Combined validation and security options
 */
export interface APIRouteOptions extends ValidationMiddlewareOptions, SecurityValidationOptions {
  permissions?: {
    resource: string
    action: string
    scope?: string
  }
  rateLimit?: 'public' | 'sensitive' | { limit: number; windowMs: number }
}

/**
 * Main API route wrapper with comprehensive validation and security
 */
export function createSecureAPIRoute(
  handler: (request: NextRequest, data: any) => Promise<NextResponse>,
  options: APIRouteOptions = {}
) {
  // Apply validation middleware
  const validatedHandler = withInputValidation(
    async (request: NextRequest, validatedData) => {
      return handler(request, validatedData)
    },
    {
      bodySchema: options.bodySchema,
      querySchema: options.querySchema,
      paramsSchema: options.paramsSchema,
      requireBody: options.requireBody,
      sanitizeInputs: options.sanitizeInputs ?? true,
      checkSQLInjection: options.checkSQLInjection ?? true,
      checkXSS: options.checkXSS ?? true,
      maxBodySize: options.maxBodySize,
      allowedMethods: options.allowedMethods,
      customValidation: options.customValidation,
    }
  )

  // Apply security middleware
  const secureHandler = withAPISecurity(validatedHandler, {
    requireCSRF: options.requireCSRF,
    maxRequestSize: options.maxRequestSize,
    allowedMethods: options.allowedMethods,
    customValidation: options.customValidation,
    skipRateLimit: options.skipRateLimit,
    rateLimitConfig: options.rateLimit || options.rateLimitConfig,
  })

  // Apply permission middleware if specified
  if (options.permissions) {
    return withApiPermissions(
      secureHandler,
      options.permissions.resource,
      options.permissions.action,
      options.permissions.scope
    )
  }

  return secureHandler
}

/**
 * Pre-configured route validators for common patterns
 */
export const routeValidators = {
  /**
   * User management routes
   */
  users: {
    list: () => createSecureAPIRoute(
      async (request, { query }) => {
        // Handler implementation would go here
        return NextResponse.json({ users: [], pagination: {} })
      },
      {
        querySchema: validationSchemas.user.query,
        allowedMethods: ['GET'],
        permissions: { resource: 'users', action: 'read' }
      }
    ),

    create: () => createSecureAPIRoute(
      async (request, { body }) => {
        // Handler implementation would go here
        return NextResponse.json({ user: body })
      },
      {
        bodySchema: validationSchemas.user.create,
        allowedMethods: ['POST'],
        requireBody: true,
        permissions: { resource: 'users', action: 'create' }
      }
    ),

    update: () => createSecureAPIRoute(
      async (request, { body, params }) => {
        // Handler implementation would go here
        return NextResponse.json({ user: { ...body, id: params.id } })
      },
      {
        bodySchema: validationSchemas.user.update,
        paramsSchema: z.object({ id: z.string().uuid() }),
        allowedMethods: ['PUT', 'PATCH'],
        requireBody: true,
        permissions: { resource: 'users', action: 'update' }
      }
    ),

    delete: () => createSecureAPIRoute(
      async (request, { params }) => {
        // Handler implementation would go here
        return NextResponse.json({ success: true })
      },
      {
        paramsSchema: z.object({ id: z.string().uuid() }),
        allowedMethods: ['DELETE'],
        permissions: { resource: 'users', action: 'delete' }
      }
    ),
  },

  /**
   * Product management routes
   */
  products: {
    list: () => createSecureAPIRoute(
      async (request, { query }) => {
        return NextResponse.json({ products: [], pagination: {} })
      },
      {
        querySchema: validationSchemas.product.query,
        allowedMethods: ['GET'],
        permissions: { resource: 'products', action: 'read' }
      }
    ),

    create: () => createSecureAPIRoute(
      async (request, { body }) => {
        return NextResponse.json({ product: body })
      },
      {
        bodySchema: validationSchemas.product.create,
        allowedMethods: ['POST'],
        requireBody: true,
        permissions: { resource: 'products', action: 'create' }
      }
    ),

    update: () => createSecureAPIRoute(
      async (request, { body, params }) => {
        return NextResponse.json({ product: { ...body, id: params.id } })
      },
      {
        bodySchema: validationSchemas.product.update,
        paramsSchema: z.object({ id: z.string().uuid() }),
        allowedMethods: ['PUT', 'PATCH'],
        requireBody: true,
        permissions: { resource: 'products', action: 'update' }
      }
    ),

    delete: () => createSecureAPIRoute(
      async (request, { params }) => {
        return NextResponse.json({ success: true })
      },
      {
        paramsSchema: z.object({ id: z.string().uuid() }),
        allowedMethods: ['DELETE'],
        permissions: { resource: 'products', action: 'delete' }
      }
    ),
  },

  /**
   * Authentication routes
   */
  auth: {
    login: () => createSecureAPIRoute(
      async (request, { body }) => {
        return NextResponse.json({ token: 'example-token' })
      },
      {
        bodySchema: validationSchemas.auth.login,
        allowedMethods: ['POST'],
        requireBody: true,
        rateLimit: 'sensitive'
      }
    ),

    register: () => createSecureAPIRoute(
      async (request, { body }) => {
        return NextResponse.json({ user: body })
      },
      {
        bodySchema: validationSchemas.auth.register,
        allowedMethods: ['POST'],
        requireBody: true,
        rateLimit: 'sensitive'
      }
    ),

    passwordReset: () => createSecureAPIRoute(
      async (request, { body }) => {
        return NextResponse.json({ success: true })
      },
      {
        bodySchema: validationSchemas.auth.passwordReset,
        allowedMethods: ['POST'],
        requireBody: true,
        rateLimit: 'sensitive'
      }
    ),
  },

  /**
   * File upload routes
   */
  upload: {
    image: () => createSecureAPIRoute(
      async (request, data) => {
        return NextResponse.json({ url: 'example-url' })
      },
      {
        allowedMethods: ['POST'],
        maxRequestSize: 10 * 1024 * 1024, // 10MB
        customValidation: async (request) => {
          const contentType = request.headers.get('content-type')
          if (!contentType?.includes('multipart/form-data')) {
            return 'File upload requires multipart/form-data'
          }
          return true
        },
        permissions: { resource: 'media', action: 'create' }
      }
    ),

    document: () => createSecureAPIRoute(
      async (request, data) => {
        return NextResponse.json({ url: 'example-url' })
      },
      {
        allowedMethods: ['POST'],
        maxRequestSize: 50 * 1024 * 1024, // 50MB
        customValidation: async (request) => {
          const contentType = request.headers.get('content-type')
          if (!contentType?.includes('multipart/form-data')) {
            return 'File upload requires multipart/form-data'
          }
          return true
        },
        permissions: { resource: 'media', action: 'create' }
      }
    ),
  },

  /**
   * Search routes
   */
  search: {
    global: () => createSecureAPIRoute(
      async (request, { query }) => {
        return NextResponse.json({ results: [] })
      },
      {
        querySchema: validationSchemas.search.query,
        allowedMethods: ['GET'],
        customValidation: async (request, data) => {
          if (data.query?.q && data.query.q.length > 1000) {
            return 'Search query too long'
          }
          return true
        }
      }
    ),
  },

  /**
   * Admin routes
   */
  admin: {
    bulkUserAction: () => createSecureAPIRoute(
      async (request, { body }) => {
        return NextResponse.json({ success: true })
      },
      {
        bodySchema: validationSchemas.admin.userBulkAction,
        allowedMethods: ['POST'],
        requireBody: true,
        permissions: { resource: 'users', action: 'manage' }
      }
    ),

    systemSettings: () => createSecureAPIRoute(
      async (request, { body }) => {
        return NextResponse.json({ settings: body })
      },
      {
        bodySchema: validationSchemas.admin.systemSettings,
        allowedMethods: ['PUT'],
        requireBody: true,
        permissions: { resource: 'system', action: 'manage' }
      }
    ),

    auditLogs: () => createSecureAPIRoute(
      async (request, { query }) => {
        return NextResponse.json({ logs: [], pagination: {} })
      },
      {
        querySchema: validationSchemas.admin.auditLogQuery,
        allowedMethods: ['GET'],
        permissions: { resource: 'audit_logs', action: 'read' }
      }
    ),
  },
}

/**
 * Validation schema builders for common patterns
 */
export const schemaBuilders = {
  /**
   * Create a paginated query schema
   */
  paginatedQuery: (additionalFields?: z.ZodRawShape) => z.object({
    page: z.string().transform(Number).pipe(secureValidationSchemas.secureInteger.positive()).default(1),
    limit: z.string().transform(Number).pipe(secureValidationSchemas.secureInteger.positive().max(100)).default(10),
    sortBy: secureValidationSchemas.secureString(50).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    ...additionalFields
  }),

  /**
   * Create a search query schema
   */
  searchQuery: (additionalFields?: z.ZodRawShape) => z.object({
    q: secureValidationSchemas.secureString(255).optional(),
    filters: z.record(secureValidationSchemas.secureString(100)).optional(),
    ...additionalFields
  }),

  /**
   * Create an ID parameter schema
   */
  idParams: () => z.object({
    id: z.string().uuid('Invalid ID format')
  }),

  /**
   * Create a bulk operation schema
   */
  bulkOperation: <T>(itemSchema: z.ZodSchema<T>) => z.object({
    items: z.array(itemSchema).min(1).max(100),
    operation: secureValidationSchemas.secureString(50),
    options: z.record(z.any()).optional()
  }),

  /**
   * Create a file upload schema
   */
  fileUpload: () => z.object({
    fileName: secureValidationSchemas.secureFileName,
    fileSize: secureValidationSchemas.secureNumber.positive().max(100 * 1024 * 1024), // 100MB max
    mimeType: secureValidationSchemas.secureString(100),
    alt: secureValidationSchemas.secureString(255).optional(),
    caption: secureValidationSchemas.secureString(500).optional(),
  }),
}

/**
 * Utility functions for route validation
 */
export const validationHelpers = {
  /**
   * Create a validation error response
   */
  createValidationError: (message: string, details?: any) => {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message,
          details,
          timestamp: new Date().toISOString(),
        },
        success: false,
      },
      { status: 400 }
    )
  },

  /**
   * Create a success response
   */
  createSuccessResponse: (data: any, message?: string) => {
    return NextResponse.json(
      {
        data,
        message,
        success: true,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  },

  /**
   * Validate file upload from FormData
   */
  validateFileFromFormData: async (formData: FormData, fieldName: string) => {
    const file = formData.get(fieldName) as File
    
    if (!file) {
      throw new Error(`File field '${fieldName}' is required`)
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB limit')
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} not allowed`)
    }

    return file
  },

  /**
   * Extract and validate pagination parameters
   */
  extractPagination: (searchParams: URLSearchParams) => {
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

    return { page, limit, sortBy, sortOrder }
  },
}

/**
 * Export types for TypeScript support
 */
export type SecureAPIRoute = ReturnType<typeof createSecureAPIRoute>
export type RouteValidator = typeof routeValidators
export type SchemaBuilder = typeof schemaBuilders
export type ValidationHelper = typeof validationHelpers