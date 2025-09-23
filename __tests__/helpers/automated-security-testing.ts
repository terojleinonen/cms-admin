/**
 * Automated Security Testing for API Endpoints
 * Comprehensive security testing utilities that automatically test all API endpoints
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
  SecurityTestScenario,
  ApiTestSetup
} from './api-permission-test-utils';
import { glob } from 'glob';
import path from 'path';

// API endpoint metadata
export interface ApiEndpointMetadata {
  path: string;
  methods: string[];
  requiredPermissions: Permission[];
  allowedRoles: UserRole[];
  isPublic: boolean;
  requiresAuth: boolean;
  description?: string;
}

// Security test result
export interface SecurityTestResult {
  endpoint: string;
  method: string;
  scenario: string;
  passed: boolean;
  error?: string;
  expectedStatus: number;
  actualStatus: number;
  duration: number;
}

// Security test report
export interface SecurityTestReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  endpoints: number;
  coverage: number;
  results: SecurityTestResult[];
  summary: {
    authenticationTests: number;
    authorizationTests: number;
    methodTests: number;
    permissionTests: number;
  };
}

/**
 * API Endpoint Discovery
 * Automatically discovers all API endpoints in the application
 */
export class ApiEndpointDiscovery {
  private static readonly API_ROUTES_PATTERN = 'app/api/**/route.{ts,js}';
  private static readonly EXCLUDED_PATTERNS = [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
  ];

  /**
   * Discover all API endpoints
   */
  static async discoverEndpoints(): Promise<string[]> {
    try {
      const files = await glob(this.API_ROUTES_PATTERN, {
        ignore: this.EXCLUDED_PATTERNS,
        cwd: process.cwd(),
      });

      return files.map(file => this.filePathToApiPath(file));
    } catch (error) {
      console.error('Failed to discover API endpoints:', error);
      return [];
    }
  }

  /**
   * Convert file path to API path
   */
  private static filePathToApiPath(filePath: string): string {
    // Convert app/api/products/route.ts -> /api/products
    const apiPath = filePath
      .replace(/^app/, '')
      .replace(/\/route\.(ts|js)$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1'); // Convert [id] to :id

    return apiPath;
  }

  /**
   * Get endpoint metadata from route file
   */
  static async getEndpointMetadata(apiPath: string): Promise<ApiEndpointMetadata> {
    const filePath = this.apiPathToFilePath(apiPath);
    
    try {
      // Dynamic import to analyze the route file
      const routeModule = await import(path.resolve(filePath));
      
      const methods = Object.keys(routeModule).filter(key => 
        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(key)
      );

      // Try to extract metadata from comments or exports
      const metadata: ApiEndpointMetadata = {
        path: apiPath,
        methods,
        requiredPermissions: this.extractPermissions(apiPath),
        allowedRoles: this.extractAllowedRoles(apiPath),
        isPublic: this.isPublicEndpoint(apiPath),
        requiresAuth: !this.isPublicEndpoint(apiPath),
        description: `API endpoint: ${apiPath}`,
      };

      return metadata;
    } catch (error) {
      console.warn(`Failed to analyze endpoint ${apiPath}:`, error);
      
      // Return default metadata
      return {
        path: apiPath,
        methods: ['GET'],
        requiredPermissions: [],
        allowedRoles: [UserRole.ADMIN],
        isPublic: false,
        requiresAuth: true,
      };
    }
  }

  /**
   * Convert API path back to file path
   */
  private static apiPathToFilePath(apiPath: string): string {
    return `app${apiPath}/route.ts`;
  }

  /**
   * Extract required permissions from API path
   */
  private static extractPermissions(apiPath: string): Permission[] {
    const permissions: Permission[] = [];
    
    // Extract resource from path
    const pathSegments = apiPath.split('/').filter(Boolean);
    if (pathSegments.length >= 2) {
      const resource = pathSegments[1]; // /api/products -> products
      
      // Map common patterns
      if (resource === 'admin') {
        permissions.push({ resource: '*', action: 'manage', scope: 'all' });
      } else {
        permissions.push({ resource, action: 'read', scope: 'all' });
      }
    }
    
    return permissions;
  }

  /**
   * Extract allowed roles from API path
   */
  private static extractAllowedRoles(apiPath: string): UserRole[] {
    if (apiPath.startsWith('/api/admin')) {
      return [UserRole.ADMIN];
    }
    
    if (apiPath.startsWith('/api/public')) {
      return [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER];
    }
    
    // Default to editor and admin
    return [UserRole.ADMIN, UserRole.EDITOR];
  }

  /**
   * Check if endpoint is public
   */
  private static isPublicEndpoint(apiPath: string): boolean {
    const publicPaths = [
      '/api/health',
      '/api/auth',
      '/api/public',
      '/api/csrf-token',
    ];
    
    return publicPaths.some(publicPath => apiPath.startsWith(publicPath));
  }
}

/**
 * Automated Security Test Generator
 * Generates comprehensive security tests for discovered endpoints
 */
export class AutomatedSecurityTestGenerator {
  /**
   * Generate security tests for all endpoints
   */
  static async generateAllEndpointTests(): Promise<Map<string, SecurityTestScenario[]>> {
    const endpoints = await ApiEndpointDiscovery.discoverEndpoints();
    const testMap = new Map<string, SecurityTestScenario[]>();
    
    for (const endpoint of endpoints) {
      const metadata = await ApiEndpointDiscovery.getEndpointMetadata(endpoint);
      const scenarios = this.generateEndpointTests(metadata);
      testMap.set(endpoint, scenarios);
    }
    
    return testMap;
  }

