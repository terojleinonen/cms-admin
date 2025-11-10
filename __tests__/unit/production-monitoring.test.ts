/**
 * Production Monitoring System Tests
 * Tests for production health monitoring, backup/recovery, and maintenance procedures
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock Prisma BEFORE importing modules that use it
const mockPrisma = {
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
  $disconnect: jest.fn(),
  permissionCache: {
    count: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn()
  },
  user: {
    count: jest.fn(),
    findMany: jest.fn()
  },
  securityEvent: {
    count: jest.fn(),
    create: jest.fn()
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn()
  }
}

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}))

// Import AFTER mocking
import { ProductionHealthMonitor } from '../../app/lib/production-health-monitor'
import { BackupRecoverySystem } from '../../app/lib/backup-recovery-system'
import { MaintenanceProcedures } from '../../app/lib/maintenance-procedures'

describe('ProductionHealthMonitor', () => {
  let healthMonitor: ProductionHealthMonitor

  beforeEach(() => {
    healthMonitor = new ProductionHealthMonitor()
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await healthMonitor.cleanup()
  })

  describe('getSystemHealth', () => {
    it('should return healthy status when all metrics are good', async () => {
      // Mock successful database query
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }])
      mockPrisma.permissionCache.count.mockResolvedValue(100)
      mockPrisma.user.count.mockResolvedValue(50)
      mockPrisma.securityEvent.count.mockResolvedValue(0)

      const health = await healthMonitor.getSystemHealth()

      expect(health.overall).toBe('healthy')
      expect(health.metrics).toHaveLength(5) // database, permission_cache, memory, active_sessions, security_events
      expect(health.uptime).toBeGreaterThan(0)
    })

    it('should return critical status when database is down', async () => {
      // Mock database failure
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'))
      mockPrisma.permissionCache.count.mockResolvedValue(100)
      mockPrisma.user.count.mockResolvedValue(50)
      mockPrisma.securityEvent.count.mockResolvedValue(0)

      const health = await healthMonitor.getSystemHealth()

      expect(health.overall).toBe('critical')
      const dbMetric = health.metrics.find(m => m.name === 'database')
      expect(dbMetric?.status).toBe('critical')
    })

    it('should return warning status when metrics are degraded', async () => {
      // Mock slow database response
      mockPrisma.$queryRaw.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ result: 1 }]), 200))
      )
      mockPrisma.permissionCache.count.mockResolvedValue(100)
      mockPrisma.user.count.mockResolvedValue(50)
      mockPrisma.securityEvent.count.mockResolvedValue(0)

      const health = await healthMonitor.getSystemHealth()

      const dbMetric = health.metrics.find(m => m.name === 'database')
      expect(dbMetric?.status).toBe('warning')
    })
  })

  describe('logHealthMetrics', () => {
    it('should log health metrics to audit system', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }])
      mockPrisma.permissionCache.count.mockResolvedValue(100)
      mockPrisma.user.count.mockResolvedValue(50)
      mockPrisma.securityEvent.count.mockResolvedValue(0)
      mockPrisma.auditLog.create.mockResolvedValue({})

      await healthMonitor.logHealthMetrics()

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'system',
          action: 'HEALTH_CHECK',
          resource: 'system',
          success: true
        })
      })
    })
  })
})

describe('BackupRecoverySystem', () => {
  let backupSystem: BackupRecoverySystem

  beforeEach(() => {
    backupSystem = new BackupRecoverySystem('./test-backups', 5)
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await backupSystem.cleanup()
  })

  describe('createRBACOnlyBackup', () => {
    it('should create RBAC-only backup successfully', async () => {
      // Mock database queries
      mockPrisma.user.findMany.mockResolvedValue([
        { id: '1', email: 'test@example.com', role: 'ADMIN' }
      ])
      mockPrisma.permissionCache.findMany.mockResolvedValue([])
      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.securityEvent.findMany.mockResolvedValue([])

      // Mock file system operations
      const fs = require('fs/promises')
      jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined)
      jest.spyOn(fs, 'access').mockRejectedValue(new Error('Not found'))
      jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined)

      const backup = await backupSystem.createRBACOnlyBackup()

      expect(backup.type).toBe('rbac_only')
      expect(backup.status).toBe('completed')
      expect(backup.tables).toContain('User')
      expect(backup.size).toBeGreaterThan(0)
      expect(backup.checksum).toBeTruthy()
    })

    it('should handle backup creation failure', async () => {
      // Mock database failure
      mockPrisma.user.findMany.mockRejectedValue(new Error('Database error'))

      await expect(backupSystem.createRBACOnlyBackup()).rejects.toThrow('Database error')
    })
  })

  describe('verifyBackup', () => {
    it('should verify backup integrity', async () => {
      const backupId = 'test-backup-123'
      
      // Mock backup metadata
      mockPrisma.$queryRaw.mockResolvedValue([{
        id: backupId,
        type: 'rbac_only',
        checksum: 'test-checksum'
      }])

      // Mock file read
      const fs = require('fs/promises')
      const testData = JSON.stringify({ test: 'data' })
      jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from(testData))

      // Mock crypto hash
      const crypto = require('crypto')
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test-checksum')
      }
      jest.spyOn(crypto, 'createHash').mockReturnValue(mockHash)

      const isValid = await backupSystem.verifyBackup(backupId)

      expect(isValid).toBe(true)
    })
  })
})

describe('MaintenanceProcedures', () => {
  let maintenanceProcedures: MaintenanceProcedures

  beforeEach(() => {
    maintenanceProcedures = new MaintenanceProcedures()
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await maintenanceProcedures.cleanup()
  })

  describe('runMaintenanceTask', () => {
    it('should run permission cache cleanup task', async () => {
      mockPrisma.permissionCache.deleteMany.mockResolvedValue({ count: 10 })
      mockPrisma.auditLog.create.mockResolvedValue({})

      const result = await maintenanceProcedures.runMaintenanceTask('permission_cache_cleanup')

      expect(result.status).toBe('completed')
      expect(result.duration).toBeGreaterThan(0)
      expect(mockPrisma.permissionCache.deleteMany).toHaveBeenCalled()
    })

    it('should handle task failure', async () => {
      mockPrisma.permissionCache.deleteMany.mockRejectedValue(new Error('Database error'))
      mockPrisma.auditLog.create.mockResolvedValue({})

      await expect(
        maintenanceProcedures.runMaintenanceTask('permission_cache_cleanup')
      ).rejects.toThrow('Database error')
    })

    it('should throw error for unknown task', async () => {
      await expect(
        maintenanceProcedures.runMaintenanceTask('unknown_task')
      ).rejects.toThrow('Maintenance task not found: unknown_task')
    })
  })

  describe('enableMaintenanceMode', () => {
    it('should enable maintenance mode and log event', async () => {
      mockPrisma.securityEvent.create.mockResolvedValue({})

      await maintenanceProcedures.enableMaintenanceMode('System update')

      expect(mockPrisma.securityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'SUSPICIOUS_ACTIVITY',
          severity: 'MEDIUM',
          details: expect.objectContaining({
            type: 'MAINTENANCE_MODE_ENABLED',
            reason: 'System update'
          })
        })
      })

      const status = maintenanceProcedures.getMaintenanceStatus()
      expect(status.isMaintenanceMode).toBe(true)
    })
  })

  describe('runDailyMaintenance', () => {
    it('should run all daily maintenance tasks', async () => {
      // Mock all required database operations
      mockPrisma.permissionCache.deleteMany.mockResolvedValue({ count: 5 })
      mockPrisma.securityEvent.deleteMany.mockResolvedValue({ count: 3 })
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }])
      mockPrisma.permissionCache.count.mockResolvedValue(100)
      mockPrisma.user.count.mockResolvedValue(50)
      mockPrisma.securityEvent.count.mockResolvedValue(0)
      mockPrisma.auditLog.create.mockResolvedValue({})

      await maintenanceProcedures.runDailyMaintenance()

      // Verify that daily tasks were executed
      expect(mockPrisma.permissionCache.deleteMany).toHaveBeenCalled()
      expect(mockPrisma.securityEvent.deleteMany).toHaveBeenCalled()
    })
  })
})

describe('Production Monitoring Integration', () => {
  it('should integrate all monitoring components', async () => {
    const healthMonitor = new ProductionHealthMonitor()
    const backupSystem = new BackupRecoverySystem('./test-backups')
    const maintenance = new MaintenanceProcedures()

    // Mock all dependencies
    mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }])
    mockPrisma.permissionCache.count.mockResolvedValue(100)
    mockPrisma.user.count.mockResolvedValue(50)
    mockPrisma.securityEvent.count.mockResolvedValue(0)
    mockPrisma.auditLog.create.mockResolvedValue({})

    // Test health monitoring
    const health = await healthMonitor.getSystemHealth()
    expect(health.overall).toBeDefined()

    // Test maintenance status
    const status = maintenance.getMaintenanceStatus()
    expect(status.availableTasks).toContain('permission_cache_cleanup')

    // Cleanup
    await healthMonitor.cleanup()
    await backupSystem.cleanup()
    await maintenance.cleanup()
  })
})