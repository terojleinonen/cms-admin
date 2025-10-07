/**
 * Route Validation Updater
 * Utility to help update existing API routes with comprehensive validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSecureAPIRoute } from './api-route-validator'
import { validationSchemas } from './validation-schemas'

/**
 * Route configuration mapping for automatic validation application
 */
export const routeConfigurations = {
  // User routes
  '/api/users': {
    GET: {
      querySchema: validationSchemas.user.query,
      permissions: { resource: 'users', action: 'read' }
    },
    POST: {
      bodySchema: validationSchemas.user.create,
      requireBody: true,
      permissions: { resource: 'users', action: 'create' }
    }
  },

  '/api/users/[id]': {
    GET: {
      paramsSchema: z.object({ id: z.string().uuid() }),
      permissions: { resource: 'users', action: 'read' }
    },
    PUT: {
      bodySchema: validationSchemas.user.update,
      paramsSchema: z.object({ id: z.string().uuid() }),
      requireBody: true,
      permissions: { resource: 'users', action: 'update' }
    },
    DELETE: {
      paramsSchema: z.object({ id: z.string().uuid() }),
      permissions: { resource: 'users', action: 'delete' }
    }
  },

  // Product routes
  '/api/products': {
    GET: {
      querySchema: validationSchemas.product.query,
      permissions: { resource: 'products', action: 'read' }
    },
    POST: {
      bodySchema: validationSchemas.product.create,
      requireBody: true,
      permissions: { resource: 'products', action: 'create' }
    }
  },

  '/api/products/[id]': {
    GET: {
      paramsSchema: z.object({ id: z.string().uuid() }),
      permissions: { resource: 'products', action: 'read' }
    },
    PUT: {
      bodySchema: validationSchemas.product.update,
      paramsSchema: z.object({ id: z.string().uuid() }),
      requireBody: true,
      permissions: { resource: 'products', action: 'update' }
    },
    DELETE: {
      paramsSchema: z.object({ id: z.string().uuid() }),
      permissions: { resource: 'products', action: 'delete' }
    }
  },

  // Category routes
  '/api/categories': {
    GET: {
      querySchema: validationSchemas.category.query,
      permissions: { resource: 'categories', action: 'read' }
    },
    POST: {
      bodySchema: validationSchemas.category.create,
      requireBody: true,
      permissions: { resource: 'categories', action: 'create' }
    }
  },

  '/api/categories/[id]': {
    GET: {
      paramsSchema: z.object({ id: z.string().uuid() }),
      permissions: { resource: 'categories', action: 'read' }
    },
    PUT: {
      bodySchema: validationSchemas.category.update,
      paramsSchema: z.object({ id: z.string().uuid() }),
      requireBody: true,
      permissions: { resource: 'categories', action: 'update' }
    },
    DELETE: {
      paramsSchema: z.object({ id: z.string().uuid() }),
      permissions: { resource: 'categories', action: 'delete' }
    }
  },

  // Page routes
  '/api/pages': {
    GET: {
      querySchema: validationSchemas.page.query,
      permissions: { resource: 'pages', action: 'read' }
    },
    POST: {
      bodySchema: validationSchemas.page.create,
      requireBody: true,
      permissions: { resource: 'pages', action: 'create' }
    }
  },

  '/api/pages/[id]': {
    GET: {
      paramsSchema: z.object({ id: z.string().uuid() }),
      permissions: { resource: 'pages', action: 'read' }
    },
    PUT: {
      bodySchema: validationSchemas.page.update,
      paramsSchema: z.object({ id: z.string().uuid() }),
      requireBody: true,
      permissions: { resource: 'pages', action: 'update' }
    },
    DELETE: {
      paramsSchema: z.object({ id: z.string().uuid() }),
      permissions: { resource: 'pages', action: 'delete' }
    }
  },

  // Media routes
  '/api/media': {
    GET: {
      querySchema: validationSchemas.media.query,
      permissions: { resource: 'media', action: 'read' }
    },
    POST: {
      allowedMethods: ['POST'],
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      permissions: { resource: 'media', action: 'create' }
    }
  },

  '/api/media/[id]': {
    GET: {
      paramsSchema: z.object({ id: z.string().uuid() }),
      permissions: { resource: 'media', action: 'read' }
    },
    PUT: {
      bodySchema: validationSchemas.media.update,
      paramsSchema: z.object({ id: z.string().uuid() }),
      requireBody: true,
      permissions: { resource: 'media', action: 'update' }
    },
    DELETE: {
      paramsSchema: z.object({ id: z.string().uuid() }),
      permissions: { resource: 'media', action: 'delete' }
    }
  },

  // Authentication routes
  '/api/auth/login': {
    POST: {
      bodySchema: validationSchemas.auth.login,
      requireBody: true,
      rateLimit: 'sensitive'
    }
  },

  '/api/auth/register': {
    POST: {
      bodySchema: validationSchemas.auth.register,
      requireBody: true,
      rateLimit: 'sensitive'
    }
  },

  '/api/auth/password-reset': {
    POST: {
      bodySchema: validationSchemas.auth.passwordReset,
      requireBody: true,
      rateLimit: 'sensitive'
    }
  },

  // Notification routes
  '/api/notifications': {
    GET: {
      querySchema: validationSchemas.notification.query,
      permissions: { resource: 'notifications', action: 'read' }
    },
    PUT: {
      bodySchema: validationSchemas.notification.update,
      requireBody: true,
      permissions: { resource: 'notifications', action: 'update' }
    }
  },

  '/api/notifications/[id]': {
    PUT: {
      bodySchema: validationSchemas.notification.update,
      paramsSchema: z.object({ id: z.string().uuid() }),
      requireBody: true,
      permissions: { resource: 'notifications', action: 'update' }
    },
    DELETE: {
      paramsSchema: z.object({ id: z.string().uuid() }),
      permissions: { resource: 'notifications', action: 'delete' }
    }
  },

  // Search routes
  '/api/search': {
    GET: {
      querySchema: validationSchemas.search.query,
      customValidation: async (request: NextRequest, data: any) => {
        if (data.query?.q && data.query.q.length > 1000) {
          return 'Search query too long'
        }
        return true
      }
    }
  },

  // Analytics routes
  '/api/analytics': {
    GET: {
      querySchema: validationSchemas.search.analytics,
      permissions: { resource: 'analytics', action: 'read' }
    }
  },

  '/api/analytics/export': {
    GET: {
      querySchema: validationSchemas.search.analytics,
      permissions: { resource: 'analytics', action: 'export' }
    }
  },

  // Admin routes
  '/api/admin/users': {
    POST: {
      bodySchema: validationSchemas.admin.userBulkAction,
      requireBody: true,
      permissions: { resource: 'users', action: 'manage' }
    }
  },

  '/api/admin/audit-logs': {
    GET: {
      querySchema: validationSchemas.admin.auditLogQuery,
      permissions: { resource: 'audit_logs', action: 'read' }
    }
  },

  // API Key routes
  '/api/admin/api-keys': {
    GET: {
      querySchema: validationSchemas.apiKey.query,
      permissions: { resource: 'api_keys', action: 'read' }
    },
    POST: {
      bodySchema: validationSchemas.apiKey.create,
      requireBody: true,
      permissions: { resource: 'api_keys', action: 'create' }
    }
  },

  '/api/admin/api-keys/[id]': {
    PUT: {
      bodySchema: validationSchemas.apiKey.update,
      paramsSchema: z.object({ id: z.string().uuid() }),
      requireBody: true,
      permissions: { resource: 'api_keys', action: 'update' }
    },
    DELETE: {
      paramsSchema: z.object({ id: z.string().uuid() }),
      permissions: { resource: 'api_keys', action: 'delete' }
    }
  },
}

