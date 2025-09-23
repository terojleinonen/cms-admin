/**
 * API Permission Testing Patterns
 * Common testing patterns and utilities for API permission validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { Permission } from '@/lib/permissions';
import { User } from '@/lib/types';
import { 
  TestUserFactory,
  MockAuthService,
  MockPermissionService,
  ApiRequestBuilder,
  ApiResponseValidator,
  ApiTestSetup
} from './api-permission-test-utils';

// Test pattern configuration
export interface TestPatternConfig {
  endpoint: string;
  methods?: string[];
  requiredPermissions?: Permission[];
  allowedRoles?: UserRole[];
  deniedRoles?: UserRole[];
  requiresAuth?: boolean;
  allowOwnerAccess?: boolean;
  customTests?: CustomTestCase[];
}

// Custom test case
export interface CustomTestCase {
  name: string;
  setup: () => Promise<void> | void;
  user: User | null;
  request: NextRequest;
  expectedStatus: number;
  expectedError?: string;
  validate?: (response: NextResponse) => Promise<void> | void;
}

/**
 * CRUD API Testing Pattern
 * Standard testing pattern for Create, Read, Update, Delete operations
 */
export class CrudApiTestPattern {
  /**
   * Test CREATE endpoint
   */
  static createTestSuite(
    endpoint: string,
    handler: (request: NextRequest) => Promise<NextResponse>,
    config: {
      requiredPermissions?: Permission[];
      allowedRoles?: UserRole[];
      sampleData?: any;
      validationTests?: boolean;
    } = {}
  ): void {
    const {
      requiredPermissions = [{ resource: 'products', action: 'create' }],
      allowedRoles = [UserRole.ADMIN, UserRole.EDITOR],
      sampleData = { name: 'Test Item' },
      validationTests = true
    } = config;

    describe(`POST ${endpoint} - CREATE`, () => {
      beforeEach(() => {
        ApiTestSetup.initializeAll();
      });

      afterEach(() => {
        ApiTestSetup.resetAll();
      });

      // Authentication tests
      it('should require authentication', async () => {
        MockAuthService.mockUnauthenticated();
        
        const request = ApiRequestBuilder
          .post(`http://localhost:3000${endpoint}`, sampleData)
          .build();
        
        const response = await handler(request);
        await ApiResponseValidator.validateUnauthorizedResponse(response);
      });

      // Authorization tests
      allowedRoles.forEach(role => {
        it(`should allow ${role} to create`, async () => {
          const user = TestUserFactory.createUser({ role });
          MockAuthService.mockAuthenticatedUser(user);
          MockPermissionService.mockRolePermissions(role, true);
          
          const request = ApiRequestBuilder
            .post(`http://localhost:3000${endpoint}`, sampleData)
            .build();
          
          const response = await handler(request);
          expect(response.status).toBeLessThan(400);
        });
      });

      const deniedRoles = [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER]
        .filter(role => !allowedRoles.includes(role));

      deniedRoles.forEach(role => {
        it(`should deny ${role} from creating`, async () => {
          const user = TestUserFactory.createUser({ role });
          MockAuthService.mockAuthenticatedUser(user);
          MockPermissionService.mockRolePermissions(role, false);
          
          const request = ApiRequestBuilder
            .post(`http://localhost:3000${endpoint}`, sampleData)
            .build();
          
          const response = await handler(request);
          await ApiResponseValidator.validateForbiddenResponse(response);
        });
      });

      // Validation tests
      if (validationTests) {
        it('should validate required fields', async () => {
          const user = TestUserFactory.createAdmin();
          MockAuthService.mockAuthenticatedUser(user);
          MockPermissionService.mockAdminPermissions();
          
          const request = ApiRequestBuilder
            .post(`http://localhost:3000${endpoint}`, {})
            .build();
          
          const response = await handler(request);
          expect(response.status).toBe(400);
        });

        it('should sanitize input data', async () => {
          const user = TestUserFactory.createAdmin();
          MockAuthService.mockAuthenticatedUser(user);
          MockPermissionService.mockAdminPermissions();
          
          const maliciousData = {
            ...sampleData,
            name: '<script>alert("xss")</script>',
            description: 'DROP TABLE users;'
          };
          
          const request = ApiRequestBuilder
            .post(`http://localhost:3000${endpoint}`, maliciousData)
            .build();
          
          const response = await handler(request);
          
          if (response.status < 400) {
            const data = await ApiResponseValidator.validateSuccessResponse(response, 201);
            expect(data.name).not.toContain('<script>');
          }
        });
      }
    });
  }

