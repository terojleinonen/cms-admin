/**
 * API Permission Middleware Tests
 * Tests for the comprehensive API permission validation system
 */

import { NextRequest } from 'next/server';
import { ApiPermissionMiddleware, withApiPermissions } from '@/lib/api-permission-middleware';
import { PermissionService } from '@/lib/permissions';
import { UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/permissions');
jest.mock('@/lib/route-permissions');
jest.mock('@/lib/audit-service');
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}));

import { getToken } from 'next-auth/jwt';
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;

describe('ApiPermissionMiddleware', () => {
  let middleware: ApiPermissionMiddleware;
  let mockPermissionService: jest.Mocked<PermissionService>;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new ApiPermissionMiddleware();
    mockPermissionService = new PermissionService() as jest.Mocked<PermissionService>;
    (middleware as any).permissionService = mockPermissionService;
  });

  const createMockRequest = (url: string, method: string = 'GET'): NextRequest => {
    return new NextRequest(url, { method });
  };

  const createMockUser = (role: UserRole = UserRole.EDITOR) => ({
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role
  });

  describe('validatePermissions', () => {
    it('should allow access for authenticated user with correct permissions', async () => {
      const mockUser = createMockUser(UserRole.ADMIN);
      mockGetToken.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      });

      mockPermissionService.hasPermission.mockReturnValue(true);

      const request = createMockRequest('http://localhost:3000/api/products');
      const result = await middleware.validatePermissions(request, {
        permissions: [{ resource: 'products', action: 'read', scope: 'all' }]
      });

      expect(result.isAuthorized).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeUndefined();
    });

    it('should deny access for unauthenticated user when auth is required', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/products');
      const result = await middleware.validatePermissions(request, {
        requireAuth: true
      });

      expect(result.isAuthorized).toBe(false);
      expect(result.user).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(401);
    });

    it('should deny access for user without required permissions', async () => {
      const mockUser = createMockUser(UserRole.VIEWER);
      mockGetToken.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      });

      mockPermissionService.hasPermission.mockReturnValue(false);

      const request = createMockRequest('http://localhost:3000/api/products');
      const result = await middleware.validatePermissions(request, {
        permissions: [{ resource: 'products', action: 'create', scope: 'all' }]
      });

      expect(result.isAuthorized).toBe(false);
      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(403);
    });

    it('should deny access for disallowed HTTP methods', async () => {
      const mockUser = createMockUser(UserRole.ADMIN);
      mockGetToken.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      });

      const request = createMockRequest('http://localhost:3000/api/products', 'DELETE');
      const result = await middleware.validatePermissions(request, {
        allowedMethods: ['GET', 'POST']
      });

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(405);
    });

    it('should skip permission check when specified', async () => {
      const mockUser = createMockUser(UserRole.VIEWER);
      mockGetToken.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      });

      const request = createMockRequest('http://localhost:3000/api/products');
      const result = await middleware.validatePermissions(request, {
        skipPermissionCheck: true
      });

      expect(result.isAuthorized).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(mockPermissionService.hasPermission).not.toHaveBeenCalled();
    });

    it('should run custom validator when provided', async () => {
      const mockUser = createMockUser(UserRole.EDITOR);
      mockGetToken.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      });

      const customValidator = jest.fn().mockResolvedValue(false);

      const request = createMockRequest('http://localhost:3000/api/products');
      const result = await middleware.validatePermissions(request, {
        customValidator,
        skipPermissionCheck: true
      });

      expect(result.isAuthorized).toBe(false);
      expect(customValidator).toHaveBeenCalledWith(mockUser, request);
      expect(result.error?.status).toBe(403);
    });

    it('should handle token errors gracefully', async () => {
      mockGetToken.mockRejectedValue(new Error('Token error'));

      const request = createMockRequest('http://localhost:3000/api/products');
      const result = await middleware.validatePermissions(request);

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(401);
    });
  });

  describe('withApiPermissions HOF', () => {
    it('should wrap handler and apply permission validation', async () => {
      const mockUser = createMockUser(UserRole.ADMIN);
      mockGetToken.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      });

      mockPermissionService.hasPermission.mockReturnValue(true);

      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }))
      );

      const wrappedHandler = withApiPermissions(mockHandler, {
        permissions: [{ resource: 'products', action: 'read', scope: 'all' }]
      });

      const request = createMockRequest('http://localhost:3000/api/products');
      const response = await wrappedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(request, { 
        user: mockUser, 
        params: undefined 
      });
      expect(response.status).toBe(200);
    });

    it('should return error response when permission validation fails', async () => {
      mockGetToken.mockResolvedValue(null);

      const mockHandler = jest.fn();
      const wrappedHandler = withApiPermissions(mockHandler, {
        requireAuth: true
      });

      const request = createMockRequest('http://localhost:3000/api/products');
      const response = await wrappedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it('should handle handler errors gracefully', async () => {
      const mockUser = createMockUser(UserRole.ADMIN);
      mockGetToken.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      });

      const mockHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      const wrappedHandler = withApiPermissions(mockHandler, {
        skipPermissionCheck: true
      });

      const request = createMockRequest('http://localhost:3000/api/products');
      const response = await wrappedHandler(request);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Error Response Format', () => {
    it('should create standardized error responses', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/products');
      const result = await middleware.validatePermissions(request, {
        requireAuth: true
      });

      expect(result.error).toBeDefined();
      const response = result.error!;
      const responseData = await response.json();

      expect(responseData).toHaveProperty('error');
      expect(responseData).toHaveProperty('success', false);
      expect(responseData.error).toHaveProperty('code');
      expect(responseData.error).toHaveProperty('message');
      expect(responseData.error).toHaveProperty('timestamp');
    });
  });

  describe('Success Response Format', () => {
    it('should create standardized success responses', () => {
      const testData = { id: 1, name: 'Test' };
      const response = middleware.createSuccessResponse(testData);

      expect(response.status).toBe(200);
    });

    it('should create success responses with custom status', () => {
      const testData = { id: 1, name: 'Test' };
      const response = middleware.createSuccessResponse(testData, 201);

      expect(response.status).toBe(201);
    });
  });

  describe('Role-based Access Control', () => {
    it('should allow admin access to all resources', async () => {
      const mockUser = createMockUser(UserRole.ADMIN);
      mockGetToken.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      });

      mockPermissionService.hasPermission.mockReturnValue(true);

      const request = createMockRequest('http://localhost:3000/api/users');
      const result = await middleware.validatePermissions(request, {
        permissions: [{ resource: 'users', action: 'manage', scope: 'all' }]
      });

      expect(result.isAuthorized).toBe(true);
    });

    it('should restrict viewer access to read-only operations', async () => {
      const mockUser = createMockUser(UserRole.VIEWER);
      mockGetToken.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      });

      mockPermissionService.hasPermission.mockReturnValue(false);

      const request = createMockRequest('http://localhost:3000/api/products', 'POST');
      const result = await middleware.validatePermissions(request, {
        permissions: [{ resource: 'products', action: 'create', scope: 'all' }]
      });

      expect(result.isAuthorized).toBe(false);
      expect(result.error?.status).toBe(403);
    });

    it('should allow editor access to content management', async () => {
      const mockUser = createMockUser(UserRole.EDITOR);
      mockGetToken.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      });

      mockPermissionService.hasPermission.mockReturnValue(true);

      const request = createMockRequest('http://localhost:3000/api/products', 'POST');
      const result = await middleware.validatePermissions(request, {
        permissions: [{ resource: 'products', action: 'create', scope: 'all' }]
      });

      expect(result.isAuthorized).toBe(true);
    });
  });
});

describe('Permission Decorators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply requirePermissions decorator correctly', async () => {
    const mockUser = createMockUser(UserRole.ADMIN);
    mockGetToken.mockResolvedValue({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      role: mockUser.role
    });

    const mockPermissionService = new PermissionService() as jest.Mocked<PermissionService>;
    mockPermissionService.hasPermission.mockReturnValue(true);

    const mockHandler = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }))
    );

    // This would be used as a decorator in real code
    const { requirePermissions } = await import('@/lib/api-permission-middleware');
    const decoratedHandler = requirePermissions(
      { resource: 'products', action: 'create', scope: 'all' }
    )()(mockHandler);

    const request = new NextRequest('http://localhost:3000/api/products', { method: 'POST' });
    await decoratedHandler(request);

    // The handler should be called if permissions are valid
    expect(mockHandler).toHaveBeenCalled();
  });
});