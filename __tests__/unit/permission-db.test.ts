/**
 * Tests for Permission Database Service
 */

import { PrismaClient } from '@prisma/client';
import {
  PermissionCacheDB,
  SecurityEventDB,
  RoleChangeHistoryDB,
  DatabasePermissionCache,
  setPrismaClient
} from '../../app/lib/permission-db';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
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
  }))
}));

const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
  // Inject the mocked Prisma client
  setPrismaClient(mockPrisma);
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('PermissionCacheDB', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached permission result', async () => {
      const mockCacheEntry = {
        userId: 'user1',
        resource: 'products',
        action: 'read',
        scope: 'all',
        result: true,
        expiresAt: new Date(Date.now() + 60000), // 1 minute from now
        createdAt: new Date()
      };

      (mockPrisma.permissionCache.findUnique as jest.Mock).mockResolvedValue(mockCacheEntry);

      const result = await PermissionCacheDB.get('user1', 'products', 'read', 'all');

      expect(result).toBe(true);
      expect(mockPrisma.permissionCache.findUnique).toHaveBeenCalledWith({
        where: {
          userId_resource_action_scope: {
            userId: 'user1',
            resource: 'products',
            action: 'read',
            scope: 'all'
          }
        }
      });
    });

    it('should return null for non-existent cache entry', async () => {
      (mockPrisma.permissionCache.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await PermissionCacheDB.get('user1', 'products', 'read', 'all');

      expect(result).toBeNull();
    });

    it('should return null and delete expired cache entry', async () => {
      const expiredEntry = {
        userId: 'user1',
        resource: 'products',
        action: 'read',
        scope: 'all',
        result: true,
        expiresAt: new Date(Date.now() - 60000), // 1 minute ago
        createdAt: new Date()
      };

      (mockPrisma.permissionCache.findUnique as jest.Mock).mockResolvedValue(expiredEntry);
      (mockPrisma.permissionCache.delete as jest.Mock).mockResolvedValue({});

      const result = await PermissionCacheDB.get('user1', 'products', 'read', 'all');

      expect(result).toBeNull();
      expect(mockPrisma.permissionCache.delete).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.permissionCache.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const result = await PermissionCacheDB.get('user1', 'products', 'read', 'all');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should upsert cache entry', async () => {
      (mockPrisma.permissionCache.upsert as jest.Mock).mockResolvedValue({});

      await PermissionCacheDB.set('user1', 'products', 'read', true, 300000, 'all');

      expect(mockPrisma.permissionCache.upsert).toHaveBeenCalledWith({
        where: {
          userId_resource_action_scope: {
            userId: 'user1',
            resource: 'products',
            action: 'read',
            scope: 'all'
          }
        },
        update: expect.objectContaining({
          result: true,
          expiresAt: expect.any(Date),
          createdAt: expect.any(Date)
        }),
        create: expect.objectContaining({
          userId: 'user1',
          resource: 'products',
          action: 'read',
          scope: 'all',
          result: true,
          expiresAt: expect.any(Date)
        })
      });
    });

    it('should handle null scope', async () => {
      (mockPrisma.permissionCache.upsert as jest.Mock).mockResolvedValue({});

      await PermissionCacheDB.set('user1', 'products', 'read', true);

      expect(mockPrisma.permissionCache.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_resource_action_scope: {
              userId: 'user1',
              resource: 'products',
              action: 'read',
              scope: null
            }
          }
        })
      );
    });
  });

  describe('invalidateUser', () => {
    it('should delete all cache entries for user', async () => {
      (mockPrisma.permissionCache.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      await PermissionCacheDB.invalidateUser('user1');

      expect(mockPrisma.permissionCache.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user1' }
      });
    });
  });

  describe('invalidateResource', () => {
    it('should delete all cache entries for resource', async () => {
      (mockPrisma.permissionCache.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

      await PermissionCacheDB.invalidateResource('products');

      expect(mockPrisma.permissionCache.deleteMany).toHaveBeenCalledWith({
        where: { resource: 'products' }
      });
    });
  });

  describe('clearExpired', () => {
    it('should delete expired cache entries', async () => {
      (mockPrisma.permissionCache.deleteMany as jest.Mock).mockResolvedValue({ count: 10 });

      const result = await PermissionCacheDB.clearExpired();

      expect(result).toBe(10);
      expect(mockPrisma.permissionCache.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date)
          }
        }
      });
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      (mockPrisma.permissionCache.count as jest.Mock)
        .mockResolvedValueOnce(100) // total entries
        .mockResolvedValueOnce(10); // expired entries

      (mockPrisma.permissionCache.groupBy as jest.Mock).mockResolvedValue([
        { userId: 'user1', _count: { userId: 25 } },
        { userId: 'user2', _count: { userId: 15 } }
      ]);

      const stats = await PermissionCacheDB.getStats();

      expect(stats).toEqual({
        totalEntries: 100,
        expiredEntries: 10,
        userCounts: [
          { userId: 'user1', count: 25 },
          { userId: 'user2', count: 15 }
        ]
      });
    });
  });
});