/**
 * Helper function to wrap existing route handlers with validation
 */
export function wrapExistingRoute(
  originalHandler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  routePath: string,
  method: string
) {
  const config = routeConfigurations[routePath as keyof typeof routeConfigurations]
  
  if (!config || !config[method as keyof typeof config]) {
    // No configuration found, return original handler with basic security
    return createSecureAPIRoute(
      async (request, data) => {
        return originalHandler(request, { params: data.params })
      },
      {
        allowedMethods: [method],
        sanitizeInputs: true,
        checkSQLInjection: true,
        checkXSS: true,
      }
    )
  }

  const methodConfig = config[method as keyof typeof config] as any

  return createSecureAPIRoute(
    async (request, data) => {
      // Call original handler with validated data
      return originalHandler(request, { params: data.params })
    },
    {
      ...methodConfig,
      allowedMethods: [method],
      sanitizeInputs: true,
      checkSQLInjection: true,
      checkXSS: true,
    }
  )
}

/**
 * Utility to generate validation wrapper code for existing routes
 */
export function generateValidationWrapper(routePath: string, method: string): string {
  const config = routeConfigurations[routePath as keyof typeof routeConfigurations]
  
  if (!config || !config[method as keyof typeof config]) {
    return `
// Basic validation wrapper for ${method} ${routePath}
import { createSecureAPIRoute } from '@/lib/api-route-validator'

export const ${method} = createSecureAPIRoute(
  async (request, data) => {
    // Your existing handler code here
    return NextResponse.json({ success: true })
  },
  {
    allowedMethods: ['${method}'],
    sanitizeInputs: true,
    checkSQLInjection: true,
    checkXSS: true,
  }
)
`
  }

  const methodConfig = config[method as keyof typeof config] as any
  const configString = JSON.stringify(methodConfig, null, 2)
    .replace(/"([^"]+)":/g, '$1:') // Remove quotes from keys
    .replace(/"/g, "'") // Use single quotes

  return `
// Validation wrapper for ${method} ${routePath}
import { createSecureAPIRoute } from '@/lib/api-route-validator'
import { validationSchemas } from '@/lib/validation-schemas'
import { z } from 'zod'

export const ${method} = createSecureAPIRoute(
  async (request, data) => {
    // Your existing handler code here
    // Access validated data via: data.body, data.query, data.params
    return NextResponse.json({ success: true })
  },
  {
    allowedMethods: ['${method}'],
    sanitizeInputs: true,
    checkSQLInjection: true,
    checkXSS: true,
    ${configString.slice(1, -1)} // Remove outer braces
  }
)
`
}

