import { db } from './db'
import { CacheService } from './cache'

export interface SystemHealthMetrics {
  timestamp: Date
  permissionSystem: {
    status: 'healthy' | 'degraded' | 'critical'
    cacheHitRate: number
    avgResponseTime: number
    errorRate: number
    activeUsers: number
  }
  database: {
    status: 'healthy' | 'degraded' | 'critical'
    connectionCount: number
    avgQueryTime: number
    slowQueries: number
  }
  api: {
    status: 'healthy' | 'degraded' | 'critical'
    requestsPerMinute: number
    errorRate: number
    avgResponseTime: number
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  alerts: SystemAlert[]
}

export interface SystemAlert {
  id: string
  type: 'performance' | 'security' | 'error' | 'capacity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: Date
  resolved: boolean
  details?: Record<string, any>
}

export class SystemHealthMonitor {
  private static instance: SystemHealthMonitor
  private metrics: SystemHealthMetrics[] = []
  private alerts: SystemAlert[] = []
  private thresholds = {
    cacheHitRate: 0.8, // 80% minimum
    avgResponseTime: 100, // 100ms maximum
    errorRate: 0.05, // 5% maximum
    memoryUsage: 0.85, // 85% maximum
    dbQueryTime: 50 // 50ms maximum
  }

  static getInstance(): SystemHealthMonitor {
    if (!SystemHealthMonitor.instance) {
      SystemHealthMonitor.instance = new SystemHealthMonitor()
    }
    return SystemHealthMonitor.instance
  }

  async collectMetrics(): Promise<SystemHealthMetrics> {
    const timestamp = new Date()
    
    const [permissionMetrics, dbMetrics, apiMetrics, memoryMetrics] = await Promise.all([
      this.getPermissionSystemMetrics(),
      this.getDatabaseMetrics(),
      this.getApiMetrics(),
      this.getMemoryMetrics()
    ])

    const metrics: SystemHealthMetrics = {
      timestamp,
      permissionSystem: permissionMetrics,
      database: dbMetrics,
      api: apiMetrics,
      memory: memoryMetrics,
      alerts: this.getActiveAlerts()
    }

    // Store metrics for historical analysis
    this.metrics.push(metrics)
    
    // Keep only last 1000 metrics (about 16 hours at 1-minute intervals)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }

    // Check for alerts
    await this.checkAlerts(metrics)

    return metrics
  }

  private async getPermissionSystemMetrics() {
    try {
      // Get cache statistics
      const cacheStats = await this.getCacheStatistics()
      
      // Get active user count
      const activeUsers = await this.getActiveUserCount()
      
      // Calculate permission check performance
      const permissionStats = await this.getPermissionCheckStats()

      const status = this.determinePermissionSystemStatus(cacheStats, permissionStats)

      return {
        status,
        cacheHitRate: cacheStats.hitRate,
        avgResponseTime: permissionStats.avgResponseTime,
        errorRate: permissionStats.errorRate,
        activeUsers
      }
    } catch (error) {
      console.error('Error collecting permission system metrics:', error)
      return {
        status: 'critical' as const,
        cacheHitRate: 0,
        avgResponseTime: 0,
        errorRate: 1,
        activeUsers: 0
      }
    }
  }

  private async getDatabaseMetrics() {
    try {
      // Get database connection info
      const connectionCount = await this.getDatabaseConnectionCount()
      
      // Get query performance stats
      const queryStats = await this.getDatabaseQueryStats()

      const status = this.determineDatabaseStatus(connectionCount, queryStats)

      return {
        status,
        connectionCount,
        avgQueryTime: queryStats.avgTime,
        slowQueries: queryStats.slowQueries
      }
    } catch (error) {
      console.error('Error collecting database metrics:', error)
      return {
        status: 'critical' as const,
        connectionCount: 0,
        avgQueryTime: 0,
        slowQueries: 0
      }
    }
  }

  private async getApiMetrics() {
    try {
      // These would typically come from application metrics
      const apiStats = await this.getApiStatistics()

      const status = this.determineApiStatus(apiStats)

      return {
        status,
        requestsPerMinute: apiStats.requestsPerMinute,
        errorRate: apiStats.errorRate,
        avgResponseTime: apiStats.avgResponseTime
      }
    } catch (error) {
      console.error('Error collecting API metrics:', error)
      return {
        status: 'critical' as const,
        requestsPerMinute: 0,
        errorRate: 1,
        avgResponseTime: 0
      }
    }
  }

  private async getMemoryMetrics() {
    const used = process.memoryUsage().heapUsed
    const total = process.memoryUsage().heapTotal
    const percentage = used / total

    return {
      used,
      total,
      percentage
    }
  }

  private async getCacheStatistics() {
    // Mock implementation - in real app, this would query Redis or cache service
    return {
      hitRate: 0.85,
      hits: 1000,
      misses: 150,
      totalRequests: 1150
    }
  }

  private async getActiveUserCount(): Promise<number> {
    try {
      // Count active sessions in the last 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
      
      const result = await db.session.count({
        where: {
          expires: {
            gt: new Date()
          },
          // Assuming we track last activity
          updatedAt: {
            gte: thirtyMinutesAgo
          }
        }
      })

      return result
    } catch (error) {
      console.error('Error getting active user count:', error)
      return 0
    }
  }

