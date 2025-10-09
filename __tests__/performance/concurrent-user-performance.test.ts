/**
 * Concurrent User Permission Performance Tests
 * Tests permission system performance with multiple concurrent users
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

// Concurrent operation utilities
class ConcurrencyTester {
  private results: Array<{ duration: number; success: boolean; error?: Error }> = [];

  async runConcurrent<T>(
    operations: Array<() => Promise<T>>,
    maxConcurrency: number = 10
  ): Promise<{ results: T[]; stats: any }> {
    const startTime = performance.now();
    const chunks = this.chunkArray(operations, maxConcurrency);
    const allResults: T[] = [];

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(async (op, index) => {
          const opStart = performance.now();
          try {
            const result = await op();
            const opEnd = performance.now();
            this.results.push({
              duration: opEnd - opStart,
              success: true
            });
            return result;
          } catch (error) {
            const opEnd = performance.now();
            this.results.push({
              duration: opEnd - opStart,
              success: false,
              error: error as Error
            });
            throw error;
          }
        })
      );

      chunkResults.forEach(result => {
        if (result.status === 'fulfilled') {
          allResults.push(result.value);
        }
      });
    }

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    const successfulResults = this.results.filter(r => r.success);
    const durations = successfulResults.map(r => r.duration);
    
    const stats = {
      totalDuration,
      totalOperations: operations.length,
      successfulOperations: successfulResults.length,
      failedOperations: this.results.length - successfulResults.length,
      avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      throughput: (successfulResults.length / totalDuration) * 1000, // operations per second
    };

    return { results: allResults, stats };
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  reset() {
    this.results = [];
  }
}

describe('Concurrent User Permission Performance Tests', () => {
  let permissionService: PermissionService;
  let enhancedPermissionService: EnhancedPermissionService;
  let concurrencyTester: ConcurrencyTester;
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
    concurrencyTester = new ConcurrencyTester();

    // Create test users with different roles
    testUsers = [
      ...Array.from({ length: 20 }, (_, i) => createMockUser(`admin-${i}`, UserRole.ADMIN)),
      ...Array.from({ length: 40 }, (_, i) => createMockUser(`editor-${i}`, UserRole.EDITOR)),
      ...Array.from({ length: 60 }, (_, i) => createMockUser(`viewer-${i}`, UserRole.VIEWER)),
    ];
  });

  beforeEach(() => {
    concurrencyTester.reset();
    permissionService.clearCache();
    enhancedPermissionService.clearCache();
  });

  describe('Basic Concurrent Permission Checks', () => {
    test('should handle concurrent permission checks from multiple users', async () => {
      const concurrentUsers = testUsers.slice(0, 20);
      const permission = commonPermissions[0];

      const operations = concurrentUsers.map(user => 
        async () => permissionService.hasPermission(user, permission)
      );

      const { results, stats } = await concurrencyTester.runConcurrent(operations, 10);

      expect(results).toHaveLength(concurrentUsers.length);
      expect(stats.successfulOperations).toBe(concurrentUsers.length);
      expect(stats.failedOperations).toBe(0);
      expect(stats.avgDuration).toBeLessThan(50); // Average should be less than 50ms
      expect(stats.throughput).toBeGreaterThan(100); // Should handle >100 ops/sec
    });

    test('should handle high concurrency with mixed permissions', async () => {
      const concurrentUsers = testUsers.slice(0, 50);
      
      const operations = concurrentUsers.map((user, index) => {
        const permission = commonPermissions[index % commonPermissions.length];
        return async () => permissionService.hasPermission(user, permission);
      });

      const { results, stats } = await concurrencyTester.runConcurrent(operations, 20);

      expect(results).toHaveLength(concurrentUsers.length);
      expect(stats.successfulOperations).toBe(concurrentUsers.length);
      expect(stats.avgDuration).toBeLessThan(100); // Should remain reasonable under high concurrency
      expect(stats.throughput).toBeGreaterThan(50); // Should maintain decent throughput
    });

    test('should handle concurrent permission checks with different roles', async () => {
      const mixedUsers = [
        ...testUsers.filter(u => u.role === UserRole.ADMIN).slice(0, 10),
        ...testUsers.filter(u => u.role === UserRole.EDITOR).slice(0, 15),
        ...testUsers.filter(u => u.role === UserRole.VIEWER).slice(0, 20),
      ];

      const operations = mixedUsers.map(user => {
        const permission = commonPermissions[Math.floor(Math.random() * commonPermissions.length)];
        return async () => permissionService.hasPermission(user, permission);
      });

      const { results, stats } = await concurrencyTester.runConcurrent(operations, 15);

      expect(results).toHaveLength(mixedUsers.length);
      expect(stats.successfulOperations).toBe(mixedUsers.length);
      expect(stats.avgDuration).toBeLessThan(80);
      expect(stats.maxDuration).toBeLessThan(500); // No operation should take too long
    });
  });

  describe('Concurrent Cache Operations', () => {
    test('should handle concurrent cache hits efficiently', async () => {
      const user = testUsers[0];
      const permission = commonPermissions[0];

      // Pre-populate cache
      permissionService.hasPermission(user, permission);

      // Create many concurrent operations that should hit cache
      const operations = Array.from({ length: 100 }, () => 
        async () => permissionService.hasPermission(user, permission)
      );

      const { results, stats } = await concurrencyTester.runConcurrent(operations, 25);

      expect(results).toHaveLength(100);
      expect(stats.successfulOperations).toBe(100);
      expect(stats.avgDuration).toBeLessThan(10); // Cache hits should be very fast
      expect(stats.throughput).toBeGreaterThan(500); // Should have high throughput with cache hits
    });

    test('should handle concurrent cache misses and population', async () => {
      const users = testUsers.slice(0, 30);
      
      const operations = users.map((user, index) => {
        const permission = {
          ...commonPermissions[index % commonPermissions.length],
          scope: `unique-${index}` // Ensure cache misses
        };
        return async () => permissionService.hasPermission(user, permission);
      });

      const { results, stats } = await concurrencyTester.runConcurrent(operations, 15);

      expect(results).toHaveLength(users.length);
      expect(stats.successfulOperations).toBe(users.length);
      expect(stats.avgDuration).toBeLessThan(150); // Cache misses will be slower but should be reasonable
      expect(stats.throughput).toBeGreaterThan(20); // Should maintain reasonable throughput
    });

    test('should handle concurrent cache invalidations', async () => {
      const users = testUsers.slice(0, 20);
      
      // Pre-populate cache for all users
      users.forEach(user => {
        commonPermissions.forEach(permission => {
          permissionService.hasPermission(user, permission);
        });
      });

      // Create concurrent invalidation operations
      const invalidationOps = users.map(user => 
        async () => {
          await enhancedPermissionService.invalidateUserCache(user.id);
          return true;
        }
      );

      const { results, stats } = await concurrencyTester.runConcurrent(invalidationOps, 10);

      expect(results).toHaveLength(users.length);
      expect(stats.successfulOperations).toBe(users.length);
      expect(stats.avgDuration).toBeLessThan(200); // Invalidations should be reasonably fast
    });
  });

  describe('Mixed Concurrent Operations', () => {
    test('should handle mixed read/write operations concurrently', async () => {
      const users = testUsers.slice(0, 30);
      const operations: Array<() => Promise<any>> = [];

      // Mix of permission checks and cache invalidations
      users.forEach((user, index) => {
        if (index % 5 === 0) {
          // Invalidation operation
          operations.push(async () => {
            await enhancedPermissionService.invalidateUserCache(user.id);
            return 'invalidated';
          });
        } else {
          // Permission check operation
          const permission = commonPermissions[index % commonPermissions.length];
          operations.push(async () => {
            return permissionService.hasPermission(user, permission);
          });
        }
      });

      const { results, stats } = await concurrencyTester.runConcurrent(operations, 12);

      expect(results).toHaveLength(users.length);
      expect(stats.successfulOperations).toBe(users.length);
      expect(stats.avgDuration).toBeLessThan(250); // Mixed operations may be slower
      expect(stats.failedOperations).toBe(0);
    });

    test('should handle concurrent route permission checks', async () => {
      const users = testUsers.slice(0, 25);
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

      const operations = users.map((user, index) => {
        const route = routes[index % routes.length];
        return async () => permissionService.canUserAccessRoute(user, route);
      });

      const { results, stats } = await concurrencyTester.runConcurrent(operations, 15);

      expect(results).toHaveLength(users.length);
      expect(stats.successfulOperations).toBe(users.length);
      expect(stats.avgDuration).toBeLessThan(100); // Route checks should be fast
      expect(stats.throughput).toBeGreaterThan(100);
    });

    test('should handle concurrent array filtering operations', async () => {
      const users = testUsers.slice(0, 20);
      const testItems = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        resource: commonPermissions[i % commonPermissions.length].resource
      }));

      const operations = users.map(user => 
        async () => permissionService.filterByPermissions(
          user,
          testItems,
          item => item.resource,
          'read'
        )
      );

      const { results, stats } = await concurrencyTester.runConcurrent(operations, 10);

      expect(results).toHaveLength(users.length);
      expect(stats.successfulOperations).toBe(users.length);
      expect(stats.avgDuration).toBeLessThan(500); // Filtering operations may take longer
      
      // Verify filtering worked correctly
      results.forEach(filteredItems => {
        expect(Array.isArray(filteredItems)).toBe(true);
        expect(filteredItems.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Stress Testing', () => {
    test('should handle high concurrent load without degradation', async () => {
      const highLoadUsers = testUsers.slice(0, 100);
      const iterations = 5;
      const results: any[] = [];

      // Run multiple rounds of concurrent operations
      for (let round = 0; round < iterations; round++) {
        const operations = highLoadUsers.map((user, index) => {
          const permission = commonPermissions[index % commonPermissions.length];
          return async () => permissionService.hasPermission(user, permission);
        });

        const { stats } = await concurrencyTester.runConcurrent(operations, 30);
        results.push(stats);
        
        // Small delay between rounds
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Verify performance doesn't degrade significantly across rounds
      const avgDurations = results.map(r => r.avgDuration);
      const throughputs = results.map(r => r.throughput);

      const firstRoundAvg = avgDurations[0];
      const lastRoundAvg = avgDurations[avgDurations.length - 1];
      
      // Performance shouldn't degrade by more than 200% (more lenient for test environment)
      expect(lastRoundAvg).toBeLessThan(firstRoundAvg * 3);
      
      // All rounds should maintain reasonable performance
      avgDurations.forEach(avg => {
        expect(avg).toBeLessThan(200);
      });
      
      throughputs.forEach(throughput => {
        expect(throughput).toBeGreaterThan(20);
      });
    });

    test('should handle burst concurrent operations', async () => {
      const burstUsers = testUsers.slice(0, 200);
      
      // Create a large burst of operations
      const operations = burstUsers.map((user, index) => {
        const permission = commonPermissions[index % commonPermissions.length];
        return async () => permissionService.hasPermission(user, permission);
      });

      const { results, stats } = await concurrencyTester.runConcurrent(operations, 50);

      expect(results).toHaveLength(burstUsers.length);
      expect(stats.successfulOperations).toBe(burstUsers.length);
      expect(stats.failedOperations).toBe(0);
      expect(stats.avgDuration).toBeLessThan(300); // Should handle burst reasonably
      expect(stats.maxDuration).toBeLessThan(1000); // No single operation should take too long
    });

    test('should maintain memory efficiency under concurrent load', async () => {
      const memoryUsers = testUsers.slice(0, 50);
      
      // Get initial memory usage
      const initialMemory = process.memoryUsage();

      // Run sustained concurrent operations
      for (let round = 0; round < 10; round++) {
        const operations = memoryUsers.map((user, index) => {
          const permission = {
            ...commonPermissions[index % commonPermissions.length],
            scope: `round-${round}-${index}` // Create unique permissions to test memory
          };
          return async () => permissionService.hasPermission(user, permission);
        });

        await concurrencyTester.runConcurrent(operations, 20);
        
        // Occasional cache cleanup
        if (round % 3 === 0) {
          permissionService.clearCache();
        }
      }

      // Get final memory usage
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Error Handling Under Concurrency', () => {
    test('should handle errors gracefully in concurrent operations', async () => {
      const users = testUsers.slice(0, 20);
      
      const operations = users.map((user, index) => {
        if (index % 5 === 0) {
          // Introduce some operations that might fail
          return async () => {
            if (Math.random() < 0.3) {
              throw new Error('Simulated error');
            }
            return permissionService.hasPermission(user, commonPermissions[0]);
          };
        } else {
          return async () => permissionService.hasPermission(user, commonPermissions[0]);
        }
      });

      const { results, stats } = await concurrencyTester.runConcurrent(operations, 10);

      // Should handle both successful and failed operations
      expect(stats.totalOperations).toBe(users.length);
      expect(stats.successfulOperations + stats.failedOperations).toBe(users.length);
      expect(results.length).toBe(stats.successfulOperations);
    });
  });
});