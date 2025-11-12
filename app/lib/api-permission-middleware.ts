/**
 * Reusable API Permission Validation Middleware
 * Provides consistent permission checking across all API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Permission } from './types';
import { PermissionService } from './permissions';
import { RoutePermissionResolver, ROUTE_PERMISSION_MAPPINGS } from './route-permissions';
import { User } from './types';
import { isString, isUserRole } from './type-guards';
import { auditService } from './audit-service';
import { SecurityEventType } from './security';

/**
 * API Error Response interface
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
  };
  success: false;
}

/**
 * API Success Response interface
 */
export interface ApiSuccessResponse<T = any> {
  data: T;
  success: true;
  timestamp?: string;
}

/**
 * Permission validation options
 */
export interface PermissionValidationOptions {
  permissions?: Permission[];
  requireAuth?: boolean;
  allowedMethods?: string[];
  customValidator?: (user: User | null, request: NextRequest) => Promise<boolean> | boolean;
  skipPermissionCheck?: boolean;
  allowOwnerAccess?: boolean;
  resourceIdParam?: string; // Parameter name for resource ID (e.g., 'id')
  resourceOwnerField?: string; // Field name for resource owner (e.g., 'createdBy')
}

/**
 * Permission validation result
 */
export interface PermissionValidationResult {
  user: User | null;
  error?: NextResponse;
  isAuthorized: boolean;
  permissions: Permission[];
}

/**
 * API Permission Middleware Service
 */
export class ApiPermissionMiddleware {
  private permissionService: PermissionService;
  private routeResolver: RoutePermissionResolver;

  constructor() {
    this.permissionService = new PermissionService();
    this.routeResolver = new RoutePermissionResolver(ROUTE_PERMISSION_MAPPINGS);
  }

