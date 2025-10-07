/**
 * Security Monitoring Service Tests
 */

import { SecurityMonitoringService, SECURITY_EVENT_TYPES, SECURITY_SEVERITY } from '../../app/lib/security-monitoring';
import { AuditService } from '../../app/lib/audit-service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  securityEvent: {
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
  $queryRaw: jest.fn(),
} as unknown as PrismaClient;

// Mock AuditService
const mockAuditService = {
  logSecurity: jest.fn(),
  getSecurityIncidents: jest.fn(),
} as unknown as AuditService;

// Mock SecurityEventDB
jest.mock('../../app/lib/permission-db', () => ({
  SecurityEventDB: {
    create: jest.fn().mockResolvedValue('event-123'),
    getEvents: jest.fn().mockResolvedValue({
      events: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
    }),
    getStats: jest.fn().mockResolvedValue({
      totalEvents: 0,
      unresolvedEvents: 0,
      eventsByType: [],
      eventsBySeverity: [],
      recentTrends: []
    }),
    resolve: jest.fn(),
  }
}));

describe('SecurityMonitoringService', () => {
  let service: SecurityMonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SecurityMonitoringService(mockPrisma, mockAuditService);
  });

  describe('logSecurityEvent', () => {
    it('should log a security event successfully', async () => {
      const eventData = {
        type: SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS,
        severity: SECURITY_SEVERITY.HIGH,
        userId: 'user-123',
        resource: 'products',
        action: 'read',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        details: {
          reason: 'Invalid permissions'
        }
      };

      const eventId = await service.logSecurityEvent(eventData);

      expect(eventId).toBe('event-123');
      expect(mockAuditService.logSecurity).toHaveBeenCalledWith(
        'user-123',
        'SUSPICIOUS_ACTIVITY',
        expect.objectContaining({
          securityEventId: 'event-123',
          type: SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS,
          severity: SECURITY_SEVERITY.HIGH
        }),
        '192.168.1.1',
        'Mozilla/5.0'
      );
    });

    it('should handle events without userId', async () => {
      const eventData = {
        type: SECURITY_EVENT_TYPES.BRUTE_FORCE_ATTACK,
        severity: SECURITY_SEVERITY.CRITICAL,
        ipAddress: '192.168.1.1',
        details: {
          reason: 'Multiple failed attempts'
        }
      };

      const eventId = await service.logSecurityEvent(eventData);

      expect(eventId).toBe('event-123');
      expect(mockAuditService.logSecurity).not.toHaveBeenCalled();
    });

    it('should skip analysis when skipAnalysis is true', async () => {
      const eventData = {
        type: SECURITY_EVENT_TYPES.BRUTE_FORCE_ATTACK,
        severity: SECURITY_SEVERITY.HIGH,
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        details: { reason: 'Derived event' }
      };

      // Mock the analysis methods to verify they're not called
      const analyzeUserBehaviorSpy = jest.spyOn(service as any, 'analyzeUserBehavior');
      const analyzeIPBehaviorSpy = jest.spyOn(service as any, 'analyzeIPBehavior');

      await service.logSecurityEvent(eventData, true);

      expect(analyzeUserBehaviorSpy).not.toHaveBeenCalled();
      expect(analyzeIPBehaviorSpy).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting', async () => {
      const eventData = {
        type: SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS,
        severity: SECURITY_SEVERITY.HIGH,
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        details: { reason: 'Rate limit test' }
      };

      // First 10 events should succeed
      for (let i = 0; i < 10; i++) {
        await service.logSecurityEvent(eventData);
      }

      // 11th event should be rate limited
      await expect(service.logSecurityEvent(eventData)).rejects.toThrow('Security event rate limited');
    });
  });

  describe('getDashboardData', () => {
    it('should return dashboard data', async () => {
      mockPrisma.$queryRaw = jest.fn().mockResolvedValue([
        { date: '2024-01-01', count: BigInt(5) },
        { date: '2024-01-02', count: BigInt(3) }
      ]);

      const dashboardData = await service.getDashboardData(7);

      expect(dashboardData).toHaveProperty('summary');
      expect(dashboardData).toHaveProperty('eventsByType');
      expect(dashboardData).toHaveProperty('eventsBySeverity');
      expect(dashboardData).toHaveProperty('recentEvents');
      expect(dashboardData).toHaveProperty('timeline');
      expect(dashboardData.timeline).toEqual([
        { date: '2024-01-01', count: 5 },
        { date: '2024-01-02', count: 3 }
      ]);
    });
  });

  describe('isIPBlocked', () => {
    it('should return false for non-blocked IP', () => {
      expect(service.isIPBlocked('192.168.1.1')).toBe(false);
    });

    it('should return true for blocked IP after blocking', async () => {
      // Simulate blocking an IP through alert action
      const eventData = {
        type: SECURITY_EVENT_TYPES.BRUTE_FORCE_ATTACK,
        severity: SECURITY_SEVERITY.CRITICAL,
        ipAddress: '192.168.1.1',
        details: { reason: 'Brute force detected' }
      };

      // Mock count to trigger alert
      mockPrisma.securityEvent.count = jest.fn().mockResolvedValue(6);

      await service.logSecurityEvent(eventData);

      // The IP should be blocked after the alert triggers
      expect(service.isIPBlocked('192.168.1.1')).toBe(true);
    });
  });

  describe('updateAlertConfig', () => {
    it('should update alert configuration', () => {
      const newConfig = {
        enabled: false,
        threshold: 10,
        timeWindow: 60,
        severity: SECURITY_SEVERITY.LOW,
        actions: []
      };

      service.updateAlertConfig(SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS, newConfig);

      const configs = service.getAlertConfigs();
      expect(configs[SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS]).toMatchObject(newConfig);
    });
  });

  describe('resolveSecurityEvent', () => {
    it('should resolve a security event', async () => {
      await service.resolveSecurityEvent('event-123', 'admin-user');

      const { SecurityEventDB } = require('../../app/lib/permission-db');
      expect(SecurityEventDB.resolve).toHaveBeenCalledWith('event-123', 'admin-user');
    });
  });

  describe('alert conditions', () => {
    beforeEach(() => {
      // Reset alert configs to defaults
      service = new SecurityMonitoringService(mockPrisma, mockAuditService);
    });

    it('should trigger alert when threshold is exceeded', async () => {
      // Mock count to exceed threshold
      mockPrisma.securityEvent.count = jest.fn().mockResolvedValue(6);

      const eventData = {
        type: SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS,
        severity: SECURITY_SEVERITY.HIGH,
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        details: { reason: 'Access denied' }
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.logSecurityEvent(eventData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Security alert triggered: UNAUTHORIZED_ACCESS')
      );

      consoleSpy.mockRestore();
    });

    it('should not trigger alert when threshold is not exceeded', async () => {
      // Mock count below threshold
      mockPrisma.securityEvent.count = jest.fn().mockResolvedValue(1);

      const eventData = {
        type: SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS,
        severity: SECURITY_SEVERITY.HIGH,
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        details: { reason: 'Access denied' }
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.logSecurityEvent(eventData);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Security alert triggered')
      );

      consoleSpy.mockRestore();
    });

    it('should respect cooldown periods', async () => {
      // Mock count to exceed threshold
      mockPrisma.securityEvent.count = jest.fn().mockResolvedValue(6);

      const eventData = {
        type: SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS,
        severity: SECURITY_SEVERITY.HIGH,
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        details: { reason: 'Access denied' }
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // First event should trigger alert
      await service.logSecurityEvent(eventData);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Security alert triggered')
      );

      consoleSpy.mockClear();

      // Second event immediately after should not trigger due to cooldown
      await service.logSecurityEvent(eventData);
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Security alert triggered')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('real-time analysis', () => {
    it('should detect brute force attacks', async () => {
      // Mock multiple failed attempts
      mockPrisma.securityEvent.count = jest.fn().mockResolvedValue(6);

      const eventData = {
        type: SECURITY_EVENT_TYPES.FAILED_AUTHENTICATION,
        severity: SECURITY_SEVERITY.MEDIUM,
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        details: { reason: 'Invalid password' }
      };

      const { SecurityEventDB } = require('../../app/lib/permission-db');
      SecurityEventDB.create = jest.fn().mockResolvedValue('event-456');

      await service.logSecurityEvent(eventData);

      // Should create a brute force event
      expect(SecurityEventDB.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SECURITY_EVENT_TYPES.BRUTE_FORCE_ATTACK,
          severity: SECURITY_SEVERITY.HIGH
        })
      );
    });

    it('should detect multiple IP access', async () => {
      // Mock multiple IPs for same user
      mockPrisma.securityEvent.findMany = jest.fn().mockResolvedValue([
        { ipAddress: '192.168.1.1' },
        { ipAddress: '192.168.1.2' },
        { ipAddress: '192.168.1.3' }
      ]);

      const eventData = {
        type: SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS,
        severity: SECURITY_SEVERITY.HIGH,
        userId: 'user-123',
        ipAddress: '192.168.1.4',
        details: { reason: 'Access denied' }
      };

      const { SecurityEventDB } = require('../../app/lib/permission-db');
      SecurityEventDB.create = jest.fn().mockResolvedValue('event-789');

      await service.logSecurityEvent(eventData);

      // Should create a multiple IP access event
      expect(SecurityEventDB.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SECURITY_EVENT_TYPES.MULTIPLE_IP_ACCESS,
          severity: SECURITY_SEVERITY.HIGH
        })
      );
    });

    it('should detect coordinated attacks', async () => {
      // Mock similar events from multiple IPs
      mockPrisma.securityEvent.findMany = jest.fn().mockResolvedValue([
        { ipAddress: '192.168.1.1' },
        { ipAddress: '192.168.1.2' },
        { ipAddress: '192.168.1.3' },
        { ipAddress: '192.168.1.4' },
        { ipAddress: '192.168.1.5' }
      ]);

      const eventData = {
        type: SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS,
        severity: SECURITY_SEVERITY.HIGH,
        ipAddress: '192.168.1.6',
        details: { reason: 'Access denied' }
      };

      const { SecurityEventDB } = require('../../app/lib/permission-db');
      SecurityEventDB.create = jest.fn().mockResolvedValue('event-coordinated');

      await service.logSecurityEvent(eventData);

      // Should create a coordinated attack event
      expect(SecurityEventDB.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
          severity: SECURITY_SEVERITY.HIGH,
          details: expect.objectContaining({
            reason: 'Coordinated attack detected'
          })
        })
      );
    });
  });

  describe('cleanup and memory management', () => {
    it('should cleanup expired rate limit data', () => {
      // Access private method for testing
      const cleanupMethod = (service as any).cleanupExpiredData;
      
      // Add some expired data to rate limit cache
      const rateLimitCache = (service as any).rateLimitCache;
      rateLimitCache.set('expired-key', {
        count: 5,
        resetTime: Date.now() - 1000 // Expired 1 second ago
      });
      rateLimitCache.set('valid-key', {
        count: 3,
        resetTime: Date.now() + 60000 // Expires in 1 minute
      });

      expect(rateLimitCache.size).toBe(2);
      
      cleanupMethod.call(service);
      
      expect(rateLimitCache.size).toBe(1);
      expect(rateLimitCache.has('valid-key')).toBe(true);
      expect(rateLimitCache.has('expired-key')).toBe(false);
    });

    it('should cleanup resources when destroyed', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      service.destroy();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect((service as any).blockedIPs.size).toBe(0);
      expect((service as any).rateLimitCache.size).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { SecurityEventDB } = require('../../app/lib/permission-db');
      SecurityEventDB.create = jest.fn().mockRejectedValue(new Error('Database error'));

      const eventData = {
        type: SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS,
        severity: SECURITY_SEVERITY.HIGH,
        details: { reason: 'Test error' }
      };

      await expect(service.logSecurityEvent(eventData)).rejects.toThrow('Database error');
    });

    it('should handle audit service errors gracefully', async () => {
      mockAuditService.logSecurity = jest.fn().mockRejectedValue(new Error('Audit error'));

      const eventData = {
        type: SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS,
        severity: SECURITY_SEVERITY.HIGH,
        userId: 'user-123',
        details: { reason: 'Test error' }
      };

      // Should still complete despite audit error
      const eventId = await service.logSecurityEvent(eventData);
      expect(eventId).toBe('event-123');
    });
  });
});