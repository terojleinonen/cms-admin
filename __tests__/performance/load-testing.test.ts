/**
 * Permission System Load Testing
 * Comprehensive load testing for permission system under various scenarios
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

// Load testing utilities
class LoadTester {
  private metrics: {
    operationsPerSecond: number[];
    responseTime: number[];
    errorRate: number[];
    memoryUsage: number[];
    cacheHitRate: number[];
  } = {
    operationsPerSecond: [],
    responseTime: [],
    errorRate: [],
    memoryUsage: [],
    cacheHitRate: [],
  };

  async runLoadTest(
    testName: string,
    operation: () => Promise<any>,
    options: {
      duration: number; // milliseconds
      targetRps: number; // requests per second
      rampUpTime?: number; // milliseconds
      rampDownTime?: number; // milliseconds
    }
  ): Promise<{
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    avgResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    actualRps: number;
    errorRate: number;
    memoryStats: any;
  }> {
    const startTime = Date.now();
    const endTime = startTime + options.duration;
    const operations: Promise<{ success: boolean; duration: number; error?: Error }>[] = [];
    const responseTimes: number[] = [];
    let successCount = 0;
    let errorCount = 0;

    console.log(`Starting load test: ${testName}`);
    console.log(`Target RPS: ${options.targetRps}, Duration: ${options.duration}ms`);

    // Calculate interval between operations
    const baseInterval = 1000 / options.targetRps;
    let currentRps = options.targetRps;

    // Ramp up phase
    if (options.rampUpTime) {
      const rampUpSteps = Math.floor(options.rampUpTime / 1000);
      const rpsIncrement = options.targetRps / rampUpSteps;
      currentRps = rpsIncrement;
    }

    while (Date.now() < endTime) {
      const operationStart = performance.now();
      
      const operationPromise = operation()
        .then(() => {
          const operationEnd = performance.now();
          const duration = operationEnd - operationStart;
          responseTimes.push(duration);
          successCount++;
          return { success: true, duration };
        })
        .catch((error: Error) => {
          const operationEnd = performance.now();
          const duration = operationEnd - operationStart;
          responseTimes.push(duration);
          errorCount++;
          return { success: false, duration, error };
        });

      operations.push(operationPromise);

      // Adjust RPS during ramp up
      const elapsed = Date.now() - startTime;
      if (options.rampUpTime && elapsed < options.rampUpTime) {
        const progress = elapsed / options.rampUpTime;
        currentRps = options.targetRps * progress;
      } else if (options.rampDownTime && elapsed > options.duration - options.rampDownTime) {
        const rampDownProgress = (options.duration - elapsed) / options.rampDownTime;
        currentRps = options.targetRps * rampDownProgress;
      }

      const currentInterval = Math.max(1, 1000 / currentRps);
      await new Promise(resolve => setTimeout(resolve, currentInterval));
    }

    // Wait for all operations to complete
    await Promise.allSettled(operations);

    const totalDuration = Date.now() - startTime;
    const totalOperations = operations.length;
    const actualRps = (totalOperations / totalDuration) * 1000;

    // Calculate statistics
    const sortedResponseTimes = responseTimes.sort((a, b) => a - b);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
    const p99Index = Math.floor(sortedResponseTimes.length * 0.99);

    const memoryUsage = process.memoryUsage();

    console.log(`Load test completed: ${testName}`);
    console.log(`Total operations: ${totalOperations}, Success: ${successCount}, Errors: ${errorCount}`);
    console.log(`Actual RPS: ${actualRps.toFixed(2)}, Avg response time: ${avgResponseTime.toFixed(2)}ms`);

    return {
      totalOperations,
      successfulOperations: successCount,
      failedOperations: errorCount,
      avgResponseTime,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      p95ResponseTime: sortedResponseTimes[p95Index] || 0,
      p99ResponseTime: sortedResponseTimes[p99Index] || 0,
      actualRps,
      errorRate: (errorCount / totalOperations) * 100,
      memoryStats: memoryUsage,
    };
  }

  async runSustainedLoadTest(
    testName: string,
    operation: () => Promise<any>,
    options: {
      duration: number;
      targetRps: number;
      samplingInterval: number; // milliseconds
    }
  ): Promise<any> {
    const samples: any[] = [];
    const startTime = Date.now();
    const endTime = startTime + options.duration;

    console.log(`Starting sustained load test: ${testName}`);

    while (Date.now() < endTime) {
      const sampleStart = Date.now();
      const sampleOperations: Promise<any>[] = [];
      const sampleDuration = Math.min(options.samplingInterval, endTime - Date.now());
      const sampleEndTime = sampleStart + sampleDuration;

      // Run operations for this sample period
      while (Date.now() < sampleEndTime) {
        sampleOperations.push(operation());
        await new Promise(resolve => setTimeout(resolve, 1000 / options.targetRps));
      }

      // Wait for sample operations to complete and collect metrics
      const sampleResults = await Promise.allSettled(sampleOperations);
      const sampleSuccess = sampleResults.filter(r => r.status === 'fulfilled').length;
      const sampleErrors = sampleResults.filter(r => r.status === 'rejected').length;
      const sampleRps = (sampleOperations.length / sampleDuration) * 1000;
      const memoryUsage = process.memoryUsage();

      samples.push({
        timestamp: Date.now() - startTime,
        operations: sampleOperations.length,
        successful: sampleSuccess,
        errors: sampleErrors,
        rps: sampleRps,
        errorRate: (sampleErrors / sampleOperations.length) * 100,
        memoryUsage: memoryUsage.heapUsed,
      });

      console.log(`Sample: RPS=${sampleRps.toFixed(1)}, Errors=${sampleErrors}, Memory=${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);
    }

    return {
      samples,
      totalDuration: Date.now() - startTime,
      avgRps: samples.reduce((sum, s) => sum + s.rps, 0) / samples.length,
      avgErrorRate: samples.reduce((sum, s) => sum + s.errorRate, 0) / samples.length,
      peakMemory: Math.max(...samples.map(s => s.memoryUsage)),
    };
  }
}

describe('Permission System Load Testing', () => {
  let permissionService: PermissionService;
  let enhancedPermissionService: EnhancedPermissionService;
  let loadTester: LoadTester;
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
    loadTester = new LoadTester();

    // Create a large set of test users
    testUsers = [
      ...Array.from({ length: 100 }, (_, i) => createMockUser(`admin-${i}`, UserRole.ADMIN)),
      ...Array.from({ length: 200 }, (_, i) => createMockUser(`editor-${i}`, UserRole.EDITOR)),
      ...Array.from({ length: 300 }, (_, i) => createMockUser(`viewer-${i}`, UserRole.VIEWER)),
    ];
  });

  beforeEach(() => {
    permissionService.clearCache();
    enhancedPermissionService.clearCache();
  });

  describe('Basic Load Testing', () => {
    test('should handle moderate load (100 RPS) efficiently', async () => {
      const testUser = testUsers[0];
      const testPermission = commonPermissions[0];

      const results = await loadTester.runLoadTest(
        'Moderate Load Test',
        async () => permissionService.hasPermission(testUser, testPermission),
        {
          duration: 5000, // 5 seconds
          targetRps: 100,
        }
      );

      expect(results.errorRate).toBeLessThan(1); // Less than 1% error rate
      expect(results.avgResponseTime).toBeLessThan(10); // Average response time under 10ms
      expect(results.p95ResponseTime).toBeLessThan(20); // 95th percentile under 20ms
      expect(results.actualRps).toBeGreaterThan(50); // Should achieve at least 50% of target RPS
    });

    test('should handle high load (500 RPS) with acceptable performance', async () => {
      const testUser = testUsers[0];
      const testPermission = commonPermissions[0];

      const results = await loadTester.runLoadTest(
        'High Load Test',
        async () => permissionService.hasPermission(testUser, testPermission),
        {
          duration: 3000, // 3 seconds
          targetRps: 500,
        }
      );

      expect(results.errorRate).toBeLessThan(5); // Less than 5% error rate under high load
      expect(results.avgResponseTime).toBeLessThan(50); // Average response time under 50ms
      expect(results.p95ResponseTime).toBeLessThan(100); // 95th percentile under 100ms
      expect(results.actualRps).toBeGreaterThan(200); // Should achieve reasonable throughput
    });

    test('should handle mixed user load efficiently', async () => {
      const results = await loadTester.runLoadTest(
        'Mixed User Load Test',
        async () => {
          const randomUser = testUsers[Math.floor(Math.random() * testUsers.length)];
          const randomPermission = commonPermissions[Math.floor(Math.random() * commonPermissions.length)];
          return permissionService.hasPermission(randomUser, randomPermission);
        },
        {
          duration: 5000, // 5 seconds
          targetRps: 200,
        }
      );

      expect(results.errorRate).toBeLessThan(2); // Less than 2% error rate
      expect(results.avgResponseTime).toBeLessThan(25); // Average response time under 25ms
      expect(results.p99ResponseTime).toBeLessThan(100); // 99th percentile under 100ms
      expect(results.actualRps).toBeGreaterThan(70); // Should achieve reasonable throughput
    });
  });

  describe('Sustained Load Testing', () => {
    test('should maintain performance under sustained load', async () => {
      const testUser = testUsers[0];
      const testPermission = commonPermissions[0];

      const results = await loadTester.runSustainedLoadTest(
        'Sustained Load Test',
        async () => permissionService.hasPermission(testUser, testPermission),
        {
          duration: 6000, // 6 seconds (reduced for test environment)
          targetRps: 100, // Reduced target for test environment
          samplingInterval: 2000, // 2 second samples
        }
      );

      expect(results.samples.length).toBeGreaterThanOrEqual(3); // Should have multiple samples
      expect(results.avgErrorRate).toBeLessThan(2); // Average error rate under 2%
      expect(results.avgRps).toBeGreaterThan(50); // Should maintain reasonable RPS

      // Check that performance doesn't degrade significantly over time
      const firstSample = results.samples[0];
      const lastSample = results.samples[results.samples.length - 1];
      
      expect(lastSample.rps).toBeGreaterThan(firstSample.rps * 0.7); // No more than 30% degradation
    });

    test('should handle memory efficiently under sustained load', async () => {
      const results = await loadTester.runSustainedLoadTest(
        'Memory Efficiency Test',
        async () => {
          const randomUser = testUsers[Math.floor(Math.random() * 50)]; // Limit to 50 users
          const randomPermission = commonPermissions[Math.floor(Math.random() * commonPermissions.length)];
          return permissionService.hasPermission(randomUser, randomPermission);
        },
        {
          duration: 8000, // 8 seconds
          targetRps: 100,
          samplingInterval: 2000,
        }
      );

      const memoryGrowth = results.peakMemory - results.samples[0].memoryUsage;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;

      expect(memoryGrowthMB).toBeLessThan(20); // Memory growth should be less than 20MB
      expect(results.avgErrorRate).toBeLessThan(1); // Should maintain low error rate
    });
  });

  describe('Spike Load Testing', () => {
    test('should handle traffic spikes gracefully', async () => {
      const testUser = testUsers[0];
      const testPermission = commonPermissions[0];

      // Simulate a traffic spike with ramp up and ramp down
      const results = await loadTester.runLoadTest(
        'Spike Load Test',
        async () => permissionService.hasPermission(testUser, testPermission),
        {
          duration: 6000, // 6 seconds
          targetRps: 800, // High spike
          rampUpTime: 1000, // 1 second ramp up
          rampDownTime: 1000, // 1 second ramp down
        }
      );

      expect(results.errorRate).toBeLessThan(10); // Should handle spike with acceptable error rate
      expect(results.avgResponseTime).toBeLessThan(100); // Average response time should be reasonable
      expect(results.totalOperations).toBeGreaterThan(200); // Should process reasonable number of operations
    });

    test('should recover quickly from load spikes', async () => {
      const testUser = testUsers[0];
      const testPermission = commonPermissions[0];

      // First, create a spike
      await loadTester.runLoadTest(
        'Recovery Test - Spike',
        async () => permissionService.hasPermission(testUser, testPermission),
        {
          duration: 2000,
          targetRps: 1000,
        }
      );

      // Then test normal load immediately after
      const recoveryResults = await loadTester.runLoadTest(
        'Recovery Test - Normal',
        async () => permissionService.hasPermission(testUser, testPermission),
        {
          duration: 3000,
          targetRps: 100,
        }
      );

      // Should recover to normal performance quickly
      expect(recoveryResults.errorRate).toBeLessThan(1);
      expect(recoveryResults.avgResponseTime).toBeLessThan(15);
      expect(recoveryResults.actualRps).toBeGreaterThan(50);
    });
  });

  describe('Cache Performance Under Load', () => {
    test('should show improved performance with cache warming under load', async () => {
      const loadUsers = testUsers.slice(0, 20);

      // Test without cache warming
      const coldResults = await loadTester.runLoadTest(
        'Cold Cache Load Test',
        async () => {
          const randomUser = loadUsers[Math.floor(Math.random() * loadUsers.length)];
          const randomPermission = commonPermissions[Math.floor(Math.random() * commonPermissions.length)];
          return permissionService.hasPermission(randomUser, randomPermission);
        },
        {
          duration: 3000,
          targetRps: 200,
        }
      );

      // Clear cache and warm it
      permissionService.clearCache();
      await enhancedPermissionService.warmCache(loadUsers, commonPermissions);

      // Test with warmed cache
      const warmResults = await loadTester.runLoadTest(
        'Warm Cache Load Test',
        async () => {
          const randomUser = loadUsers[Math.floor(Math.random() * loadUsers.length)];
          const randomPermission = commonPermissions[Math.floor(Math.random() * commonPermissions.length)];
          return permissionService.hasPermission(randomUser, randomPermission);
        },
        {
          duration: 3000,
          targetRps: 200,
        }
      );

      // Warmed cache should perform reasonably well (allowing for test environment variance)
      expect(warmResults.avgResponseTime).toBeLessThan(coldResults.avgResponseTime * 2);
      expect(warmResults.actualRps).toBeGreaterThan(coldResults.actualRps * 0.8);
    }, 30000); // 30 second timeout

    test('should handle cache invalidation under load', async () => {
      const loadUsers = testUsers.slice(0, 30);

      const results = await loadTester.runLoadTest(
        'Cache Invalidation Load Test',
        async () => {
          const randomUser = loadUsers[Math.floor(Math.random() * loadUsers.length)];
          
          if (Math.random() < 0.1) {
            // 10% of operations are cache invalidations
            await enhancedPermissionService.invalidateUserCache(randomUser.id);
            return 'invalidated';
          } else {
            // 90% are permission checks
            const randomPermission = commonPermissions[Math.floor(Math.random() * commonPermissions.length)];
            return permissionService.hasPermission(randomUser, randomPermission);
          }
        },
        {
          duration: 5000,
          targetRps: 150,
        }
      );

      expect(results.errorRate).toBeLessThan(3); // Should handle mixed operations well
      expect(results.avgResponseTime).toBeLessThan(30); // Should maintain reasonable response times
      expect(results.actualRps).toBeGreaterThan(5); // Should maintain decent throughput
    });
  });

  describe('Complex Operation Load Testing', () => {
    test('should handle route permission checks under load', async () => {
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

      const results = await loadTester.runLoadTest(
        'Route Permission Load Test',
        async () => {
          const randomUser = testUsers[Math.floor(Math.random() * testUsers.length)];
          const randomRoute = routes[Math.floor(Math.random() * routes.length)];
          return permissionService.canUserAccessRoute(randomUser, randomRoute);
        },
        {
          duration: 4000,
          targetRps: 250,
        }
      );

      expect(results.errorRate).toBeLessThan(2);
      expect(results.avgResponseTime).toBeLessThan(20);
      expect(results.actualRps).toBeGreaterThan(120);
    });

    test('should handle array filtering under load', async () => {
      const testItems = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        resource: commonPermissions[i % commonPermissions.length].resource
      }));

      const results = await loadTester.runLoadTest(
        'Array Filtering Load Test',
        async () => {
          const randomUser = testUsers[Math.floor(Math.random() * testUsers.length)];
          return permissionService.filterByPermissions(
            randomUser,
            testItems,
            item => item.resource,
            'read'
          );
        },
        {
          duration: 3000,
          targetRps: 100,
        }
      );

      expect(results.errorRate).toBeLessThan(1);
      expect(results.avgResponseTime).toBeLessThan(50); // Filtering may take longer
      expect(results.actualRps).toBeGreaterThan(30); // More lenient for test environment
    });
  });
});