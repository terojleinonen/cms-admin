/**
 * API Permission Testing Utilities
 * Comprehensive test helpers for API permission validation, mock authentication, and security testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { Permission } from '@/lib/permissions';
import { User } from '@/lib/types';
import { jest } from '@jest/globals';

// Mock authentication token structure
export interface MockAuthToken {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Test user factory
export interface TestUserOptions {
  id?: string;
  email?: string;
  name?: string;
  role?: UserRole;
  isActive?: boolean;
  twoFactorEnabled?: boolean;
}

// API test context
export interface ApiTestContext {
  user: User | null;
  token: MockAuthToken | null;
  request: NextRequest;
  mockPermissions: Record<string, boolean>;
}

// Security test scenario
export interface SecurityTestScenario {
  name: string;
  user: User | null;
  expectedStatus: number;
  expectedError?: string;
  description: string;
}

/**
 * Test User Factory
 * Creates mock users with different roles and configurations
 */
export class TestUserFactory {
  private static userCounter = 1;

  /**
   * Create a mock user with specified options
   */
  static createUser(options: TestUserOptions = {}): User {
    const id = options.id || `test-user-${this.userCounter++}`;
    
    return {
      id,
      email: options.email || `${id}@example.com`,
      name: options.name || `Test User ${id}`,
      role: options.role || UserRole.VIEWER,
      isActive: options.isActive ?? true,
      twoFactorEnabled: options.twoFactorEnabled ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Create admin user
   */
  static createAdmin(options: Partial<TestUserOptions> = {}): User {
    return this.createUser({ ...options, role: UserRole.ADMIN });
  }

  /**
   * Create editor user
   */
  static createEditor(options: Partial<TestUserOptions> = {}): User {
    return this.createUser({ ...options, role: UserRole.EDITOR });
  }

  /**
   * Create viewer user
   */
  static createViewer(options: Partial<TestUserOptions> = {}): User {
    return this.createUser({ ...options, role: UserRole.VIEWER });
  }

  /**
   * Create multiple users with different roles
   */
  static createUserSet(): { admin: User; editor: User; viewer: User } {
    return {
      admin: this.createAdmin(),
      editor: this.createEditor(),
      viewer: this.createViewer(),
    };
  }

  /**
   * Create users for all roles
   */
  static createAllRoles(): User[] {
    return [
      this.createAdmin(),
      this.createEditor(),
      this.createViewer(),
    ];
  }
}

/**
 * Mock Authentication Service
 * Provides utilities for mocking NextAuth authentication in tests
 */
export class MockAuthService {
  private static mockGetToken: jest.MockedFunction<any>;

  /**
   * Initialize mock authentication
   */
  static initialize(): void {
    const { getToken } = require('next-auth/jwt');
    this.mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
  }

  /**
   * Mock authentication with user
   */
  static mockAuthenticatedUser(user: User): MockAuthToken {
    const token: MockAuthToken = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };

    this.mockGetToken.mockResolvedValue(token);
    return token;
  }

  /**
   * Mock unauthenticated request
   */
  static mockUnauthenticated(): void {
    this.mockGetToken.mockResolvedValue(null);
  }

  /**
   * Mock expired token
   */
  static mockExpiredToken(user: User): MockAuthToken {
    const token: MockAuthToken = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
    };

    this.mockGetToken.mockResolvedValue(token);
    return token;
  }

  /**
   * Mock invalid token
   */
  static mockInvalidToken(): void {
    this.mockGetToken.mockRejectedValue(new Error('Invalid token'));
  }

  /**
   * Reset authentication mocks
   */
  static reset(): void {
    if (this.mockGetToken) {
      this.mockGetToken.mockReset();
    }
  }
}

/**
 * Permission Mock Service
 * Provides utilities for mocking permission checks in tests
 */
export class MockPermissionService {
  private static mockPermissionService: any;
  private static mockHasPermission: jest.MockedFunction<any>;

  /**
   * Initialize permission mocks
   */
  static initialize(): void {
    const { PermissionService } = require('@/lib/permissions');
    this.mockPermissionService = new PermissionService();
    this.mockHasPermission = jest.fn();
    this.mockPermissionService.hasPermission = this.mockHasPermission;
  }

  /**
   * Mock permission result for specific permission
   */
  static mockPermission(permission: Permission, result: boolean): void {
    this.mockHasPermission.mockImplementation((user: User, perm: Permission) => {
      if (
        perm.resource === permission.resource &&
        perm.action === permission.action &&
        perm.scope === permission.scope
      ) {
        return result;
      }
      return false;
    });
  }

