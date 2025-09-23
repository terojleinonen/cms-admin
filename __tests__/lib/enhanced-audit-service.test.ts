/**
 * Tests for Enhanced Audit Service
 */

import { UserRole } from '@prisma/client';
import { AuditService, AUDIT_ACTIONS } from '../../app/lib/audit-service';

// Mock Prisma Client
const mockPrisma = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    deleteMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $disconnect: jest.fn(),
} as any;

// Mock permission-db module
jest.mock('../../app/lib/permission-db', () => ({
  SecurityEventDB: {
    create: jest.fn().mockResolvedValue({ id: 'security-event-123' }),
  },
  RoleChangeHistoryDB: {
    recordChange: jest.fn().mockResolvedValue('role-change-123'),
  },
}));

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

let auditService: AuditService;

describe('Enhanced Audit Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auditService = new AuditService(mockPrisma);
  });

  describe('log', () => {
    it('should log basic user action', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' });

      await auditService.log({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'CREATE_PRODUCT',
        resource: 'products',
        resourceId: 'product-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        details: { productName: 'Test Product' }
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: '550e8400-e29b-41d4-a716-446655440000',
          action: 'CREATE_PRODUCT',
          resource: 'products',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }),
      });
    });

    it('should handle audit logging errors gracefully', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('Database error'));

      // Should throw since the service throws errors
      await expect(auditService.log({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'TEST_ACTION',
        resource: 'test'
      })).rejects.toThrow();
    });
  });

  describe('logPermissionCheck', () => {
    it('should log successful permission check', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' });

      await auditService.logPermissionCheck(
        '550e8400-e29b-41d4-a716-446655440000',
        { resource: 'products', action: 'read', scope: 'all' },
        true,
        undefined,
        '192.168.1.1',
        'Mozilla/5.0',
        { route: '/admin/products' }
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: '550e8400-e29b-41d4-a716-446655440000',
          action: AUDIT_ACTIONS.SECURITY.PERMISSION_CHECK_GRANTED,
          resource: 'products'
        })
      });
    });

    it('should log failed permission check and create security event', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' });

      await auditService.logPermissionCheck(
        '550e8400-e29b-41d4-a716-446655440000',
        { resource: 'users', action: 'delete', scope: 'all' },
        false,
        'Insufficient permissions',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      // Should log audit entry for permission check
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AUDIT_ACTIONS.SECURITY.PERMISSION_CHECK_DENIED
        })
      });

      // Should also log security event
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AUDIT_ACTIONS.SECURITY.PERMISSION_DENIED
        })
      });
    });
  });

  describe('logSecurity', () => {
    it('should log security event', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' });

      await auditService.logSecurity(
        '550e8400-e29b-41d4-a716-446655440000',
        'SUSPICIOUS_ACTIVITY',
        { attemptedRoute: '/admin/users' },
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: '550e8400-e29b-41d4-a716-446655440000',
          action: AUDIT_ACTIONS.SECURITY.SUSPICIOUS_ACTIVITY,
          resource: 'system'
        })
      });
    });
  });

  describe('logRoleChange', () => {
    it('should log role change without escalation', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' });

      await auditService.logRoleChange(
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440000',
        'EDITOR',
        'VIEWER',
        'Role downgrade',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      // Should log audit entry
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: '550e8400-e29b-41d4-a716-446655440001',
          action: AUDIT_ACTIONS.USER.ROLE_CHANGED,
          resource: 'user'
        })
      });
    });

    it('should log role escalation as security event', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' });

      await auditService.logRoleChange(
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440000',
        'VIEWER',
        'ADMIN',
        'Promotion to admin',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      // Should log role change
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AUDIT_ACTIONS.USER.ROLE_CHANGED
        })
      });

      // Should also log security event for escalation
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AUDIT_ACTIONS.SECURITY.SUSPICIOUS_ACTIVITY
        })
      });
    });
  });

  describe('logAuth', () => {
    it('should log successful login', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' });

      await auditService.logAuth(
        '550e8400-e29b-41d4-a716-446655440000',
        'LOGIN',
        { method: 'password' },
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: '550e8400-e29b-41d4-a716-446655440000',
          action: AUDIT_ACTIONS.AUTH.LOGIN,
          resource: 'user'
        })
      });
    });

    it('should log failed login with medium severity', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' });

      await auditService.logAuth(
        '550e8400-e29b-41d4-a716-446655440000',
        'LOGIN_FAILED',
        { errorMessage: 'Invalid credentials' },
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AUDIT_ACTIONS.AUTH.LOGIN_FAILED
        })
      });
    });
  });

  describe('logResourceAccess', () => {
    it('should log successful resource access', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' });

      await auditService.logResourceAccess(
        '550e8400-e29b-41d4-a716-446655440000',
        'read',
        'products',
        'product-456',
        true,
        undefined,
        '192.168.1.1'
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'resource.read',
          resource: 'products'
        })
      });
    });

    it('should log unauthorized access and create security event', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' });

      await auditService.logResourceAccess(
        '550e8400-e29b-41d4-a716-446655440000',
        'delete',
        'users',
        '550e8400-e29b-41d4-a716-446655440002',
        false,
        'Access denied',
        '192.168.1.1'
      );

      // Should log resource access
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'resource.delete'
        })
      });

      // Should also log security event
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AUDIT_ACTIONS.SECURITY.SUSPICIOUS_ACTIVITY
        })
      });
    });
  });

  describe('getStats', () => {
    it('should return audit statistics', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(100);
      mockPrisma.auditLog.groupBy
        .mockResolvedValueOnce([
          { action: 'auth.login', _count: { action: 50 } }
        ])
        .mockResolvedValueOnce([
          { resource: 'user', _count: { resource: 80 } }
        ]);
      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const stats = await auditService.getStats(30);

      expect(stats).toEqual({
        totalLogs: 100,
        actionBreakdown: { 'auth.login': 50 },
        resourceBreakdown: { 'user': 80 },
        severityBreakdown: {},
        recentActivity: []
      });
    });
  });

  describe('getSecurityIncidents', () => {
    it('should return security incident summary', async () => {
      mockPrisma.auditLog.count
        .mockResolvedValueOnce(10) // totalIncidents
        .mockResolvedValueOnce(2); // criticalIncidents

      mockPrisma.auditLog.groupBy
        .mockResolvedValueOnce([
          { action: 'security.suspicious_activity', _count: { action: 5 } }
        ])
        .mockResolvedValueOnce([
          { userId: 'user-1', _count: { userId: 3 } }
        ]);

      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const incidents = await auditService.getSecurityIncidents(7);

      expect(incidents.totalIncidents).toBe(10);
      expect(incidents.criticalIncidents).toBe(2);
      expect(incidents.topThreats).toEqual([
        { type: 'suspicious_activity', count: 5 }
      ]);
    });
  });

  describe('cleanup', () => {
    it('should delete old audit logs', async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 50 });

      const result = await auditService.cleanup();

      expect(result.deletedCount).toBe(50);
    });
  });
});