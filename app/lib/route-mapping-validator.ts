/**
 * Route Mapping Validator
 * Validates route configurations and tests route permission resolution
 */

import { RoutePermissionResolver, RoutePermissionConfig } from './route-permissions';
import { COMPREHENSIVE_ROUTE_MAPPING, ExtendedRouteConfig, RouteCategory } from './route-mapping-config';
import { Permission } from './permissions';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

export interface ValidationError {
  type: 'error';
  code: string;
  message: string;
  route?: string;
  details?: any;
}

export interface ValidationWarning {
  type: 'warning';
  code: string;
  message: string;
  route?: string;
  details?: any;
}

export interface ValidationSummary {
  totalRoutes: number;
  validRoutes: number;
  errorCount: number;
  warningCount: number;
  coverage: {
    publicRoutes: number;
    protectedRoutes: number;
    apiRoutes: number;
    webRoutes: number;
  };
}

/**
 * Route test case interface
 */
export interface RouteTestCase {
  path: string;
  method?: string;
  expectedPermissions: Permission[];
  expectedPublic: boolean;
  description: string;
}

/**
 * Route Mapping Validator
 */
export class RouteMappingValidator {
  private resolver: RoutePermissionResolver;
  private routes: ExtendedRouteConfig[];

  constructor(
    routes: ExtendedRouteConfig[] = COMPREHENSIVE_ROUTE_MAPPING,
    resolver?: RoutePermissionResolver
  ) {
    this.routes = routes;
    this.resolver = resolver || new RoutePermissionResolver(routes);
  }

  /**
   * Validate all route configurations
   */
  validateRouteConfigurations(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let validRoutes = 0;

    for (const route of this.routes) {
      const routeValidation = this.validateSingleRoute(route);
      
      if (routeValidation.isValid) {
        validRoutes++;
      }
      
      errors.push(...routeValidation.errors);
      warnings.push(...routeValidation.warnings);
    }

    // Check for duplicate patterns
    const duplicateCheck = this.checkDuplicatePatterns();
    errors.push(...duplicateCheck.errors);
    warnings.push(...duplicateCheck.warnings);

    // Check for missing routes
    const missingCheck = this.checkMissingRoutes();
    warnings.push(...missingCheck.warnings);

    const summary: ValidationSummary = {
      totalRoutes: this.routes.length,
      validRoutes,
      errorCount: errors.length,
      warningCount: warnings.length,
      coverage: this.calculateCoverage()
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary
    };
  }

