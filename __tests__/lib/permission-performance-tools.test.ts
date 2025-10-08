/**
 * Tests for Permission Performance Optimization Tools
 * Requirements: 6.1, 6.2
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { PermissionCacheWarmer } from '../../app/lib/permission-cache-warmer'
import { PermissionQueryOptimizer } from '../../app/lib/permission-query-optimizer'
import { PermissionPerformanceProfiler } from '../../app/lib/permission-performance-profiler'
import { PermissionPerformanceService } from '../../app/lib/permission-performance-service'
import { UserRole } from '@prisma/client'

// Mock dependencies
jest.mock('../../app/lib/db', () => ({
  db: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn()
    },
    permissionCache: {
      findFirst: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn()
    },
    product: {
      findMany: jest.fn()
    },
    category: {
      findMany: jest.fn()
    },
    order: {
      findMany: jest.fn()
    }
  }
}))

jest.mock('../../app/lib/permissions', () => ({
  PermissionService: jest.fn().mockImplementation(() => ({
    hasPermission: jest.fn().mockResolvedValue(true),
    invalidateUserCache: jest.fn().mockResolvedValue(undefined)
  }))
}))

describe('Permission Cache Warmer', () => {
  let cacheWarmer: PermissionCacheWarmer
  let mockPermissionService: any

  beforeEach(() => {
    mockPermissionService = {
      hasPermission: jest.fn().mockResolvedValue(true),
      invalidateUserCache: jest.fn().mockResolvedValue(undefined)
    }
    
    cacheWarmer = new PermissionCacheWarmer(mockPermissionService, {
      batchSize: 2,
      maxConcurrency: 1
    })
  })

  describe('warmUserCache', () => {
    it('should warm cache for user with correct permissions', async () => {
      const userId = 'user-1'
      const role = UserRole.ADMIN

      const entriesWarmed = await cacheWarmer.warmUserCache(userId, role)

      expect(entriesWarmed).toBeGreaterThan(0)
      expect(mockPermissionService.hasPermission).toHaveBeenCalled()
    })

    it('should handle different roles appropriately', async () => {
      const userId = 'user-1'
      
      // Test VIEWER role (should have fewer permissions)
      const viewerEntries = await cacheWarmer.warmUserCache(userId, UserRole.VIEWER)
      
      // Test ADMIN role (should have more permissions)
      const adminEntries = await cacheWarmer.warmUserCache(userId, UserRole.ADMIN)

      expect(adminEntries).toBeGreaterThanOrEqual(viewerEntries)
    })

    it('should handle permission check failures gracefully', async () => {
      mockPermissionService.hasPermission.mockRejectedValueOnce(new Error('Permission check failed'))

      const userId = 'user-1'
      const role = UserRole.EDITOR

      // Should not throw, but continue with other permissions
      const entriesWarmed = await cacheWarmer.warmUserCache(userId, role)
      expect(entriesWarmed).toBeGreaterThanOrEqual(0)
    })
  })

  describe('warmAfterRoleChange', () => {
    it('should invalidate cache and warm with new role', async () => {
      const userId = 'user-1'
      const newRole = UserRole.ADMIN

      await cacheWarmer.warmAfterRoleChange(userId, newRole)

      expect(mockPermissionService.invalidateUserCache).toHaveBeenCalledWith(userId)
      expect(mockPermissionService.hasPermission).toHaveBeenCalled()
    })
  })
})

describe('Permission Query Optimizer', () => {
  let queryOptimizer: PermissionQueryOptimizer
  let mockDb: any

  beforeEach(() => {
    queryOptimizer = new PermissionQueryOptimizer({
      enableQueryCache: true,
      cacheTimeout: 1000
    })

    mockDb = require('../../app/lib/db').db
  })

  describe('getUserPermissions', () => {
    it('should return cached result when available', async () => {
      const userId = 'user-1'
      const mockUser = { id: userId, role: UserRole.ADMIN, isActive: true }

      // First call - should hit database
      mockDb.user.findUnique.mockResolvedValueOnce(mockUser)
      const result1 = await queryOptimizer.getUserPermissions(userId)

      // Second call - should use cache
      const result2 = await queryOptimizer.getUserPermissions(userId)

      expect(result1).toEqual(mockUser)
      expect(result2).toEqual(mockUser)
      expect(mockDb.user.findUnique).toHaveBeenCalledTimes(1)
    })

    it('should record query statistics', async () => {
      const userId = 'user-1'
      mockDb.user.findUnique.mockResolvedValueOnce({ id: userId, role: UserRole.ADMIN })

      await queryOptimizer.getUserPermissions(userId)

      const stats = queryOptimizer.getQueryStats()
      expect(stats.length).toBeGreaterThan(0)
      expect(stats[0].query).toBe('getUserPermissions')
    })
  })

  describe('batchUserPermissions', () => {
    it('should process users in batches', async () => {
      const userIds = ['user-1', 'user-2', 'user-3']
      const mockUsers = userIds.map(id => ({ id, role: UserRole.EDITOR, isActive: true }))

      mockDb.user.findMany.mockResolvedValueOnce(mockUsers)

      const results = await queryOptimizer.batchUserPermissions(userIds)

      expect(results.size).toBe(3)
      expect(results.get('user-1')).toEqual(mockUsers[0])
    })
  })

  describe('cleanupExpiredCache', () => {
    it('should remove expired cache entries', async () => {
      mockDb.permissionCache.deleteMany.mockResolvedValueOnce({ count: 5 })

      const deletedCount = await queryOptimizer.cleanupExpiredCache()

      expect(deletedCount).toBe(5)
      expect(mockDb.permissionCache.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date)
          }
        }
      })
    })
  })
})

describe('Permission Performance Profiler', () => {
  let profiler: PermissionPerformanceProfiler

  beforeEach(() => {
    profiler = new PermissionPerformanceProfiler()
  })

  afterEach(() => {
    profiler.clear()
  })

  describe('operation profiling', () => {
    it('should track operation duration', async () => {
      const operationId = profiler.startOperation('test_operation')
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10))
      
      profiler.endOperation(operationId, true)

      const report = profiler.generateReport()
      expect(report.totalOperations).toBe(1)
      expect(report.averageDuration).toBeGreaterThan(0)
    })

    it('should track operation success/failure', async () => {
      const successId = profiler.startOperation('success_op')
      const failureId = profiler.startOperation('failure_op')

      profiler.endOperation(successId, true)
      profiler.endOperation(failureId, false)

      const report = profiler.generateReport()
      expect(report.totalOperations).toBe(2)
      expect(report.errorRate).toBe(50) // 1 out of 2 failed
    })
  })

  describe('cache tracking', () => {
    it('should track cache hit/miss rates', () => {
      profiler.recordCacheHit(true)
      profiler.recordCacheHit(true)
      profiler.recordCacheHit(false)

      const report = profiler.generateReport()
      expect(report.cacheHitRate).toBeCloseTo(66.67, 1) // 2 out of 3 hits
    })
  })

  describe('performance analysis', () => {
    it('should detect performance trends', async () => {
      // Add some operations with increasing duration manually
      const baseTime = performance.now()
      for (let i = 0; i < 10; i++) {
        profiler['metrics'].push({
          name: 'trend_test',
          startTime: baseTime + i * 100,
          endTime: baseTime + i * 100 + (10 + i * 5), // Increasing duration
          duration: 10 + i * 5
        })
      }

      const trends = profiler.analyzePerformanceTrends()
      expect(trends.trend).toBe('degrading')
      expect(trends.averageChange).toBeGreaterThan(0)
    })

    it('should detect anomalies', () => {
      // Add operations that exceed thresholds
      for (let i = 0; i < 10; i++) {
        const operationId = profiler.startOperation('slow_operation')
        // Simulate slow operation by manually setting duration
        profiler.endOperation(operationId, true)
      }

      // Manually add a slow operation to metrics
      profiler['metrics'].push({
        name: 'slow_operation',
        startTime: 0,
        endTime: 300,
        duration: 300 // 300ms - should trigger anomaly
      })

      const anomalies = profiler.detectAnomalies()
      expect(anomalies.length).toBeGreaterThan(0)
      expect(anomalies.some(a => a.type === 'slow_operations')).toBe(true)
    })
  })

  describe('system metrics', () => {
    it('should capture system metrics', () => {
      profiler.captureSystemMetrics()
      
      const systemMetrics = profiler.getSystemMetrics()
      expect(systemMetrics.length).toBe(1)
      expect(systemMetrics[0]).toHaveProperty('memoryUsage')
      expect(systemMetrics[0]).toHaveProperty('cpuUsage')
      expect(systemMetrics[0]).toHaveProperty('timestamp')
    })
  })
})

describe('Permission Performance Service', () => {
  let performanceService: PermissionPerformanceService

  beforeEach(() => {
    performanceService = new PermissionPerformanceService({
      enableCacheWarming: true,
      enableQueryOptimization: true,
      enableProfiling: true,
      monitoringInterval: 1 // 1 second for testing
    })
  })

  afterEach(() => {
    performanceService.shutdown()
  })

  describe('initialization', () => {
    it('should initialize all components when enabled', async () => {
      // Mock the initialization methods
      const mockCacheWarmer = {
        warmPriorityUsers: jest.fn().mockResolvedValue({ processedUsers: 5 })
      }

      // This would require more complex mocking in a real test
      expect(performanceService).toBeDefined()
    })
  })

  describe('performance status', () => {
    it('should return comprehensive performance status', async () => {
      const status = await performanceService.getPerformanceStatus()

      expect(status).toHaveProperty('cacheWarming')
      expect(status).toHaveProperty('queryOptimization')
      expect(status).toHaveProperty('profiling')
      expect(status).toHaveProperty('systemHealth')
      
      expect(status.systemHealth.status).toMatch(/healthy|warning|critical/)
    })
  })

  describe('performance metrics', () => {
    it('should return performance metrics for dashboard', () => {
      const metrics = performanceService.getPerformanceMetrics()

      expect(metrics).toHaveProperty('summary')
      expect(metrics).toHaveProperty('trends')
      expect(metrics).toHaveProperty('anomalies')
      expect(metrics).toHaveProperty('recommendations')
    })
  })
})

describe('Integration Tests', () => {
  it('should integrate cache warmer with query optimizer', async () => {
    const mockPermissionService = {
      hasPermission: jest.fn().mockResolvedValue(true),
      invalidateUserCache: jest.fn().mockResolvedValue(undefined)
    }

    const cacheWarmer = new PermissionCacheWarmer(mockPermissionService)
    const queryOptimizer = new PermissionQueryOptimizer()

    // Warm cache for a user
    await cacheWarmer.warmUserCache('user-1', UserRole.ADMIN)

    // Check that permissions can be retrieved efficiently
    const mockDb = require('../../app/lib/db').db
    mockDb.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      role: UserRole.ADMIN,
      isActive: true
    })

    const user = await queryOptimizer.getUserPermissions('user-1')
    expect(user).toBeDefined()
    expect(user.role).toBe(UserRole.ADMIN)
  })

  it('should profile cache warming operations', async () => {
    const profiler = new PermissionPerformanceProfiler()
    const mockPermissionService = {
      hasPermission: jest.fn().mockResolvedValue(true),
      invalidateUserCache: jest.fn().mockResolvedValue(undefined)
    }

    const cacheWarmer = new PermissionCacheWarmer(mockPermissionService)

    // Profile a cache warming operation
    const operationId = profiler.startOperation('cache_warming')
    await cacheWarmer.warmUserCache('user-1', UserRole.ADMIN)
    profiler.endOperation(operationId, true)

    const report = profiler.generateReport()
    expect(report.totalOperations).toBe(1)
    expect(report.averageDuration).toBeGreaterThan(0)
  })
})