  /**
   * Mock multiple permissions
   */
  static mockPermissions(permissions: Record<string, boolean>): void {
    this.mockHasPermission.mockImplementation((user: User, permission: Permission) => {
      const key = `${permission.resource}:${permission.action}:${permission.scope || 'default'}`;
      return permissions[key] || false;
    });
  }

  /**
   * Mock all permissions for a role
   */
  static mockRolePermissions(role: UserRole, allowed: boolean = true): void {
    this.mockHasPermission.mockImplementation((user: User) => {
      return user?.role === role ? allowed : false;
    });
  }

  /**
   * Mock admin permissions (allow all)
   */
  static mockAdminPermissions(): void {
    this.mockHasPermission.mockImplementation((user: User) => {
      return user?.role === UserRole.ADMIN;
    });
  }

  /**
   * Mock no permissions (deny all)
   */
  static mockNoPermissions(): void {
    this.mockHasPermission.mockReturnValue(false);
  }

  /**
   * Reset permission mocks
   */
  static reset(): void {
    if (this.mockHasPermission) {
      this.mockHasPermission.mockReset();
    }
  }
}

/**
 * API Request Builder
 * Utility for creating mock NextRequest objects for testing
 */
export class ApiRequestBuilder {
  private url: string;
  private method: string;
  private headers: Record<string, string>;
  private body?: any;

  constructor(url: string = 'http://localhost:3000/api/test') {
    this.url = url;
    this.method = 'GET';
    this.headers = {};
  }

  /**
   * Set HTTP method
   */
  setMethod(method: string): this {
    this.method = method;
    return this;
  }

  /**
   * Set request URL
   */
  setUrl(url: string): this {
    this.url = url;
    return this;
  }

  /**
   * Add header
   */
  addHeader(name: string, value: string): this {
    this.headers[name] = value;
    return this;
  }

  /**
   * Set JSON body
   */
  setJsonBody(body: any): this {
    this.body = JSON.stringify(body);
    this.headers['Content-Type'] = 'application/json';
    return this;
  }

  /**
   * Set form data body
   */
  setFormBody(data: Record<string, string>): this {
    const formData = new URLSearchParams(data);
    this.body = formData.toString();
    this.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    return this;
  }

  /**
   * Build NextRequest object
   */
  build(): NextRequest {
    return new NextRequest(this.url, {
      method: this.method,
      headers: this.headers,
      body: this.body,
    });
  }

  /**
   * Create GET request
   */
  static get(url: string): ApiRequestBuilder {
    return new ApiRequestBuilder(url).setMethod('GET');
  }

  /**
   * Create POST request
   */
  static post(url: string, body?: any): ApiRequestBuilder {
    const builder = new ApiRequestBuilder(url).setMethod('POST');
    if (body) {
      builder.setJsonBody(body);
    }
    return builder;
  }

  /**
   * Create PUT request
   */
  static put(url: string, body?: any): ApiRequestBuilder {
    const builder = new ApiRequestBuilder(url).setMethod('PUT');
    if (body) {
      builder.setJsonBody(body);
    }
    return builder;
  }

  /**
   * Create DELETE request
   */
  static delete(url: string): ApiRequestBuilder {
    return new ApiRequestBuilder(url).setMethod('DELETE');
  }
}

/**
 * API Response Validator
 * Utilities for validating API responses in tests
 */
export class ApiResponseValidator {
  /**
   * Validate success response structure
   */
  static async validateSuccessResponse(
    response: NextResponse,
    expectedStatus: number = 200
  ): Promise<any> {
    expect(response.status).toBe(expectedStatus);
    
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('timestamp');
    expect(typeof data.timestamp).toBe('string');
    
    return data.data;
  }

  /**
   * Validate error response structure
   */
  static async validateErrorResponse(
    response: NextResponse,
    expectedStatus: number,
    expectedCode?: string
  ): Promise<any> {
    expect(response.status).toBe(expectedStatus);
    
    const data = await response.json();
    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('error');
    expect(data.error).toHaveProperty('code');
    expect(data.error).toHaveProperty('message');
    expect(data.error).toHaveProperty('timestamp');
    expect(typeof data.error.timestamp).toBe('string');
    
    if (expectedCode) {
      expect(data.error.code).toBe(expectedCode);
    }
    
    return data.error;
  }

