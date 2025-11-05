/**
 * Production Health Monitor
 * Comprehensive health monitoring for production RBAC system
 */

import { PrismaClient } from '@prisma/client'
import { performance } from 'perf_hooks'

interface HealthMetric {
  name: string
  status: 'healthy' | 'warning' | 'critical'
  value: number
  threshold: number
  unit: string
  timestamp: Date
  details?: Record<string, any>
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical'
  metrics: HealthMetric[]
  timestamp: Date
  uptime: number
}

export class ProductionHealthMonitor {
  private prisma: PrismaClient
  private startTime: Date
  private healthChecks: Map<string, () => Promise<HealthMetric>>

  constructor() {
    this.prisma = new PrismaClient()
    this.startTime = new Date()
    this.healthChecks = new Map()
    this.initializeHealthChecks()
  }

  private initializeHealthChecks() {
    // Database connectivity check
    this.healthChecks.set('database', async () => {
      const start = performance.now()
      try {
        await this.prisma.$queryRaw`SELECT 1`
        const responseTime = performance.now() - start
        return {
          name: 'database',
          status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'warning' : 'critical',
          value: responseTime,
          threshold: 100,
          unit: 'ms',
          timestamp: new Date()
        }
      } catch (error) {
        return {
          name: 'database',
          status: 'critical' as const,
          value: -1,
          threshold: 100,
          unit: 'ms',
          timestamp: new Date(),
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }
    })

    // Permission cache performance (in-memory cache)
    this.healthChecks.set('permission_cache', async () => {
      const start = performance.now()
      try {
        // Simulate cache check since we're using in-memory cache
        const responseTime = performance.now() - start
        return {
          name: 'permission_cache',
          status: responseTime < 50 ? 'healthy' : responseTime < 200 ? 'warning' : 'critical',
          value: responseTime,
          threshold: 50,
          unit: 'ms',
          timestamp: new Date(),
          details: { cache_type: 'in_memory' }
        }
      } catch (error) {
        return {
          name: 'permission_cache',
          status: 'critical' as const,
          value: -1,
          threshold: 50,
          unit: 'ms',
          timestamp: new Date(),
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }
    })

    // Memory usage check
    this.healthChecks.set('memory', async () => {
      const memUsage = process.memoryUsage()
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024
      const usagePercent = (heapUsedMB / heapTotalMB) * 100

      return {
        name: 'memory',
        status: usagePercent < 70 ? 'healthy' : usagePercent < 85 ? 'warning' : 'critical',
        value: usagePercent,
        threshold: 70,
        unit: '%',
        timestamp: new Date(),
        details: {
          heap_used_mb: Math.round(heapUsedMB),
          heap_total_mb: Math.round(heapTotalMB),
          rss_mb: Math.round(memUsage.rss / 1024 / 1024)
        }
      }
    })

    // Active sessions check
    this.healthChecks.set('active_sessions', async () => {
      try {
        const activeUsers = await this.prisma.user.count({
          where: {
            lastLoginAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        })

        return {
          name: 'active_sessions',
          status: activeUsers < 1000 ? 'healthy' : activeUsers < 5000 ? 'warning' : 'critical',
          value: activeUsers,
          threshold: 1000,
          unit: 'users',
          timestamp: new Date()
        }
      } catch (error) {
        return {
          name: 'active_sessions',
          status: 'critical' as const,
          value: -1,
          threshold: 1000,
          unit: 'users',
          timestamp: new Date(),
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }
    })

    // Security events check using AuditLog
    this.healthChecks.set('security_events', async () => {
      try {
        const recentSecurityEvents = await this.prisma.auditLog.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
            },
            action: { startsWith: 'SECURITY_EVENT_' },
            details: {
              path: ['severity'],
              in: ['HIGH', 'CRITICAL']
            }
          }
        })

        return {
          name: 'security_events',
          status: recentSecurityEvents === 0 ? 'healthy' : recentSecurityEvents < 5 ? 'warning' : 'critical',
          value: recentSecurityEvents,
          threshold: 0,
          unit: 'events',
          timestamp: new Date()
        }
      } catch (error) {
        return {
          name: 'security_events',
          status: 'critical' as const,
          value: -1,
          threshold: 0,
          unit: 'events',
          timestamp: new Date(),
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }
    })
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const metrics: HealthMetric[] = []
    
    // Run all health checks in parallel
    const healthCheckPromises = Array.from(this.healthChecks.entries()).map(
      async ([name, check]) => {
        try {
          return await check()
        } catch (error) {
          return {
            name,
            status: 'critical' as const,
            value: -1,
            threshold: 0,
            unit: 'error',
            timestamp: new Date(),
            details: { error: error instanceof Error ? error.message : 'Unknown error' }
          }
        }
      }
    )

    const results = await Promise.all(healthCheckPromises)
    metrics.push(...results)

    // Determine overall health status
    const criticalCount = metrics.filter(m => m.status === 'critical').length
    const warningCount = metrics.filter(m => m.status === 'warning').length
    
    let overall: 'healthy' | 'warning' | 'critical'
    if (criticalCount > 0) {
      overall = 'critical'
    } else if (warningCount > 0) {
      overall = 'warning'
    } else {
      overall = 'healthy'
    }

    const uptime = Date.now() - this.startTime.getTime()

    return {
      overall,
      metrics,
      timestamp: new Date(),
      uptime
    }
  }

  async logHealthMetrics(): Promise<void> {
    const health = await this.getSystemHealth()
    
    // Log to audit system
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'system',
          action: 'HEALTH_CHECK',
          resource: 'system',
          details: {
            overall_status: health.overall,
            metrics: health.metrics,
            uptime: health.uptime
          },
          ipAddress: '127.0.0.1',
          userAgent: 'ProductionHealthMonitor'
        }
      })
    } catch (error) {
      console.error('Failed to log health metrics:', error)
    }
  }

  async startContinuousMonitoring(intervalMs: number = 60000): Promise<void> {
    console.log('Starting continuous health monitoring...')
    
    const monitor = async () => {
      try {
        await this.logHealthMetrics()
        const health = await this.getSystemHealth()
        
        if (health.overall === 'critical') {
          console.error('CRITICAL: System health is critical!', health)
          await this.triggerAlert(health)
        } else if (health.overall === 'warning') {
          console.warn('WARNING: System health degraded', health)
        }
      } catch (error) {
        console.error('Health monitoring error:', error)
      }
    }

    // Initial check
    await monitor()
    
    // Schedule recurring checks
    setInterval(monitor, intervalMs)
  }

  private async triggerAlert(health: SystemHealth): Promise<void> {
    // Create security event for critical health issues using AuditLog
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'system',
          action: 'SECURITY_EVENT_SYSTEM_HEALTH_CRITICAL',
          resource: 'system',
          details: {
            type: 'SYSTEM_HEALTH_CRITICAL',
            severity: 'CRITICAL',
            health_status: health.overall,
            critical_metrics: health.metrics.filter(m => m.status === 'critical'),
            timestamp: health.timestamp
          },
          ipAddress: '127.0.0.1',
          userAgent: 'ProductionHealthMonitor'
        }
      })
    } catch (error) {
      console.error('Failed to create security event for health alert:', error)
    }
  }

  async cleanup(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

// Singleton instance for production use
export const productionHealthMonitor = new ProductionHealthMonitor()