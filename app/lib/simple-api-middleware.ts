/**
 * Simplified API Middleware
 * Provides basic authentication and essential security checks
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { z } from 'zod'

/**
 * User type for simplified middleware
 */
export interface SimpleUser {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'EDITOR' | 'VIEWER'
}

/**
 * Simple role-based permissions
 */
const ROLE_PERMISSIONS = {
  ADMIN: ['*'], // All permissions
  EDITOR: ['products:*', 'categories:*', 'media:*', 'pages:*', 'users:read'],
  VIEWER: ['products:read', 'categories:read', 'media:read', 'pages:read']
} as const

/**
 * Check if user has permission for resource:action
 */
function hasPermission(user: SimpleUser | null, resource: string, action: string): boolean {
  if (!user) return false
  
  const userPermissions = ROLE_PERMISSIONS[user.role] || []
  
  // Admin has all permissions
  if (userPermissions.includes('*')) return true
  
  // Check specific permission
  const permission = `${resource}:${action}`
  const wildcardPermission = `${resource}:*`
  
  return userPermissions.includes(permission) || userPermissions.includes(wildcardPermission)
}

/**
 * Basic input sanitization
 */
function sanitizeString(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj
  
  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item))
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value)
    }
    return sanitized
  }
  
  return obj
}

/**
 * Simple API middleware options
 */
export interface SimpleApiOptions {
  requireAuth?: boolean
  requiredRole?: 'ADMIN' | 'EDITOR' | 'VIEWER'
  resource?: string
  action?: string
  allowedMethods?: string[]
}

/**
 * Simple API middleware wrapper
 */
export function withSimpleAuth(
  handler: (request: NextRequest, context: { user: SimpleUser | null }) => Promise<NextResponse>,
  options: SimpleApiOptions = {}
) {
  return async (request: NextRequest, context: { params?: any } = {}) => {
    const {
      requireAuth = true,
      requiredRole,
      resource,
      action,
      allowedMethods = []
    } = options

    try {
      // Check HTTP method
      if (allowedMethods.length > 0 && !allowedMethods.includes(request.method)) {
        return NextResponse.json(
          { error: `Method ${request.method} not allowed` },
          { status: 405 }
        )
      }

      // Get authentication token
      let token
      try {
        token = await getToken({ 
          req: request, 
          secret: process.env.AUTH_SECRET 
        })
      } catch (error) {
        console.error('Failed to get token:', error)
        return NextResponse.json(
          { error: 'Authentication error' },
          { status: 401 }
        )
      }

      // Check authentication requirement
      if (requireAuth && !token) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const user = token ? {
        id: token.id as string,
        email: token.email as string,
        name: token.name as string,
        role: token.role as 'ADMIN' | 'EDITOR' | 'VIEWER'
      } : null

      // Check role requirement
      if (requiredRole && (!user || user.role !== requiredRole && user.role !== 'ADMIN')) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      // Check resource permission
      if (resource && action && !hasPermission(user, resource, action)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      // Execute handler
      return await handler(request, { user })

    } catch (error) {
      console.error('API middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Validate and sanitize request body
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json()
    
    // Basic sanitization
    const sanitizedBody = sanitizeObject(body)
    
    // Validate with schema
    const result = schema.safeParse(sanitizedBody)
    
    if (!result.success) {
      return {
        success: false,
        error: 'Validation failed: ' + result.error.issues.map(i => i.message).join(', ')
      }
    }
    
    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    return {
      success: false,
      error: 'Invalid request body'
    }
  }
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  }, { status })
}

/**
 * Create error response
 */
export function createErrorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  }, { status })
}

/**
 * Convenience functions for common permission patterns
 */
export const requireAdmin = (options: Omit<SimpleApiOptions, 'requiredRole'> = {}) => 
  ({ ...options, requiredRole: 'ADMIN' as const })

export const requireEditor = (options: Omit<SimpleApiOptions, 'requiredRole'> = {}) => 
  ({ ...options, requiredRole: 'EDITOR' as const })

export const requirePermission = (resource: string, action: string, options: Omit<SimpleApiOptions, 'resource' | 'action'> = {}) => 
  ({ ...options, resource, action })