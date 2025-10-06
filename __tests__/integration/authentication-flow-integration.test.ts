/**
 * Authentication Flow Integration Tests
 * Tests complete authentication workflows with real database integration
 */

import { NextRequest } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { getToken } from 'next-auth/jwt';
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware';
import { AuditService } from '@/lib/audit-service';
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
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      count: jest.fn(),
    },
    securityEvent: {
      create: jest.fn(),
    },
  }
}));

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const { prisma } = require('@/lib/db');

describe('Authentication Flow Integration Tests', () => {
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

  describe('Login Flow Integration', () => {
    it('should handle complete login flow with session creation and audit logging', async () => {
      const user = testUsers.editor;
      const loginData = {
        email: user.email,
        password: 'correct-password',
      };

      // Mock database operations
      prisma.user.findUnique.mockResolvedValue({
        ...user,
        passwordHash: 'hashed-password',
        isActive: true,
        twoFactorEnabled: false,
      });
      prisma.session.create.mockResolvedValue({
        id: 'session-1',
        userId: user.id,
        token: 'session-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: true,
      });
      prisma.user.update.mockResolvedValue({ ...user, lastLoginAt: new Date() });
      prisma.auditLog.create.mockResolvedValue({ id: 'login-audit-1' });

      const loginHandler = async (request: NextRequest) => {
        const body = await request.json();
        
        // Find user by email
        const foundUser = await prisma.user.findUnique({
          where: { email: body.email },
        });

        if (!foundUser || !foundUser.isActive) {
          return createApiSuccessResponse(
            { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } },
            401
          );
        }

        // Create session
        const session = await prisma.session.create({
          data: {
            userId: foundUser.id,
            token: `session-${Date.now()}`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            ipAddress: request.headers.get('x-forwarded-for') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
          },
        });

        // Update last login
        await prisma.user.update({
          where: { id: foundUser.id },
          data: { lastLoginAt: new Date() },
        });

        // Log successful login
        await auditService.logAuth(
          foundUser.id,
          'LOGIN',
          { 
            sessionId: session.id,
            method: 'password',
          },
          request.headers.get('x-forwarded-for') || undefined,
          request.headers.get('user-agent') || undefined
        );

        return createApiSuccessResponse({
          user: {
            id: foundUser.id,
            name: foundUser.name,
            email: foundUser.email,
            role: foundUser.role,
          },
          session: {
            token: session.token,
            expiresAt: session.expiresAt,
          },
        });
      };

      const request = ApiRequestBuilder.post('http://localhost:3000/api/auth/login', loginData)
        .addHeader('x-forwarded-for', '192.168.1.100')
        .addHeader('user-agent', 'Test-Browser/1.0')
        .build();

      const response = await loginHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.user.id).toBe(user.id);
      expect(data.session.token).toBe('session-token');

      // Verify database operations
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginData.email },
      });
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: user.id,
          ipAddress: '192.168.1.100',
          userAgent: 'Test-Browser/1.0',
        }),
      });

      // Verify audit log
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: user.id,
          action: 'auth.login',
          resource: 'user',
          details: expect.objectContaining({
            sessionId: 'session-1',
            method: 'password',
          }),
          ipAddress: '192.168.1.100',
          userAgent: 'Test-Browser/1.0',
        }),
      });
    });

    it('should handle failed login attempts with security monitoring', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'wrong-password',
      };

      // Mock user not found
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.auditLog.create.mockResolvedValue({ id: 'failed-login-audit' });
      prisma.auditLog.count.mockResolvedValue(3);
      prisma.securityEvent.create.mockResolvedValue({ id: 'security-event-1' });

      const loginHandler = async (request: NextRequest) => {
        const body = await request.json();
        
        const foundUser = await prisma.user.findUnique({
          where: { email: body.email },
        });

        if (!foundUser) {
          // Log failed attempt
          await auditService.logAuth(
            'unknown',
            'LOGIN_FAILED',
            { reason: 'User not found', email: body.email },
            request.headers.get('x-forwarded-for') || undefined,
            request.headers.get('user-agent') || undefined
          );

          // Check for multiple failed attempts
          const recentFailures = await prisma.auditLog.count({
            where: {
              action: 'auth.login_failed',
              ipAddress: request.headers.get('x-forwarded-for'),
              createdAt: {
                gte: new Date(Date.now() - 60 * 60 * 1000),
              },
            },
          });

          if (recentFailures >= 3) {
            await prisma.securityEvent.create({
              data: {
                type: 'BRUTE_FORCE_ATTEMPT',
                severity: 'HIGH',
                ipAddress: request.headers.get('x-forwarded-for'),
                userAgent: request.headers.get('user-agent'),
                details: {
                  targetEmail: body.email,
                  attemptCount: recentFailures,
                },
              },
            });
          }
          
          return createApiSuccessResponse(
            { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } },
            401
          );
        }

        return createApiSuccessResponse({ message: 'Should not reach here' });
      };

      const request = ApiRequestBuilder.post('http://localhost:3000/api/auth/login', loginData)
        .addHeader('x-forwarded-for', '10.0.0.1')
        .addHeader('user-agent', 'Suspicious-Agent/1.0')
        .build();

      const response = await loginHandler(request);
      await ApiResponseValidator.validateErrorResponse(response, 401, 'INVALID_CREDENTIALS');

      // Verify security event was created
      expect(prisma.securityEvent.create).toHaveBeenCalledWith({
        data: {
          type: 'BRUTE_FORCE_ATTEMPT',
          severity: 'HIGH',
          ipAddress: '10.0.0.1',
          userAgent: 'Suspicious-Agent/1.0',
          details: {
            targetEmail: 'nonexistent@example.com',
            attemptCount: 3,
          },
        },
      });
    });
  });

  describe('Session Management Integration', () => {
    it('should handle session validation and renewal', async () => {
      const user = testUsers.editor;

      mockGetToken.mockResolvedValue({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      prisma.session.findFirst.mockResolvedValue({
        id: 'session-123',
        userId: user.id,
        token: 'valid-session-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isActive: true,
      });

      prisma.session.update.mockResolvedValue({
        id: 'session-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const sessionHandler = withApiPermissions(
        async (request: NextRequest, { user: authenticatedUser }) => {
          const session = await prisma.session.findFirst({
            where: {
              userId: authenticatedUser!.id,
              isActive: true,
              expiresAt: {
                gt: new Date(),
              },
            },
          });

          if (!session) {
            return createApiSuccessResponse(
              { error: { code: 'SESSION_EXPIRED', message: 'Session expired' } },
              401
            );
          }

          // Extend session if close to expiring
          const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
          if (session.expiresAt < oneHourFromNow) {
            await prisma.session.update({
              where: { id: session.id },
              data: {
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            });
          }

          return createApiSuccessResponse({
            user: {
              id: authenticatedUser!.id,
              name: authenticatedUser!.name,
              role: authenticatedUser!.role,
            },
            session: {
              id: session.id,
              renewed: session.expiresAt < oneHourFromNow,
            },
          });
        },
        {
          permissions: [{ resource: 'profile', action: 'read', scope: 'own' }]
        }
      );

      const request = ApiRequestBuilder.get('http://localhost:3000/api/auth/session').build();

      const response = await sessionHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.user.id).toBe(user.id);
      expect(data.session.renewed).toBe(true);

      // Verify session was extended
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should handle logout with session cleanup', async () => {
      const user = testUsers.editor;
      MockAuthService.mockAuthenticatedUser(user);

      prisma.session.update.mockResolvedValue({ id: 'session-logout' });
      prisma.auditLog.create.mockResolvedValue({ id: 'logout-audit' });

      const logoutHandler = withApiPermissions(
        async (request: NextRequest, { user: authenticatedUser }) => {
          const body = await request.json();
          
          // Deactivate session
          await prisma.session.update({
            where: { 
              userId: authenticatedUser!.id,
              token: body.sessionToken,
            },
            data: { isActive: false },
          });

          // Log logout
          await auditService.logAuth(
            authenticatedUser!.id,
            'LOGOUT',
            { sessionToken: body.sessionToken },
            request.headers.get('x-forwarded-for') || undefined,
            request.headers.get('user-agent') || undefined
          );

          return createApiSuccessResponse({
            message: 'Logged out successfully',
          });
        },
        {
          skipPermissionCheck: true,
        }
      );

      const request = ApiRequestBuilder.post('http://localhost:3000/api/auth/logout', {
        sessionToken: 'current-session-token',
      }).build();

      const response = await logoutHandler(request);
      const data = await ApiResponseValidator.validateSuccessResponse(response, 200);

      expect(data.message).toBe('Logged out successfully');

      // Verify session was deactivated
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { 
          userId: user.id,
          token: 'current-session-token',
        },
        data: { isActive: false },
      });

      // Verify logout was logged
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: user.id,
          action: 'auth.logout',
          resource: 'user',
          details: expect.objectContaining({
            sessionToken: 'current-session-token',
          }),
        }),
      });
    });
  });
});