  /**
   * Generate security tests for specific endpoint
   */
  static generateEndpointTests(metadata: ApiEndpointMetadata): SecurityTestScenario[] {
    const scenarios: SecurityTestScenario[] = [];
    
    // Authentication tests
    if (metadata.requiresAuth) {
      scenarios.push(...this.generateAuthenticationTests());
    }
    
    // Authorization tests
    if (!metadata.isPublic) {
      scenarios.push(...this.generateAuthorizationTests(metadata));
    }
    
    // Method tests
    scenarios.push(...this.generateMethodTests(metadata));
    
    // Permission tests
    if (metadata.requiredPermissions.length > 0) {
      scenarios.push(...this.generatePermissionTests(metadata));
    }
    
    return scenarios;
  }

  /**
   * Generate authentication test scenarios
   */
  private static generateAuthenticationTests(): SecurityTestScenario[] {
    return [
      {
        name: 'should reject unauthenticated requests',
        user: null,
        expectedStatus: 401,
        expectedError: 'UNAUTHORIZED',
        description: 'Endpoint should require authentication',
      },
      {
        name: 'should reject expired tokens',
        user: TestUserFactory.createAdmin(),
        expectedStatus: 401,
        expectedError: 'UNAUTHORIZED',
        description: 'Endpoint should reject expired authentication tokens',
      },
    ];
  }

  /**
   * Generate authorization test scenarios
   */
  private static generateAuthorizationTests(metadata: ApiEndpointMetadata): SecurityTestScenario[] {
    const scenarios: SecurityTestScenario[] = [];
    
    // Test allowed roles
    for (const role of metadata.allowedRoles) {
      scenarios.push({
        name: `should allow ${role} role`,
        user: TestUserFactory.createUser({ role }),
        expectedStatus: 200,
        description: `${role} should have access to this endpoint`,
      });
    }
    
    // Test denied roles
    const allRoles = [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER];
    const deniedRoles = allRoles.filter(role => !metadata.allowedRoles.includes(role));
    
    for (const role of deniedRoles) {
      scenarios.push({
        name: `should deny ${role} role`,
        user: TestUserFactory.createUser({ role }),
        expectedStatus: 403,
        expectedError: 'FORBIDDEN',
        description: `${role} should be denied access to this endpoint`,
      });
    }
    
    return scenarios;
  }

  /**
   * Generate HTTP method test scenarios
   */
  private static generateMethodTests(metadata: ApiEndpointMetadata): SecurityTestScenario[] {
    const scenarios: SecurityTestScenario[] = [];
    const allMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const disallowedMethods = allMethods.filter(method => !metadata.methods.includes(method));
    
    for (const method of disallowedMethods) {
      scenarios.push({
        name: `should reject ${method} method`,
        user: TestUserFactory.createAdmin(),
        expectedStatus: 405,
        expectedError: 'METHOD_NOT_ALLOWED',
        description: `${method} method should not be allowed on this endpoint`,
      });
    }
    
    return scenarios;
  }

