/**
 * Integration tests for the complete permission system
 * Tests the interaction between permission service, caching, and database
 */

import { UserRole } from '@prisma/client';
import { 
  EnhancedPermissionService,
  CacheInvalidationService,
  Permission
} from '../../app/lib/permissions';
import { 
  PermissionCacheDB,
  SecurityEventDB,
  RoleChangeHistoryDB,
  DatabasePermissionCache,
  setPrismaClient
} from '../../app/lib/permission-db';
import { User } from '../../app/lib/types';

// Mock Prisma for integration tests
const mockPrisma = {
  permissionCache: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  securityEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  },
  roleChangeHistory: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $disconnect: jest.fn(),
} as any;

// Mock user factory
const createMockUser = (role: UserRole, id?: string): User => ({
  id: id || `${role.toLowerCase()}-user-${Math.random().toString(36).substr(2, 9)}`,
  email: 'test@example.com',
  name: 'Test User',
  role,
  isActive: true,
  twoFactorEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('Permission System Integration', () => {
  let permissionService: EnhancedPermissionService;
  let cacheInvalidationService: CacheInvalidationService;
  let dbCache: DatabasePermissionCache;

  beforeAll(() => {
    // Inject mocked Prisma client
    setPrismaClient(mockPrisma);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Initialize services with database caching
    permissionService = new EnhancedPermissionService({
      ttl: 300000, // 5 minutes
      enableDistributed: false,
      useDatabase: true
    });
    
    cacheInvalidationService = new CacheInvalidationService(permissionService);
    dbCache = new DatabasePermissionCache(300000);
  });

  describe('Permission Service with Database Cache', () => {
    it('should check permissions and cache results in database', async () => {
      const user = createMockUser(UserRole.EDITOR, 'editor-123');
      const permission: Permission = { resource: 'products', action: 'create' };

      // Mock database cache miss
      mockPrisma.permissionCache.findUnique.mockResolvedValue(null);
      mockPrisma.permissionCache.upsert.mockResolvedValue({});

      const result = await permissionService.hasPermission(user, permission);

      expect(result).toBe(true);
      
      // Should have tried to get from database cache
      expect(mockPrisma.permissionCache.findUnique).toHaveBeenCalledWith({
        where: {
          userId_resource_action_scope: {
            userId: 'editor-123',
            resource: 'products',
            action: 'create',
            scope: null
          }
        }
      });
    });

    it('should use cached results from database', async () => {
      const user = createMockUser(UserRole.VIEWER, 'viewer-123');
      const permission: Permission = { resource: 'products', action: 'create' };

      // Mock database cache hit
      const cachedEntry = {
        userId: 'viewer-123',
        resource: 'products',
        action: 'create',
        scope: null,
        result: false,
        expiresAt: new Date(Date.now() + 60000), // 1 minute from now
        createdAt: new Date()
      };

      mockPrisma.permissionCache.findUnique.mockResolvedValue(cachedEntry);

      const result = await permissionService.hasPermission(user, permission);

      expect(result).toBe(false);
      
      // Should not have computed permission (used cache)
      expect(mockPrisma.permissionCache.upsert).not.toHaveBeenCalled();
    });

    it('should handle expired cache entries', async () => {
      const user = createMockUser(UserRole.EDITOR, 'editor-123');
      const permission: Permission = { resource: 'products', action: 'read' };

      // Mock expired cache entry
      const expiredEntry = {
        userId: 'editor-123',
        resource: 'products',
        action: 'read',
        scope: null,
        result: true,
        expiresAt: new Date(Date.now() - 60000), // 1 minute ago
        createdAt: new Date()
      };

      mockPrisma.permissionCache.findUnique.mockResolvedValue(expiredEntry);
      mockPrisma.permissionCache.delete.mockResolvedValue({});
      mockPrisma.permissionCache.upsert.mockResolvedValue({});

      const result = await permissionService.hasPermission(user, permission);

      expect(result).toBe(true);
      
      // Should have deleted expired entry
      expect(mockPrisma.permissionCache.delete).toHaveBeenCalled();
      
      // Should have computed and cached new result
      expect(mockPrisma.permissionCache.upsert).toHaveBeenCalled();
    });
  });

  describe('Cache Invalidation Integration', () => {
    it('should invalidate cache when user role changes', async () => {
      const userId = 'user-123';
      
      mockPrisma.permissionCache.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.roleChangeHistory.create.mockResolvedValue({ id: 'change-123' });

      // Mock console.log to verify logging
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await cacheInvalidationService.onUserRoleChange(userId, UserRole.VIEWER, UserRole.EDITOR);

      expect(mockPrisma.permissionCache.deleteMany).toHaveBeenCalledWith({
        where: { userId }
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`User ${userId} role changed from VIEWER to EDITOR`)
      );

      consoleSpy.mockRestore();
    });

    it('should invalidate resource cache when permissions are updated', async () => {
      const resource = 'products';
      
      mockPrisma.permissionCache.deleteMany.mockResolvedValue({ count: 10 });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await cacheInvalidationService.onPermissionUpdate(resource);

      expect(mockPrisma.permissionCache.deleteMany).toHaveBeenCalledWith({
        where: { resource }
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Permissions updated for resource ${resource}`)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Security Event Integration', () => {
    it('should create security events for permission violations', async () => {
      const user = createMockUser(UserRole.VIEWER, 'viewer-123');
      
      mockPrisma.securityEvent.create.mockResolvedValue({ id: 'event-123' });

      const eventId = await SecurityEventDB.create({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'HIGH',
        userId: user.id,
        resource: 'users',
        action: 'delete',
        ipAddress: '192.168.1.1',
        details: {
          attemptedPermission: { resource: 'users', action: 'delete' },
          userRole: user.role
        }
      });

      expect(eventId).toBe('event-123');
      expect(mockPrisma.securityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'UNAUTHORIZED_ACCESS',
          severity: 'HIGH',
          userId: user.id,
          resource: 'users',
          action: 'delete',
          ipAddress: '192.168.1.1',
          details: expect.objectContaining({
            attemptedPermission: { resource: 'users', action: 'delete' },
            userRole: user.role
          })
        })
      });
    });
  });

  describe('Role Change History Integration', () => {
    it('should record role changes with proper audit trail', async () => {
      const userId = 'user-123';
      const adminId = 'admin-456';
      
      mockPrisma.roleChangeHistory.create.mockResolvedValue({ id: 'change-123' });

      const changeId = await RoleChangeHistoryDB.recordChange(
        userId,
        'VIEWER',
        'EDITOR',
        adminId,
        'User promotion after training completion'
      );

      expect(changeId).toBe('change-123');
      expect(mockPrisma.roleChangeHistory.create).toHaveBeenCalledWith({
        data: {
          userId,
          oldRole: 'VIEWER',
          newRole: 'EDITOR',
          changedBy: adminId,
          reason: 'User promotion after training completion'
        }
      });
    });

    it('should retrieve user role change history', async () => {
      const userId = 'user-123';
      const mockHistory = [
        {
          id: 'change-1',
          userId,
          oldRole: 'VIEWER',
          newRole: 'EDITOR',
          changedBy: 'admin-1',
          reason: 'Promotion',
          createdAt: new Date(),
          user: { id: userId, name: 'Test User', email: 'test@example.com' },
          changer: { id: 'admin-1', name: 'Admin User', email: 'admin@example.com' }
        }
      ];

      mockPrisma.roleChangeHistory.findMany.mockResolvedValue(mockHistory);

      const history = await RoleChangeHistoryDB.getUserHistory(userId);

      expect(history).toEqual(mockHistory);
      expect(mockPrisma.roleChangeHistory.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: expect.objectContaining({
          user: expect.any(Object),
          changer: expect.any(Object)
        }),
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    });
  });

  describe('Database Cache Performance', () => {
    it('should provide cache statistics', async () => {
      mockPrisma.permissionCache.count
        .mockResolvedValueOnce(150) // total entries
        .mockResolvedValueOnce(25); // expired entries

      mockPrisma.permissionCache.groupBy.mockResolvedValue([
        { userId: 'user-1', _count: { userId: 50 } },
        { userId: 'user-2', _count: { userId: 30 } },
        { userId: 'user-3', _count: { userId: 20 } }
      ]);

      const stats = await dbCache.getStats();

      expect(stats).toEqual({
        totalEntries: 150,
        expiredEntries: 25,
        userCounts: [
          { userId: 'user-1', count: 50 },
          { userId: 'user-2', count: 30 },
          { userId: 'user-3', count: 20 }
        ]
      });
    });

    it('should clean up expired entries', async () => {
      mockPrisma.permissionCache.deleteMany.mockResolvedValue({ count: 15 });

      const removedCount = await dbCache.cleanupExpired();

      expect(removedCount).toBe(15);
      expect(mockPrisma.permissionCache.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date)
          }
        }
      });
    });
  });

  describe('End-to-End Permission Flow', () => {
    it('should handle complete permission check with caching and audit', async () => {
      const user = createMockUser(UserRole.EDITOR, 'editor-123');
      const permission: Permission = { resource: 'products', action: 'delete' };

      // Mock database operations
      mockPrisma.permissionCache.findUnique.mockResolvedValue(null); // Cache miss
      mockPrisma.permissionCache.upsert.mockResolvedValue({}); // Cache set
      mockPrisma.securityEvent.create.mockResolvedValue({ id: 'event-123' }); // Security event

      // Check permission (should be allowed for EDITOR)
      const result = await permissionService.hasPermission(user, permission);
      expect(result).toBe(true);

      // Verify cache was checked and updated
      expect(mockPrisma.permissionCache.findUnique).toHaveBeenCalled();
      expect(mockPrisma.permissionCache.upsert).toHaveBeenCalled();

      // Simulate a role change
      mockPrisma.permissionCache.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.roleChangeHistory.create.mockResolvedValue({ id: 'change-123' });

      await cacheInvalidationService.onUserRoleChange(user.id, UserRole.EDITOR, UserRole.VIEWER);

      // Verify cache was invalidated
      expect(mockPrisma.permissionCache.deleteMany).toHaveBeenCalledWith({
        where: { userId: user.id }
      });

      // Now check permission again (should be denied for VIEWER)
      mockPrisma.permissionCache.findUnique.mockResolvedValue(null); // Cache miss after invalidation
      
      const newUser = { ...user, role: UserRole.VIEWER };
      const newResult = await permissionService.hasPermission(newUser, permission);
      expect(newResult).toBe(false);
    });
  });
});