  /**
   * Validate permissions for API route
   */
  async validatePermissions(
    request: NextRequest,
    options: PermissionValidationOptions = {}
  ): Promise<PermissionValidationResult> {
    const {
      permissions = [],
      requireAuth = true,
      allowedMethods = [],
      customValidator,
      skipPermissionCheck = false,
      allowOwnerAccess = false,
      resourceIdParam = 'id',
      resourceOwnerField = 'createdBy'
    } = options;

    const method = request.method;
    const pathname = new URL(request.url).pathname;

    // Check HTTP method
    if (allowedMethods.length > 0 && !allowedMethods.includes(method)) {
      const error = this.createErrorResponse(
        'METHOD_NOT_ALLOWED',
        `Method ${method} not allowed`,
        405,
        { allowedMethods }
      );
      
      await this.logSecurityEvent(null, 'blocked_request', {
        method,
        pathname,
        allowedMethods
      });

      return {
        user: null,
        error,
        isAuthorized: false,
        permissions: []
      };
    }

    // Get authentication token
    let token;
    try {
      token = await getToken({ 
        req: request, 
        secret: process.env.AUTH_SECRET 
      });
    } catch (error) {
      console.error('Failed to get token:', error);
      const errorResponse = this.createErrorResponse(
        'TOKEN_ERROR',
        'Authentication token error',
        401
      );

      await this.logSecurityEvent(null, 'login_failed', {
        pathname,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        user: null,
        error: errorResponse,
        isAuthorized: false,
        permissions: []
      };
    }

    // Check authentication requirement
    if (requireAuth && !token) {
      const error = this.createErrorResponse(
        'UNAUTHORIZED',
        'Authentication required',
        401
      );

      await this.logSecurityEvent(null, 'unauthorized_access', {
        pathname,
        method
      });

      return {
        user: null,
        error,
        isAuthorized: false,
        permissions: []
      };
    }

    const user = token && 
      isString(token.id) && 
      isString(token.email) && 
      isString(token.name) && 
      isUserRole(token.role) ? {
      id: token.id,
      email: token.email,
      name: token.name,
      role: token.role,
    } as User : null;

    // Skip permission check if specified
    if (skipPermissionCheck) {
      return {
        user,
        isAuthorized: true,
        permissions: []
      };
    }

    // Get route permissions if not explicitly provided
    let requiredPermissions = permissions;
    if (requiredPermissions.length === 0) {
      requiredPermissions = this.routeResolver.getRoutePermissions(pathname, method);
    }

    // Check if route is public
    if (this.routeResolver.isPublicRoute(pathname)) {
      return {
        user,
        isAuthorized: true,
        permissions: []
      };
    }

    // Check permissions
    if (requiredPermissions.length > 0) {
      let hasPermission = false;

      // Check each required permission
      for (const permission of requiredPermissions) {
        if (this.permissionService.hasPermission(user, permission)) {
          hasPermission = true;
          break;
        }

        // Check owner access if enabled
        if (allowOwnerAccess && permission.scope === 'own') {
          const resourceId = this.extractResourceId(request, resourceIdParam);
          if (resourceId && await this.checkOwnerAccess(user, resourceId, resourceOwnerField)) {
            hasPermission = true;
            break;
          }
        }
      }

      if (!hasPermission) {
        const error = this.createErrorResponse(
          'FORBIDDEN',
          'Insufficient permissions',
          403,
          { 
            requiredPermissions,
            userRole: user?.role,
            pathname,
            method
          }
        );

        await this.logSecurityEvent(user, 'permission_denied', {
          pathname,
          method,
          requiredPermissions,
          userRole: user?.role
        });

        return {
          user,
          error,
          isAuthorized: false,
          permissions: requiredPermissions
        };
      }
    }

    // Run custom validator if provided
    if (customValidator) {
      try {
        const isValid = await customValidator(user, request);
        if (!isValid) {
          const error = this.createErrorResponse(
            'FORBIDDEN',
            'Custom validation failed',
            403
          );

          await this.logSecurityEvent(user, 'input_validation_failed', {
            pathname,
            method
          });

          return {
            user,
            error,
            isAuthorized: false,
            permissions: requiredPermissions
          };
        }
      } catch (error) {
        console.error('Custom validator error:', error);
        const errorResponse = this.createErrorResponse(
          'VALIDATION_ERROR',
          'Validation error',
          500
        );

        await this.logSecurityEvent(user, 'input_validation_error', {
          pathname,
          method,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return {
          user,
          error: errorResponse,
          isAuthorized: false,
          permissions: requiredPermissions
        };
      }
    }

    // Log successful access
    await this.logAccessAttempt(user, pathname, method, 'SUCCESS');

    return {
      user,
      isAuthorized: true,
      permissions: requiredPermissions
    };
  }

  /**
   * Extract resource ID from request
   */
  private extractResourceId(request: NextRequest, paramName: string): string | null {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    
    // Find the segment after the parameter name
    const paramIndex = pathSegments.findIndex(segment => segment === paramName);
    if (paramIndex !== -1 && paramIndex < pathSegments.length - 1) {
      return pathSegments[paramIndex + 1];
    }

    // Try to extract from URL pattern
    const match = url.pathname.match(new RegExp(`/${paramName}/([^/]+)`));
    return match ? match[1] : null;
  }

  /**
   * Check if user owns the resource
   */
  private async checkOwnerAccess(
    user: User | null,
    resourceId: string,
    ownerField: string
  ): Promise<boolean> {
    if (!user) return false;

    try {
      // This would need to be implemented based on your specific data model
      // For now, we'll assume the resource has a field that matches the user ID
      const { prisma } = await import('./db');
      
      // Generic query - you might need to customize this based on your schema
      const resource = await prisma.$queryRaw`
        SELECT ${ownerField} as ownerId 
        FROM products 
        WHERE id = ${resourceId}
        UNION ALL
        SELECT ${ownerField} as ownerId 
        FROM pages 
        WHERE id = ${resourceId}
        UNION ALL
        SELECT ${ownerField} as ownerId 
        FROM media 
        WHERE id = ${resourceId}
        LIMIT 1
      `;

      return Array.isArray(resource) && resource.length > 0 && resource[0].ownerId === user.id;
    } catch (error) {
      console.error('Error checking owner access:', error);
      return false;
    }
  }

  /**
   * Create standardized error response
   */
  private createErrorResponse(
    code: string,
    message: string,
    status: number,
    details?: Record<string, any>
  ): NextResponse {
    const errorResponse: ApiErrorResponse = {
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      success: false,
    };

    return NextResponse.json(errorResponse, { status });
  }

  /**
   * Create standardized success response
   */
  createSuccessResponse<T>(data: T, status: number = 200): NextResponse {
    const successResponse: ApiSuccessResponse<T> = {
      data,
      success: true,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(successResponse, { status });
  }

  /**
   * Log access attempt
   */
  private async logAccessAttempt(
    user: User | null,
    pathname: string,
    method: string,
    result: 'SUCCESS' | 'FAILURE'
  ): Promise<void> {
    try {
      await auditService.log(
        user?.id || 'anonymous',
        'API_ACCESS',
        'api',
        null,
        {
          pathname,
          method,
          result,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to log access attempt:', error);
    }
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(
    user: User | null,
    eventType: SecurityEventType,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await auditService.logSecurity(
        user?.id,
        eventType,
        {
          ...details,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}

/**
 * Higher-order function to protect API route handlers
 */
export function withApiPermissions(
  handler: (request: NextRequest, context: { user: User | null; params?: Promise<Record<string, string>> | Record<string, string> }) => Promise<NextResponse>,
  options: PermissionValidationOptions = {}
) {
  return async (request: NextRequest, context: { params?: Promise<Record<string, string>> | Record<string, string> } = {}) => {
    const middleware = new ApiPermissionMiddleware();
    
    const { user, error, isAuthorized } = await middleware.validatePermissions(request, options);
    
    if (error) {
      return error;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
            timestamp: new Date().toISOString(),
          },
          success: false,
        },
        { status: 403 }
      );
    }

    try {
      return await handler(request, { user, params: context.params });
    } catch (error) {
      console.error('API route handler error:', error);
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            details: { error: error instanceof Error ? error.message : 'Unknown error' },
            timestamp: new Date().toISOString(),
          },
          success: false,
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Convenience decorators for common permission patterns
 */

/**
 * Require specific permissions
 */
export function requirePermissions(...permissions: Permission[]) {
  return function(options: Omit<PermissionValidationOptions, 'permissions'> = {}) {
    return (
      handler: (request: NextRequest, context: { user: User | null; params?: Record<string, string> }) => Promise<NextResponse>
    ) => withApiPermissions(handler, { ...options, permissions });
  };
}

/**
 * Require authentication only
 */
export function requireAuth(options: Omit<PermissionValidationOptions, 'requireAuth'> = {}) {
  return (
    handler: (request: NextRequest, context: { user: User | null; params?: Record<string, string> }) => Promise<NextResponse>
  ) => withApiPermissions(handler, { ...options, requireAuth: true });
}

/**
 * Allow specific HTTP methods
 */
export function allowMethods(...methods: string[]) {
  return function(options: Omit<PermissionValidationOptions, 'allowedMethods'> = {}) {
    return (
      handler: (request: NextRequest, context: { user: User | null; params?: Record<string, string> }) => Promise<NextResponse>
    ) => withApiPermissions(handler, { ...options, allowedMethods: methods });
  };
}

/**
 * Require admin role
 */
export function requireAdmin(options: PermissionValidationOptions = {}) {
  return (
    handler: (request: NextRequest, context: { user: User | null; params?: Record<string, string> }) => Promise<NextResponse>
  ) => withApiPermissions(handler, {
    ...options,
    permissions: [{ resource: '*', action: 'manage', scope: 'all' }]
  });
}

/**
 * Require editor role or higher
 */
export function requireEditor(options: PermissionValidationOptions = {}) {
  return (
    handler: (request: NextRequest, context: { user: User | null; params?: Record<string, string> }) => Promise<NextResponse>
  ) => withApiPermissions(handler, {
    ...options,
    customValidator: async (user) => {
      if (!user) return false;
      return ['ADMIN', 'EDITOR'].includes(user.role);
    }
  });
}

/**
 * Allow owner access or admin
 */
export function allowOwnerOrAdmin(
  resourceIdParam: string = 'id',
  resourceOwnerField: string = 'createdBy'
) {
  return function(options: PermissionValidationOptions = {}) {
    return (
      handler: (request: NextRequest, context: { user: User | null; params?: Record<string, string> }) => Promise<NextResponse>
    ) => withApiPermissions(handler, {
      ...options,
      allowOwnerAccess: true,
      resourceIdParam,
      resourceOwnerField
    });
  };
}

// Singleton instance
export const apiPermissionMiddleware = new ApiPermissionMiddleware();

// Convenience functions
export async function validateApiPermissions(
  request: NextRequest,
  options?: PermissionValidationOptions
) {
  return apiPermissionMiddleware.validatePermissions(request, options);
}

export function createApiSuccessResponse<T>(data: T, status?: number) {
  return apiPermissionMiddleware.createSuccessResponse(data, status);
}