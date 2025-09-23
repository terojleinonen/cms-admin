/**
 * API Permission Integration Tests
 * Tests the complete permission system with real API routes
 */

import { NextRequest } from 'next/server';
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware';
import { UserRole } from '@prisma/client';

// Mock the dependencies
jest.mock('@/lib/audit-service', () => ({
  auditService: {
    logAction: jest.fn(),
    logSecurityEvent: jest.fn()
  }
}));

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}));

jest.mock('@/lib/permissions', () => ({
  PermissionService: jest.fn().mockImplementation(() => ({
    hasPermission: jest.fn()
  }))
}));

jest.mock('@/lib/route-permissions', () => ({
  RoutePermissionResolver: jest.fn().mockImplementation(() => ({
    getRoutePermissions: jest.fn().mockReturnValue([]),
    isPublicRoute: jest.fn().mockReturnValue(false)
  })),
  ROUTE_PERMISSION_MAPPINGS: []
}));

import { getToken } from 'next-auth/jwt';
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;

describe('API Permission Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockUser = (role: UserRole = UserRole.EDITOR) => ({
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role
  });

  it('should protect a simple GET endpoint', async () => {
    const mockUser = createMockUser(UserRole.ADMIN);
    mockGetToken.mockResolvedValue({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      role: mockUser.role
    });

    // Mock permission service to allow access
    const { PermissionService } = require('@/lib/permissions');
    const mockPermissionService = new PermissionService();
    mockPermissionService.hasPermission.mockReturnValue(true);

    // Create a protected endpoint
    const protectedHandler = withApiPermissions(
      async (request: NextRequest, { user }) => {
        return createApiSuccessResponse({ 
          message: 'Success',
          userId: user?.id 
        });
      },
      {
        permissions: [{ resource: 'products', action: 'read', scope: 'all' }]
      }
    );

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await protectedHandler(request);

    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data.userId).toBe(mockUser.id);
  });

  it('should deny access to unauthorized users', async () => {
    mockGetToken.mockResolvedValue(null);

    const protectedHandler = withApiPermissions(
      async (request: NextRequest, { user }) => {
        return createApiSuccessResponse({ message: 'Success' });
      },
      {
        permissions: [{ resource: 'products', action: 'read', scope: 'all' }]
      }
    );

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await protectedHandler(request);

    expect(response.status).toBe(401);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error.code).toBe('UNAUTHORIZED');
  });

  it('should handle POST requests with permission validation', async () => {
    const mockUser = createMockUser(UserRole.EDITOR);
    mockGetToken.mockResolvedValue({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      role: mockUser.role
    });

    const { PermissionService } = require('@/lib/permissions');
    const mockPermissionService = new PermissionService();
    mockPermissionService.hasPermission.mockReturnValue(true);

    const protectedHandler = withApiPermissions(
      async (request: NextRequest, { user }) => {
        const body = await request.json();
        return createApiSuccessResponse({ 
          message: 'Created',
          data: body,
          createdBy: user?.id 
        }, 201);
      },
      {
        permissions: [{ resource: 'products', action: 'create', scope: 'all' }],
        allowedMethods: ['POST']
      }
    );

    const request = new NextRequest('http://localhost:3000/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Product' }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await protectedHandler(request);

    expect(response.status).toBe(201);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data.createdBy).toBe(mockUser.id);
  });

  it('should deny access for insufficient permissions', async () => {
    const mockUser = createMockUser(UserRole.VIEWER);
    mockGetToken.mockResolvedValue({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      role: mockUser.role
    });

    const { PermissionService } = require('@/lib/permissions');
    const mockPermissionService = new PermissionService();
    mockPermissionService.hasPermission.mockReturnValue(false);

    const protectedHandler = withApiPermissions(
      async (request: NextRequest, { user }) => {
        return createApiSuccessResponse({ message: 'Success' });
      },
      {
        permissions: [{ resource: 'products', action: 'create', scope: 'all' }]
      }
    );

    const request = new NextRequest('http://localhost:3000/api/products', {
      method: 'POST'
    });

    const response = await protectedHandler(request);

    expect(response.status).toBe(403);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error.code).toBe('FORBIDDEN');
  });

  it('should handle method restrictions', async () => {
    const mockUser = createMockUser(UserRole.ADMIN);
    mockGetToken.mockResolvedValue({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      role: mockUser.role
    });

    const protectedHandler = withApiPermissions(
      async (request: NextRequest, { user }) => {
        return createApiSuccessResponse({ message: 'Success' });
      },
      {
        allowedMethods: ['GET', 'POST']
      }
    );

    const request = new NextRequest('http://localhost:3000/api/products', {
      method: 'DELETE'
    });

    const response = await protectedHandler(request);

    expect(response.status).toBe(405);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('should create consistent error responses', async () => {
    mockGetToken.mockResolvedValue(null);

    const protectedHandler = withApiPermissions(
      async (request: NextRequest, { user }) => {
        return createApiSuccessResponse({ message: 'Success' });
      },
      {
        requireAuth: true
      }
    );

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await protectedHandler(request);

    expect(response.status).toBe(401);
    const responseData = await response.json();
    
    // Verify error response structure
    expect(responseData).toHaveProperty('error');
    expect(responseData).toHaveProperty('success', false);
    expect(responseData.error).toHaveProperty('code');
    expect(responseData.error).toHaveProperty('message');
    expect(responseData.error).toHaveProperty('timestamp');
    expect(typeof responseData.error.timestamp).toBe('string');
  });

  it('should create consistent success responses', async () => {
    const mockUser = createMockUser(UserRole.ADMIN);
    mockGetToken.mockResolvedValue({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      role: mockUser.role
    });

    const protectedHandler = withApiPermissions(
      async (request: NextRequest, { user }) => {
        return createApiSuccessResponse({ 
          id: 1, 
          name: 'Test Product',
          createdBy: user?.id 
        });
      },
      {
        skipPermissionCheck: true
      }
    );

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await protectedHandler(request);

    expect(response.status).toBe(200);
    const responseData = await response.json();
    
    // Verify success response structure
    expect(responseData).toHaveProperty('data');
    expect(responseData).toHaveProperty('success', true);
    expect(responseData).toHaveProperty('timestamp');
    expect(typeof responseData.timestamp).toBe('string');
    expect(responseData.data.createdBy).toBe(mockUser.id);
  });
});