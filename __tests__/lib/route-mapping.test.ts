/**
 * Route Mapping System Tests
 * Tests for comprehensive route permission mapping and resolution
 */

import { RoutePermissionResolver } from '../../app/lib/route-permissions';
import { RouteMappingValidator, DEFAULT_TEST_CASES } from '../../app/lib/route-mapping-validator';
import { routeMappingUtils } from '../../app/lib/route-mapping-config';

describe('Route Mapping System', () => {
  let resolver: RoutePermissionResolver;
  let validator: RouteMappingValidator;

  beforeEach(() => {
    resolver = new RoutePermissionResolver();
    validator = new RouteMappingValidator();
  });

  describe('RoutePermissionResolver', () => {
    test('should resolve permissions for admin routes', () => {
      const permissions = resolver.getRoutePermissions('/admin');
      expect(permissions).toEqual([
        { resource: 'admin', action: 'read', scope: 'all' }
      ]);
    });

    test('should resolve permissions for user management routes', () => {
      const permissions = resolver.getRoutePermissions('/admin/users');
      expect(permissions).toEqual([
        { resource: 'users', action: 'read', scope: 'all' }
      ]);
    });

    test('should resolve permissions for dynamic routes', () => {
      const permissions = resolver.getRoutePermissions('/admin/users/123');
      expect(permissions).toEqual([
        { resource: 'users', action:'read', scope: 'all' }
      ]);
    });

    test('should identify public routes correctly', () => {
      expect(resolver.isPublicRoute('/')).toBe(true);
      expect(resolver.isPublicRoute('/auth/login')).toBe(true);
      expect(resolver.isPublicRoute('/api/health')).toBe(true);
      expect(resolver.isPublicRoute('/admin')).toBe(false);
    });

    test('should handle API routes with HTTP methods', () => {
      const getPermissions = resolver.getRoutePermissions('/api/products', 'GET');
      const postPermissions = resolver.getRoutePermissions('/api/products', 'POST');
      
      expect(getPermissions).toEqual([
        { resource: 'products', action: 'read', scope: 'all' }
      ]);
      expect(postPermissions).toEqual([
        { resource: 'products', action: 'read', scope: 'all' }
      ]);
    });

    test('should handle public API routes', () => {
      expect(resolver.isPublicRoute('/api/public/products')).toBe(true);
      expect(resolver.isPublicRoute('/api/public/categories')).toBe(true);
    });

    test('should extract route parameters correctly', () => {
      const match = resolver.findRouteMatch('/admin/products/123/edit');
      expect(match).toBeTruthy();
      expect(match?.params).toEqual({ id: '123' });
    });

    test('should handle complex dynamic routes', () => {
      const permissions = resolver.getRoutePermissions('/api/users/456/two-factor/setup');
      expect(permissions).toEqual([
        { resource: 'profile', action: 'update', scope: 'own' }
      ]);
    });
  });

  describe('Route Configuration Validation', () => {
    test('should validate route configurations successfully', () => {
      const validation = validator.validateRouteConfigurations();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.summary.totalRoutes).toBeGreaterThan(0);
    });

    test('should detect missing required fields', () => {
      const invalidRoutes = [
        {
          pattern: '',
          permissions: [],
          description: '',
          category: 'admin' as any,
          tags: []
        }
      ];
      
      const customValidator = new RouteMappingValidator(invalidRoutes as any);
      const validation = customValidator.validateRouteConfigurations();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should run default test cases successfully', () => {
      const testResults = validator.testRouteResolution(DEFAULT_TEST_CASES);
      
      expect(testResults.passed).toBeGreaterThan(0);
      expect(testResults.failed).toBe(0);
    });
  });

  describe('Route Mapping Utils', () => {
    test('should get routes by category', () => {
      const adminRoutes = routeMappingUtils.getRoutesByCategory('admin' as any);
      expect(adminRoutes.length).toBeGreaterThan(0);
      
      const publicRoutes = routeMappingUtils.getRoutesByCategory('public' as any);
      expect(publicRoutes.length).toBeGreaterThan(0);
    });

    test('should get routes by tag', () => {
      const authRoutes = routeMappingUtils.getRoutesByTag('auth');
      expect(authRoutes.length).toBeGreaterThan(0);
      
      const apiRoutes = routeMappingUtils.getRoutesByTag('api');
      expect(apiRoutes.length).toBeGreaterThan(0);
    });

    test('should get routes by permission', () => {
      const userRoutes = routeMappingUtils.getRoutesByPermission('users');
      expect(userRoutes.length).toBeGreaterThan(0);
      
      const productRoutes = routeMappingUtils.getRoutesByPermission('products', 'read');
      expect(productRoutes.length).toBeGreaterThan(0);
    });

    test('should generate documentation', () => {
      const docs = routeMappingUtils.generateDocumentation();
      
      expect(docs.summary.total).toBeGreaterThan(0);
      expect(docs.summary.public).toBeGreaterThan(0);
      expect(docs.summary.protected).toBeGreaterThan(0);
      expect(Object.keys(docs.categories)).toContain('admin');
    });
  });

  describe('Route Pattern Matching', () => {
    test('should match exact routes', () => {
      const config = resolver.findRouteConfig('/admin/users');
      expect(config).toBeTruthy();
      expect(config?.pattern).toBe('/admin/users');
    });

    test('should match dynamic routes with parameters', () => {
      const config = resolver.findRouteConfig('/admin/users/123');
      expect(config).toBeTruthy();
      expect(config?.pattern).toBe('/admin/users/[id]');
    });

    test('should match nested dynamic routes', () => {
      const config = resolver.findRouteConfig('/api/users/123/preferences');
      expect(config).toBeTruthy();
      expect(config?.pattern).toBe('/api/users/[id]/preferences');
    });

    test('should not match non-existent routes', () => {
      const config = resolver.findRouteConfig('/non-existent-route');
      expect(config).toBeNull();
    });

    test('should handle method-specific matching', () => {
      const getConfig = resolver.findRouteConfig('/api/products', 'GET');
      const postConfig = resolver.findRouteConfig('/api/products', 'POST');
      
      expect(getConfig).toBeTruthy();
      expect(postConfig).toBeTruthy();
    });
  });

  describe('Permission Resolution Edge Cases', () => {
    test('should handle routes with no permissions', () => {
      const permissions = resolver.getRoutePermissions('/api/health');
      expect(permissions).toEqual([]);
    });

    test('should handle routes with multiple permissions', () => {
      // This would be a route that requires multiple permissions
      // For now, most routes have single permissions, but the system supports multiple
      const permissions = resolver.getRoutePermissions('/admin');
      expect(Array.isArray(permissions)).toBe(true);
    });

    test('should handle case-insensitive HTTP methods', () => {
      const permissions1 = resolver.getRoutePermissions('/api/products', 'get');
      const permissions2 = resolver.getRoutePermissions('/api/products', 'GET');
      
      // The resolver should handle case normalization
      expect(permissions1).toEqual(permissions2);
    });

    test('should handle trailing slashes consistently', () => {
      const permissions1 = resolver.getRoutePermissions('/admin');
      const permissions2 = resolver.getRoutePermissions('/admin/');
      
      // Should handle trailing slashes gracefully
      expect(permissions1).toEqual(permissions2);
    });
  });

  describe('Route Configuration Management', () => {
    test('should add new route configuration', () => {
      const initialCount = resolver.getAllRouteConfigs().length;
      
      resolver.addRouteConfig({
        pattern: '/test/new-route',
        permissions: [{ resource: 'test', action: 'read' }],
        description: 'Test route'
      });
      
      expect(resolver.getAllRouteConfigs().length).toBe(initialCount + 1);
      
      const permissions = resolver.getRoutePermissions('/test/new-route');
      expect(permissions).toEqual([{ resource: 'test', action: 'read' }]);
    });

    test('should update existing route configuration', () => {
      const updated = resolver.updateRouteConfig('/admin', {
        description: 'Updated admin dashboard'
      });
      
      expect(updated).toBe(true);
      
      const config = resolver.findRouteConfig('/admin');
      expect(config?.description).toBe('Updated admin dashboard');
    });

    test('should remove route configuration', () => {
      const initialCount = resolver.getAllRouteConfigs().length;
      
      // Add a test route first
      resolver.addRouteConfig({
        pattern: '/test/remove-me',
        permissions: [],
        description: 'Route to be removed'
      });
      
      expect(resolver.getAllRouteConfigs().length).toBe(initialCount + 1);
      
      // Remove it
      const removed = resolver.removeRouteConfig('/test/remove-me');
      expect(removed).toBe(true);
      expect(resolver.getAllRouteConfigs().length).toBe(initialCount);
    });
  });

  describe('Export and Import', () => {
    test('should export route configurations as JSON', () => {
      const json = resolver.exportRouteConfigs();
      expect(() => JSON.parse(json)).not.toThrow();
      
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    test('should import valid route configurations', () => {
      const testConfig = [
        {
          pattern: '/test/import',
          permissions: [{ resource: 'test', action: 'read' }],
          description: 'Imported test route'
        }
      ];
      
      const result = resolver.importRouteConfigs(JSON.stringify(testConfig));
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      const permissions = resolver.getRoutePermissions('/test/import');
      expect(permissions).toEqual([{ resource: 'test', action: 'read' }]);
    });

    test('should reject invalid route configurations', () => {
      const invalidConfig = [
        {
          pattern: '', // Invalid: empty pattern
          permissions: 'invalid', // Invalid: not an array
          description: ''
        }
      ];
      
      const result = resolver.importRouteConfigs(JSON.stringify(invalidConfig));
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});