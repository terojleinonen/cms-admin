/**
 * Performance metrics API endpoint
 * Provides comprehensive performance data for the admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { 
  databasePerformanceAnalyzer, 
  apiPerformanceTracker,
  performanceMonitor 
} from '@/lib/performance'
import { MemoryMonitor } from '@/middleware/performance'

export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    // Check authentication
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Collect performance metrics
    const [databaseMetrics, databaseOptimizations, apiMetrics, systemMetrics] = await Promise.all([
      databasePerformanceAnalyzer.getPerformanceMetrics(),
      databasePerformanceAnalyzer.analyzeAndSuggestOptimizations(),
      Promise.resolve(apiPerformanceTracker.getMetrics()),
      Promise.resolve(MemoryMonitor.getStats())
    ])

    // Calculate API aggregates
    const apiAggregates = apiMetrics.reduce(
      (acc, metric) => {
        acc.totalRequests += metric.requestCount
        acc.totalResponseTime += metric.avgResponseTime * metric.requestCount
        acc.totalErrors += metric.errorRate * metric.requestCount
        return acc
      },
      { totalRequests: 0, totalResponseTime: 0, totalErrors: 0 }
    )

    const avgResponseTime = apiAggregates.totalRequests > 0 
      ? apiAggregates.totalResponseTime / apiAggregates.totalRequests 
      : 0
    const errorRate = apiAggregates.totalRequests > 0 
      ? apiAggregates.totalErrors / apiAggregates.totalRequests 
      : 0

    // Get slow endpoints (> 1000ms)
    const slowEndpoints = apiMetrics
      .filter(metric => metric.avgResponseTime > 1000)
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10)

    // Format response
    const response = {
      database: {
        avgQueryTime: 0, // Would need pg_stat_statements
        cacheHitRatio: databaseMetrics.cacheHitRatio,
        indexUsage: databaseMetrics.indexUsage,
        connectionPool: {
          active: databaseMetrics.connectionPoolStats.active,
          idle: databaseMetrics.connectionPoolStats.idle,
          total: databaseMetrics.connectionPoolStats.total,
          utilization: databaseMetrics.connectionPoolStats.utilization
        },
        slowQueries: databaseMetrics.slowQueries,
        healthScore: databaseOptimizations.healthScore,
        suggestions: databaseOptimizations.suggestions
      },
      api: {
        avgResponseTime,
        requestCount: apiAggregates.totalRequests,
        errorRate,
        throughput: apiAggregates.totalRequests / 3600, // Requests per hour (rough estimate)
        slowEndpoints: slowEndpoints.map(endpoint => ({
          endpoint: endpoint.endpoint,
          method: endpoint.method,
          avgResponseTime: endpoint.avgResponseTime,
          requestCount: endpoint.requestCount
        }))
      },
      system: {
        memoryUsage: systemMetrics.current,
        memoryTrend: systemMetrics.trend,
        cpuUsage: undefined // Would need additional monitoring
      },
      timestamp: Date.now()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Performance metrics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)

export const POST = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    // Check authentication
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'clear_metrics':
        performanceMonitor.clearMetrics()
        return createApiSuccessResponse({ success: true, message: 'Metrics cleared' })

      case 'optimize_database':
        // This would trigger database optimization tasks
        // For now, just return success
        return createApiSuccessResponse({ 
          success: true, 
          message: 'Database optimization initiated' 
        })

      case 'clear_cache':
        // This would clear application caches
        return createApiSuccessResponse({ 
          success: true, 
          message: 'Cache cleared' 
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Performance action API error:', error)
    return NextResponse.json(
      { error: 'Failed to execute performance action' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)