  /**
   * Test READ endpoint
   */
  static readTestSuite(
    endpoint: string,
    handler: (request: NextRequest) => Promise<NextResponse>,
    config: {
      requiredPermissions?: Permission[];
      allowedRoles?: UserRole[];
      testPagination?: boolean;
      testFiltering?: boolean;
    } = {}
  ): void {
    const {
      requiredPermissions = [{ resource: 'products', action: 'read' }],
      allowedRoles = [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER],
      testPagination = true,
      testFiltering = true
    } = config;

    describe(`GET ${endpoint} - READ`, () => {
      beforeEach(() => {
        ApiTestSetup.initializeAll();
      });

      afterEach(() => {
        ApiTestSetup.resetAll();
      });

      // Authentication tests
      it('should require authentication', async () => {
        MockAuthService.mockUnauthenticated();
        
        const request = ApiRequestBuilder
          .get(`http://localhost:3000${endpoint}`)
          .build();
        
        const response = await handler(request);
        await ApiResponseValidator.validateUnauthorizedResponse(response);
      });

      // Authorization tests
      allowedRoles.forEach(role => {
        it(`should allow ${role} to read`, async () => {
          const user = TestUserFactory.createUser({ role });
          MockAuthService.mockAuthenticatedUser(user);
          MockPermissionService.mockRolePermissions(role, true);
          
          const request = ApiRequestBuilder
            .get(`http://localhost:3000${endpoint}`)
            .build();
          
          const response = await handler(request);
          expect(response.status).toBeLessThan(400);
        });
      });

      // Pagination tests
      if (testPagination) {
        it('should handle pagination parameters', async () => {
          const user = TestUserFactory.createAdmin();
          MockAuthService.mockAuthenticatedUser(user);
          MockPermissionService.mockAdminPermissions();
          
          const request = ApiRequestBuilder
            .get(`http://localhost:3000${endpoint}?page=1&limit=10`)
            .build();
          
          const response = await handler(request);
          expect(response.status).toBeLessThan(400);
        });

        it('should validate pagination limits', async () => {
          const user = TestUserFactory.createAdmin();
          MockAuthService.mockAuthenticatedUser(user);
          MockPermissionService.mockAdminPermissions();
          
          const request = ApiRequestBuilder
            .get(`http://localhost:3000${endpoint}?page=1&limit=1000`)
            .build();
          
          const response = await handler(request);
          // Should either limit the results or return an error
          expect(response.status).toBeLessThan(500);
        });
      }

      // Filtering tests
      if (testFiltering) {
        it('should handle search parameters', async () => {
          const user = TestUserFactory.createAdmin();
          MockAuthService.mockAuthenticatedUser(user);
          MockPermissionService.mockAdminPermissions();
          
          const request = ApiRequestBuilder
            .get(`http://localhost:3000${endpoint}?search=test`)
            .build();
          
          const response = await handler(request);
          expect(response.status).toBeLessThan(400);
        });
      }
    });
  }

