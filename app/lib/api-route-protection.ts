/**
 * API Route Protection Utilities
 * Provides middleware and utilities for protecting API routes with permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Permission, PermissionService } from './permissions';
import { routePermissionResolver } from './route-permissions';
import { User } from './types';

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
 * Route protection options
 */
export interface RouteProtectionOptions {
  permissions?: Permission[];
  requireAuth?: boolean;
  allowedMethods?: string[];
  customValidator?: (user: User | null, request: NextRequest) => Promise<boolean> | boolean;
  skipPermissionCheck?: boolean;
}

/**
 * API Route Protection Service
 */
export class ApiRouteProtectionService {
  private permissionService: PermissionService;

  constructor(permissionService: PermissionService) {
    this.permissionService = permissionService;
  }

  /**
   * Protect API route with authentication and permission checks
   */
  async protectRoute(
    request: NextRequest,
    options: RouteProtectionOptions = {}
  ): Promise<{ user: User | null; error?: NextResponse }> {
    const {
      permissions = [],
      requireAuth = true,
      allowedMethods = [],
      customValidator,
      skipPermissionCheck = false
    } = options;

    // Check HTTP method
    if (allowedMethods.length > 0 && !allowedMethods.includes(request.method)) {
      return {
        user: null,
        error: this.createErrorResponse('METHOD_NOT_ALLOWED', `Method ${request.method} not allowed`, 405)
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
      return {
        user: null,
        error: this.createErrorResponse('TOKEN_ERROR', 'Authentication token error', 401)
      };
    }

    // Check authentication requirement
    if (requireAuth && !token) {
      return {
        user: null,
        error: this.createErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
      };
    }

    const user = token ? {
      id: token.id as string,
      email: token.email as string,
      name: token.name as string,
      role: token.role as any,
    } as User : null;

    // Skip permission check if specified
    if (skipPermissionCheck) {
      return { user };
    }

    // Get route permissions if not explicitly provided
    let requiredPermissions = permissions;
    if (requiredPermissions.length === 0) {
      const pathname = new URL(request.url).pathname;
      requiredPermissions = routePermissionResolver.getRoutePermissions(pathname, request.method);
    }

    // Check permissions
    if (requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.some(permission =>
        this.permissionService.hasPermission(user, permission)
      );

      if (!hasPermission) {
        return {
          user,
          error: this.createErrorResponse(
            'FORBIDDEN',
            'Insufficient permissions',
            403,
            { requiredPermissions, userRole: user?.role }
          )
        };
      }
    }

    // Run custom validator if provided
    if (customValidator) {
      try {
        const isValid = await customValidator(user, request);
        if (!isValid) {
          return {
            user,
            error: this.createErrorResponse('FORBIDDEN', 'Custom validation failed', 403)
          };
        }
      } catch (error) {
        console.error('Custom validator error:', error);
        return {
          user,
          error: this.createErrorResponse('VALIDATION_ERROR', 'Validation error', 500)
        };
      }
    }

    return { user };
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
}

/**
 * Higher-order function to protect API route handlers
 */
export function withApiProtection(
  handler: (request: NextRequest, context: { user: User | null; params?: any }) => Promise<NextResponse>,
  options: RouteProtectionOptions = {}
) {
  return async (request: NextRequest, context: { params?: any } = {}) => {
    const protectionService = new ApiRouteProtectionService(new PermissionService());
    
    const { user, error } = await protectionService.protectRoute(request, options);
    
    if (error) {
      return error;
    }

    try {
      return await handler(request, { user, params: context.params });
    } catch (error) {
      console.error('API route handler error:', error);
      return protectionService.createErrorResponse(
        'INTERNAL_ERROR',
        'Internal server error',
        500
      );
    }
  };
}

/**
 * Decorator for protecting API routes with specific permissions
 */
export function requirePermissions(...permissions: Permission[]) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = withApiProtection(originalMethod, { permissions });
    
    return descriptor;
  };
}

/**
 * Decorator for requiring authentication only
 */
export function requireAuth(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  
  descriptor.value = withApiProtection(originalMethod, { requireAuth: true });
  
  return descriptor;
}

