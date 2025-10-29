import { SystemHealthMonitor } from '../../app/lib/system-health-monitor'

// Mock dependencies
jest.mock('../../app/lib/db', () => ({
  db: {
    session: {
      count: jest.fn().mockResolvedValue(5)
    }
  }
}))

jest.mock('../../app/lib/cache', () => ({
  cache: {}
}))

describe('SystemHealthMonitor', () => {
  let monitor: SystemHealthMonitor

  beforeEach(() => {
    monitor = SystemHealthMonitor.getInstance()
  })

  describe('collectMetrics', () => {
    it('should collect system health metrics', async () => {
      const metrics = await monitor.collectMetrics()

      expect(metrics).toBeDefined()
      expect(metrics.timestamp).toBeInstanceOf(Date)
      expect(metrics.permissionSystem).toBeDefined()
      expect(metrics.database).toBeDefined()
      expect(metrics.api).toBeDefined()
      expect(metrics.memory).toBeDefined()
      expect(metrics.alerts).toBeInstanceOf(Array)
    })

    it('should include permission system metrics', async () => {
      const metrics = await monitor.collectMetrics()

      expect(metrics.permissionSystem.status).toMatch(/^(healthy|degraded|critical)$/)
      expect(typeof metrics.permissionSystem.cacheHitRate).toBe('number')
      expect(typeof metrics.permissionSystem.avgResponseTime).toBe('number')
      expect(typeof metrics.permissionSystem.errorRate).toBe('number')
      expect(typeof metrics.permissionSystem.activeUsers).toBe('number')
    })

    it('should include database metrics', async () => {
      const metrics = await monitor.collectMetrics()

      expect(metrics.database.status).toMatch(/^(healthy|degraded|critical)$/)
      expect(typeof metrics.database.connectionCount).toBe('number')
      expect(typeof metrics.database.avgQueryTime).toBe('number')
      expect(typeof metrics.database.slowQueries).toBe('number')
    })

    it('should include API metrics', async () => {
      const metrics = await monitor.collectMetrics()

      expect(metrics.api.status).toMatch(/^(healthy|degraded|critical)$/)
      expect(typeof metrics.api.requestsPerMinute).toBe('number')
      expect(typeof metrics.api.errorRate).toBe('number')
      expect(typeof metrics.api.avgResponseTime).toBe('number')
    })

    it('should include memory metrics', async () => {
      const metrics = await monitor.collectMetrics()

      expect(typeof metrics.memory.used).toBe('number')
      expect(typeof metrics.memory.total).toBe('number')
      expect(typeof metrics.memory.percentage).toBe('number')
      expect(metrics.memory.percentage).toBeGreaterThanOrEqual(0)
      expect(metrics.memory.percentage).toBeLessThanOrEqual(1)
    })
  })

  describe('getSystemStatus', () => {
    it('should return overall system status', async () => {
      // Collect some metrics first
      await monitor.collectMetrics()
      
      const status = monitor.getSystemStatus()
      expect(status).toMatch(/^(healthy|degraded|critical)$/)
    })

    it('should return critical if no metrics available', () => {
      // Create a new instance with no metrics
      const newMonitor = new (SystemHealthMonitor as any)()
      const status = newMonitor.getSystemStatus()
      expect(status).toBe('critical')
    })
  })

  describe('alert management', () => {
    it('should track active alerts', async () => {
      const metrics = await monitor.collectMetrics()
      const activeAlerts = monitor.getActiveAlerts()
      
      expect(Array.isArray(activeAlerts)).toBe(true)
      // Active alerts should be a subset of all alerts
      expect(activeAlerts.every(alert => !alert.resolved)).toBe(true)
    })

    it('should resolve alerts', async () => {
      // First collect metrics to potentially generate alerts
      await monitor.collectMetrics()
      
      const allAlerts = monitor.getAllAlerts()
      if (allAlerts.length > 0) {
        const alertId = allAlerts[0].id
        const resolved = monitor.resolveAlert(alertId)
        expect(resolved).toBe(true)
        
        const updatedAlert = monitor.getAllAlerts().find(a => a.id === alertId)
        expect(updatedAlert?.resolved).toBe(true)
      }
    })

    it('should return false when resolving non-existent alert', () => {
      const resolved = monitor.resolveAlert('non-existent-id')
      expect(resolved).toBe(false)
    })
  })

  describe('historical metrics', () => {
    it('should return historical metrics within time range', async () => {
      // Collect some metrics
      await monitor.collectMetrics()
      
      const historical = monitor.getHistoricalMetrics(1) // Last 1 hour
      expect(Array.isArray(historical)).toBe(true)
      
      // All metrics should be within the time range
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      historical.forEach(metric => {
        expect(metric.timestamp.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime())
      })
    })

    it('should limit historical metrics to specified hours', async () => {
      // Collect metrics multiple times to build history
      await monitor.collectMetrics()
      await monitor.collectMetrics()
      
      const historical24h = monitor.getHistoricalMetrics(24)
      const historical1h = monitor.getHistoricalMetrics(1)
      
      expect(historical1h.length).toBeLessThanOrEqual(historical24h.length)
    })
  })
})