  /**
   * Validate unauthorized response
   */
  static async validateUnauthorizedResponse(response: NextResponse): Promise<void> {
    await this.validateErrorResponse(response, 401, 'UNAUTHORIZED');
  }

  /**
   * Validate forbidden response
   */
  static async validateForbiddenResponse(response: NextResponse): Promise<void> {
    await this.validateErrorResponse(response, 403, 'FORBIDDEN');
  }

  /**
   * Validate method not allowed response
   */
  static async validateMethodNotAllowedResponse(response: NextResponse): Promise<void> {
    await this.validateErrorResponse(response, 405, 'METHOD_NOT_ALLOWED');
  }
}

/**
 * Security Test Generator
 * Generates comprehensive security test scenarios for API endpoints
 */
export class SecurityTestGenerator {
  /**
   * Generate authentication test scenarios
   */
  static generateAuthTestScenarios(): SecurityTestScenario[] {
    return [
      {
        name: 'should deny access to unauthenticated users',
        user: null,
        expectedStatus: 401,
        expectedError: 'UNAUTHORIZED',
        description: 'Unauthenticated request should be rejected',
      },
    ];
  }

  /**
   * Generate role-based test scenarios
   */
  static generateRoleTestScenarios(
    allowedRoles: UserRole[],
    deniedRoles: UserRole[] = []
  ): SecurityTestScenario[] {
    const scenarios: SecurityTestScenario[] = [];
    
    // Test allowed roles
    for (const role of allowedRoles) {
      scenarios.push({
        name: `should allow access for ${role} role`,
        user: TestUserFactory.createUser({ role }),
        expectedStatus: 200,
        description: `${role} should have access`,
      });
    }
    
    // Test denied roles
    for (const role of deniedRoles) {
      scenarios.push({
        name: `should deny access for ${role} role`,
        user: TestUserFactory.createUser({ role }),
        expectedStatus: 403,
        expectedError: 'FORBIDDEN',
        description: `${role} should be denied access`,
      });
    }
    
    return scenarios;
  }

  /**
   * Generate permission-based test scenarios
   */
  static generatePermissionTestScenarios(
    requiredPermissions: Permission[]
  ): SecurityTestScenario[] {
    const scenarios: SecurityTestScenario[] = [];
    
    // Test with sufficient permissions
    scenarios.push({
      name: 'should allow access with sufficient permissions',
      user: TestUserFactory.createAdmin(),
      expectedStatus: 200,
      description: 'User with required permissions should have access',
    });
    
    // Test with insufficient permissions
    scenarios.push({
      name: 'should deny access with insufficient permissions',
      user: TestUserFactory.createViewer(),
      expectedStatus: 403,
      expectedError: 'FORBIDDEN',
      description: 'User without required permissions should be denied',
    });
    
    return scenarios;
  }

  /**
   * Generate HTTP method test scenarios
   */
  static generateMethodTestScenarios(
    allowedMethods: string[],
    deniedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  ): SecurityTestScenario[] {
    const scenarios: SecurityTestScenario[] = [];
    const testMethods = deniedMethods.filter(method => !allowedMethods.includes(method));
    
    for (const method of testMethods) {
      scenarios.push({
        name: `should deny ${method} method`,
        user: TestUserFactory.createAdmin(),
        expectedStatus: 405,
        expectedError: 'METHOD_NOT_ALLOWED',
        description: `${method} method should not be allowed`,
      });
    }
    
    return scenarios;
  }

  /**
   * Generate comprehensive security test suite
   */
  static generateComprehensiveTestSuite(options: {
    allowedRoles?: UserRole[];
    deniedRoles?: UserRole[];
    requiredPermissions?: Permission[];
    allowedMethods?: string[];
    includeAuthTests?: boolean;
  } = {}): SecurityTestScenario[] {
    const {
      allowedRoles = [UserRole.ADMIN],
      deniedRoles = [UserRole.VIEWER],
      requiredPermissions = [],
      allowedMethods = ['GET'],
      includeAuthTests = true,
    } = options;

    let scenarios: SecurityTestScenario[] = [];

    if (includeAuthTests) {
      scenarios = scenarios.concat(this.generateAuthTestScenarios());
    }

    scenarios = scenarios.concat(
      this.generateRoleTestScenarios(allowedRoles, deniedRoles)
    );

    if (requiredPermissions.length > 0) {
      scenarios = scenarios.concat(
        this.generatePermissionTestScenarios(requiredPermissions)
      );
    }

    scenarios = scenarios.concat(
      this.generateMethodTestScenarios(allowedMethods)
    );

    return scenarios;
  }
}

