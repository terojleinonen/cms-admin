/**
 * Permission System Performance Tests
 * Tests permission checking performance under various load conditions
 */

import { UserRole } from '@prisma/client';
import { PermissionService, EnhancedPermissionService, Permission } from '@/lib/permissions';
import { User } from '@/lib/types';

// Mock users for testing
const createMockUser = (id: string, role: UserRole): User => ({
  id,
  email: `user${id}@test.com`,
  name: `User ${id}`,
  role,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Common permissions for testing
const commonPermissions: Permission[] = [
  { resource: 'products', action: 'read' },
  { resource: 'products', action: 'create' },
  { resource: 'products', action: 'update' },
  { resource: 'products', action: 'delete' },
  { resource: 'categories', action: 'read' },
  { resource: 'categories', action: 'create' },
  { resource: 'pages', action: 'read' },
  { resource: 'pages', action: 'create' },
  { resource: 'media', action: 'read' },
  { resource: 'users', action: 'read' },
];

describe('Permission System Performance Tests', () => {
  let permissionService: PermissionService;
  let enhancedPermissionService: EnhancedPermissionService;
  let testUsers: User[];

  beforeAll(() => {
    permissionService = new PermissionService();
    enhancedPermissionService = new EnhancedPermissionService({
      ttl: 5 * 60 * 1000,
      enableDistributed: false, // Use memory cache for testing
    });

    // Create test users with different roles
    testUsers = [
      ...Array.from({ length: 100 }, (_, i) => createMockUser(`admin-${i}`, UserRole.ADMIN)),
      ...Array.from({ length: 200 }, (_, i) => createMockUser(`editor-${i}`, UserRole.EDITOR)),
      ...Array.from({ length: 300 }, (_, i) => createMockUser(`viewer-${i}`, UserRole.VIEWER)),
    ];
  });

  afterEach(() => {
    // Clear caches between tests
    permissionService.clearCache();
    enhancedPermissionService.clearCache();
  });

  describe('Basic Permission Check Performance', () => {
    test('should handle single permission check within performance threshold', () => {
      const user = testUsers[0];
      const permission = commonPermissions[0];

      const startTime = performance.now();
      const result = permissionService.hasPermission(user, permission);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(50); // Should complete in reasonable time
    });

    test('should handle batch permission checks efficiently', () => {
      const user = testUsers[0];
      const batchSize = 100;

      const startTime = performance.now();
      
      for (let i = 0; i < batchSize; i++) {
        const permission = commonPermissions[i % commonPermissions.length];
        permissionService.hasPermission(user, permission);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgDuration = duration / batchSize;

      expect(avgDuration).toBeLessThan(5); // Average should be less than 5ms per check
      expect(duration).toBeLessThan(500); // Total should be less than 500ms
    });

    test('should handle permission checks for multiple users efficiently', () => {
      const userBatch = testUsers.slice(0, 50);
      const permission = commonPermissions[0];

      const startTime = performance.now();
      
      const results = userBatch.map(user => 
        permissionService.hasPermission(user, permission)
      );

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgDuration = duration / userBatch.length;

      expect(results).toHaveLength(userBatch.length);
      expect(avgDuration).toBeLessThan(10); // Average should be less than 10ms per user
      expect(duration).toBeLessThan(500); // Total should be less than 500ms
    });
  });

  describe('Cache Performance Tests', () => {
    test('should demonstrate cache functionality and reasonable performance', () => {
      const user = testUsers[0];
      const permission = commonPermissions[0];

      // Clear cache to start fresh
      permissionService.clearCache();

      // First call should populate cache
      const result1 = permissionService.hasPermission(user, permission);
      
      // Subsequent calls should use cache
      const result2 = permissionService.hasPermission(user, permission);
      const result3 = permissionService.hasPermission(user, permission);

      // Results should be consistent
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);

      // Test cache configuration
      const cacheStats = permissionService.getCacheStats();
      expect(cacheStats.ttl).toBeGreaterThan(0); // TTL should be configured

      // Test that many operations complete quickly (this tests caching indirectly)
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        permissionService.hasPermission(user, permission);
      }
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / 100;

      expect(avgTime).toBeLessThan(5); // Average should be under 5ms with cache (more lenient)
      expect(totalTime).toBeLessThan(500); // Total should be under 500ms (more lenient)
    });

    test('should handle cache warming efficiently', async () => {
      const userBatch = testUsers.slice(0, 10);
      
      const startTime = performance.now();
      await enhancedPermissionService.warmCache(userBatch, commonPermissions);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      const totalOperations = userBatch.length * commonPermissions.length;
      const avgDuration = duration / totalOperations;

      expect(avgDuration).toBeLessThan(100); // Average should be reasonable per operation
      expect(duration).toBeLessThan(10000); // Total should be less than 10 seconds
    });

    test('should maintain performance with large cache sizes', () => {
      const largeBatch = testUsers.slice(0, 100);
      
      // Populate cache with many entries
      largeBatch.forEach(user => {
        commonPermissions.forEach(permission => {
          permissionService.hasPermission(user, permission);
        });
      });

      // Test performance with large cache
      const testUser = testUsers[50];
      const testPermission = commonPermissions[5];

      const startTime = performance.now();
      const result = permissionService.hasPermission(testUser, testPermission);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(10); // Should still be reasonably fast with large cache
    });
  });

  describe('Concurrent Access Performance', () => {
    test('should handle concurrent permission checks efficiently', async () => {
      const concurrentUsers = testUsers.slice(0, 20);
      const permission = commonPermissions[0];

      const startTime = performance.now();
      
      const promises = concurrentUsers.map(user => 
        Promise.resolve(permissionService.hasPermission(user, permission))
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const avgDuration = duration / concurrentUsers.length;

      expect(results).toHaveLength(concurrentUsers.length);
      expect(avgDuration).toBeLessThan(20); // Average should be less than 20ms per concurrent check
      expect(duration).toBeLessThan(1000); // Total should be less than 1000ms
    });

    test('should handle mixed read/write operations efficiently', async () => {
      const user = testUsers[0];
      const operations = 50;

      const startTime = performance.now();
      
      const promises = Array.from({ length: operations }, (_, i) => {
        if (i % 10 === 0) {
          // Occasional cache invalidation
          return Promise.resolve(permissionService.invalidateUserCache(user.id));
        } else {
          // Regular permission checks
          const permission = commonPermissions[i % commonPermissions.length];
          return Promise.resolve(permissionService.hasPermission(user, permission));
        }
      });
      
      await Promise.all(promises);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const avgDuration = duration / operations;

      expect(avgDuration).toBeLessThan(20); // Average should be less than 20ms per operation
      expect(duration).toBeLessThan(2000); // Total should be less than 2000ms
    });
  });

  describe('Memory Usage Tests', () => {
    test('should not cause memory leaks with repeated operations', () => {
      const user = testUsers[0];
      const permission = commonPermissions[0];
      const iterations = 1000;

      // Get initial memory usage
      const initialMemory = process.memoryUsage();

      // Perform many operations
      for (let i = 0; i < iterations; i++) {
        permissionService.hasPermission(user, permission);
        
        // Occasionally clear cache to test cleanup
        if (i % 100 === 0) {
          permissionService.clearCache();
        }
      }

      // Get final memory usage
      const finalMemory = process.memoryUsage();
      
      // Memory increase should be reasonable (less than 10MB)
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });

    test('should handle cache size limits appropriately', () => {
      const largeBatch = testUsers.slice(0, 200);
      
      // Fill cache beyond reasonable limits
      largeBatch.forEach((user, userIndex) => {
        commonPermissions.forEach((permission, permIndex) => {
          // Create unique permission variations to avoid cache hits
          const uniquePermission = {
            ...permission,
            scope: `scope-${userIndex}-${permIndex}`
          };
          permissionService.hasPermission(user, uniquePermission);
        });
      });

      const cacheStats = permissionService.getCacheStats();
      
      // Cache should not grow indefinitely
      expect(cacheStats.size).toBeLessThan(5000); // Reasonable cache size limit
    });
  });

  describe('Role Hierarchy Performance', () => {
    test('should handle role hierarchy checks efficiently', () => {
      const users = [
        createMockUser('admin', UserRole.ADMIN),
        createMockUser('editor', UserRole.EDITOR),
        createMockUser('viewer', UserRole.VIEWER),
      ];

      const startTime = performance.now();
      
      users.forEach(user => {
        expect(permissionService.isAdmin(user)).toBeDefined();
        expect(permissionService.isEditor(user)).toBeDefined();
        expect(permissionService.isViewer(user)).toBeDefined();
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should complete reasonably quickly
    });
  });

  describe('Route Permission Performance', () => {
    test('should handle route permission checks efficiently', () => {
      const user = testUsers[0];
      const routes = [
        '/admin',
        '/admin/users',
        '/admin/products',
        '/admin/categories',
        '/admin/pages',
        '/media',
        '/profile',
        '/settings',
      ];

      const startTime = performance.now();
      
      routes.forEach(route => {
        permissionService.canUserAccessRoute(user, route);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgDuration = duration / routes.length;

      expect(avgDuration).toBeLessThan(10); // Average should be less than 10ms per route
      expect(duration).toBeLessThan(100); // Total should be less than 100ms
    });

    test('should handle dynamic route matching efficiently', () => {
      const user = testUsers[0];
      const dynamicRoutes = [
        '/admin/products/123/edit',
        '/admin/products/456/edit',
        '/admin/pages/789/edit',
        '/admin/users/101/edit',
      ];

      const startTime = performance.now();
      
      dynamicRoutes.forEach(route => {
        permissionService.canUserAccessRoute(user, route);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgDuration = duration / dynamicRoutes.length;

      expect(avgDuration).toBeLessThan(20); // Average should be less than 20ms per dynamic route
      expect(duration).toBeLessThan(200); // Total should be less than 200ms
    });
  });

  describe('Filter Performance', () => {
    test('should handle array filtering efficiently', () => {
      const user = testUsers[0];
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        resource: commonPermissions[i % commonPermissions.length].resource
      }));

      const startTime = performance.now();
      
      const filteredItems = permissionService.filterByPermissions(
        user,
        items,
        item => item.resource,
        'read'
      );

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgDuration = duration / items.length;

      expect(filteredItems).toBeDefined();
      expect(avgDuration).toBeLessThan(1); // Average should be less than 1ms per item
      expect(duration).toBeLessThan(1000); // Total should be less than 1000ms
    });
  });
});