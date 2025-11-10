/**
 * API Routes Permission Validation Tests
 * Tests permission validation for all API endpoints
 * Requirements: 4.2, 4.5
 */

import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { ApiPermissionMiddleware, withApiPermissions } from '@/lib/api-permission-middleware'
import { getToken } from 'next-auth/jwt'

// Mock dependencies
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}))

jest.mock('@/lib/permissions', () => ({
  PermissionService: jest.fn().mockImplementation(() => ({
    hasPermission: jest.fn(),
    hasResourceAccess: jest.fn(),
    canUserAccessRoute: jest.fn()
  }))
}))

jest.mock('@/lib/route-permissions', () => ({
  RoutePermissionResolver: jest.fn().mockImplementation(() => ({
    getRoutePermissions: jest.fn().mockReturnValue([]),
    isPublicRoute: jest.fn().mockReturnValue(false)
  })),
  ROUTE_PERMISSION_MAPPINGS: []
}))

jest.mock('@/lib/audit-service', () => ({
  auditService: {
    logAction: jest.fn(),
    logSecurityEvent: jest.fn()
  }
}))

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>

describe('API Routes Permission Validation Tests', () => {
  let middleware: ApiPermissionMiddleware
  let mockPermissionService: any
  let mockRouteResolver: any

  beforeEach(() => {
    jest.clearAllMocks()
    middleware = new ApiPermissionMiddleware()
    
    // Get mocked services
    const { PermissionService } = require('../app/lib/permissions')
    const { RoutePermissionResolver } = require('../app/lib/route-permissions')
    
    mockPermissionService = new PermissionService()
    mockRouteResolver = new RoutePermissionResolver()
    
    // Set up middleware with mocked services
    ;(middleware as any).permissionService = mockPermissionService
    ;(middleware as any).routeResolver = mockRouteResolver
  })

  const createMockRequest = (
    url: string, 
    method: string = 'GET',
    body?: any,
    headers: Record<string, string> = {}
  ): NextRequest => {
    const requestInit: RequestInit = { method }
    
    if (body) {
      requestInit.body = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
    
    if (Object.keys(headers).length > 0) {
      requestInit.headers = headers
    }
    
    return new NextRequest(url, requestInit)
  }

  const createMockUser = (role: UserRole = UserRole.VIEWER, id: string = 'user-1') => ({
    id,
    email: 'test@example.com',
    name: 'Test User',
    role
  })

  const createMockToken = (user: any) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  })

  describe('Authentication Validation', () => {
    it('should reject unauthenticated requests when auth is required', async () => {
      mockGetToken.mockResolvedValue(null)
      
      const request = createMockRequest('http://localhost:3000/api/products', 'POST')
      const result = await middleware.validatePermissions(request, {
        requireAuth: true
      })
      
      expect(result.isAuthorized).toBe(false)
      expect(result.user).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.status).toBe(401)
      
      const errorBody = await result.error!.json()
      expect(errorBody.error.code).toBe('UNAUTHORIZED')
      expect(errorBody.error.message).toBe('Authentication required')
    })

    it('should allow unauthenticated requests when auth is not required', async () => {
      mockGetToken.mockResolvedValue(null)
      
      const request = createMockRequest('http://localhost:3000/api/health')
      const result = await middleware.validatePermissions(request, {
        requireAuth: false
      })
      
      expect(result.isAuthorized).toBe(true)
      expect(result.user).toBeNull()
      expect(result.error).toBeUndefined()
    })

    it('should handle token retrieval errors', async () => {
      mockGetToken.mockRejectedValue(new Error('JWT verification failed'))
      
      const request = createMockRequest('http://localhost:3000/api/products')
      const result = await middleware.validatePermissions(request)
      
      expect(result.isAuthorized).toBe(false)
      expect(result.error?.status).toBe(401)
      
      const errorBody = await result.error!.json()
      expect(errorBody.error.code).toBe('TOKEN_ERROR')
    })

    it('should validate token structure', async () => {
      mockGetToken.mockResolvedValue({
        // Missing required fields
        email: 'test@example.com'
      } as any)
      
      const request = createMockRequest('http://localhost:3000/api/products')
      const result = await middleware.validatePermissions(request)
      
      expect(result.isAuthorized).toBe(true) // Should still work with partial token
      expect(result.user?.id).toBeUndefined()
    })
  })

  describe('HTTP Method Validation', () => {
    it('should allow specified HTTP methods', async () => {
      const user = createMockUser(UserRole.ADMIN)
      mockGetToken.mockResolvedValue(createMockToken(user))
      
      const allowedMethods = ['GET', 'POST']
      
      for (const method of allowedMethods) {
        const request = createMockRequest('http://localhost:3000/api/products', method)
        const result = await middleware.validatePermissions(request, {
          allowedMethods
        })
        
        expect(result.isAuthorized).toBe(true)
        expect(result.error).toBeUndefined()
      }
    })

    it('should reject disallowed HTTP methods', async () => {
      const user = createMockUser(UserRole.ADMIN)
      mockGetToken.mockResolvedValue(createMockToken(user))
      
      const request = createMockRequest('http://localhost:3000/api/products', 'DELETE')
      const result = await middleware.validatePermissions(request, {
        allowedMethods: ['GET', 'POST']
      })
      
      expect(result.isAuthorized).toBe(false)
      expect(result.error?.status).toBe(405)
      
      const errorBody = await result.error!.json()
      expect(errorBody.error.code).toBe('METHOD_NOT_ALLOWED')
      expect(errorBody.error.details.allowedMethods).toEqual(['GET', 'POST'])
    })
  })

  describe('Permission-Based Validation', () => {
    it('should validate specific permissions', async () => {
      const user = createMockUser(UserRole.EDITOR)
      mockGetToken.mockResolvedValue(createMockToken(user))
      mockPermissionService.hasPermission.mockReturnValue(true)
      
      const request = createMockRequest('http://localhost:3000/api/products', 'POST')
      const result = await middleware.validatePermissions(request, {
        permissions: [{ resource: 'products', action: 'create', scope: 'all' }]
      })
      
      expect(result.isAuthorized).toBe(true)
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith(
        user,
        { resource: 'products', action: 'create', scope: 'all' }
      )
    })

    it('should reject insufficient permissions', async () => {
      const user = createMockUser(UserRole.VIEWER)
      mockGetToken.mockResolvedValue(createMockToken(user))
      mockPermissionService.hasPermission.mockReturnValue(false)
      
      const request = createMockRequest('http://localhost:3000/api/products', 'POST')
      const result = await middleware.validatePermissions(request, {
        permissions: [{ resource: 'products', action: 'create', scope: 'all' }]
      })
      
      expect(result.isAuthorized).toBe(false)
      expect(result.error?.status).toBe(403)
      
      const errorBody = await result.error!.json()
      expect(errorBody.error.code).toBe('FORBIDDEN')
      expect(errorBody.error.details.requiredPermissions).toEqual([
        { resource: 'products', action: 'create', scope: 'all' }
      ])
    })

    it('should use route-based permissions when none specified', async () => {
      const user = createMockUser(UserRole.EDITOR)
      mockGetToken.mockResolvedValue(createMockToken(user))
      mockRouteResolver.getRoutePermissions.mockReturnValue([
        { resource: 'products', action: 'read', scope: 'all' }
      ])
      mockPermissionService.hasPermission.mockReturnValue(true)
      
      const request = createMockRequest('http://localhost:3000/api/products')
      const result = await middleware.validatePermissions(request)
      
      expect(result.isAuthorized).toBe(true)
      expect(mockRouteResolver.getRoutePermissions).toHaveBeenCalledWith('/api/products', 'GET')
    })

    it('should handle public routes', async () => {
      mockRouteResolver.isPublicRoute.mockReturnValue(true)
      
      const request = createMockRequest('http://localhost:3000/api/health')
      const result = await middleware.validatePermissions(request)
      
      expect(result.isAuthorized).toBe(true)
      expect(mockRouteResolver.isPublicRoute).toHaveBeenCalledWith('/api/health')
    })
  })

  describe('Role-Based Access Control', () => {
    const roleTestCases = [
      {
        role: UserRole.ADMIN,
        permissions: [
          { resource: 'users', action: 'manage', scope: 'all', expected: true },
          { resource: 'products', action: 'create', scope: 'all', expected: true },
          { resource: 'security', action: 'read', scope: 'all', expected: true }
        ]
      },
      {
        role: UserRole.EDITOR,
        permissions: [
          { resource: 'products', action: 'create', scope: 'all', expected: true },
          { resource: 'products', action: 'read', scope: 'all', expected: true },
          { resource: 'users', action: 'manage', scope: 'all', expected: false },
          { resource: 'profile', action: 'update', scope: 'own', expected: true }
        ]
      },
      {
        role: UserRole.VIEWER,
        permissions: [
          { resource: 'products', action: 'read', scope: 'all', expected: true },
          { resource: 'products', action: 'create', scope: 'all', expected: false },
          { resource: 'users', action: 'read', scope: 'all', expected: false },
          { resource: 'profile', action: 'read', scope: 'own', expected: true }
        ]
      }
    ]

    roleTestCases.forEach(({ role, permissions }) => {
      describe(`${role} role permissions`, () => {
        permissions.forEach(({ resource, action, scope, expected }) => {
          it(`should ${expected ? 'allow' : 'deny'} ${resource}:${action}:${scope || 'default'}`, async () => {
            const user = createMockUser(role)
            mockGetToken.mockResolvedValue(createMockToken(user))
            mockPermissionService.hasPermission.mockReturnValue(expected)
            
            const request = createMockRequest('http://localhost:3000/api/test')
            const result = await middleware.validatePermissions(request, {
              permissions: [{ resource, action, scope }]
            })
            
            expect(result.isAuthorized).toBe(expected)
            if (!expected) {
              expect(result.error?.status).toBe(403)
            }
          })
        })
      })
    })
  })

  describe('Custom Validation', () => {
    it('should run custom validator when provided', async () => {
      const user = createMockUser(UserRole.EDITOR)
      mockGetToken.mockResolvedValue(createMockToken(user))
      
      const customValidator = jest.fn().mockResolvedValue(true)
      
      const request = createMockRequest('http://localhost:3000/api/products')
      const result = await middleware.validatePermissions(request, {
        customValidator,
        skipPermissionCheck: true
      })
      
      expect(result.isAuthorized).toBe(true)
      expect(customValidator).toHaveBeenCalledWith(user, request)
    })

    it('should reject when custom validator fails', async () => {
      const user = createMockUser(UserRole.EDITOR)
      mockGetToken.mockResolvedValue(createMockToken(user))
      
      const customValidator = jest.fn().mockResolvedValue(false)
      
      const request = createMockRequest('http://localhost:3000/api/products')
      const result = await middleware.validatePermissions(request, {
        customValidator,
        skipPermissionCheck: true
      })
      
      expect(result.isAuthorized).toBe(false)
      expect(result.error?.status).toBe(403)
      
      const errorBody = await result.error!.json()
      expect(errorBody.error.code).toBe('FORBIDDEN')
      expect(errorBody.error.message).toBe('Custom validation failed')
    })

    it('should handle custom validator errors', async () => {
      const user = createMockUser(UserRole.EDITOR)
      mockGetToken.mockResolvedValue(createMockToken(user))
      
      const customValidator = jest.fn().mockRejectedValue(new Error('Validation error'))
      
      const request = createMockRequest('http://localhost:3000/api/products')
      const result = await middleware.validatePermissions(request, {
        customValidator,
        skipPermissionCheck: true
      })
      
      expect(result.isAuthorized).toBe(false)
      expect(result.error?.status).toBe(500)
      
      const errorBody = await result.error!.json()
      expect(errorBody.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Owner Access Validation', () => {
    it('should allow owner access when enabled', async () => {
      const user = createMockUser(UserRole.EDITOR, 'owner-123')
      mockGetToken.mockResolvedValue(createMockToken(user))
      mockPermissionService.hasPermission.mockReturnValue(false) // No general permission
      
      // Mock the checkOwnerAccess method to return true
      const checkOwnerAccessSpy = jest.spyOn(middleware as any, 'checkOwnerAccess')
      checkOwnerAccessSpy.mockResolvedValue(true)
      
      const request = createMockRequest('http://localhost:3000/api/products/owner-123')
      const result = await middleware.validatePermissions(request, {
        permissions: [{ resource: 'products', action: 'update', scope: 'own' }],
        allowOwnerAccess: true,
        resourceIdParam: 'id'
      })
      
      expect(result.isAuthorized).toBe(true)
      expect(checkOwnerAccessSpy).toHaveBeenCalledWith(user, 'owner-123', 'createdBy')
      
      checkOwnerAccessSpy.mockRestore()
    })

    it('should deny non-owner access', async () => {
      const user = createMockUser(UserRole.EDITOR, 'user-456')
      mockGetToken.mockResolvedValue(createMockToken(user))
      mockPermissionService.hasPermission.mockReturnValue(false)
      
      const checkOwnerAccessSpy = jest.spyOn(middleware as any, 'checkOwnerAccess')
      checkOwnerAccessSpy.mockResolvedValue(false)
      
      const request = createMockRequest('http://localhost:3000/api/products/owner-123')
      const result = await middleware.validatePermissions(request, {
        permissions: [{ resource: 'products', action: 'update', scope: 'own' }],
        allowOwnerAccess: true
      })
      
      expect(result.isAuthorized).toBe(false)
      expect(result.error?.status).toBe(403)
      
      checkOwnerAccessSpy.mockRestore()
    })
  })

  describe('API Endpoint Specific Tests', () => {
    const apiEndpoints = [
      {
        path: '/api/products',
        methods: ['GET', 'POST'],
        permissions: {
          GET: [{ resource: 'products', action: 'read' }],
          POST: [{ resource: 'products', action: 'create' }]
        },
        allowedRoles: {
          GET: [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER],
          POST: [UserRole.ADMIN, UserRole.EDITOR]
        }
      },
      {
        path: '/api/admin/users',
        methods: ['GET', 'POST'],
        permissions: {
          GET: [{ resource: 'users', action: 'read', scope: 'all' }],
          POST: [{ resource: 'users', action: 'create', scope: 'all' }]
        },
        allowedRoles: {
          GET: [UserRole.ADMIN],
          POST: [UserRole.ADMIN]
        }
      },
      {
        path: '/api/categories',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        permissions: {
          GET: [{ resource: 'categories', action: 'read' }],
          POST: [{ resource: 'categories', action: 'create' }],
          PUT: [{ resource: 'categories', action: 'update' }],
          DELETE: [{ resource: 'categories', action: 'delete' }]
        },
        allowedRoles: {
          GET: [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER],
          POST: [UserRole.ADMIN, UserRole.EDITOR],
          PUT: [UserRole.ADMIN, UserRole.EDITOR],
          DELETE: [UserRole.ADMIN, UserRole.EDITOR]
        }
      }
    ]

    apiEndpoints.forEach(({ path, methods, permissions, allowedRoles }) => {
      describe(`${path} endpoint`, () => {
        methods.forEach(method => {
          const methodPermissions = permissions[method as keyof typeof permissions]
          const methodAllowedRoles = allowedRoles[method as keyof typeof allowedRoles]

          it(`should validate ${method} method permissions`, async () => {
            // Test with allowed role
            const allowedRole = methodAllowedRoles[0]
            const user = createMockUser(allowedRole)
            mockGetToken.mockResolvedValue(createMockToken(user))
            mockPermissionService.hasPermission.mockReturnValue(true)
            
            const request = createMockRequest(`http://localhost:3000${path}`, method)
            const result = await middleware.validatePermissions(request, {
              permissions: methodPermissions
            })
            
            expect(result.isAuthorized).toBe(true)
          })

          it(`should reject ${method} method for unauthorized roles`, async () => {
            // Test with role not in allowed list
            const unauthorizedRole = Object.values(UserRole).find(
              role => !methodAllowedRoles.includes(role)
            )
            
            if (unauthorizedRole) {
              const user = createMockUser(unauthorizedRole)
              mockGetToken.mockResolvedValue(createMockToken(user))
              mockPermissionService.hasPermission.mockReturnValue(false)
              
              const request = createMockRequest(`http://localhost:3000${path}`, method)
              const result = await middleware.validatePermissions(request, {
                permissions: methodPermissions
              })
              
              expect(result.isAuthorized).toBe(false)
              expect(result.error?.status).toBe(403)
            }
          })
        })
      })
    })
  })

  describe('withApiPermissions Higher-Order Function', () => {
    it('should wrap handler and apply permission validation', async () => {
      const user = createMockUser(UserRole.ADMIN)
      mockGetToken.mockResolvedValue(createMockToken(user))
      mockPermissionService.hasPermission.mockReturnValue(true)
      
      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ data: 'success' })
      )
      
      const wrappedHandler = withApiPermissions(mockHandler, {
        permissions: [{ resource: 'products', action: 'read' }]
      })
      
      const request = createMockRequest('http://localhost:3000/api/products')
      const response = await wrappedHandler(request)
      
      expect(mockHandler).toHaveBeenCalledWith(request, {
        user,
        params: undefined
      })
      expect(response.status).toBe(200)
    })

    it('should return error when validation fails', async () => {
      mockGetToken.mockResolvedValue(null)
      
      const mockHandler = jest.fn()
      const wrappedHandler = withApiPermissions(mockHandler, {
        requireAuth: true
      })
      
      const request = createMockRequest('http://localhost:3000/api/products')
      const response = await wrappedHandler(request)
      
      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
    })

    it('should handle handler errors gracefully', async () => {
      const user = createMockUser(UserRole.ADMIN)
      mockGetToken.mockResolvedValue(createMockToken(user))
      
      const mockHandler = jest.fn().mockRejectedValue(new Error('Handler error'))
      const wrappedHandler = withApiPermissions(mockHandler, {
        skipPermissionCheck: true
      })
      
      const request = createMockRequest('http://localhost:3000/api/products')
      const response = await wrappedHandler(request)
      
      expect(response.status).toBe(500)
      
      const errorBody = await response.json()
      expect(errorBody.error.code).toBe('INTERNAL_ERROR')
      expect(errorBody.error.message).toBe('Internal server error')
    })
  })

  describe('Response Format Validation', () => {
    it('should create standardized success responses', () => {
      const testData = { id: 1, name: 'Test Product' }
      const response = middleware.createSuccessResponse(testData, 201)
      
      expect(response.status).toBe(201)
    })

    it('should create standardized error responses', async () => {
      mockGetToken.mockResolvedValue(null)
      
      const request = createMockRequest('http://localhost:3000/api/products')
      const result = await middleware.validatePermissions(request, {
        requireAuth: true
      })
      
      expect(result.error).toBeDefined()
      
      const errorBody = await result.error!.json()
      expect(errorBody).toHaveProperty('error')
      expect(errorBody).toHaveProperty('success', false)
      expect(errorBody.error).toHaveProperty('code')
      expect(errorBody.error).toHaveProperty('message')
      expect(errorBody.error).toHaveProperty('timestamp')
    })
  })

  describe('Audit Logging', () => {
    it('should log successful access attempts', async () => {
      const { auditService } = require('../app/lib/audit-service')
      
      const user = createMockUser(UserRole.ADMIN)
      mockGetToken.mockResolvedValue(createMockToken(user))
      
      const request = createMockRequest('http://localhost:3000/api/products')
      await middleware.validatePermissions(request)
      
      expect(auditService.logAction).toHaveBeenCalledWith(
        user.id,
        'API_ACCESS',
        'api',
        null,
        expect.objectContaining({
          pathname: '/api/products',
          method: 'GET',
          result: 'SUCCESS'
        })
      )
    })

    it('should log security events for violations', async () => {
      const { auditService } = require('../app/lib/audit-service')
      
      mockGetToken.mockResolvedValue(null)
      
      const request = createMockRequest('http://localhost:3000/api/products')
      await middleware.validatePermissions(request, { requireAuth: true })
      
      expect(auditService.logSecurityEvent).toHaveBeenCalledWith(
        'UNAUTHORIZED_ACCESS',
        'MEDIUM',
        undefined,
        expect.objectContaining({
          pathname: '/api/products',
          method: 'GET'
        })
      )
    })
  })
})