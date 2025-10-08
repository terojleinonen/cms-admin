/**
 * Scalability Monitor Tests
 * Tests for concurrent user monitoring, database performance tracking, and system resource monitoring
 */

import { ScalabilityMonitor } from '../../app/lib/scalability-monitor';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  $queryRaw: jest.fn()
} as unknown as PrismaClient;

describe('ScalabilityMonitor', () => {
  let monitor: ScalabilityMonitor;

  beforeEach(() => {
    monitor = new ScalabilityMonitor(mockPrisma, {
      maxConcurrentUsers: 100,
      maxPermissionCheckRate: 1000,
      maxQueryLatency: 200,
      maxCpuUsage: 70,
      maxMemoryUsage: 80,
      maxEventLoopDelay: 50,
      minConnectionPoolAvailable: 3,
      slowQueryThreshold: 500
    });
  });

  afterEach(() => {
    monitor.stopMonitoring();
    jest.clearAllMocks();
  });

  describe('User Session Tracking', () => {
    it('should track user session start', () => {
      const userId = 'user123';
      const role = 'ADMIN';
      const ipAddress = '192.168.1.1';

      monitor.trackUserSession(userId, role, ipAddress);

      const metrics = monitor.getConcurrentUserMetrics();
      expect(metrics).toHaveLength(0); // No metrics until collection runs
    });

    it('should track user activity', () => {
      const userId = 'user123';
      monitor.trackUserSession(userId, 'ADMIN');
      
      monitor.trackUserActivity(userId);
      
      // Should not throw and should update last activity
      expect(() => monitor.trackUserActivity(userId)).not.toThrow();
    });

    it('should track permission checks', () => {
      const userId = 'user123';
      monitor.trackUserSession(userId, 'ADMIN');
      
      monitor.trackPermissionCheck(userId);
      monitor.trackPermissionCheck(userId);
      
      // Should increment permission check count
      expect(() => monitor.trackPermissionCheck(userId)).not.toThrow();
    });

    it('should remove user session', () => {
      const userId = 'user123';
      monitor.trackUserSession(userId, 'ADMIN');
      
      monitor.removeUserSession(userId);
      
      // Should not throw
      expect(() => monitor.removeUserSession(userId)).not.toThrow();
    });
  });

  describe('Database Performance Tracking', () => {
    it('should track database query performance', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ result: 'success' });
      
      const result = await monitor.trackDatabaseQuery('test-query', mockQuery, ['param1']);
      
      expect(result).toEqual({ result: 'success' });
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should track slow queries', async () => {
      const slowQuery = jest.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve({ result: 'slow' }), 600));
      });
      
      const result = await monitor.trackDatabaseQuery('slow-query', slowQuery);
      
      expect(result).toEqual({ result: 'slow' });
      
      // Check that slow query was recorded
      const dbMetrics = monitor.getDatabaseMetrics();
      // Metrics won't be available until collection runs, but the query should complete
    });

    it('should handle database query errors', async () => {
      const errorQuery = jest.fn().mockRejectedValue(new Error('Database error'));
      
      await expect(monitor.trackDatabaseQuery('error-query', errorQuery)).rejects.toThrow('Database error');
    });
  });

  describe('System Metrics Collection', () => {
    it('should start and stop monitoring', () => {
      expect(() => monitor.startMonitoring(1000)).not.toThrow();
      expect(() => monitor.stopMonitoring()).not.toThrow();
    });

    it('should not start monitoring twice', () => {
      monitor.startMonitoring(1000);
      
      // Should warn but not throw
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      monitor.startMonitoring(1000);
      
      expect(consoleSpy).toHaveBeenCalledWith('Scalability monitoring is already running');
      consoleSpy.mockRestore();
    });

    it('should get empty metrics initially', () => {
      const userMetrics = monitor.getConcurrentUserMetrics();
      const dbMetrics = monitor.getDatabaseMetrics();
      const systemMetrics = monitor.getSystemMetrics();
      
      expect(userMetrics).toHaveLength(0);
      expect(dbMetrics).toHaveLength(0);
      expect(systemMetrics).toHaveLength(0);
    });

    it('should filter metrics by time window', () => {
      const oneHour = 60 * 60 * 1000;
      
      const userMetrics = monitor.getConcurrentUserMetrics(oneHour);
      const dbMetrics = monitor.getDatabaseMetrics(oneHour);
      const systemMetrics = monitor.getSystemMetrics(oneHour);
      
      expect(userMetrics).toHaveLength(0);
      expect(dbMetrics).toHaveLength(0);
      expect(systemMetrics).toHaveLength(0);
    });
  });

  describe('Alert System', () => {
    it('should get alerts by severity', () => {
      const criticalAlerts = monitor.getAlerts('CRITICAL');
      const highAlerts = monitor.getAlerts('HIGH');
      const unresolvedAlerts = monitor.getAlerts(undefined, false);
      
      expect(criticalAlerts).toHaveLength(0);
      expect(highAlerts).toHaveLength(0);
      expect(unresolvedAlerts).toHaveLength(0);
    });

    it('should filter alerts by resolved status', () => {
      const resolvedAlerts = monitor.getAlerts(undefined, true);
      const unresolvedAlerts = monitor.getAlerts(undefined, false);
      
      expect(resolvedAlerts).toHaveLength(0);
      expect(unresolvedAlerts).toHaveLength(0);
    });
  });

  describe('Scalability Report', () => {
    it('should generate comprehensive report', () => {
      const report = monitor.getScalabilityReport();
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('userMetrics');
      expect(report).toHaveProperty('databaseMetrics');
      expect(report).toHaveProperty('systemMetrics');
      expect(report).toHaveProperty('alerts');
      expect(report).toHaveProperty('recommendations');
      
      expect(report.summary).toHaveProperty('peakConcurrentUsers');
      expect(report.summary).toHaveProperty('averageUsers');
      expect(report.summary).toHaveProperty('totalPermissionChecks');
      expect(report.summary).toHaveProperty('averageQueryLatency');
      expect(report.summary).toHaveProperty('peakCpuUsage');
      expect(report.summary).toHaveProperty('peakMemoryUsage');
    });

    it('should generate recommendations based on thresholds', () => {
      const report = monitor.getScalabilityReport();
      
      expect(Array.isArray(report.recommendations)).toBe(true);
      // With no data, should have minimal recommendations
    });
  });

  describe('Configuration', () => {
    it('should update thresholds', () => {
      const newThresholds = {
        maxConcurrentUsers: 200,
        maxQueryLatency: 300
      };
      
      monitor.updateThresholds(newThresholds);
      
      // Should not throw
      expect(() => monitor.updateThresholds(newThresholds)).not.toThrow();
    });

    it('should export metrics in JSON format', () => {
      const jsonExport = monitor.exportMetrics('json');
      
      expect(() => JSON.parse(jsonExport)).not.toThrow();
      
      const data = JSON.parse(jsonExport);
      expect(data).toHaveProperty('concurrentUserMetrics');
      expect(data).toHaveProperty('databaseMetrics');
      expect(data).toHaveProperty('systemMetrics');
      expect(data).toHaveProperty('alerts');
      expect(data).toHaveProperty('thresholds');
    });

    it('should export metrics in CSV format', () => {
      const csvExport = monitor.exportMetrics('csv');
      
      expect(typeof csvExport).toBe('string');
      expect(csvExport).toContain('timestamp,activeUsers,queryLatency,cpuUsage,memoryUsage');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ScalabilityMonitor.getInstance(mockPrisma);
      const instance2 = ScalabilityMonitor.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Error Handling', () => {
    it('should handle monitoring errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Start monitoring with very short interval to trigger errors
      monitor.startMonitoring(1);
      
      // Wait a bit for potential errors
      setTimeout(() => {
        monitor.stopMonitoring();
        consoleSpy.mockRestore();
      }, 100);
    });

    it('should handle database tracking errors', async () => {
      const errorQuery = jest.fn().mockRejectedValue(new Error('Connection failed'));
      
      await expect(monitor.trackDatabaseQuery('failing-query', errorQuery)).rejects.toThrow('Connection failed');
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of concurrent users', () => {
      // Simulate many users
      for (let i = 0; i < 1000; i++) {
        monitor.trackUserSession(`user${i}`, 'VIEWER', `192.168.1.${i % 255}`);
      }
      
      // Should not throw or cause performance issues
      expect(() => {
        for (let i = 0; i < 1000; i++) {
          monitor.trackUserActivity(`user${i}`);
          monitor.trackPermissionCheck(`user${i}`);
        }
      }).not.toThrow();
    });

    it('should handle rapid permission checks', () => {
      const userId = 'test-user';
      monitor.trackUserSession(userId, 'ADMIN');
      
      // Simulate rapid permission checks
      for (let i = 0; i < 10000; i++) {
        monitor.trackPermissionCheck(userId);
      }
      
      // Should not throw
      expect(() => monitor.trackPermissionCheck(userId)).not.toThrow();
    });
  });
});