  /**
   * Generate permission test scenarios
   */
  private static generatePermissionTests(metadata: ApiEndpointMetadata): SecurityTestScenario[] {
    const scenarios: SecurityTestScenario[] = [];
    
    // Test with sufficient permissions
    scenarios.push({
      name: 'should allow with sufficient permissions',
      user: TestUserFactory.createAdmin(),
      expectedStatus: 200,
      description: 'User with required permissions should have access',
    });
    
    // Test with insufficient permissions
    scenarios.push({
      name: 'should deny with insufficient permissions',
      user: TestUserFactory.createViewer(),
      expectedStatus: 403,
      expectedError: 'FORBIDDEN',
      description: 'User without required permissions should be denied',
    });
    
    return scenarios;
  }
}

/**
 * Automated Security Test Runner
 * Executes security tests against all discovered endpoints
 */
export class AutomatedSecurityTestRunner {
  private results: SecurityTestResult[] = [];
  private startTime: number = 0;

  /**
   * Run security tests for all endpoints
   */
  async runAllEndpointTests(): Promise<SecurityTestReport> {
    this.startTime = Date.now();
    this.results = [];
    
    const testMap = await AutomatedSecurityTestGenerator.generateAllEndpointTests();
    
    for (const [endpoint, scenarios] of testMap) {
      await this.runEndpointTests(endpoint, scenarios);
    }
    
    return this.generateReport();
  }

  /**
   * Run security tests for specific endpoint
   */
  async runEndpointTests(endpoint: string, scenarios: SecurityTestScenario[]): Promise<void> {
    const metadata = await ApiEndpointDiscovery.getEndpointMetadata(endpoint);
    
    for (const method of metadata.methods) {
      for (const scenario of scenarios) {
        await this.runSingleTest(endpoint, method, scenario);
      }
    }
  }

  /**
   * Run single security test
   */
  private async runSingleTest(
    endpoint: string,
    method: string,
    scenario: SecurityTestScenario
  ): Promise<void> {
    const testStart = Date.now();
    
    try {
      // Setup test environment
      ApiTestSetup.initializeAll();
      
      // Setup authentication
      if (scenario.user) {
        if (scenario.name.includes('expired')) {
          MockAuthService.mockExpiredToken(scenario.user);
        } else {
          MockAuthService.mockAuthenticatedUser(scenario.user);
        }
      } else {
        MockAuthService.mockUnauthenticated();
      }
      
      // Setup permissions
      if (scenario.user?.role === UserRole.ADMIN) {
        MockPermissionService.mockAdminPermissions();
      } else {
        MockPermissionService.mockNoPermissions();
      }
      
      // Create request
      const request = ApiRequestBuilder
        .get(`http://localhost:3000${endpoint}`)
        .setMethod(method)
        .build();
      
      // Execute test (this would need to be implemented based on your routing system)
      const response = await this.executeApiRequest(endpoint, request);
      
      // Validate response
      const passed = response.status === scenario.expectedStatus;
      
      this.results.push({
        endpoint,
        method,
        scenario: scenario.name,
        passed,
        error: passed ? undefined : `Expected ${scenario.expectedStatus}, got ${response.status}`,
        expectedStatus: scenario.expectedStatus,
        actualStatus: response.status,
        duration: Date.now() - testStart,
      });
      
    } catch (error) {
      this.results.push({
        endpoint,
        method,
        scenario: scenario.name,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        expectedStatus: scenario.expectedStatus,
        actualStatus: 500,
        duration: Date.now() - testStart,
      });
    } finally {
      ApiTestSetup.resetAll();
    }
  }