  /**
   * Test UPDATE endpoint
   */
  static updateTestSuite(
    endpoint: string,
    handler: (request: NextRequest) => Promise<NextResponse>,
    config: {
      requiredPermissions?: Permission[];
      allowedRoles?: UserRole[];
      sampleData?: any;
      testOwnership?: boolean;
    } = {}
  ): void {
    const {
      requiredPermissions = [{ resource: 'products', action: 'update' }],
      allowedRoles = [UserRole.ADMIN, UserRole.EDITOR],
      sampleData = { name: 'Updated Item' },
      testOwnership = true
    } = config;

    describe(`PUT ${endpoint} - UPDATE`, () => {
      beforeEach(() => {
        ApiTestSetup.initializeAll();
      });

      afterEach(() => {
        ApiTestSetup.resetAll();
      });

      // Authentication tests
      it('should require authentication', async () => {
        MockAuthService.mockUnauthenticated();
        
        const request = ApiRequestBuilder
          .put(`http://localhost:3000${endpoint}/123`, sampleData)
          .build();
        
        const response = await handler(request);
        await ApiResponseValidator.validateUnauthorizedResponse(response);
      });

      // Authorization tests
      allowedRoles.forEach(role => {
        it(`should allow ${role} to update`, async () => {
          const user = TestUserFactory.createUser({ role });
          MockAuthService.mockAuthenticatedUser(user);
          MockPermissionService.mockRolePermissions(role, true);
          
          const request = ApiRequestBuilder
            .put(`http://localhost:3000${endpoint}/123`, sampleData)
            .build();
          
          const response = await handler(request);
          expect(response.status).toBeLessThan(400);
        });
      });

      // Ownership tests
      if (testOwnership) {
        it('should allow owners to update their own resources', async () => {
          const user = TestUserFactory.createEditor();
          MockAuthService.mockAuthenticatedUser(user);
          MockPermissionService.mockPermissions({
            'products:update:own': true,
            'products:update:all': false
          });
          
          const request = ApiRequestBuilder
            .put(`http://localhost:3000${endpoint}/${user.id}`, sampleData)
            .build();
          
          const response = await handler(request);
          expect(response.status).toBeLessThan(400);
        });

        it('should deny updating others resources without permission', async () => {
          const user = TestUserFactory.createEditor();
          MockAuthService.mockAuthenticatedUser(user);
          MockPermissionService.mockPermissions({
            'products:update:own': true,
            'products:update:all': false
          });
          
          const request = ApiRequestBuilder
            .put(`http://localhost:3000${endpoint}/other-user-id`, sampleData)
            .build();
          
          const response = await handler(request);
          await ApiResponseValidator.validateForbiddenResponse(response);
        });
      }
    });
  }

  /**
   * Test DELETE endpoint
   */
  static deleteTestSuite(
    endpoint: string,
    handler: (request: NextRequest) => Promise<NextResponse>,
    config: {
      requiredPermissions?: Permission[];
      allowedRoles?: UserRole[];
      testOwnership?: boolean;
      testCascade?: boolean;
    } = {}
  ): void {
    const {
      requiredPermissions = [{ resource: 'products', action: 'delete' }],
      allowedRoles = [UserRole.ADMIN],
      testOwnership = true,
      testCascade = false
    } = config;

    describe(`DELETE ${endpoint} - DELETE`, () => {
      beforeEach(() => {
        ApiTestSetup.initializeAll();
      });

      afterEach(() => {
        ApiTestSetup.resetAll();
      });

      // Authentication tests
      it('should require authentication', async () => {
        MockAuthService.mockUnauthenticated();
        
        const request = ApiRequestBuilder
          .delete(`http://localhost:3000${endpoint}/123`)
          .build();
        
        const response = await handler(request);
        await ApiResponseValidator.validateUnauthorizedResponse(response);
      });

      // Authorization tests (usually more restrictive)
      allowedRoles.forEach(role => {
        it(`should allow ${role} to delete`, async () => {
          const user = TestUserFactory.createUser({ role });
          MockAuthService.mockAuthenticatedUser(user);
          MockPermissionService.mockRolePermissions(role, true);
          
          const request = ApiRequestBuilder
            .delete(`http://localhost:3000${endpoint}/123`)
            .build();
          
          const response = await handler(request);
          expect(response.status).toBeLessThan(400);
        });
      });

      const deniedRoles = [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER]
        .filter(role => !allowedRoles.includes(role));

      deniedRoles.forEach(role => {
        it(`should deny ${role} from deleting`, async () => {
          const user = TestUserFactory.createUser({ role });
          MockAuthService.mockAuthenticatedUser(user);
          MockPermissionService.mockRolePermissions(role, false);
          
          const request = ApiRequestBuilder
            .delete(`http://localhost:3000${endpoint}/123`)
            .build();
          
          const response = await handler(request);
          await ApiResponseValidator.validateForbiddenResponse(response);
        });
      });

      // Ownership tests
      if (testOwnership) {
        it('should prevent users from deleting their own account', async () => {
          const user = TestUserFactory.createAdmin();
          MockAuthService.mockAuthenticatedUser(user);
          MockPermissionService.mockAdminPermissions();
          
          const request = ApiRequestBuilder
            .delete(`http://localhost:3000${endpoint}/${user.id}`)
            .build();
          
          const response = await handler(request);
          await ApiResponseValidator.validateForbiddenResponse(response);
        });
      }

      // Cascade deletion tests
      if (testCascade) {
        it('should handle cascade deletion properly', async () => {
          const user = TestUserFactory.createAdmin();
          MockAuthService.mockAuthenticatedUser(user);
          MockPermissionService.mockAdminPermissions();
          
          const request = ApiRequestBuilder
            .delete(`http://localhost:3000${endpoint}/123?cascade=true`)
            .build();
          
          const response = await handler(request);
          expect(response.status).toBeLessThan(400);
        });
      }
    });
  }