describe('SecurityEventDB', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create security event', async () => {
      const mockEvent = {
        id: 'event1',
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'HIGH',
        userId: 'user1',
        resource: 'products',
        action: 'delete',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        details: { reason: 'Invalid permissions' }
      };

      (mockPrisma.securityEvent.create as jest.Mock).mockResolvedValue(mockEvent);

      const eventId = await SecurityEventDB.create({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'HIGH',
        userId: 'user1',
        resource: 'products',
        action: 'delete',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        details: { reason: 'Invalid permissions' }
      });

      expect(eventId).toBe('event1');
      expect(mockPrisma.securityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'UNAUTHORIZED_ACCESS',
          severity: 'HIGH',
          userId: 'user1',
          resource: 'products',
          action: 'delete',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          details: { reason: 'Invalid permissions' }
        })
      });
    });

    it('should use default severity', async () => {
      const mockEvent = { id: 'event1' };
      (mockPrisma.securityEvent.create as jest.Mock).mockResolvedValue(mockEvent);

      await SecurityEventDB.create({
        type: 'LOGIN_ATTEMPT'
      });

      expect(mockPrisma.securityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'MEDIUM'
        })
      });
    });
  });

  describe('getEvents', () => {
    it('should return paginated security events', async () => {
      const mockEvents = [
        { id: 'event1', type: 'UNAUTHORIZED_ACCESS', user: { id: 'user1', name: 'User 1' } },
        { id: 'event2', type: 'LOGIN_FAILURE', user: { id: 'user2', name: 'User 2' } }
      ];

      (mockPrisma.securityEvent.findMany as jest.Mock).mockResolvedValue(mockEvents);
      (mockPrisma.securityEvent.count as jest.Mock).mockResolvedValue(25);

      const result = await SecurityEventDB.getEvents({
        page: 2,
        limit: 10,
        type: 'UNAUTHORIZED_ACCESS'
      });

      expect(result).toEqual({
        events: mockEvents,
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3
        }
      });

      expect(mockPrisma.securityEvent.findMany).toHaveBeenCalledWith({
        where: { type: 'UNAUTHORIZED_ACCESS' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10
      });
    });
  });

  describe('resolve', () => {
    it('should resolve security event', async () => {
      (mockPrisma.securityEvent.update as jest.Mock).mockResolvedValue({});

      await SecurityEventDB.resolve('event1', 'admin1');

      expect(mockPrisma.securityEvent.update).toHaveBeenCalledWith({
        where: { id: 'event1' },
        data: {
          resolved: true,
          resolvedAt: expect.any(Date),
          resolvedBy: 'admin1'
        }
      });
    });
  });
});

describe('RoleChangeHistoryDB', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordChange', () => {
    it('should record role change', async () => {
      const mockChange = { id: 'change1' };
      (mockPrisma.roleChangeHistory.create as jest.Mock).mockResolvedValue(mockChange);

      const changeId = await RoleChangeHistoryDB.recordChange(
        'user1',
        'VIEWER',
        'EDITOR',
        'admin1',
        'Promotion'
      );

      expect(changeId).toBe('change1');
      expect(mockPrisma.roleChangeHistory.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          oldRole: 'VIEWER',
          newRole: 'EDITOR',
          changedBy: 'admin1',
          reason: 'Promotion'
        }
      });
    });
  });

  describe('getUserHistory', () => {
    it('should return user role change history', async () => {
      const mockHistory = [
        {
          id: 'change1',
          oldRole: 'VIEWER',
          newRole: 'EDITOR',
          user: { id: 'user1', name: 'User 1' },
          changer: { id: 'admin1', name: 'Admin 1' }
        }
      ];

      (mockPrisma.roleChangeHistory.findMany as jest.Mock).mockResolvedValue(mockHistory);

      const result = await RoleChangeHistoryDB.getUserHistory('user1', 25);

      expect(result).toEqual(mockHistory);
      expect(mockPrisma.roleChangeHistory.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 25
      });
    });
  });
});

describe('DatabasePermissionCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use PermissionCacheDB methods', async () => {
    const cache = new DatabasePermissionCache(300000);

    // Mock the static methods
    jest.spyOn(PermissionCacheDB, 'get').mockResolvedValue(true);
    jest.spyOn(PermissionCacheDB, 'set').mockResolvedValue();
    jest.spyOn(PermissionCacheDB, 'invalidateUser').mockResolvedValue();

    await cache.get('user1', 'products', 'read');
    await cache.set('user1', 'products', 'read', true);
    await cache.invalidateUser('user1');

    expect(PermissionCacheDB.get).toHaveBeenCalledWith('user1', 'products', 'read', undefined);
    expect(PermissionCacheDB.set).toHaveBeenCalledWith('user1', 'products', 'read', true, 300000, undefined);
    expect(PermissionCacheDB.invalidateUser).toHaveBeenCalledWith('user1');
  });
});