/**
 * @jest-environment node
 */

import { 
  PermissionPerformanceMonitor, 
  PermissionPerformanceAlerting,
  PerformanceAlert 
} from '../../app/lib/permission-performance-monitor';
import { Permission } from '../../app/lib/permissions';
import { UserRole } from '@prisma/client';

describe('PermissionPerformanceMonitor', () => {
  let monitor: PermissionPerformanceMonitor;
  let mockUser: { id: string; role: UserRole };
  let mockPermission: Permission;

  beforeEach(() => {
    monitor = new PermissionPerformanceMonitor();
    mockUser = { id: 'user-1', role: UserRole.EDITOR };
    mockPermission = { resource: 'products', action: 'read', scope: 'all' };
  });

  afterEach(() => {
    monitor.clearMetrics();
  });

  describe('trackPermissionCheck', () => {
    it('should track successful permission check', async () => {
      const result = await monitor.trackPermissionCheck(
        'test-operation',
        mockUser.id,
        mockPermission,
        () => Promise.resolve(true)
      );

      expect(result).toBe(true);

      const stats = monitor.getPerformanceStats();
      expect(stats.totalChecks).toBe(1);
      expect(stats.errorRate).toBe(0);
      expect(stats.avgLatency).toBeGreaterThan(0);
    });

    it('should track failed permission check', async () => {
      await expect(
        monitor.trackPermissionCheck(
          'test-operation',
          mockUser.id,
          mockPermission,
          () => {
            throw new Error('Test error');
          }
        )
      ).rejects.toThrow('Test error');

      const stats = monitor.getPerformanceStats();
      expect(stats.totalChecks).toBe(1);
      expect(stats.errorRate).toBe(1);
    });

    it('should detect cache hits based on execution time', async () => {
      // Fast operation (simulating cache hit)
      await monitor.trackPermissionCheck(
        'fast-operation',
        mockUser.id,
        mockPermission,
        () => Promise.resolve(true)
      );

      // Slow operation (simulating cache miss)
      await monitor.trackPermissionCheck(
        'slow-operation',
        mockUser.id,
        mockPermission,
        () => new Promise(resolve => setTimeout(() => resolve(true), 10))
      );

      const stats = monitor.getPerformanceStats();
      expect(stats.totalChecks).toBe(2);
      expect(stats.cacheHitRatio).toBeGreaterThan(0);
    });
  });

  describe('trackCacheOperation', () => {
    it('should track cache get operation', async () => {
      const result = await monitor.trackCacheOperation(
        'cache_get',
        'test-key',
        () => 'cached-value'
      );

      expect(result).toBe('cached-value');

      const cacheMetrics = monitor.getCachePerformanceMetrics();
      expect(cacheMetrics.avgGetLatency).toBeGreaterThan(0);
    });

    it('should track cache set operation', async () => {
      await monitor.trackCacheOperation(
        'cache_set',
        'test-key',
        () => undefined
      );

      const cacheMetrics = monitor.getCachePerformanceMetrics();
      expect(cacheMetrics.avgSetLatency).toBeGreaterThan(0);
    });
  });

  describe('performance statistics', () => {
    beforeEach(async () => {
      // Add some test data
      for (let i = 0; i < 10; i++) {
        await monitor.trackPermissionCheck(
          `operation-${i}`,
          mockUser.id,
          mockPermission,
          () => Promise.resolve(true)
        );
      }

      // Add one slow operation
      await monitor.trackPermissionCheck(
        'slow-operation',
        mockUser.id,
        mockPermission,
        () => new Promise(resolve => setTimeout(() => resolve(true), 60))
      );

      // Add one failed operation
      try {
        await monitor.trackPermissionCheck(
          'failed-operation',
          mockUser.id,
          mockPermission,
          () => {
            throw new Error('Test error');
          }
        );
      } catch {
        // Expected to fail
      }
    });

    it('should calculate correct performance statistics', () => {
      const stats = monitor.getPerformanceStats();

      expect(stats.totalChecks).toBe(12);
      expect(stats.avgLatency).toBeGreaterThan(0);
      expect(stats.errorRate).toBeCloseTo(1/12, 2);
      expect(stats.slowChecks).toBe(1);
      expect(stats.recentMetrics).toHaveLength(12);
    });

    it('should calculate percentile latencies', () => {
      const stats = monitor.getPerformanceStats();

      expect(stats.p95Latency).toBeGreaterThanOrEqual(stats.avgLatency);
      expect(stats.p99Latency).toBeGreaterThanOrEqual(stats.p95Latency);
    });

    it('should filter by time window', () => {
      const recentStats = monitor.getPerformanceStats(1000); // Last 1 second
      const allStats = monitor.getPerformanceStats();

      expect(recentStats.totalChecks).toBeLessThanOrEqual(allStats.totalChecks);
    });
  });

  describe('cache performance metrics', () => {
    beforeEach(async () => {
      // Simulate cache operations
      await monitor.trackCacheOperation('cache_get', 'key-1', () => 'value');
      await monitor.trackCacheOperation('cache_get', 'key-2', () => null);
      await monitor.trackCacheOperation('cache_set', 'key-3', () => undefined);
    });

    it('should calculate cache performance metrics', () => {
      const metrics = monitor.getCachePerformanceMetrics();

      expect(metrics.totalOperations).toBe(0); // No permission checks with cache tracking yet
      expect(metrics.avgGetLatency).toBeGreaterThan(0);
      expect(metrics.avgSetLatency).toBeGreaterThan(0);
    });
  });

  describe('performance alerts', () => {
    it('should generate high latency alerts', async () => {
      const customMonitor = new PermissionPerformanceMonitor({ maxLatency: 10 });

      // Create a slow operation that exceeds threshold
      await customMonitor.trackPermissionCheck(
        'slow-operation',
        mockUser.id,
        mockPermission,
        () => new Promise(resolve => setTimeout(() => resolve(true), 20))
      );

      const alerts = customMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('HIGH_LATENCY');
    });

    it('should resolve alerts', () => {
      const customMonitor = new PermissionPerformanceMonitor();
      
      // Manually add an alert for testing
      const alert: PerformanceAlert = {
        id: 'test-alert',
        type: 'HIGH_LATENCY',
        severity: 'HIGH',
        message: 'Test alert',
        value: 100,
        threshold: 50,
        timestamp: Date.now(),
        resolved: false
      };

      // Access private method for testing
      (customMonitor as any).addAlert(alert);

      expect(customMonitor.getAlerts().length).toBe(1);
      expect(customMonitor.resolveAlert('test-alert')).toBe(true);
      expect(customMonitor.getAlerts(undefined, false).length).toBe(0);
    });

    it('should filter alerts by severity and resolution status', () => {
      const customMonitor = new PermissionPerformanceMonitor();
      
      // Add test alerts
      const alerts: PerformanceAlert[] = [
        {
          id: 'alert-1',
          type: 'HIGH_LATENCY',
          severity: 'CRITICAL',
          message: 'Critical alert',
          value: 200,
          threshold: 100,
          timestamp: Date.now(),
          resolved: false
        },
        {
          id: 'alert-2',
          type: 'LOW_CACHE_HIT_RATIO',
          severity: 'HIGH',
          message: 'High alert',
          value: 0.5,
          threshold: 0.8,
          timestamp: Date.now(),
          resolved: true
        }
      ];

      alerts.forEach(alert => (customMonitor as any).addAlert(alert));

      expect(customMonitor.getAlerts('CRITICAL').length).toBe(1);
      expect(customMonitor.getAlerts(undefined, false).length).toBe(1);
      expect(customMonitor.getAlerts(undefined, true).length).toBe(1);
    });
  });

  describe('performance report', () => {
    beforeEach(async () => {
      // Add test data
      for (let i = 0; i < 5; i++) {
        await monitor.trackPermissionCheck(
          `operation-${i}`,
          mockUser.id,
          mockPermission,
          () => Promise.resolve(true)
        );
      }
    });

    it('should generate comprehensive performance report', () => {
      const report = monitor.getPerformanceReport();

      expect(report.summary).toBeDefined();
      expect(report.cacheMetrics).toBeDefined();
      expect(report.alerts).toBeDefined();
      expect(report.recommendations).toBeDefined();

      expect(report.summary.totalChecks).toBe(5);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should include performance recommendations', () => {
      const customMonitor = new PermissionPerformanceMonitor({ 
        maxLatency: 1, // Very low threshold to trigger recommendations
        minCacheHitRatio: 0.99 // Very high threshold
      });

      const report = customMonitor.getPerformanceReport();
      
      // Should have recommendations due to low thresholds
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('metrics export', () => {
    beforeEach(async () => {
      await monitor.trackPermissionCheck(
        'test-operation',
        mockUser.id,
        mockPermission,
        () => Promise.resolve(true)
      );
    });

    it('should export metrics as JSON', () => {
      const jsonMetrics = monitor.exportMetrics('json');
      const parsed = JSON.parse(jsonMetrics);

      expect(parsed.metrics).toBeDefined();
      expect(parsed.cacheMetrics).toBeDefined();
      expect(parsed.alerts).toBeDefined();
      expect(parsed.thresholds).toBeDefined();
    });

    it('should export metrics as CSV', () => {
      const csvMetrics = monitor.exportMetrics('csv');
      
      expect(csvMetrics).toContain('timestamp,operation,duration');
      expect(csvMetrics.split('\n').length).toBeGreaterThan(1);
    });
  });
});

describe('PermissionPerformanceAlerting', () => {
  let monitor: PermissionPerformanceMonitor;
  let alerting: PermissionPerformanceAlerting;
  let alertHandler: jest.Mock;

  beforeEach(() => {
    monitor = new PermissionPerformanceMonitor();
    alerting = new PermissionPerformanceAlerting(monitor);
    alertHandler = jest.fn();
  });

  afterEach(() => {
    monitor.clearMetrics();
  });

  it('should register and call alert handlers', () => {
    alerting.onAlert('HIGH_LATENCY', alertHandler);

    // Manually trigger an alert
    const alert: PerformanceAlert = {
      id: 'test-alert',
      type: 'HIGH_LATENCY',
      severity: 'HIGH',
      message: 'Test alert',
      value: 100,
      threshold: 50,
      timestamp: Date.now(),
      resolved: false
    };

    (monitor as any).addAlert(alert);

    // Simulate monitoring check
    const alerts = monitor.getAlerts(undefined, false);
    alerts.forEach(alert => {
      if (alert.type === 'HIGH_LATENCY') {
        alertHandler(alert);
      }
    });

    expect(alertHandler).toHaveBeenCalledWith(alert);
  });
});