  /**
   * Create complete CRUD test suite
   */
  static createCompleteCrudSuite(
    baseEndpoint: string,
    handlers: {
      create?: (request: NextRequest) => Promise<NextResponse>;
      read?: (request: NextRequest) => Promise<NextResponse>;
      update?: (request: NextRequest) => Promise<NextResponse>;
      delete?: (request: NextRequest) => Promise<NextResponse>;
    },
    config: TestPatternConfig = {}
  ): void {
    const {
      requiredPermissions = [{ resource: 'products', action: 'manage' }],
      allowedRoles = [UserRole.ADMIN, UserRole.EDITOR],
      methods = ['GET', 'POST', 'PUT', 'DELETE']
    } = config;

    describe(`CRUD API Tests - ${baseEndpoint}`, () => {
      if (methods.includes('POST') && handlers.create) {
        this.createTestSuite(baseEndpoint, handlers.create, {
          requiredPermissions,
          allowedRoles
        });
      }

      if (methods.includes('GET') && handlers.read) {
        this.readTestSuite(baseEndpoint, handlers.read, {
          requiredPermissions: [{ resource: requiredPermissions[0].resource, action: 'read' }],
          allowedRoles: [...allowedRoles, UserRole.VIEWER]
        });
      }

      if (methods.includes('PUT') && handlers.update) {
        this.updateTestSuite(baseEndpoint, handlers.update, {
          requiredPermissions,
          allowedRoles
        });
      }

      if (methods.includes('DELETE') && handlers.delete) {
        this.deleteTestSuite(baseEndpoint, handlers.delete, {
          requiredPermissions,
          allowedRoles: [UserRole.ADMIN] // Usually more restrictive
        });
      }
    });
  }
}

/**
 * Admin API Testing Pattern
 * Testing pattern for admin-only endpoints
 */
