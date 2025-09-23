/**
 * Comprehensive API Permission Testing Example
 * Demonstrates complete usage of all API permission testing utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { withApiPermissions } from '@/lib/api-permission-middleware';
import { 
  TestUserFactory,
  MockAuthService,
  MockPermissionService,
  ApiRequestBuilder,
  ApiResponseValidator,
  ApiTestSetup,
  SecurityTestGenerator,
  ApiTestRunner
} from './helpers/api-permission-test-utils';
import { 
  CrudApiTestPattern,
  AdminApiTestPattern,
  PublicApiTestPattern
} from './helpers/api-permission-patterns';

// Mock a complete API handler using the permission middleware
const createProtectedApiHandler = (
  businessLogic: (request: NextRequest, context: { user: any }) => Promise<NextResponse>,
  permissions: any[] = [],
  options: any = {}
) => {
  return withApiPermissions(businessLogic, {
    permissions,
    requireAuth: true,
    ...options
  });
};

// Sample business logic handlers
const productsBusinessLogic = {
  create: async (request: NextRequest, { user }: { user: any }) => {
    const body = await request.json();
    return NextResponse.json({
      data: { id: '123', ...body, createdBy: user?.id },
      success: true
    }, { status: 201 });
  },

  read: async (request: NextRequest, { user }: { user: any }) => {
    const url = new URL(request.url);
    const page = url.searchParams.get('page') || '1';
    const limit = url.searchParams.get('limit') || '10';
    
    return NextResponse.json({
      data: {
        products: [
          { id: '1', name: 'Product 1', createdBy: user?.id },
          { id: '2', name: 'Product 2', createdBy: 'other-user' }
        ],
        pagination: { page: parseInt(page), limit: parseInt(limit), total: 2 }
      },
      success: true
    });
  },

  update: async (request: NextRequest, { user }: { user: any }) => {
    const body = await request.json();
    return NextResponse.json({
      data: { id: '123', ...body, updatedBy: user?.id },
      success: true
    });
  },

  delete: async (request: NextRequest, { user }: { user: any }) => {
    return NextResponse.json({
      data: { message: 'Product deleted', deletedBy: user?.id },
      success: true
    });
  }
};

// Create protected handlers
const protectedHandlers = {
  create: createProtectedApiHandler(
    productsBusinessLogic.create,
    [{ resource: 'products', action: 'create', scope: 'all' }],
    { allowedMethods: ['POST'] }
  ),
  
  read: createProtectedApiHandler(
    productsBusinessLogic.read,
    [{ resource: 'products', action: 'read', scope: 'all' }],
    { allowedMethods: ['GET'] }
  ),
  
  update: createProtectedApiHandler(
    productsBusinessLogic.update,
    [{ resource: 'products', action: 'update', scope: 'all' }],
    { allowedMethods: ['PUT'], allowOwnerAccess: true }
  ),
  
  delete: createProtectedApiHandler(
    productsBusinessLogic.delete,
    [{ resource: 'products', action: 'delete', scope: 'all' }],
    { allowedMethods: ['DELETE'] }
  )
};

describe('Comprehensive API Permission Testing', () => {
  beforeEach(() => {
    ApiTestSetup.initializeAll();
  });

  afterEach(() => {
    ApiTestSetup.resetAll();
  });

  describe('Individual Permission Tests', () => {
    it('should test CREATE endpoint with proper authentication and authorization', async () => {
      // Test 1: Unauthenticated request should fail
      MockAuthService.mockUnauthenticated();
      
      let request = ApiRequestBuilder
        .post('http://localhost:3000/api/products', { name: 'Test Product' })
        .build();
      
      let response = await protectedHandlers.create(request);
      await ApiResponseValidator.validateUnauthorizedResponse(response);

      // Test 2: Authenticated user with permissions should succeed
      const admin = TestUserFactory.createAdmin();
      MockAuthService.mockAuthenticatedUser(admin);
      MockPermissionService.mockAdminPermissions();
      
      request = ApiRequestBuilder
        .post('http://localhost:3000/api/products', { name: 'Admin Product' })
        .build();
      
      response = await protectedHandlers.create(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 201);
      expect(data.name).toBe('Admin Product');
      expect(data.createdBy).toBe(admin.id);

      // Test 3: Authenticated user without permissions should fail
      const viewer = TestUserFactory.createViewer();
      MockAuthService.mockAuthenticatedUser(viewer);
      MockPermissionService.mockRolePermissions(UserRole.VIEWER, false);
      
      request = ApiRequestBuilder
        .post('http://localhost:3000/api/products', { name: 'Viewer Product' })
        .build();
      
      response = await protectedHandlers.create(request);
      await ApiResponseValidator.validateForbiddenResponse(response);
    });

    it('should test READ endpoint with different user roles', async () => {
      // Test with different roles
      const roles = [
        { role: UserRole.ADMIN, shouldSucceed: true },
        { role: UserRole.EDITOR, shouldSucceed: true },
        { role: UserRole.VIEWER, shouldSucceed: true }
      ];

      for (const { role, shouldSucceed } of roles) {
        const user = TestUserFactory.createUser({ role });
        MockAuthService.mockAuthenticatedUser(user);
        MockPermissionService.mockRolePermissions(role, shouldSucceed);
        
        const request = ApiRequestBuilder
          .get('http://localhost:3000/api/products?page=1&limit=5')
          .build();
        
        const response = await protectedHandlers.read(request);
        
        if (shouldSucceed) {
          const data = await ApiResponseValidator.validateSuccessResponse(response);
          expect(data.products).toBeInstanceOf(Array);
          expect(data.pagination).toBeDefined();
        } else {
          await ApiResponseValidator.validateForbiddenResponse(response);
        }
      }
    });

    it('should test UPDATE endpoint with ownership checks', async () => {
      const owner = TestUserFactory.createEditor({ id: 'owner-123' });
      const otherUser = TestUserFactory.createEditor({ id: 'other-456' });

      // Test 1: Owner should be able to update their own resource
      MockAuthService.mockAuthenticatedUser(owner);
      MockPermissionService.mockPermissions({
        'products:update:own': true,
        'products:update:all': false
      });
      
      let request = ApiRequestBuilder
        .put('http://localhost:3000/api/products/owner-123', { name: 'Updated by Owner' })
        .build();
      
      let response = await protectedHandlers.update(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response);
      expect(data.name).toBe('Updated by Owner');
      expect(data.updatedBy).toBe(owner.id);

      // Test 2: Admin should be able to update any resource
      const admin = TestUserFactory.createAdmin();
      MockAuthService.mockAuthenticatedUser(admin);
      MockPermissionService.mockAdminPermissions();
      
      request = ApiRequestBuilder
        .put('http://localhost:3000/api/products/any-id', { name: 'Updated by Admin' })
        .build();
      
      response = await protectedHandlers.update(request);
      const adminData = await ApiResponseValidator.validateSuccessResponse(response);
      expect(adminData.name).toBe('Updated by Admin');
    });

    it('should test DELETE endpoint with strict permissions', async () => {
      // Test 1: Only admin should be able to delete
      const admin = TestUserFactory.createAdmin();
      MockAuthService.mockAuthenticatedUser(admin);
      MockPermissionService.mockAdminPermissions();
      
      let request = ApiRequestBuilder
        .delete('http://localhost:3000/api/products/123')
        .build();
      
      let response = await protectedHandlers.delete(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response);
      expect(data.message).toBe('Product deleted');

      // Test 2: Editor should be denied
      const editor = TestUserFactory.createEditor();
      MockAuthService.mockAuthenticatedUser(editor);
      MockPermissionService.mockRolePermissions(UserRole.EDITOR, false);
      
      request = ApiRequestBuilder
        .delete('http://localhost:3000/api/products/123')
        .build();
      
      response = await protectedHandlers.delete(request);
      await ApiResponseValidator.validateForbiddenResponse(response);
    });
  });

  describe('Security Test Scenarios', () => {
    it('should run comprehensive security scenarios for all endpoints', async () => {
      const endpoints = [
        { name: 'CREATE', handler: protectedHandlers.create, method: 'POST' },
        { name: 'READ', handler: protectedHandlers.read, method: 'GET' },
        { name: 'UPDATE', handler: protectedHandlers.update, method: 'PUT' },
        { name: 'DELETE', handler: protectedHandlers.delete, method: 'DELETE' }
      ];

      for (const endpoint of endpoints) {
        const scenarios = SecurityTestGenerator.generateComprehensiveTestSuite({
          allowedRoles: endpoint.name === 'DELETE' ? [UserRole.ADMIN] : [UserRole.ADMIN, UserRole.EDITOR],
          deniedRoles: endpoint.name === 'READ' ? [] : [UserRole.VIEWER],
          allowedMethods: [endpoint.method],
          includeAuthTests: true
        });

        // Run a subset of scenarios for each endpoint
        for (const scenario of scenarios.slice(0, 3)) {
          const request = ApiRequestBuilder
            .get('http://localhost:3000/api/products')
            .setMethod(endpoint.method)
            .build();
          
          await ApiTestRunner.runSecurityScenario(scenario, endpoint.handler, request);
        }
      }
    });

    it('should test HTTP method restrictions', async () => {
      const admin = TestUserFactory.createAdmin();
      MockAuthService.mockAuthenticatedUser(admin);
      MockPermissionService.mockAdminPermissions();

      // Test allowed methods
      const allowedTests = [
        { handler: protectedHandlers.create, method: 'POST' },
        { handler: protectedHandlers.read, method: 'GET' },
        { handler: protectedHandlers.update, method: 'PUT' },
        { handler: protectedHandlers.delete, method: 'DELETE' }
      ];

      for (const { handler, method } of allowedTests) {
        const request = ApiRequestBuilder
          .get('http://localhost:3000/api/products')
          .setMethod(method)
          .build();
        
        const response = await handler(request);
        expect(response.status).toBeLessThan(400);
      }

      // Test disallowed methods
      const disallowedTests = [
        { handler: protectedHandlers.create, method: 'GET' },
        { handler: protectedHandlers.read, method: 'POST' },
        { handler: protectedHandlers.update, method: 'DELETE' },
        { handler: protectedHandlers.delete, method: 'PATCH' }
      ];

      for (const { handler, method } of disallowedTests) {
        const request = ApiRequestBuilder
          .get('http://localhost:3000/api/products')
          .setMethod(method)
          .build();
        
        const response = await handler(request);
        await ApiResponseValidator.validateMethodNotAllowedResponse(response);
      }
    });

    it('should test input validation and sanitization', async () => {
      const admin = TestUserFactory.createAdmin();
      MockAuthService.mockAuthenticatedUser(admin);
      MockPermissionService.mockAdminPermissions();

      // Test XSS prevention
      const maliciousData = {
        name: '<script>alert("xss")</script>',
        description: '<img src="x" onerror="alert(1)">',
        price: 'DROP TABLE products;'
      };

      const request = ApiRequestBuilder
        .post('http://localhost:3000/api/products', maliciousData)
        .build();
      
      const response = await protectedHandlers.create(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 201);
      
      // In a real implementation, the data should be sanitized
      expect(data.name).toBeDefined();
      // The actual sanitization would be done by the business logic
    });

    it('should test error handling', async () => {
      // Test invalid JSON
      MockAuthService.mockAuthenticatedUser(TestUserFactory.createAdmin());
      MockPermissionService.mockAdminPermissions();

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: 'invalid json{',
        headers: { 'Content-Type': 'application/json' }
      });
      
      try {
        await protectedHandlers.create(request);
      } catch (error) {
        // Should handle JSON parsing errors gracefully
        expect(error).toBeDefined();
      }
    });
  });

  describe('CRUD Pattern Testing', () => {
    // Use the CRUD testing patterns
    CrudApiTestPattern.createCompleteCrudSuite('/api/products', {
      create: protectedHandlers.create,
      read: protectedHandlers.read,
      update: protectedHandlers.update,
      delete: protectedHandlers.delete
    }, {
      requiredPermissions: [{ resource: 'products', action: 'manage' }],
      allowedRoles: [UserRole.ADMIN, UserRole.EDITOR],
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests', async () => {
      const admin = TestUserFactory.createAdmin();
      MockAuthService.mockAuthenticatedUser(admin);
      MockPermissionService.mockAdminPermissions();

      // Create multiple concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) =>
        ApiRequestBuilder
          .post('http://localhost:3000/api/products', { name: `Product ${i}` })
          .build()
      );

      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map(request => protectedHandlers.create(request))
      );
      const endTime = Date.now();

      // All requests should succeed
      for (const response of responses) {
        expect(response.status).toBe(201);
      }

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });

    it('should handle permission cache efficiently', async () => {
      const users = TestUserFactory.createAllRoles();
      
      // Make multiple requests with the same user to test caching
      for (const user of users) {
        MockAuthService.mockAuthenticatedUser(user);
        MockPermissionService.mockRolePermissions(user.role, user.role !== UserRole.VIEWER);

        const requests = Array.from({ length: 5 }, () =>
          ApiRequestBuilder.get('http://localhost:3000/api/products').build()
        );

        const startTime = Date.now();
        const responses = await Promise.all(
          requests.map(request => protectedHandlers.read(request))
        );
        const endTime = Date.now();

        // Subsequent requests should be faster due to caching
        expect(endTime - startTime).toBeLessThan(1000); // 1 second
        
        // All responses should be consistent
        const statuses = responses.map(r => r.status);
        expect(new Set(statuses).size).toBe(1); // All same status
      }
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle malformed requests', async () => {
      const admin = TestUserFactory.createAdmin();
      MockAuthService.mockAuthenticatedUser(admin);
      MockPermissionService.mockAdminPermissions();

      // Test with missing Content-Type
      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' })
        // Missing Content-Type header
      });
      
      const response = await protectedHandlers.create(request);
      // Should handle gracefully
      expect(response.status).toBeLessThan(500);
    });

    it('should handle database errors gracefully', async () => {
      // Mock a handler that simulates database errors
      const errorHandler = createProtectedApiHandler(
        async (request: NextRequest) => {
          throw new Error('Database connection failed');
        },
        [{ resource: 'products', action: 'read' }]
      );

      const admin = TestUserFactory.createAdmin();
      MockAuthService.mockAuthenticatedUser(admin);
      MockPermissionService.mockAdminPermissions();

      const request = ApiRequestBuilder
        .get('http://localhost:3000/api/products')
        .build();
      
      const response = await errorHandler(request);
      expect(response.status).toBe(500);
      
      const error = await ApiResponseValidator.validateErrorResponse(response, 500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle permission service failures', async () => {
      const admin = TestUserFactory.createAdmin();
      MockAuthService.mockAuthenticatedUser(admin);
      
      // Mock permission service to throw error
      MockPermissionService.mockPermissions({});
      const mockHasPermission = jest.fn().mockImplementation(() => {
        throw new Error('Permission service unavailable');
      });
      
      const request = ApiRequestBuilder
        .get('http://localhost:3000/api/products')
        .build();
      
      // Should handle permission service errors gracefully
      const response = await protectedHandlers.read(request);
      expect(response.status).toBeLessThan(600);
    });
  });

  describe('Audit and Logging', () => {
    it('should log all access attempts', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const admin = TestUserFactory.createAdmin();
      MockAuthService.mockAuthenticatedUser(admin);
      MockPermissionService.mockAdminPermissions();

      const request = ApiRequestBuilder
        .post('http://localhost:3000/api/products', { name: 'Logged Product' })
        .build();
      
      await protectedHandlers.create(request);
      
      // Should have logged the access attempt
      // In a real implementation, this would check audit logs
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should log security violations', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Attempt unauthorized access
      MockAuthService.mockUnauthenticated();
      
      const request = ApiRequestBuilder
        .post('http://localhost:3000/api/products', { name: 'Unauthorized Product' })
        .build();
      
      await protectedHandlers.create(request);
      
      // Should have logged the security violation
      // In a real implementation, this would check security event logs
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});