  /**
   * Execute API request (mock implementation)
   */
  private async executeApiRequest(endpoint: string, request: NextRequest): Promise<NextResponse> {
    // This is a mock implementation
    // In a real scenario, you would need to import and execute the actual API handler
    
    try {
      // Try to dynamically import the route handler
      const routePath = `../../../app${endpoint}/route`;
      const routeModule = await import(routePath);
      
      const method = request.method;
      const handler = routeModule[method];
      
      if (!handler) {
        return NextResponse.json(
          { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } },
          { status: 405 }
        );
      }
      
      return await handler(request);
    } catch (error) {
      // If we can't import the route, return a mock response
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Route not found' } },
        { status: 404 }
      );
    }
  }

  /**
   * Generate test report
   */
  private generateReport(): SecurityTestReport {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    const endpoints = new Set(this.results.map(r => r.endpoint)).size;
    const coverage = endpoints > 0 ? (passedTests / totalTests) * 100 : 0;
    
    const summary = {
      authenticationTests: this.results.filter(r => r.scenario.includes('authentication') || r.scenario.includes('unauthenticated')).length,
      authorizationTests: this.results.filter(r => r.scenario.includes('role') || r.scenario.includes('allow') || r.scenario.includes('deny')).length,
      methodTests: this.results.filter(r => r.scenario.includes('method')).length,
      permissionTests: this.results.filter(r => r.scenario.includes('permission')).length,
    };
    
    return {
      totalTests,
      passedTests,
      failedTests,
      endpoints,
      coverage,
      results: this.results,
      summary,
    };
  }

  /**
   * Print test report
   */
  static printReport(report: SecurityTestReport): void {
    console.log('\n=== API Security Test Report ===');
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passedTests}`);
    console.log(`Failed: ${report.failedTests}`);
    console.log(`Endpoints Tested: ${report.endpoints}`);
    console.log(`Coverage: ${report.coverage.toFixed(2)}%`);
    
    console.log('\n=== Test Summary ===');
    console.log(`Authentication Tests: ${report.summary.authenticationTests}`);
    console.log(`Authorization Tests: ${report.summary.authorizationTests}`);
    console.log(`Method Tests: ${report.summary.methodTests}`);
    console.log(`Permission Tests: ${report.summary.permissionTests}`);
    
    if (report.failedTests > 0) {
      console.log('\n=== Failed Tests ===');
      report.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`❌ ${result.endpoint} [${result.method}] - ${result.scenario}`);
          console.log(`   Expected: ${result.expectedStatus}, Got: ${result.actualStatus}`);
          if (result.error) {
            console.log(`   Error: ${result.error}`);
          }
        });
    }
    
    console.log('\n=== Passed Tests ===');
    const passedCount = report.results.filter(r => r.passed).length;
    console.log(`✅ ${passedCount} tests passed successfully`);
  }
}

/**
 * Security Test CLI
 * Command-line interface for running automated security tests
 */
export class SecurityTestCLI {
  /**
   * Run security tests from command line
   */
  static async run(options: {
    endpoint?: string;
    verbose?: boolean;
    output?: string;
  } = {}): Promise<void> {
    console.log('🔒 Starting Automated API Security Tests...\n');
    
    const runner = new AutomatedSecurityTestRunner();
    
    let report: SecurityTestReport;
    
    if (options.endpoint) {
      // Test specific endpoint
      const scenarios = AutomatedSecurityTestGenerator.generateEndpointTests(
        await ApiEndpointDiscovery.getEndpointMetadata(options.endpoint)
      );
      await runner.runEndpointTests(options.endpoint, scenarios);
      report = runner['generateReport']();
    } else {
      // Test all endpoints
      report = await runner.runAllEndpointTests();
    }
    
    // Print report
    AutomatedSecurityTestRunner.printReport(report);
    
    // Save report to file if specified
    if (options.output) {
      const fs = await import('fs/promises');
      await fs.writeFile(options.output, JSON.stringify(report, null, 2));
      console.log(`\n📄 Report saved to: ${options.output}`);
    }
    
    // Exit with error code if tests failed
    if (report.failedTests > 0) {
      process.exit(1);
    }
  }
}

// Export main utilities
export {
  ApiEndpointDiscovery,
  AutomatedSecurityTestGenerator,
  AutomatedSecurityTestRunner,
  SecurityTestCLI,
};

// Convenience function for running all security tests
export async function runAutomatedSecurityTests(): Promise<SecurityTestReport> {
  const runner = new AutomatedSecurityTestRunner();
  return await runner.runAllEndpointTests();
}