export class AdminApiTestPattern {
  /**
   * Create admin endpoint test suite
   */
  static createTestSuite(
    endpoint: string,
    handler: (request: NextRequest) => Promise<NextResponse>,
    config: {
      methods?: string[];
      customTests?: CustomTestCase[];
    } = {}
  ): void {
    const { methods = ['GET'], customTests = [] } = config;

    describe(`Admin API Tests - ${endpoint}`, () => {
      beforeEach(() => {
        ApiTestSetup.initializeAll();
      });

      afterEach(() => {
        ApiTestSetup.resetAll();
      });

      methods.forEach(method => {
        describe(`${method} ${endpoint}`, () => {
          it('should require authentication', async () => {
            MockAuthService.mockUnauthenticated();
            
            const request = ApiRequestBuilder
              .get(`http://localhost:3000${endpoint}`)
              .setMethod(method)
              .build();
            
            const response = await handler(request);
            await ApiResponseValidator.validateUnauthorizedResponse(response);
          });

          it('should require admin role', async () => {
            const user = TestUserFactory.createEditor();
            MockAuthService.mockAuthenticatedUser(user);
            MockPermissionService.mockRolePermissions(UserRole.EDITOR, false);
            
            const request = ApiRequestBuilder
              .get(`http://localhost:3000${endpoint}`)
              .setMethod(method)
              .build();
            
            const response = await handler(request);
            await ApiResponseValidator.validateForbiddenResponse(response);
          });

          it('should allow admin access', async () => {
            const user = TestUserFactory.createAdmin();
            MockAuthService.mockAuthenticatedUser(user);
            MockPermissionService.mockAdminPermissions();
            
            const request = ApiRequestBuilder
              .get(`http://localhost:3000${endpoint}`)
              .setMethod(method)
              .build();
            
            const response = await handler(request);
            expect(response.status).toBeLessThan(400);
          });
        });
      });

      // Run custom tests
      customTests.forEach(testCase => {
        it(testCase.name, async () => {
          await testCase.setup();
          
          if (testCase.user) {
            MockAuthService.mockAuthenticatedUser(testCase.user);
          } else {
            MockAuthService.mockUnauthenticated();
          }
          
          const response = await handler(testCase.request);
          
          if (testCase.expectedStatus >= 200 && testCase.expectedStatus < 300) {
            await ApiResponseValidator.validateSuccessResponse(response, testCase.expectedStatus);
          } else {
            await ApiResponseValidator.validateErrorResponse(
              response,
              testCase.expectedStatus,
              testCase.expectedError
            );
          }
          
          if (testCase.validate) {
            await testCase.validate(response);
          }
        });
      });
    });
  }
}

/**
 * Public API Testing Pattern
 * Testing pattern for public endpoints
 */
export class PublicApiTestPattern {
  /**
   * Create public endpoint test suite
   */
  static createTestSuite(
    endpoint: string,
    handler: (request: NextRequest) => Promise<NextResponse>,
    config: {
      methods?: string[];
      rateLimitTests?: boolean;
      validationTests?: boolean;
    } = {}
  ): void {
    const { methods = ['GET'], rateLimitTests = true, validationTests = true } = config;

    describe(`Public API Tests - ${endpoint}`, () => {
      beforeEach(() => {
        ApiTestSetup.initializeAll();
      });

      afterEach(() => {
        ApiTestSetup.resetAll();
      });

      methods.forEach(method => {
        describe(`${method} ${endpoint}`, () => {
          it('should allow unauthenticated access', async () => {
            MockAuthService.mockUnauthenticated();
            
            const request = ApiRequestBuilder
              .get(`http://localhost:3000${endpoint}`)
              .setMethod(method)
              .build();
            
            const response = await handler(request);
            expect(response.status).toBeLessThan(400);
          });

          it('should allow authenticated access', async () => {
            const user = TestUserFactory.createViewer();
            MockAuthService.mockAuthenticatedUser(user);
            
            const request = ApiRequestBuilder
              .get(`http://localhost:3000${endpoint}`)
              .setMethod(method)
              .build();
            
            const response = await handler(request);
            expect(response.status).toBeLessThan(400);
          });
        });
      });

      // Rate limiting tests
      if (rateLimitTests) {
        it('should implement rate limiting', async () => {
          MockAuthService.mockUnauthenticated();
          
          // Make multiple rapid requests
          const requests = Array.from({ length: 100 }, () =>
            ApiRequestBuilder.get(`http://localhost:3000${endpoint}`).build()
          );
          
          const responses = await Promise.all(
            requests.map(request => handler(request))
          );
          
          // At least some requests should be rate limited
          const rateLimitedResponses = responses.filter(r => r.status === 429);
          expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });
      }

      // Input validation tests
      if (validationTests && methods.includes('POST')) {
        it('should validate input data', async () => {
          MockAuthService.mockUnauthenticated();
          
          const request = ApiRequestBuilder
            .post(`http://localhost:3000${endpoint}`, { invalid: 'data' })
            .build();
          
          const response = await handler(request);
          // Should either accept valid data or reject invalid data
          expect([200, 201, 400, 422]).toContain(response.status);
        });
      }
    });
  }
}

// Export all patterns
export {
  CrudApiTestPattern,
  AdminApiTestPattern,
  PublicApiTestPattern,
};