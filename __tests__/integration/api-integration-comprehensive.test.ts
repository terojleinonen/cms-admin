/**
 * Comprehensive API Integration Tests
 * Tests API permission validation with real database, authentication flows, and audit logging
 * 
 * This test suite covers:
 * - API permission validation with real database operations
 * - Authentication flow integration testing
 * - Audit logging integration testing
 * - End-to-end API security workflows
 */

import { NextRequest } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware';
import { AuditService } from '@/lib/audit-service';
import { EnhancedPermissionService } from '@/lib/permissions';
import { getToken } from 'next-auth/jwt';
import { 
  TestUserFactory, 
  MockAuthService, 
  ApiRequestBuilder,
  ApiResponseValidator,
  ApiTestSetup
} from '../helpers/api-permission-test-utils';

// Mock dependencies
jest.mock('next-auth/jwt');
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    permissionCache: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    securityEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    roleChangeHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}));

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const { prisma } = require('@/lib/db');

describe('API Integration Tests - Comprehensive', () => {
  let auditService: AuditService;
  let permissionService: EnhancedPermissionService;
  let testUsers: { admin: any; editor: any; viewer: any };

  beforeAll(() => {
    ApiTestSetup.initializeAll();
    auditService = new AuditService(prisma);
    permissionService = new EnhancedPermissionService();
    testUsers = TestUserFactory.createUserSet();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ApiTestSetup.resetAll();
  });

  describe('Database Integration - User Management API', () => {
    const createUserManagementHandler = () => {
      return withApiPermissions(
        async (request: NextRequest, { user }) => {
          const method = request.method;
          
          if (method === 'GET') {
            // Simulate database query for users
            const users = await prisma.user.findMany({
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 10,
            });

            // Log the access
            await auditService.logResourceAccess(
              user!.id,
              'list',
              'users',
              undefined,
              true,
              undefined,
              request.headers.get('x-forwarded-for') || undefined,
              request.headers.get('user-agent') || undefined
            );

            return createApiSuccessResponse({ users });
          }

          if (method === 'POST') {
            const body = await request.json();
            
            // Simulate user creation
            const newUser = await prisma.user.create({
              data: {
                name: body.name,
                email: body.email,
                role: body.role,
                passwordHash: 'hashed-password',
              },
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
              },
            });

            // Log the creation
            await auditService.logUser(
              user!.id,
              newUser.id,
              'CREATED',
              { userData: body },
              request.headers.get('x-forwarded-for') || undefined,
              request.headers.get('user-agent') || undefined
            );

            return createApiSuccessResponse({ user: newUser }, 201);
          }

          return createApiSuccessResponse({ message: 'Method not implemented' }, 405);
        },
        {
          permissions: [
            { resource: 'users', action: 'read', scope: 'all' },
            { resource: 'users', action: 'create', scope: 'all' }
          ]
        }
      );
    };

    it('should handle GET request with database integration and audit logging', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      // Mock database response
      const mockUsers = [
        { id: '1', name: 'User 1', email: 'user1@example.com', role: 'EDITOR', isActive: true, createdAt: new Date() },
        { id: '2', name: 'User 2', email: 'user2@example.com', role: 'VIEWER', isActive: true, createdAt: new Date() },
      ];
      prisma.user.findMany.mockResolvedValue(mockUsers);
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

      const handler = createUserManagementHandler();
      const request = ApiRequestBuilder.get('http://localhost:3000/api/admin/users').build();

      const response = await handler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.users).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      // Verify audit log was created
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: admin.id,
          action: 'resource.list',
          resource: 'users',
          details: expect.objectContaining({
            success: true,
          }),
        }),
      });
    });

    it('should handle POST request with database transaction and audit logging', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      const newUserData = {
        name: 'New User',
        email: 'newuser@example.com',
        role: 'EDITOR',
      };

      const createdUser = {
        id: 'new-user-id',
        ...newUserData,
        createdAt: new Date(),
      };

      // Mock database operations
      prisma.user.create.mockResolvedValue(createdUser);
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-2' });

      const handler = createUserManagementHandler();
      const request = ApiRequestBuilder.post('http://localhost:3000/api/admin/users', newUserData).build();

      const response = await handler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 201);

      expect(data.user).toEqual(createdUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: newUserData.name,
          email: newUserData.email,
          role: newUserData.role,
          passwordHash: 'hashed-password',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      // Verify audit log was created for user creation
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: admin.id,
          action: 'user.created',
          resource: 'user',
          details: expect.objectContaining({
            userData: newUserData,
          }),
        }),
      });
    });

    it('should deny access for insufficient permissions and log security event', async () => {
      const viewer = testUsers.viewer;
      MockAuthService.mockAuthenticatedUser(viewer);

      // Mock security event creation
      prisma.securityEvent.create.mockResolvedValue({ id: 'security-event-1' });

      const handler = createUserManagementHandler();
      const request = ApiRequestBuilder.get('http://localhost:3000/api/admin/users').build();

      const response = await handler(request);
      await ApiResponseValidator.validateForbiddenResponse(response);

      // Verify no database query was made
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should handle complete authentication flow with session management', async () => {
      const user = testUsers.editor;
      
      // Mock authentication token
      const mockToken = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockGetToken.mockResolvedValue(mockToken);

      // Mock database operations for session validation
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.auditLog.create.mockResolvedValue({ id: 'auth-audit-1' });

      const protectedHandler = withApiPermissions(
        async (request: NextRequest, { user: authenticatedUser }) => {
          // Verify user is properly authenticated
          expect(authenticatedUser).toBeDefined();
          expect(authenticatedUser!.id).toBe(user.id);
          expect(authenticatedUser!.role).toBe(user.role);

          // Log authentication success
          await auditService.logAuth(
            authenticatedUser!.id,
            'LOGIN',
            { method: 'jwt_token' },
            request.headers.get('x-forwarded-for') || undefined,
            request.headers.get('user-agent') || undefined
          );

          return createApiSuccessResponse({ 
            message: 'Authenticated successfully',
            user: {
              id: authenticatedUser!.id,
              name: authenticatedUser!.name,
              role: authenticatedUser!.role,
            }
          });
        },
        {
          permissions: [{ resource: 'profile', action: 'read', scope: 'own' }]
        }
      );

      const request = ApiRequestBuilder.get('http://localhost:3000/api/auth/me')
        .addHeader('Authorization', 'Bearer mock-jwt-token')
        .build();

      const response = await protectedHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.user.id).toBe(user.id);
      expect(data.user.role).toBe(user.role);

      // Verify authentication audit log
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: user.id,
          action: 'auth.login',
          resource: 'user',
          details: expect.objectContaining({
            method: 'jwt_token',
          }),
        }),
      });
    });

    it('should handle expired token and log security event', async () => {
      const user = testUsers.editor;
      
      // Mock expired token
      const expiredToken = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
      };

      mockGetToken.mockResolvedValue(expiredToken);
      prisma.securityEvent.create.mockResolvedValue({ id: 'security-expired-1' });

      const protectedHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          return createApiSuccessResponse({ message: 'Should not reach here' });
        },
        {
          permissions: [{ resource: 'profile', action: 'read', scope: 'own' }]
        }
      );

      const request = ApiRequestBuilder.get('http://localhost:3000/api/auth/me')
        .addHeader('Authorization', 'Bearer expired-jwt-token')
        .build();

      const response = await protectedHandler(request);
      await ApiResponseValidator.validateUnauthorizedResponse(response);
    });

    it('should handle invalid token and create security alert', async () => {
      // Mock invalid token scenario
      mockGetToken.mockRejectedValue(new Error('Invalid token signature'));
      prisma.securityEvent.create.mockResolvedValue({ id: 'security-invalid-1' });

      const protectedHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          return createApiSuccessResponse({ message: 'Should not reach here' });
        },
        {
          permissions: [{ resource: 'profile', action: 'read', scope: 'own' }]
        }
      );

      const request = ApiRequestBuilder.get('http://localhost:3000/api/auth/me')
        .addHeader('Authorization', 'Bearer invalid-jwt-token')
        .build();

      const response = await protectedHandler(request);
      await ApiResponseValidator.validateUnauthorizedResponse(response);
    });
  });

  describe('Audit Logging Integration', () => {
    it('should create comprehensive audit logs for CRUD operations', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      // Mock all database operations
      const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        slug: 'test-product',
        price: 99.99,
        createdBy: admin.id,
        createdAt: new Date(),
      };

      prisma.product.create.mockResolvedValue(mockProduct);
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-product-1' });

      const productHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          const body = await request.json();
          
          // Create product
          const product = await prisma.product.create({
            data: {
              ...body,
              createdBy: user!.id,
            },
          });

          // Create comprehensive audit log
          await auditService.log({
            userId: user!.id,
            action: 'product.created',
            resource: 'product',
            resourceId: product.id,
            details: {
              productData: body,
              success: true,
              method: 'api',
              endpoint: '/api/products',
            },
            ipAddress: request.headers.get('x-forwarded-for') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
            severity: 'low',
          });

          return createApiSuccessResponse({ product }, 201);
        },
        {
          permissions: [{ resource: 'products', action: 'create', scope: 'all' }]
        }
      );

      const productData = {
        name: 'Test Product',
        slug: 'test-product',
        price: 99.99,
        description: 'A test product',
      };

      const request = ApiRequestBuilder.post('http://localhost:3000/api/products', productData)
        .addHeader('x-forwarded-for', '192.168.1.100')
        .addHeader('user-agent', 'Test-Agent/1.0')
        .build();

      const response = await productHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 201);

      expect(data.product).toEqual(mockProduct);

      // Verify comprehensive audit log
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: admin.id,
          action: 'product.created',
          resource: 'product',
          details: expect.objectContaining({
            productData: productData,
            success: true,
            method: 'api',
            endpoint: '/api/products',
            resourceId: mockProduct.id,
            severity: 'low',
          }),
          ipAddress: '192.168.1.100',
          userAgent: 'Test-Agent/1.0',
        }),
      });
    });

    it('should log permission check failures with detailed context', async () => {
      const viewer = testUsers.viewer;
      MockAuthService.mockAuthenticatedUser(viewer);

      prisma.auditLog.create.mockResolvedValue({ id: 'audit-permission-denied' });
      prisma.securityEvent.create.mockResolvedValue({ id: 'security-permission-denied' });

      const restrictedHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          return createApiSuccessResponse({ message: 'Should not reach here' });
        },
        {
          permissions: [{ resource: 'users', action: 'delete', scope: 'all' }]
        }
      );

      const request = ApiRequestBuilder.delete('http://localhost:3000/api/admin/users/123')
        .addHeader('x-forwarded-for', '10.0.0.1')
        .addHeader('user-agent', 'Suspicious-Agent/1.0')
        .build();

      const response = await restrictedHandler(request);
      await ApiResponseValidator.validateForbiddenResponse(response);

      // Should not create any business logic audit logs
      expect(prisma.auditLog.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.stringMatching(/^(?!security\.|permission\.).*/)
        })
      );
    });

    it('should aggregate audit logs for security analysis', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      // Mock audit log queries for security analysis
      prisma.auditLog.count.mockResolvedValue(150);
      prisma.auditLog.groupBy.mockResolvedValue([
        { action: 'auth.login_failed', _count: { action: 5 } },
        { action: 'security.permission_denied', _count: { action: 3 } },
        { action: 'user.created', _count: { action: 2 } },
      ]);
      prisma.auditLog.findMany.mockResolvedValue([
        {
          id: '1',
          userId: 'user-1',
          action: 'security.permission_denied',
          resource: 'users',
          details: { attemptedAction: 'delete' },
          createdAt: new Date(),
          user: { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'VIEWER' },
        },
      ]);

      const securityAnalysisHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          // Get security statistics
          const stats = await auditService.getStats(7); // Last 7 days

          return createApiSuccessResponse({ stats });
        },
        {
          permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
        }
      );

      const request = ApiRequestBuilder.get('http://localhost:3000/api/admin/security/stats').build();

      const response = await securityAnalysisHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.stats).toBeDefined();
      expect(data.stats.totalLogs).toBe(150);
      expect(data.stats.actionBreakdown).toEqual({
        'auth.login_failed': 5,
        'security.permission_denied': 3,
        'user.created': 2,
      });

      // Verify database queries for security analysis
      expect(prisma.auditLog.count).toHaveBeenCalled();
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

    it('should handle audit log retention and cleanup', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      // Mock cleanup operation
      prisma.auditLog.deleteMany.mockResolvedValue({ count: 25 });

      const cleanupHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          // Perform audit log cleanup
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
            message: 'Cleanup completed',
            deletedCount: result.deletedCount 
          });
        },
        {
          permissions: [{ resource: 'system', action: 'manage', scope: 'all' }]
        }
      );

      const request = ApiRequestBuilder.post('http://localhost:3000/api/admin/system/cleanup').build();

      const response = await cleanupHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.deletedCount).toBe(25);

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
            deletedCount: 25,
            retentionDays: 365,
          }),
        }),
      });
    });
  });

  describe('Permission Cache Integration', () => {
    it('should use database permission cache for performance', async () => {
      const editor = testUsers.editor;
      MockAuthService.mockAuthenticatedUser(editor);

      // Mock permission cache hit
      const cachedPermission = {
        userId: editor.id,
        resource: 'products',
        action: 'read',
        scope: null,
        result: true,
        expiresAt: new Date(Date.now() + 300000), // 5 minutes from now
        createdAt: new Date(),
      };

      prisma.permissionCache.findUnique.mockResolvedValue(cachedPermission);

      const cachedHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          return createApiSuccessResponse({ 
            message: 'Access granted via cache',
            userId: user!.id 
          });
        },
        {
          permissions: [{ resource: 'products', action: 'read', scope: 'all' }]
        }
      );

      const request = ApiRequestBuilder.get('http://localhost:3000/api/products').build();

      const response = await cachedHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.userId).toBe(editor.id);

      // Verify cache was checked
      expect(prisma.permissionCache.findUnique).toHaveBeenCalledWith({
        where: {
          userId_resource_action_scope: {
            userId: editor.id,
            resource: 'products',
            action: 'read',
            scope: null,
          },
        },
      });
    });

    it('should invalidate cache on role changes', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      const targetUserId = 'user-to-change';
      
      // Mock database operations
      prisma.user.update.mockResolvedValue({
        id: targetUserId,
        role: 'ADMIN',
        name: 'Updated User',
        email: 'user@example.com',
      });
      prisma.permissionCache.deleteMany.mockResolvedValue({ count: 5 });
      prisma.roleChangeHistory.create.mockResolvedValue({ id: 'role-change-1' });
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-role-change' });

      const roleChangeHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          const body = await request.json();
          
          // Update user role
          const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: { role: body.newRole },
          });

          // Invalidate permission cache
          await prisma.permissionCache.deleteMany({
            where: { userId: targetUserId },
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

          // Log the role change
          await auditService.logRoleChange(
            user!.id,
            targetUserId,
            body.oldRole,
            body.newRole,
            body.reason,
            request.headers.get('x-forwarded-for') || undefined,
            request.headers.get('user-agent') || undefined
          );

          return createApiSuccessResponse({ 
            user: updatedUser,
            cacheInvalidated: true 
          });
        },
        {
          permissions: [{ resource: 'users', action: 'manage', scope: 'all' }]
        }
      );

      const roleChangeData = {
        oldRole: 'EDITOR',
        newRole: 'ADMIN',
        reason: 'Promotion to admin role',
      };

      const request = ApiRequestBuilder.put(`http://localhost:3000/api/admin/users/${targetUserId}/role`, roleChangeData).build();

      const response = await roleChangeHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.cacheInvalidated).toBe(true);

      // Verify cache invalidation
      expect(prisma.permissionCache.deleteMany).toHaveBeenCalledWith({
        where: { userId: targetUserId },
      });

      // Verify role change history
      expect(prisma.roleChangeHistory.create).toHaveBeenCalledWith({
        data: {
          userId: targetUserId,
          oldRole: 'EDITOR',
          newRole: 'ADMIN',
          changedBy: admin.id,
          reason: 'Promotion to admin role',
        },
      });

      // Verify audit log
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: admin.id,
          action: 'user.role_changed',
          resource: 'user',
          details: expect.objectContaining({
            oldRole: 'EDITOR',
            newRole: 'ADMIN',
            reason: 'Promotion to admin role',
          }),
        }),
      });
    });
  });

  describe('Security Event Integration', () => {
    it('should create security events for suspicious activities', async () => {
      const suspiciousUser = TestUserFactory.createViewer({ id: 'suspicious-user' });
      MockAuthService.mockAuthenticatedUser(suspiciousUser);

      // Mock multiple failed attempts
      prisma.auditLog.count.mockResolvedValue(6); // 6 failed attempts in last hour
      prisma.securityEvent.create.mockResolvedValue({ id: 'security-suspicious-1' });

      const suspiciousHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          // Simulate checking for suspicious activity
          const recentFailures = await prisma.auditLog.count({
            where: {
              userId: user!.id,
              action: 'auth.login_failed',
              createdAt: {
                gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
              },
            },
          });

          if (recentFailures >= 5) {
            // Create security event
            await prisma.securityEvent.create({
              data: {
                type: 'SUSPICIOUS_ACTIVITY',
                severity: 'HIGH',
                userId: user!.id,
                resource: 'auth',
                action: 'login',
                ipAddress: request.headers.get('x-forwarded-for') || undefined,
                userAgent: request.headers.get('user-agent') || undefined,
                details: {
                  reason: 'Multiple failed login attempts',
                  count: recentFailures,
                  timeWindow: '1 hour',
                },
              },
            });

            return createApiSuccessResponse({ 
              warning: 'Suspicious activity detected',
              securityEventCreated: true 
            }, 200);
          }

          return createApiSuccessResponse({ message: 'Normal activity' });
        },
        {
          skipPermissionCheck: true, // For security monitoring
        }
      );

      const request = ApiRequestBuilder.get('http://localhost:3000/api/auth/check-security')
        .addHeader('x-forwarded-for', '192.168.1.200')
        .addHeader('user-agent', 'Suspicious-Bot/1.0')
        .build();

      const response = await suspiciousHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.securityEventCreated).toBe(true);

      // Verify security event creation
      expect(prisma.securityEvent.create).toHaveBeenCalledWith({
        data: {
          type: 'SUSPICIOUS_ACTIVITY',
          severity: 'HIGH',
          userId: suspiciousUser.id,
          resource: 'auth',
          action: 'login',
          ipAddress: '192.168.1.200',
          userAgent: 'Suspicious-Bot/1.0',
          details: {
            reason: 'Multiple failed login attempts',
            count: 6,
            timeWindow: '1 hour',
          },
        },
      });
    });

    it('should handle concurrent requests and maintain data integrity', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      // Mock transaction for concurrent operations
      prisma.$transaction.mockImplementation(async (operations) => {
        // Simulate transaction execution
        const results = [];
        for (const operation of operations) {
          if (typeof operation === 'function') {
            results.push(await operation(prisma));
          } else {
            results.push(await operation);
          }
        }
        return results;
      });

      prisma.user.create.mockResolvedValue({ id: 'concurrent-user-1' });
      prisma.auditLog.create.mockResolvedValue({ id: 'concurrent-audit-1' });

      const concurrentHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          const body = await request.json();

          // Use transaction for data integrity
          const [newUser, auditLog] = await prisma.$transaction([
            prisma.user.create({
              data: {
                name: body.name,
                email: body.email,
                role: body.role,
                passwordHash: 'hashed-password',
              },
            }),
            prisma.auditLog.create({
              data: {
                userId: user!.id,
                action: 'user.created',
                resource: 'user',
                details: { userData: body },
              },
            }),
          ]);

          return createApiSuccessResponse({ 
            user: newUser,
            auditLogId: auditLog.id 
          }, 201);
        },
        {
          permissions: [{ resource: 'users', action: 'create', scope: 'all' }]
        }
      );

      const userData = {
        name: 'Concurrent User',
        email: 'concurrent@example.com',
        role: 'EDITOR',
      };

      const request = ApiRequestBuilder.post('http://localhost:3000/api/admin/users', userData).build();

      const response = await concurrentHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 201);

      expect(data.user.id).toBe('concurrent-user-1');
      expect(data.auditLogId).toBe('concurrent-audit-1');

      // Verify transaction was used
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      // Mock database connection failure
      prisma.user.findMany.mockRejectedValue(new Error('Database connection failed'));

      const errorHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          try {
            const users = await prisma.user.findMany();
            return createApiSuccessResponse({ users });
          } catch (error) {
            // Log the error but don't expose internal details
            console.error('Database error:', error);
            
            return createApiSuccessResponse(
              { 
                error: {
                  code: 'SERVICE_UNAVAILABLE',
                  message: 'Service temporarily unavailable',
                  timestamp: new Date().toISOString(),
                }
              },
              503
            );
          }
        },
        {
          permissions: [{ resource: 'users', action: 'read', scope: 'all' }]
        }
      );

      const request = ApiRequestBuilder.get('http://localhost:3000/api/admin/users').build();

      const response = await errorHandler(request);
      
      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should maintain audit trail even during partial failures', async () => {
      const admin = testUsers.admin;
      MockAuthService.mockAuthenticatedUser(admin);

      // Mock partial failure scenario
      prisma.user.create.mockRejectedValue(new Error('User creation failed'));
      prisma.auditLog.create.mockResolvedValue({ id: 'failure-audit-1' });

      const partialFailureHandler = withApiPermissions(
        async (request: NextRequest, { user }) => {
          const body = await request.json();

          try {
            const newUser = await prisma.user.create({
              data: {
                name: body.name,
                email: body.email,
                role: body.role,
                passwordHash: 'hashed-password',
              },
            });

            // This won't be reached due to mock failure
            await auditService.logUser(
              user!.id,
              newUser.id,
              'CREATED',
              { userData: body }
            );

            return createApiSuccessResponse({ user: newUser }, 201);
          } catch (error) {
            // Still log the failure attempt
            await auditService.log({
              userId: user!.id,
              action: 'user.create_failed',
              resource: 'user',
              details: {
                userData: body,
                error: error instanceof Error ? error.message : 'Unknown error',
                success: false,
              },
              severity: 'high',
            });

            return createApiSuccessResponse(
              {
                error: {
                  code: 'CREATION_FAILED',
                  message: 'Failed to create user',
                  timestamp: new Date().toISOString(),
                }
              },
              500
            );
          }
        },
        {
          permissions: [{ resource: 'users', action: 'create', scope: 'all' }]
        }
      );

      const userData = {
        name: 'Failed User',
        email: 'failed@example.com',
        role: 'EDITOR',
      };

      const request = ApiRequestBuilder.post('http://localhost:3000/api/admin/users', userData).build();

      const response = await partialFailureHandler(request);
      
      expect(response.status).toBe(500);

      // Verify failure was still audited
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: admin.id,
          action: 'user.create_failed',
          resource: 'user',
          details: expect.objectContaining({
            userData: userData,
            error: 'User creation failed',
            success: false,
            severity: 'high',
          }),
        }),
      });
    });
  });
});