  private async getPermissionCheckStats() {
    // Mock implementation - in real app, this would come from metrics collection
    return {
      avgResponseTime: 45,
      errorRate: 0.02,
      totalChecks: 5000,
      errors: 100
    }
  }

  private async getDatabaseConnectionCount(): Promise<number> {
    try {
      // This would query the database for active connections
      // Mock implementation
      return 10
    } catch (error) {
      console.error('Error getting database connection count:', error)
      return 0
    }
  }

  private async getDatabaseQueryStats() {
    // Mock implementation - in real app, this would query database performance stats
    return {
      avgTime: 25,
      slowQueries: 5,
      totalQueries: 1000
    }
  }

  private async getApiStatistics() {
    // Mock implementation - in real app, this would come from API gateway or metrics service
    return {
      requestsPerMinute: 150,
      errorRate: 0.03,
      avgResponseTime: 120,
      totalRequests: 9000,
      errors: 270
    }
  }

  private determinePermissionSystemStatus(cacheStats: any, permissionStats: any): 'healthy' | 'degraded' | 'critical' {
    if (permissionStats.errorRate > 0.1 || permissionStats.avgResponseTime > 200) {
      return 'critical'
    }
    if (cacheStats.hitRate < this.thresholds.cacheHitRate || permissionStats.avgResponseTime > this.thresholds.avgResponseTime) {
      return 'degraded'
    }
    return 'healthy'
  }

  private determineDatabaseStatus(connectionCount: number, queryStats: any): 'healthy' | 'degraded' | 'critical' {
    if (connectionCount > 50 || queryStats.avgTime > 100) {
      return 'critical'
    }
    if (queryStats.avgTime > this.thresholds.dbQueryTime || queryStats.slowQueries > 10) {
      return 'degraded'
    }
    return 'healthy'
  }

  private determineApiStatus(apiStats: any): 'healthy' | 'degraded' | 'critical' {
    if (apiStats.errorRate > 0.1 || apiStats.avgResponseTime > 500) {
      return 'critical'
    }
    if (apiStats.errorRate > this.thresholds.errorRate || apiStats.avgResponseTime > 200) {
      return 'degraded'
    }
    return 'healthy'
  }

  private async checkAlerts(metrics: SystemHealthMetrics) {
    const newAlerts: SystemAlert[] = []

    // Check cache hit rate
    if (metrics.permissionSystem.cacheHitRate < this.thresholds.cacheHitRate) {
      newAlerts.push({
        id: `cache-hit-rate-${Date.now()}`,
        type: 'performance',
        severity: 'medium',
        message: `Permission cache hit rate is low: ${(metrics.permissionSystem.cacheHitRate * 100).toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false,
        details: { hitRate: metrics.permissionSystem.cacheHitRate }
      })
    }

    // Check response time
    if (metrics.permissionSystem.avgResponseTime > this.thresholds.avgResponseTime) {
      newAlerts.push({
        id: `response-time-${Date.now()}`,
        type: 'performance',
        severity: metrics.permissionSystem.avgResponseTime > 200 ? 'high' : 'medium',
        message: `Permission system response time is high: ${metrics.permissionSystem.avgResponseTime}ms`,
        timestamp: new Date(),
        resolved: false,
        details: { responseTime: metrics.permissionSystem.avgResponseTime }
      })
    }

    // Check memory usage
    if (metrics.memory.percentage > this.thresholds.memoryUsage) {
      newAlerts.push({
        id: `memory-usage-${Date.now()}`,
        type: 'capacity',
        severity: metrics.memory.percentage > 0.95 ? 'critical' : 'high',
        message: `High memory usage: ${(metrics.memory.percentage * 100).toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false,
        details: { memoryUsage: metrics.memory.percentage }
      })
    }

    // Check error rates
    if (metrics.permissionSystem.errorRate > this.thresholds.errorRate) {
      newAlerts.push({
        id: `error-rate-${Date.now()}`,
        type: 'error',
        severity: metrics.permissionSystem.errorRate > 0.1 ? 'critical' : 'high',
        message: `High permission system error rate: ${(metrics.permissionSystem.errorRate * 100).toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false,
        details: { errorRate: metrics.permissionSystem.errorRate }
      })
    }

    // Add new alerts
    this.alerts.push(...newAlerts)

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }
  }

  getActiveAlerts(): SystemAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  getAllAlerts(): SystemAlert[] {
    return [...this.alerts]
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      return true
    }
    return false
  }

  getHistoricalMetrics(hours: number = 24): SystemHealthMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.metrics.filter(m => m.timestamp >= cutoff)
  }

  getSystemStatus(): 'healthy' | 'degraded' | 'critical' {
    if (this.metrics.length === 0) return 'critical'
    
    const latest = this.metrics[this.metrics.length - 1]
    const statuses = [
      latest.permissionSystem.status,
      latest.database.status,
      latest.api.status
    ]

    if (statuses.includes('critical')) return 'critical'
    if (statuses.includes('degraded')) return 'degraded'
    return 'healthy'
  }
}

export const systemHealthMonitor = SystemHealthMonitor.getInstance()