/**
 * Validation migration helper
 */
export const validationMigration = {
  /**
   * Get all routes that need validation updates
   */
  getRoutesToUpdate: () => {
    return Object.keys(routeConfigurations)
  },

  /**
   * Get configuration for a specific route
   */
  getRouteConfig: (routePath: string) => {
    return routeConfigurations[routePath as keyof typeof routeConfigurations]
  },

  /**
   * Generate migration script for all routes
   */
  generateMigrationScript: () => {
    const routes = Object.entries(routeConfigurations)
    let script = '// Validation Migration Script\n\n'

    for (const [routePath, config] of routes) {
      script += `// Route: ${routePath}\n`
      
      for (const [method, methodConfig] of Object.entries(config)) {
        script += generateValidationWrapper(routePath, method)
        script += '\n'
      }
      
      script += '\n'
    }

    return script
  },

  /**
   * Validate that all required schemas exist
   */
  validateSchemas: () => {
    const missingSchemas: string[] = []
    
    for (const [routePath, config] of Object.entries(routeConfigurations)) {
      for (const [method, methodConfig] of Object.entries(config)) {
        const cfg = methodConfig as any
        
        if (cfg.bodySchema && !cfg.bodySchema._def) {
          missingSchemas.push(`${routePath} ${method} bodySchema`)
        }
        
        if (cfg.querySchema && !cfg.querySchema._def) {
          missingSchemas.push(`${routePath} ${method} querySchema`)
        }
        
        if (cfg.paramsSchema && !cfg.paramsSchema._def) {
          missingSchemas.push(`${routePath} ${method} paramsSchema`)
        }
      }
    }

    return {
      valid: missingSchemas.length === 0,
      missingSchemas
    }
  }
}

/**
 * Export types
 */
export type RouteConfiguration = typeof routeConfigurations
export type ValidationMigration = typeof validationMigration