/**
 * API Test Runner
 * Executes security test scenarios against API endpoints
 */
export class ApiTestRunner {
  /**
   * Run security test scenario
   */
  static async runSecurityScenario(
    scenario: SecurityTestScenario,
    apiHandler: (request: NextRequest) => Promise<NextResponse>,
    request: NextRequest
  ): Promise<void> {
    // Setup authentication
    if (scenario.user) {
      MockAuthService.mockAuthenticatedUser(scenario.user);
    } else {
      MockAuthService.mockUnauthenticated();
    }

    // Execute API handler
    const response = await apiHandler(request);

    // Validate response
    if (scenario.expectedStatus >= 200 && scenario.expectedStatus < 300) {
      await ApiResponseValidator.validateSuccessResponse(response, scenario.expectedStatus);
    } else {
      await ApiResponseValidator.validateErrorResponse(
        response,
        scenario.expectedStatus,
        scenario.expectedError
      );
    }
  }

  /**
   * Run multiple security scenarios
   */
  static async runSecurityScenarios(
    scenarios: SecurityTestScenario[],
    apiHandler: (request: NextRequest) => Promise<NextResponse>,
    requestBuilder: () => NextRequest
  ): Promise<void> {
    for (const scenario of scenarios) {
      await this.runSecurityScenario(scenario, apiHandler, requestBuilder());
    }
  }
}

/**
 * Test Setup Utilities
 * Helper functions for setting up API permission tests
 */
export class ApiTestSetup {
  /**
   * Initialize all mocks for API testing
   */
  static initializeAll(): void {
    MockAuthService.initialize();
    MockPermissionService.initialize();
  }

  /**
   * Reset all mocks
   */
  static resetAll(): void {
    MockAuthService.reset();
    MockPermissionService.reset();
    jest.clearAllMocks();
  }

  /**
   * Setup test context with user and permissions
   */
  static setupTestContext(
    user: User | null,
    permissions: Record<string, boolean> = {}
  ): ApiTestContext {
    let token: MockAuthToken | null = null;
    
    if (user) {
      token = MockAuthService.mockAuthenticatedUser(user);
    } else {
      MockAuthService.mockUnauthenticated();
    }

    MockPermissionService.mockPermissions(permissions);

    return {
      user,
      token,
      request: ApiRequestBuilder.get('http://localhost:3000/api/test').build(),
      mockPermissions: permissions,
    };
  }

  /**
   * Create test suite for API endpoint
   */
  static createEndpointTestSuite(
    endpointName: string,
    apiHandler: (request: NextRequest) => Promise<NextResponse>,
    options: {
      allowedRoles?: UserRole[];
      deniedRoles?: UserRole[];
      requiredPermissions?: Permission[];
      allowedMethods?: string[];
      customScenarios?: SecurityTestScenario[];
    } = {}
  ): void {
    describe(`${endpointName} Security Tests`, () => {
      beforeEach(() => {
        ApiTestSetup.initializeAll();
      });

      afterEach(() => {
        ApiTestSetup.resetAll();
      });

      const scenarios = SecurityTestGenerator.generateComprehensiveTestSuite(options);
      
      if (options.customScenarios) {
        scenarios.push(...options.customScenarios);
      }

      scenarios.forEach(scenario => {
        it(scenario.name, async () => {
          const request = ApiRequestBuilder.get('http://localhost:3000/api/test').build();
          await ApiTestRunner.runSecurityScenario(scenario, apiHandler, request);
        });
      });
    });
  }
}

// Export convenience functions
export const createTestUser = TestUserFactory.createUser;
export const createAdmin = TestUserFactory.createAdmin;
export const createEditor = TestUserFactory.createEditor;
export const createViewer = TestUserFactory.createViewer;

export const mockAuth = MockAuthService.mockAuthenticatedUser;
export const mockNoAuth = MockAuthService.mockUnauthenticated;
export const mockPermissions = MockPermissionService.mockPermissions;

export const buildRequest = ApiRequestBuilder;
export const validateResponse = ApiResponseValidator;
export const runSecurityTests = ApiTestRunner.runSecurityScenarios;