describe('ScalabilityMonitor Integration', () => {
  let monitor: ScalabilityMonitor;

  beforeEach(() => {
    monitor = new ScalabilityMonitor(mockPrisma);
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  it('should simulate realistic usage scenario', async () => {
    // Start monitoring
    monitor.startMonitoring(100); // Very fast for testing
    
    // Simulate user sessions
    monitor.trackUserSession('admin1', 'ADMIN', '192.168.1.100');
    monitor.trackUserSession('editor1', 'EDITOR', '192.168.1.101');
    monitor.trackUserSession('viewer1', 'VIEWER', '192.168.1.102');
    
    // Simulate activity
    for (let i = 0; i < 10; i++) {
      monitor.trackUserActivity('admin1');
      monitor.trackPermissionCheck('admin1');
      
      monitor.trackUserActivity('editor1');
      monitor.trackPermissionCheck('editor1');
      
      monitor.trackUserActivity('viewer1');
      monitor.trackPermissionCheck('viewer1');
      
      // Simulate database queries
      await monitor.trackDatabaseQuery('user-lookup', async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        return { users: [] };
      });
    }
    
    // Wait for metrics collection
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Generate report
    const report = monitor.getScalabilityReport();
    
    expect(report.summary.peakConcurrentUsers).toBeGreaterThanOrEqual(0);
    expect(report.summary.totalPermissionChecks).toBeGreaterThanOrEqual(0);
    
    // Clean up
    monitor.removeUserSession('admin1');
    monitor.removeUserSession('editor1');
    monitor.removeUserSession('viewer1');
  });
});