/**
 * Decorator for allowing specific HTTP methods
 */
export function allowMethods(...methods: string[]) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = withApiProtection(originalMethod, { allowedMethods: methods });
    
    return descriptor;
  };
}

/**
 * Utility functions for common permission checks in API routes
 */
export class ApiPermissionUtils {
  private permissionService: PermissionService;

  constructor(permissionService: PermissionService) {
    this.permissionService = permissionService;
  }

  /**
   * Check if user can access resource with ownership validation
   */
  canAccessResource(
    user: User | null,
    resource: string,
    action: string,
    resourceOwnerId?: string
  ): boolean {
    // Check for 'all' scope permission first
    if (this.permissionService.hasResourceAccess(user, resource, action, 'all')) {
      return true;
    }

    // Check for 'own' scope permission with ownership validation
    if (resourceOwnerId && user?.id === resourceOwnerId) {
      return this.permissionService.hasResourceAccess(user, resource, action, 'own');
    }

    // Check for general permission without scope
    return this.permissionService.hasResourceAccess(user, resource, action);
  }

  /**
   * Validate request body against schema
   */
  async validateRequestBody<T>(
    request: NextRequest,
    validator: (data: any) => T | Promise<T>
  ): Promise<{ data: T | null; error: string | null }> {
    try {
      const body = await request.json();
      const validatedData = await validator(body);
      return { data: validatedData, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Invalid request body'
      };
    }
  }

  /**
   * Extract and validate query parameters
   */
  validateQueryParams(
    request: NextRequest,
    schema: Record<string, { required?: boolean; type?: string; default?: any }>
  ): { params: Record<string, any>; errors: string[] } {
    const url = new URL(request.url);
    const params: Record<string, any> = {};
    const errors: string[] = [];

    for (const [key, config] of Object.entries(schema)) {
      const value = url.searchParams.get(key);
      
      if (config.required && !value) {
        errors.push(`Missing required parameter: ${key}`);
        continue;
      }

      if (!value) {
        params[key] = config.default;
        continue;
      }

      // Type conversion
      switch (config.type) {
        case 'number':
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors.push(`Parameter ${key} must be a number`);
          } else {
            params[key] = numValue;
          }
          break;
        case 'boolean':
          params[key] = value.toLowerCase() === 'true';
          break;
        case 'array':
          params[key] = value.split(',').map(v => v.trim());
          break;
        default:
          params[key] = value;
      }
    }

    return { params, errors };
  }

  /**
   * Create paginated response
   */
  createPaginatedResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } {
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}

// Singleton instances
const permissionService = new PermissionService();
export const apiRouteProtectionService = new ApiRouteProtectionService(permissionService);
export const apiPermissionUtils = new ApiPermissionUtils(permissionService);

// Convenience functions
export async function protectApiRoute(
  request: NextRequest,
  options?: RouteProtectionOptions
) {
  return apiRouteProtectionService.protectRoute(request, options);
}

export function createApiSuccessResponse<T>(data: T, status?: number) {
  return apiRouteProtectionService.createSuccessResponse(data, status);
}

/**
 * Example usage patterns for API route protection
 */

// Example 1: Basic protection with automatic permission detection
/*
export async function GET(request: NextRequest) {
  const { user, error } = await protectApiRoute(request);
  if (error) return error;
  
  // Route logic here
  return createApiSuccessResponse({ message: 'Success' });
}
*/

// Example 2: Protection with specific permissions
/*
export const POST = withApiProtection(
  async (request, { user }) => {
    // Route logic here
    return createApiSuccessResponse({ message: 'Created' });
  },
  {
    permissions: [{ resource: 'products', action: 'create', scope: 'all' }],
    allowedMethods: ['POST']
  }
);
*/

// Example 3: Protection with custom validation
/*
export const PUT = withApiProtection(
  async (request, { user, params }) => {
    // Route logic here
    return createApiSuccessResponse({ message: 'Updated' });
  },
  {
    permissions: [{ resource: 'products', action: 'update', scope: 'all' }],
    customValidator: async (user, request) => {
      // Custom validation logic
      return true;
    }
  }
);
*/