  /**
   * Validate a single route configuration
   */
  private validateSingleRoute(route: ExtendedRouteConfig): {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields validation
    if (!route.pattern) {
      errors.push({
        type: 'error',
        code: 'MISSING_PATTERN',
        message: 'Route pattern is required',
        route: route.pattern
      });
    }

    if (!route.description) {
      errors.push({
        type: 'error',
        code: 'MISSING_DESCRIPTION',
        message: 'Route description is required',
        route: route.pattern
      });
    }

    if (!route.category) {
      errors.push({
        type: 'error',
        code: 'MISSING_CATEGORY',
        message: 'Route category is required',
        route: route.pattern
      });
    }

    // Pattern validation
    if (route.pattern && !this.isValidRoutePattern(route.pattern)) {
      errors.push({
        type: 'error',
        code: 'INVALID_PATTERN',
        message: 'Invalid route pattern format',
        route: route.pattern
      });
    }

    // Permissions validation
    if (!Array.isArray(route.permissions)) {
      errors.push({
        type: 'error',
        code: 'INVALID_PERMISSIONS',
        message: 'Permissions must be an array',
        route: route.pattern
      });
    } else {
      route.permissions.forEach((permission, index) => {
        if (!permission.resource) {
          errors.push({
            type: 'error',
            code: 'MISSING_PERMISSION_RESOURCE',
            message: `Permission ${index}: resource is required`,
            route: route.pattern
          });
        }
        if (!permission.action) {
          errors.push({
            type: 'error',
            code: 'MISSING_PERMISSION_ACTION',
            message: `Permission ${index}: action is required`,
            route: route.pattern
          });
        }
      });
    }

    // HTTP methods validation
    if (route.methods) {
      const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      route.methods.forEach(method => {
        if (!validMethods.includes(method.toUpperCase())) {
          errors.push({
            type: 'error',
            code: 'INVALID_HTTP_METHOD',
            message: `Invalid HTTP method: ${method}`,
            route: route.pattern
          });
        }
      });
    }

    // Category validation
    if (route.category && !Object.values(RouteCategory).includes(route.category)) {
      errors.push({
        type: 'error',
        code: 'INVALID_CATEGORY',
        message: `Invalid route category: ${route.category}`,
        route: route.pattern
      });
    }

    // Logical validation
    if (route.isPublic && route.permissions.length > 0) {
      warnings.push({
        type: 'warning',
        code: 'PUBLIC_WITH_PERMISSIONS',
        message: 'Public route has permissions defined',
        route: route.pattern
      });
    }

    if (!route.isPublic && route.permissions.length === 0 && !route.requiresAuth) {
      warnings.push({
        type: 'warning',
        code: 'UNPROTECTED_ROUTE',
        message: 'Route is not public but has no permissions or auth requirement',
        route: route.pattern
      });
    }

    // Rate limiting validation
    if (route.rateLimit) {
      if (!route.rateLimit.requests || route.rateLimit.requests <= 0) {
        errors.push({
          type: 'error',
          code: 'INVALID_RATE_LIMIT_REQUESTS',
          message: 'Rate limit requests must be positive',
          route: route.pattern
        });
      }
      if (!route.rateLimit.window || !this.isValidTimeWindow(route.rateLimit.window)) {
        errors.push({
          type: 'error',
          code: 'INVALID_RATE_LIMIT_WINDOW',
          message: 'Rate limit window must be valid time format (e.g., 1m, 1h, 1d)',
          route: route.pattern
        });
      }
    }

    // Caching validation
    if (route.caching?.enabled && route.caching.ttl && route.caching.ttl <= 0) {
      errors.push({
        type: 'error',
        code: 'INVALID_CACHE_TTL',
        message: 'Cache TTL must be positive',
        route: route.pattern
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check for duplicate route patterns
   */
  private checkDuplicatePatterns(): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const patternCounts = new Map<string, ExtendedRouteConfig[]>();

    // Group routes by pattern
    this.routes.forEach(route => {
      const key = `${route.pattern}:${route.methods?.join(',') || 'ALL'}`;
      if (!patternCounts.has(key)) {
        patternCounts.set(key, []);
      }
      patternCounts.get(key)!.push(route);
    });

    // Check for duplicates
    patternCounts.forEach((routes, key) => {
      if (routes.length > 1) {
        errors.push({
          type: 'error',
          code: 'DUPLICATE_PATTERN',
          message: `Duplicate route pattern found: ${key}`,
          details: { routes: routes.map(r => r.pattern) }
        });
      }
    });

    return { errors, warnings };
  }

  /**
   * Check for potentially missing routes
   */
  private checkMissingRoutes(): {
    warnings: ValidationWarning[];
  } {
    const warnings: ValidationWarning[] = [];
    
    // Common patterns that might be missing
    const expectedPatterns = [
      '/api/health',
      '/api/csrf-token',
      '/auth/login',
      '/auth/register',
      '/admin',
      '/profile'
    ];

    expectedPatterns.forEach(pattern => {
      const exists = this.routes.some(route => route.pattern === pattern);
      if (!exists) {
        warnings.push({
          type: 'warning',
          code: 'MISSING_COMMON_ROUTE',
          message: `Common route pattern not found: ${pattern}`,
          route: pattern
        });
      }
    });

    return { warnings };
  }

  /**
   * Calculate route coverage statistics
   */
  private calculateCoverage(): ValidationSummary['coverage'] {
    const publicRoutes = this.routes.filter(r => r.isPublic).length;
    const protectedRoutes = this.routes.filter(r => !r.isPublic && r.permissions.length > 0).length;
    const apiRoutes = this.routes.filter(r => r.pattern.startsWith('/api/')).length;
    const webRoutes = this.routes.filter(r => !r.pattern.startsWith('/api/')).length;

    return {
      publicRoutes,
      protectedRoutes,
      apiRoutes,
      webRoutes
    };
  }

  /**
   * Test route resolution with test cases
   */
  testRouteResolution(testCases: RouteTestCase[]): {
    passed: number;
    failed: number;
    results: Array<{
      testCase: RouteTestCase;
      passed: boolean;
      actualPermissions: Permission[];
      actualPublic: boolean;
      error?: string;
    }>;
  } {
    const results = testCases.map(testCase => {
      try {
        const actualPermissions = this.resolver.getRoutePermissions(testCase.path, testCase.method);
        const actualPublic = this.resolver.isPublicRoute(testCase.path);

        const permissionsMatch = this.comparePermissions(testCase.expectedPermissions, actualPermissions);
        const publicMatch = testCase.expectedPublic === actualPublic;
        const passed = permissionsMatch && publicMatch;

        return {
          testCase,
          passed,
          actualPermissions,
          actualPublic,
          error: passed ? undefined : 'Permissions or public status mismatch'
        };
      } catch (error) {
        return {
          testCase,
          passed: false,
          actualPermissions: [],
          actualPublic: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;

    return { passed, failed, results };
  }

  /**
   * Generate comprehensive test cases
   */
  generateTestCases(): RouteTestCase[] {
    const testCases: RouteTestCase[] = [];

    // Generate test cases for each route
    this.routes.forEach(route => {
      // Basic test case
      testCases.push({
        path: this.generateTestPath(route.pattern),
        method: route.methods?.[0],
        expectedPermissions: route.permissions,
        expectedPublic: route.isPublic || false,
        description: `Test ${route.pattern} - ${route.description}`
      });

      // Test different HTTP methods if specified
      if (route.methods && route.methods.length > 1) {
        route.methods.slice(1).forEach(method => {
          testCases.push({
            path: this.generateTestPath(route.pattern),
            method,
            expectedPermissions: route.permissions,
            expectedPublic: route.isPublic || false,
            description: `Test ${route.pattern} with ${method} - ${route.description}`
          });
        });
      }
    });

    return testCases;
  }

  /**
   * Generate a test path from a route pattern
   */
  private generateTestPath(pattern: string): string {
    return pattern
      .replace(/\[id\]/g, '123')
      .replace(/\[slug\]/g, 'test-slug')
      .replace(/\[\.\.\.([^\]]+)\]/g, 'test-param')
      .replace(/\[([^\]]+)\]/g, 'test-value');
  }

  /**
   * Compare two permission arrays
   */
  private comparePermissions(expected: Permission[], actual: Permission[]): boolean {
    if (expected.length !== actual.length) return false;

    return expected.every(expectedPerm =>
      actual.some(actualPerm =>
        expectedPerm.resource === actualPerm.resource &&
        expectedPerm.action === actualPerm.action &&
        expectedPerm.scope === actualPerm.scope
      )
    );
  }

  /**
   * Validate route pattern format
   */
  private isValidRoutePattern(pattern: string): boolean {
    // Basic validation for Next.js route patterns
    const validPattern = /^\/(?:[a-zA-Z0-9\-_]+(?:\/[a-zA-Z0-9\-_\[\]\.]+)*)?$/;
    return validPattern.test(pattern);
  }

  /**
   * Validate time window format
   */
  private isValidTimeWindow(window: string): boolean {
    const validWindow = /^\d+[smhd]$/;
    return validWindow.test(window);
  }

  /**
   * Generate validation report
   */
  generateReport(): string {
    const validation = this.validateRouteConfigurations();
    const testCases = this.generateTestCases();
    const testResults = this.testRouteResolution(testCases);

    let report = '# Route Mapping Validation Report\n\n';
    
    // Summary
    report += '## Summary\n';
    report += `- Total Routes: ${validation.summary.totalRoutes}\n`;
    report += `- Valid Routes: ${validation.summary.validRoutes}\n`;
    report += `- Errors: ${validation.summary.errorCount}\n`;
    report += `- Warnings: ${validation.summary.warningCount}\n`;
    report += `- Test Cases Passed: ${testResults.passed}/${testResults.passed + testResults.failed}\n\n`;

    // Coverage
    report += '## Coverage\n';
    report += `- Public Routes: ${validation.summary.coverage.publicRoutes}\n`;
    report += `- Protected Routes: ${validation.summary.coverage.protectedRoutes}\n`;
    report += `- API Routes: ${validation.summary.coverage.apiRoutes}\n`;
    report += `- Web Routes: ${validation.summary.coverage.webRoutes}\n\n`;

    // Errors
    if (validation.errors.length > 0) {
      report += '## Errors\n';
      validation.errors.forEach(error => {
        report += `- **${error.code}**: ${error.message}`;
        if (error.route) report += ` (Route: ${error.route})`;
        report += '\n';
      });
      report += '\n';
    }

    // Warnings
    if (validation.warnings.length > 0) {
      report += '## Warnings\n';
      validation.warnings.forEach(warning => {
        report += `- **${warning.code}**: ${warning.message}`;
        if (warning.route) report += ` (Route: ${warning.route})`;
        report += '\n';
      });
      report += '\n';
    }

    // Failed tests
    const failedTests = testResults.results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      report += '## Failed Tests\n';
      failedTests.forEach(result => {
        report += `- **${result.testCase.path}**: ${result.error}\n`;
      });
    }

    return report;
  }
}

// Default test cases for common scenarios
export const DEFAULT_TEST_CASES: RouteTestCase[] = [
  {
    path: '/',
    expectedPermissions: [],
    expectedPublic: true,
    description: 'Home page should be public'
  },
  {
    path: '/auth/login',
    expectedPermissions: [],
    expectedPublic: true,
    description: 'Login page should be public'
  },
  {
    path: '/admin',
    expectedPermissions: [{ resource: 'admin', action: 'read', scope: 'all' }],
    expectedPublic: false,
    description: 'Admin dashboard should require admin permissions'
  },
  {
    path: '/admin/users',
    expectedPermissions: [{ resource: 'users', action: 'read', scope: 'all' }],
    expectedPublic: false,
    description: 'User management should require user read permissions'
  },
  {
    path: '/api/products',
    method: 'GET',
    expectedPermissions: [{ resource: 'products', action: 'read', scope: 'all' }],
    expectedPublic: false,
    description: 'Product API should require product read permissions'
  },
  {
    path: '/api/public/products',
    method: 'GET',
    expectedPermissions: [],
    expectedPublic: true,
    description: 'Public product API should be public'
  },
  {
    path: '/profile',
    expectedPermissions: [{ resource: 'profile', action: 'read', scope: 'own' }],
    expectedPublic: false,
    description: 'Profile page should require own profile permissions'
  }
];

// Singleton instance
export const routeMappingValidator = new RouteMappingValidator();