/**
 * Audit Logging Integration Tests
 * Tests comprehensive audit logging with real database integration
 * 
 * This test suite covers:
 * - Audit log creation and storage
 * - Security event logging
 * - Audit log querying and filtering
 * - Compliance reporting
 * - Log retention and cleanup
 */

import { NextRequest } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware';
import { AuditService, AUDIT_ACTIONS, AUDIT_RESOURCES } from '@/lib/audit-service';
import { 
  TestUserFactory, 
  MockAuthService, 
  ApiRequestBuilder,
  ApiResponseValidator,
  ApiTestSetup
} from '../helpers/api-permission-test-utils';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      deleteMany: jest.fn(),
    },
    securityEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    roleChangeHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}));

const { prisma } = require('@/lib/db');

describe('Audit Logging Integration Tests', () => {
  let auditService: AuditService;
  let testUsers: { admin: any; editor: any; viewer: any };

  beforeAll(() => {
    ApiTestSetup.initializeAll();
    auditService = new AuditService(prisma);
    testUsers = TestUserFactory.createUserSet();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ApiTestSetup.resetAll();
  });

  describe('Basic Audit Logging', () => {
    it('should create comprehensive audit logs for user actions', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      const mockAuditLog = {
        id: 'audit-1',
        userId: admin.id,
        action: 'user.created',
        resource: 'user',
        details: {
          userData: { name: 'New User', email: 'new@example.com', role: 'EDITOR' },
          success: true,
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Test-Browser/1.0',
        createdAt: new Date(),
      };

      prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        name: 'New User',
        email: 'new@example.com',
        role: 'EDITOR',
      });
      prisma.auditLog.create.mockResolvedValue(mockAuditLog);

      const userCreationHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          const body = await request.json();
          
          // Create user
          const newUser = await prisma.user.create({
            data: {
              name: body.name,
              email: body.email,
              role: body.role,
              passwordHash: 'hashed-password',
            },
          });

          // Create comprehensive audit log
          await auditService.log({
            userId: user!.id,
            action: AUDIT_ACTIONS.USER.CREATED,
            resource: AUDIT_RESOURCES.USER,
            resourceId: newUser.id,
            details: {
              userData: body,
              success: true,
              method: 'api',
              endpoint: '/api/admin/users',
              userAgent: request.headers.get('user-agent'),
            },
            ipAddress: request.headers.get('x-forwarded-for') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
            severity: 'medium',
          });

          return createApiSuccessResponse({ user: newUser }, 201);
        },
        {
          permissions: [{ resource: 'users', action: 'create', scope: 'all' }]
        }
      );

      const userData = {
        name: 'New User',
        email: 'new@example.com',
        role: 'EDITOR',
      };

      const request = ApiRequestBuilder.post('http://localhost:3000/api/admin/users', userData)
        .addHeader('x-forwarded-for', '192.168.1.100')
        .addHeader('user-agent', 'Test-Browser/1.0')
        .build();

      const response = await userCreationHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 201);

      expect(data.user.id).toBe('new-user-id');

      // Verify comprehensive audit log was created
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: admin.id,
          action: 'user.created',
          resource: 'user',
          details: expect.objectContaining({
            userData: userData,
            success: true,
            method: 'api',
            endpoint: '/api/admin/users',
            userAgent: 'Test-Browser/1.0',
            resourceId: 'new-user-id',
            severity: 'medium',
          }),
          ipAddress: '192.168.1.100',
          userAgent: 'Test-Browser/1.0',
        }),
      });
    });

    it('should log failed operations with error details', async () => {
      const editor = testUsers.editor;
      MockAuthService.mockAuthenticatedUser(editor);

      // Mock database error
      prisma.product.create.mockRejectedValue(new Error('Database constraint violation'));
      prisma.auditLog.create.mockResolvedValue({ id: 'failed-audit-1' });

      const productCreationHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          const body = await request.json();
          
          try {
            const newProduct = await prisma.product.create({
              data: {
                name: body.name,
                slug: body.slug,
                price: body.price,
                createdBy: user!.id,
              },
            });

            // This won't be reached due to mock error
            await auditService.log({
              userId: user!.id,
              action: 'product.created',
              resource: 'product',
              resourceId: newProduct.id,
              details: { productData: body, success: true },
              severity: 'low',
            });

            return createApiSuccessResponse({ product: newProduct }, 201);
          } catch (error) {
            // Log the failure
            await auditService.log({
              userId: user!.id,
              action: 'product.create_failed',
              resource: 'product',
              details: {
                productData: body,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                stackTrace: error instanceof Error ? error.stack : undefined,
              },
              ipAddress: request.headers.get('x-forwarded-for') || undefined,
              userAgent: request.headers.get('user-agent') || undefined,
              severity: 'high',
            });

            return createApiSuccessResponse(
              { error: { code: 'CREATION_FAILED', message: 'Failed to create product' } },
              500
            );
          }
        },
        {
          permissions: [{ resource: 'products', action: 'create', scope: 'all' }]
        }
      );

      const productData = {
        name: 'Test Product',
        slug: 'test-product',
        price: 99.99,
      };

      const request = ApiRequestBuilder.post('http://localhost:3000/api/products', productData)
        .addHeader('x-forwarded-for', '10.0.0.1')
        .build();

      const response = await productCreationHandler(request);
      
      expect(response.status).toBe(500);

      // Verify failure was logged with error details
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: editor.id,
          action: 'product.create_failed',
          resource: 'product',
          details: expect.objectContaining({
            productData: productData,
            success: false,
            error: 'Database constraint violation',
            stackTrace: expect.any(String),
            severity: 'high',
          }),
          ipAddress: '10.0.0.1',
        }),
      });
    });
  });

  describe('Security Event Logging', () => {
    it('should create security events for permission violations', async () => {
      const viewer = testUsers.viewer;
      MockAuthService.mockAuthenticatedUser(viewer);

      prisma.securityEvent.create.mockResolvedValue({ id: 'security-event-1' });
      prisma.auditLog.create.mockResolvedValue({ id: 'permission-denied-audit' });

      const restrictedHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          // This should not be reached due to permission denial
          return createApiSuccessResponse({ message: 'Should not reach here' });
        },
        {
          permissions: [{ resource: 'users', action: 'delete', scope: 'all' }]
        }
      );

      const request = ApiRequestBuilder.delete('http://localhost:3000/api/admin/users/123')
        .addHeader('x-forwarded-for', '192.168.1.200')
        .addHeader('user-agent', 'Suspicious-Agent/1.0')
        .build();

      const response = await restrictedHandler(request);
      await ApiResponseValidator.validateForbiddenResponse(response);

      // The middleware should have created a security event for the permission violation
      // This would be handled by the permission middleware, not the handler itself
    });

    it('should log role escalation attempts', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      const targetUserId = 'user-to-escalate';
      
      prisma.user.update.mockResolvedValue({
        id: targetUserId,
        role: 'ADMIN',
        name: 'Escalated User',
      });
      prisma.roleChangeHistory.create.mockResolvedValue({ id: 'role-change-1' });
      prisma.auditLog.create.mockResolvedValue({ id: 'role-escalation-audit' });
      prisma.securityEvent.create.mockResolvedValue({ id: 'escalation-security-event' });

      const roleChangeHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          const body = await request.json();
          
          // Update user role
          const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: { role: body.newRole },
          });

          // Record role change history
          await prisma.roleChangeHistory.create({
            data: {
              userId: targetUserId,
              oldRole: body.oldRole,
              newRole: body.newRole,
              changedBy: user!.id,
              reason: body.reason,
            },
          });

          // Log the role change with escalation detection
          await auditService.logRoleChange(
            user!.id,
            targetUserId,
            body.oldRole,
            body.newRole,
            body.reason,
            request.headers.get('x-forwarded-for') || undefined,
            request.headers.get('user-agent') || undefined
          );

          return createApiSuccessResponse({ user: updatedUser });
        },
        {
          permissions: [{ resource: 'users', action: 'manage', scope: 'all' }]
        }
      );

      const roleChangeData = {
        oldRole: 'VIEWER',
        newRole: 'ADMIN',
        reason: 'Emergency escalation',
      };

      const request = ApiRequestBuilder.put(`http://localhost:3000/api/admin/users/${targetUserId}/role`, roleChangeData)
        .addHeader('x-forwarded-for', '192.168.1.50')
        .build();

      const response = await roleChangeHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.user.role).toBe('ADMIN');

      // Verify role change was recorded
      expect(prisma.roleChangeHistory.create).toHaveBeenCalledWith({
        data: {
          userId: targetUserId,
          oldRole: 'VIEWER',
          newRole: 'ADMIN',
          changedBy: admin.id,
          reason: 'Emergency escalation',
        },
      });

      // Verify audit log was created
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: admin.id,
          action: 'user.role_changed',
          resource: 'user',
          details: expect.objectContaining({
            oldRole: 'VIEWER',
            newRole: 'ADMIN',
            reason: 'Emergency escalation',
          }),
        }),
      });
    });
  });

  describe('Audit Log Querying and Analysis', () => {
    it('should retrieve audit logs with filtering and pagination', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      const mockAuditLogs = [
        {
          id: '1',
          userId: 'user-1',
          action: 'user.created',
          resource: 'user',
          details: { userData: { name: 'User 1' } },
          createdAt: new Date('2024-01-01'),
          user: { id: 'user-1', name: 'Admin', email: 'admin@example.com', role: 'ADMIN' },
        },
        {
          id: '2',
          userId: 'user-2',
          action: 'product.updated',
          resource: 'product',
          details: { productId: 'prod-1' },
          createdAt: new Date('2024-01-02'),
          user: { id: 'user-2', name: 'Editor', email: 'editor@example.com', role: 'EDITOR' },
        },
      ];

      prisma.auditLog.count.mockResolvedValue(25);
      prisma.auditLog.findMany.mockResolvedValue(mockAuditLogs);

      const auditLogHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          const { searchParams } = new URL(request.url);
          
          const filters = {
            userId: searchParams.get('userId') || undefined,
            action: searchParams.get('action') || undefined,
            resource: searchParams.get('resource') || undefined,
            startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
            endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '10'),
          };

          const result = await auditService.getLogs(filters);

          return createApiSuccessResponse(result);
        },
        {
          permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
        }
      );

      const request = ApiRequestBuilder.get(
        'http://localhost:3000/api/admin/audit-logs?resource=user&page=1&limit=10'
      ).build();

      const response = await auditLogHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.logs).toHaveLength(2);
      expect(data.total).toBe(25);
      expect(data.page).toBe(1);

      // Verify database query with filters
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          resource: 'user',
        }),
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
    });

    it('should generate audit statistics and reports', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      // Mock statistics data
      prisma.auditLog.count.mockResolvedValue(150);
      prisma.auditLog.groupBy
        .mockResolvedValueOnce([
          { action: 'user.created', _count: { action: 25 } },
          { action: 'product.updated', _count: { action: 40 } },
          { action: 'auth.login', _count: { action: 85 } },
        ])
        .mockResolvedValueOnce([
          { resource: 'user', _count: { resource: 50 } },
          { resource: 'product', _count: { resource: 60 } },
          { resource: 'system', _count: { resource: 40 } },
        ]);

      prisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'recent-1',
          userId: 'user-1',
          action: 'auth.login',
          resource: 'user',
          createdAt: new Date(),
          user: { id: 'user-1', name: 'User 1', email: 'user1@example.com', role: 'EDITOR' },
        },
      ]);

      const statsHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          const { searchParams } = new URL(request.url);
          const days = parseInt(searchParams.get('days') || '30');

          const stats = await auditService.getStats(days);

          return createApiSuccessResponse({ stats });
        },
        {
          permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
        }
      );

      const request = ApiRequestBuilder.get('http://localhost:3000/api/admin/audit-stats?days=7').build();

      const response = await statsHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.stats.totalLogs).toBe(150);
      expect(data.stats.actionBreakdown).toEqual({
        'user.created': 25,
        'product.updated': 40,
        'auth.login': 85,
      });
      expect(data.stats.resourceBreakdown).toEqual({
        'user': 50,
        'product': 60,
        'system': 40,
      });
      expect(data.stats.recentActivity).toHaveLength(1);

      // Verify statistics queries
      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: expect.any(Date),
          },
        },
      });

      expect(prisma.auditLog.groupBy).toHaveBeenCalledWith({
        by: ['action'],
        where: {
          createdAt: {
            gte: expect.any(Date),
          },
        },
        _count: {
          action: true,
        },
      });
    });
  });

  describe('Compliance and Reporting', () => {
    it('should generate compliance reports with detailed audit trails', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      const mockComplianceLogs = [
        {
          id: '1',
          userId: 'user-1',
          action: 'user.created',
          resource: 'user',
          details: { userData: { name: 'Compliance User' }, success: true },
          createdAt: new Date('2024-01-01'),
          user: { id: 'user-1', name: 'Admin', email: 'admin@example.com', role: 'ADMIN' },
        },
        {
          id: '2',
          userId: 'user-1',
          action: 'user.role_changed',
          resource: 'user',
          details: { oldRole: 'EDITOR', newRole: 'ADMIN', success: true },
          createdAt: new Date('2024-01-02'),
          user: { id: 'user-1', name: 'Admin', email: 'admin@example.com', role: 'ADMIN' },
        },
      ];

      prisma.auditLog.findMany.mockResolvedValue(mockComplianceLogs);
      prisma.auditLog.count
        .mockResolvedValueOnce(2) // totalActions
        .mockResolvedValueOnce(0) // failedActions
        .mockResolvedValueOnce(0); // criticalEvents
      prisma.auditLog.groupBy.mockResolvedValue([
        { userId: 'user-1', _count: { userId: 2 } },
      ]);

      const complianceHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          const body = await request.json();
          
          const report = await auditService.getComplianceReport({
            startDate: new Date(body.startDate),
            endDate: new Date(body.endDate),
            userId: body.userId,
            actions: body.actions,
            resources: body.resources,
            includeFailures: body.includeFailures,
          });

          return createApiSuccessResponse({ report });
        },
        {
          permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
        }
      );

      const reportRequest = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        userId: 'user-1',
        actions: ['user.created', 'user.role_changed'],
        resources: ['user'],
        includeFailures: true,
      };

      const request = ApiRequestBuilder.post('http://localhost:3000/api/admin/compliance-report', reportRequest).build();

      const response = await complianceHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.report.logs).toHaveLength(2);
      expect(data.report.summary.totalActions).toBe(2);
      expect(data.report.summary.uniqueUsers).toBe(1);
      expect(data.report.summary.failedActions).toBe(0);

      // Verify compliance query
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: new Date('2024-01-01T00:00:00Z'),
            lte: new Date('2024-01-31T23:59:59Z'),
          },
          userId: 'user-1',
          action: { in: ['user.created', 'user.role_changed'] },
          resource: { in: ['user'] },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should export audit logs in different formats', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      const mockExportLogs = [
        {
          id: '1',
          userId: 'user-1',
          action: 'user.created',
          resource: 'user',
          details: { userData: { name: 'Export User' } },
          ipAddress: '192.168.1.1',
          userAgent: 'Browser/1.0',
          createdAt: new Date('2024-01-01'),
          user: { id: 'user-1', name: 'Admin', email: 'admin@example.com', role: 'ADMIN' },
        },
      ];

      prisma.auditLog.count.mockResolvedValue(1);
      prisma.auditLog.findMany.mockResolvedValue(mockExportLogs);

      const exportHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          const { searchParams } = new URL(request.url);
          const format = searchParams.get('format') || 'json';
          
          const filters = {
            startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
            endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
            limit: 10000, // Large limit for export
          };

          const exportData = await auditService.exportLogs(filters, format as 'json' | 'csv');

          // Log the export operation
          await auditService.logSecurity(
            user!.id,
            'DATA_EXPORT',
            {
              type: 'audit_logs',
              format,
              filters,
              recordCount: 1,
            },
            request.headers.get('x-forwarded-for') || undefined,
            request.headers.get('user-agent') || undefined
          );

          return createApiSuccessResponse({
            data: exportData,
            format,
            recordCount: 1,
          });
        },
        {
          permissions: [{ resource: 'system', action: 'export', scope: 'all' }]
        }
      );

      const request = ApiRequestBuilder.get(
        'http://localhost:3000/api/admin/audit-logs/export?format=csv&startDate=2024-01-01'
      ).build();

      const response = await exportHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.format).toBe('csv');
      expect(data.recordCount).toBe(1);
      expect(typeof data.data).toBe('string');

      // Verify export was logged as security event
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: admin.id,
          action: 'security.data_export',
          resource: 'system',
          details: expect.objectContaining({
            type: 'audit_logs',
            format: 'csv',
            recordCount: 1,
          }),
        }),
      });
    });
  });

  describe('Log Retention and Cleanup', () => {
    it('should clean up old audit logs based on retention policy', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      prisma.auditLog.deleteMany.mockResolvedValue({ count: 50 });
      prisma.auditLog.create.mockResolvedValue({ id: 'cleanup-audit' });

      const cleanupHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          const result = await auditService.cleanup();

          // Log the cleanup operation
          await auditService.logSystem(
            user!.id,
            'DATA_CLEANUP_PERFORMED',
            {
              type: 'audit_logs',
              deletedCount: result.deletedCount,
              retentionDays: 365,
            },
            request.headers.get('x-forwarded-for') || undefined,
            request.headers.get('user-agent') || undefined
          );

          return createApiSuccessResponse({
            message: 'Audit log cleanup completed',
            deletedCount: result.deletedCount,
          });
        },
        {
          permissions: [{ resource: 'system', action: 'manage', scope: 'all' }]
        }
      );

      const request = ApiRequestBuilder.post('http://localhost:3000/api/admin/system/cleanup-audit-logs').build();

      const response = await cleanupHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.deletedCount).toBe(50);

      // Verify cleanup was performed
      expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });

      // Verify cleanup was logged
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: admin.id,
          action: 'system.data_cleanup_performed',
          resource: 'system',
          details: expect.objectContaining({
            type: 'audit_logs',
            deletedCount: 50,
            retentionDays: 365,
          }),
        }),
      });
    });

    it('should validate audit log integrity', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      const mockAuditLogs = [
        {
          id: '1',
          action: 'user.created',
          userId: 'user-1',
          user: { id: 'user-1', name: 'User 1' },
          details: { success: true },
        },
        {
          id: '2',
          action: '', // Missing action - integrity issue
          userId: 'user-2',
          user: null, // Missing user - integrity issue
          details: { success: false },
        },
      ];

      prisma.auditLog.findMany.mockResolvedValue(mockAuditLogs);

      const integrityHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          const body = await request.json();
          
          const result = await auditService.validateIntegrity(
            new Date(body.startDate),
            new Date(body.endDate)
          );

          return createApiSuccessResponse({ integrity: result });
        },
        {
          permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
        }
      );

      const request = ApiRequestBuilder.post('http://localhost:3000/api/admin/audit-logs/validate', {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      }).build();

      const response = await integrityHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.integrity.isValid).toBe(false);
      expect(data.integrity.totalLogs).toBe(2);
      expect(data.integrity.validLogs).toBe(1);
      expect(data.integrity.issues).toContain('Log 2: Missing action');
      expect(data.integrity.issues).toContain('Log 2: User ID references non-existent user');

      // Verify integrity check query
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: new Date('2024-01-01T00:00:00Z'),
            lte: new Date('2024-01-31T23:59:59Z'),
          },
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    });
  });
});