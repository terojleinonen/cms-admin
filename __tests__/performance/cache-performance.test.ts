/**
 * Permission Cache Performance Tests
 * Tests cache performance, hit rates, and memory efficiency
 */

import { UserRole } from '@prisma/client';
import { 
  PermissionService, 
  EnhancedPermissionService, 
  Permission,
  EnhancedPermissionCache 
} from '@/lib/permissions';
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

// Performance measurement utilities
class PerformanceTracker {
  private measurements: { [key: string]: number[] } = {};

  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    if (!this.measurements[name]) {
      this.measurements[name] = [];
    }
    this.measurements[name].push(end - start);
    
    return result;
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    if (!this.measurements[name]) {
      this.measurements[name] = [];
    }
    this.measurements[name].push(end - start);
    
    return result;
  }

  getStats(name: string) {
    const times = this.measurements[name] || [];
    if (times.length === 0) return null;

    const sorted = [...times].sort((a, b) => a - b);
    return {
      count: times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  reset() {
    this.measurements = {};
  }
}

describe('Cache Performance Tests', () => {
  let permissionService: PermissionService;
  let enhancedPermissionService: EnhancedPermissionService;
  let cache: EnhancedPermissionCache;
  let tracker: PerformanceTracker;
  let testUsers: User[];

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

  beforeAll(() => {
    permissionService = new PermissionService();
    enhancedPermissionService = new EnhancedPermissionService({
      ttl: 5 * 60 * 1000,
      enableDistributed: false,
    });
    cache = new EnhancedPermissionCache({
      ttl: 5 * 60 * 1000,
      enableDistributed: false,
    });
    tracker = new PerformanceTracker();

    // Create test users
    testUsers = [
      ...Array.from({ length: 50 }, (_, i) => createMockUser(`admin-${i}`, UserRole.ADMIN)),
      ...Array.from({ length: 100 }, (_, i) => createMockUser(`editor-${i}`, UserRole.EDITOR)),
      ...Array.from({ length: 150 }, (_, i) => createMockUser(`viewer-${i}`, UserRole.VIEWER)),
    ];
  });

  beforeEach(() => {
    tracker.reset();
    permissionService.clearCache();
    enhancedPermissionService.clearCache();
    cache.clear();
  });

  describe('Cache Hit Rate Performance', () => {
    test('should achieve high cache hit rates with repeated access patterns', () => {
      const user = testUsers[0];
      const permission = commonPermissions[0];
      const iterations = 100;

      // First pass - populate cache
      tracker.measure('cache-miss', () => {
        permissionService.hasPermission(user, permission);
      });

      // Subsequent passes - should hit cache
      for (let i = 0; i < iterations; i++) {
        tracker.measure('cache-hit', () => {
          permissionService.hasPermission(user, permission);
        });
      }

      const missStats = tracker.getStats('cache-miss');
      const hitStats = tracker.getStats('cache-hit');

      expect(hitStats).toBeTruthy();
      expect(missStats).toBeTruthy();
      
      // Cache hits should be significantly faster (allowing for test environment variance)
      expect(hitStats!.avg).toBeLessThan(missStats!.avg * 0.8);
      expect(hitStats!.max).toBeLessThan(2); // Cache hits should be reasonably fast
    });

    test('should maintain performance with mixed cache hits and misses', () => {
      const users = testUsers.slice(0, 10);
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        users.forEach((user, userIndex) => {
          commonPermissions.forEach((permission, permIndex) => {
            const operationType = (i === 0) ? 'initial' : 'subsequent';
            
            tracker.measure(operationType, () => {
              permissionService.hasPermission(user, permission);
            });
          });
        });
      }

      const initialStats = tracker.getStats('initial');
      const subsequentStats = tracker.getStats('subsequent');

      expect(initialStats).toBeTruthy();
      expect(subsequentStats).toBeTruthy();
      
      // Subsequent calls should be faster due to cache
      expect(subsequentStats!.avg).toBeLessThan(initialStats!.avg);
      expect(subsequentStats!.p95).toBeLessThan(1); // 95th percentile should be under 1ms
    });
  });

  describe('Cache Memory Performance', () => {
    test('should handle large cache sizes efficiently', async () => {
      const largeBatch = testUsers.slice(0, 100);
      
      // Measure cache warming performance
      const startTime = performance.now();
      await enhancedPermissionService.warmCache(largeBatch, commonPermissions);
      const warmingTime = performance.now() - startTime;

      const cacheStats = enhancedPermissionService.getCacheStats();
      
      expect(cacheStats.memorySize).toBeGreaterThan(0);
      expect(warmingTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Test access performance with warmed cache
      const testUser = largeBatch[50];
      const testPermission = commonPermissions[5];

      const accessTime = tracker.measure('warmed-cache-access', () => {
        return permissionService.hasPermission(testUser, testPermission);
      });

      const accessStats = tracker.getStats('warmed-cache-access');
      expect(accessStats!.avg).toBeLessThan(1); // Should be fast with warmed cache
    });

    test('should handle cache invalidation efficiently', async () => {
      const user = testUsers[0];
      
      // Populate cache
      commonPermissions.forEach(permission => {
        permissionService.hasPermission(user, permission);
      });

      // Measure invalidation performance
      const startTime = performance.now();
      await enhancedPermissionService.invalidateUserCache(user.id);
      const invalidationTime = performance.now() - startTime;

      expect(invalidationTime).toBeLessThan(50); // Should be reasonably fast
      
      // Verify cache was cleared by checking performance difference
      const postInvalidationTime = tracker.measure('post-invalidation', () => {
        return permissionService.hasPermission(user, commonPermissions[0]);
      });

      const postInvalidationStats = tracker.getStats('post-invalidation');
      expect(postInvalidationStats!.avg).toBeGreaterThan(0.01); // Should be slower than cache hit
    });

    test('should handle concurrent cache operations efficiently', async () => {
      const concurrentUsers = testUsers.slice(0, 20);
      const permission = commonPermissions[0];

      // Test concurrent reads
      const readPromises = concurrentUsers.map(user => 
        tracker.measureAsync('concurrent-read', async () => {
          return permissionService.hasPermission(user, permission);
        })
      );

      await Promise.all(readPromises);

      // Test concurrent invalidations
      const invalidationPromises = concurrentUsers.map(user =>
        tracker.measureAsync('concurrent-invalidation', async () => {
          await enhancedPermissionService.invalidateUserCache(user.id);
        })
      );

      await Promise.all(invalidationPromises);

      const readStats = tracker.getStats('concurrent-read');
      const invalidationStats = tracker.getStats('concurrent-invalidation');

      expect(readStats!.avg).toBeLessThan(2); // Concurrent reads should be fast
      expect(invalidationStats!.avg).toBeLessThan(10); // Concurrent invalidations should be fast
    });
  });

  describe('Cache TTL Performance', () => {
    test('should handle cache expiration efficiently', async () => {
      // Create cache with short TTL for testing
      const shortTtlCache = new EnhancedPermissionCache({ ttl: 100 }); // 100ms TTL
      const user = testUsers[0];
      const permission = commonPermissions[0];

      // Set cache entry
      await shortTtlCache.set(user.id, permission.resource, permission.action, true);

      // Immediate read should hit cache
      const immediateResult = await tracker.measureAsync('immediate-read', async () => {
        return await shortTtlCache.get(user.id, permission.resource, permission.action);
      });

      expect(immediateResult).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Read after expiration should miss cache
      const expiredResult = await tracker.measureAsync('expired-read', async () => {
        return await shortTtlCache.get(user.id, permission.resource, permission.action);
      });

      expect(expiredResult).toBeNull();

      const immediateStats = tracker.getStats('immediate-read');
      const expiredStats = tracker.getStats('expired-read');

      expect(immediateStats!.avg).toBeLessThan(1);
      expect(expiredStats!.avg).toBeLessThan(1);
    });
  });

  describe('Cache Efficiency Metrics', () => {
    test('should provide accurate cache statistics', () => {
      const user = testUsers[0];
      const iterations = 100;

      // Perform operations to populate cache
      for (let i = 0; i < iterations; i++) {
        const permission = commonPermissions[i % commonPermissions.length];
        permissionService.hasPermission(user, permission);
      }

      const stats = permissionService.getCacheStats();
      
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.size).toBeLessThanOrEqual(commonPermissions.length);
      expect(stats.ttl).toBeGreaterThan(0);
    });

    test('should handle cache size limits gracefully', () => {
      const largeBatch = testUsers.slice(0, 50);
      
      // Generate many unique cache entries
      largeBatch.forEach((user, userIndex) => {
        commonPermissions.forEach((permission, permIndex) => {
          // Create variations to avoid cache hits
          const uniquePermission = {
            ...permission,
            scope: `test-scope-${userIndex}-${permIndex}`
          };
          
          tracker.measure('cache-population', () => {
            permissionService.hasPermission(user, uniquePermission);
          });
        });
      });

      const populationStats = tracker.getStats('cache-population');
      const cacheStats = permissionService.getCacheStats();

      // Performance should remain reasonable even with many entries
      expect(populationStats!.avg).toBeLessThan(2);
      expect(populationStats!.p95).toBeLessThan(5);
      
      // Cache size should be reasonable
      expect(cacheStats.size).toBeLessThan(10000);
    });
  });

  describe('Cache Performance Under Load', () => {
    test('should maintain performance under sustained load', async () => {
      const loadTestUsers = testUsers.slice(0, 30);
      const loadTestDuration = 1000; // 1 second
      const startTime = Date.now();
      const operations: Promise<any>[] = [];

      while (Date.now() - startTime < loadTestDuration) {
        const user = loadTestUsers[Math.floor(Math.random() * loadTestUsers.length)];
        const permission = commonPermissions[Math.floor(Math.random() * commonPermissions.length)];

        const operation = tracker.measureAsync('load-test-operation', async () => {
          return permissionService.hasPermission(user, permission);
        });

        operations.push(operation);

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      await Promise.all(operations);

      const loadStats = tracker.getStats('load-test-operation');
      
      expect(loadStats!.count).toBeGreaterThan(100); // Should have performed many operations
      expect(loadStats!.avg).toBeLessThan(5); // Average should remain reasonable
      expect(loadStats!.p95).toBeLessThan(10); // 95th percentile should be acceptable
      expect(loadStats!.p99).toBeLessThan(20); // 99th percentile should be reasonable
    });

    test('should handle cache thrashing gracefully', async () => {
      const user = testUsers[0];
      const thrashingIterations = 100;

      for (let i = 0; i < thrashingIterations; i++) {
        // Alternate between cache population and invalidation
        if (i % 10 === 0) {
          await tracker.measureAsync('thrashing-invalidation', async () => {
            await enhancedPermissionService.invalidateUserCache(user.id);
          });
        } else {
          const permission = commonPermissions[i % commonPermissions.length];
          tracker.measure('thrashing-access', () => {
            return permissionService.hasPermission(user, permission);
          });
        }
      }

      const accessStats = tracker.getStats('thrashing-access');
      const invalidationStats = tracker.getStats('thrashing-invalidation');

      // Performance should remain reasonable even with thrashing
      expect(accessStats!.avg).toBeLessThan(3);
      expect(invalidationStats!.avg).toBeLessThan(15);
    });
  });
});