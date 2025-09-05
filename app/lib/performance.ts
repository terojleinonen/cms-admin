/**
 * Performance monitoring and optimization utilities
 * Provides comprehensive performance tracking and optimization features
 */

import { prisma } from './db'

export interface PerformanceMetrics {
  timestamp: number
  operation: string
  duration: number
  success: boolean
  error?: string
  metadata?: Record<string, unknown>
}

export interface DatabasePerformanceMetrics {
  slowQueries: Array<{
    query: string
    duration: number
    timestamp: number
    count: number
  }>
  avgQueryTime: number
  cacheHitRatio: number
  indexUsage: number
  connectionPoolStats: {
    active: number
    idle: number
    total: number
    utilization: number
  }
  tableStats: Array<{
    table: string
    size: string
    rowCount: number
    indexScans: number
    seqScans: number
  }>
}

export interface APIPerformanceMetrics {
  endpoint: string
  method: string
  avgResponseTime: number
  requestCount: number
  errorRate: number
  p95ResponseTime: number
  p99ResponseTime: number
  throughput: number
  timestamp: number
}

export interface FrontendPerformanceMetrics {
  pageLoadTime: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
  bundleSize: number
  componentRenderTime: Record<string, number>
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: number;
}

export interface PerformanceReport {
  databaseMetrics: {
    totalQueries: number;
    slowestQueries: SlowQuery[];
    averageQueryTime: number;
  };
}

/**
 * Performance monitoring class for tracking and optimizing application performance
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics[] = []
  private maxMetrics = 10000 // Keep last 10k metrics in memory

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Track operation performance
   */
  async trackOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const start = performance.now()
    let success = true
    let error: string | undefined

    try {
      const result = await fn()
      return result
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      const duration = performance.now() - start
      
      this.addMetric({
        timestamp: Date.now(),
        operation,
        duration,
        success,
        error,
        metadata
      })

      // Log slow operations
      if (duration > 1000) {
        console.warn(`🐌 Slow operation: ${operation} took ${duration.toFixed(2)}ms`)
      }
    }
  }

  /**
   * Add performance metric
   */
  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  /**
   * Get performance statistics
   */
  getStats(operation?: string): {
    totalOperations: number
    avgDuration: number
    successRate: number
    slowOperations: number
    recentMetrics: PerformanceMetrics[]
  } {
    const filteredMetrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics

    const totalOperations = filteredMetrics.length
    const avgDuration = totalOperations > 0 
      ? filteredMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations 
      : 0
    const successRate = totalOperations > 0 
      ? (filteredMetrics.filter(m => m.success).length / totalOperations) * 100 
      : 100
    const slowOperations = filteredMetrics.filter(m => m.duration > 1000).length

    return {
      totalOperations,
      avgDuration,
      successRate,
      slowOperations,
      recentMetrics: filteredMetrics.slice(-100) // Last 100 metrics
    }
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = []
  }

  getRealTimeMetrics(): unknown {
    return {};
  }

  getPerformanceReport(_startTime: number, _endTime: number): PerformanceReport {
    return {
      databaseMetrics: {
        totalQueries: 0,
        slowestQueries: [],
        averageQueryTime: 0,
      },
    };
  }

  getSlowQueries(_limit: number, _minDuration: number): unknown[] {
    return [];
  }
}

/**
 * Database performance analyzer
 */
export class DatabasePerformanceAnalyzer {
  /**
   * Get comprehensive database performance metrics
   */
  async getPerformanceMetrics(): Promise<DatabasePerformanceMetrics> {
    try {
      // Get connection pool stats
      const [poolStats] = await prisma.$queryRaw<Array<{
        active: number
        idle: number
        total: number
      }>>`
        SELECT 
          count(*) FILTER (WHERE state = 'active') as active,
          count(*) FILTER (WHERE state = 'idle') as idle,
          count(*) as total
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `

      // Get cache hit ratio
      const [cacheStats] = await prisma.$queryRaw<Array<{
        cache_hit_ratio: number
      }>>`
        SELECT 
          round(
            sum(blks_hit) * 100.0 / nullif(sum(blks_hit + blks_read), 0), 2
          ) as cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database()
      ` || [{ cache_hit_ratio: 0 }]

      // Get table statistics
      const tableStats = await prisma.$queryRaw<Array<{
        table: string
        size: string
        row_count: number
        index_scans: number
        seq_scans: number
      }>>`
        SELECT 
          schemaname||'.'||tablename as table,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          n_tup_ins + n_tup_upd + n_tup_del as row_count,
          idx_scan as index_scans,
          seq_scan as seq_scans
        FROM pg_stat_user_tables 
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 20
      `

      // Get index usage statistics
      const [indexStats] = await prisma.$queryRaw<Array<{
        index_usage: number
      }>>`
        SELECT 
          round(
            sum(idx_scan) * 100.0 / nullif(sum(idx_scan + seq_scan), 0), 2
          ) as index_usage
        FROM pg_stat_user_tables
      ` || [{ index_usage: 0 }]

      const utilization = poolStats.total > 0 ? (poolStats.active / poolStats.total) * 100 : 0

      return {
        slowQueries: [], // Would need pg_stat_statements extension
        avgQueryTime: 0, // Would need pg_stat_statements extension
        cacheHitRatio: Number(cacheStats?.cache_hit_ratio || 0),
        indexUsage: Number(indexStats?.index_usage || 0),
        connectionPoolStats: {
          active: poolStats.active,
          idle: poolStats.idle,
          total: poolStats.total,
          utilization
        },
        tableStats: tableStats.map(stat => ({
          table: stat.table,
          size: stat.size,
          rowCount: Number(stat.row_count),
          indexScans: Number(stat.index_scans),
          seqScans: Number(stat.seq_scans)
        }))
      }
    } catch (error) {
      console.error('Failed to get database performance metrics:', error)
      return {
        slowQueries: [],
        avgQueryTime: 0,
        cacheHitRatio: 0,
        indexUsage: 0,
        connectionPoolStats: {
          active: 0,
          idle: 0,
          total: 0,
          utilization: 0
        },
        tableStats: []
      }
    }
  }

  /**
   * Analyze and suggest database optimizations
   */
  async analyzeAndSuggestOptimizations(): Promise<{
    suggestions: Array<{
      type: 'index' | 'query' | 'schema' | 'configuration'
      priority: 'high' | 'medium' | 'low'
      description: string
      impact: string
      implementation: string
    }>
    healthScore: number
  }> {
    const metrics = await this.getPerformanceMetrics()
    const suggestions: Array<{
      type: 'index' | 'query' | 'schema' | 'configuration'
      priority: 'high' | 'medium' | 'low'
      description: string
      impact: string
      implementation: string
    }> = []

    let healthScore = 100

    // Check cache hit ratio
    if (metrics.cacheHitRatio < 95) {
      healthScore -= 20
      suggestions.push({
        type: 'configuration',
        priority: 'high',
        description: `Low cache hit ratio: ${metrics.cacheHitRatio}%`,
        impact: 'Increased I/O operations and slower query performance',
        implementation: 'Increase shared_buffers in PostgreSQL configuration'
      })
    }

    // Check index usage
    if (metrics.indexUsage < 80) {
      healthScore -= 15
      suggestions.push({
        type: 'index',
        priority: 'high',
        description: `Low index usage: ${metrics.indexUsage}%`,
        impact: 'Sequential scans causing slow query performance',
        implementation: 'Add indexes on frequently queried columns'
      })
    }

    // Check connection pool utilization
    if (metrics.connectionPoolStats.utilization > 80) {
      healthScore -= 10
      suggestions.push({
        type: 'configuration',
        priority: 'medium',
        description: `High connection pool utilization: ${metrics.connectionPoolStats.utilization}%`,
        impact: 'Potential connection bottlenecks',
        implementation: 'Increase connection pool size or optimize connection usage'
      })
    }

    // Check for tables with high sequential scan ratio
    metrics.tableStats.forEach(table => {
      const totalScans = table.indexScans + table.seqScans
      if (totalScans > 0) {
        const seqScanRatio = (table.seqScans / totalScans) * 100
        if (seqScanRatio > 50 && table.rowCount > 1000) {
          healthScore -= 5
          suggestions.push({
            type: 'index',
            priority: 'medium',
            description: `Table ${table.table} has high sequential scan ratio: ${seqScanRatio.toFixed(1)}%`,
            impact: 'Slow queries on large table',
            implementation: `Add appropriate indexes to ${table.table} table`
          })
        }
      }
    })

    return {
      suggestions,
      healthScore: Math.max(0, healthScore)
    }
  }
}

/**
 * API performance tracker
 */
export class APIPerformanceTracker {
  private static instance: APIPerformanceTracker
  private metrics: Map<string, APIPerformanceMetrics> = new Map()

  static getInstance(): APIPerformanceTracker {
    if (!APIPerformanceTracker.instance) {
      APIPerformanceTracker.instance = new APIPerformanceTracker()
    }
    return APIPerformanceTracker.instance
  }

  /**
   * Track API request performance
   */
  trackRequest(
    endpoint: string,
    method: string,
    responseTime: number,
    success: boolean
  ): void {
    const key = `${method}:${endpoint}`
    const existing = this.metrics.get(key)

    if (existing) {
      // Update existing metrics
      const totalRequests = existing.requestCount + 1
      const totalTime = (existing.avgResponseTime * existing.requestCount) + responseTime
      const errorCount = success ? 0 : 1

      this.metrics.set(key, {
        ...existing,
        avgResponseTime: totalTime / totalRequests,
        requestCount: totalRequests,
        errorRate: ((existing.errorRate * existing.requestCount) + errorCount) / totalRequests,
        timestamp: Date.now()
      })
    } else {
      // Create new metrics
      this.metrics.set(key, {
        endpoint,
        method,
        avgResponseTime: responseTime,
        requestCount: 1,
        errorRate: success ? 0 : 1,
        p95ResponseTime: responseTime,
        p99ResponseTime: responseTime,
        throughput: 1,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Get API performance metrics
   */
  getMetrics(): APIPerformanceMetrics[] {
    return Array.from(this.metrics.values())
  }

  /**
   * Get slow endpoints
   */
  getSlowEndpoints(threshold: number = 1000): APIPerformanceMetrics[] {
    return this.getMetrics().filter(metric => metric.avgResponseTime > threshold)
  }

  /**
   * Get high error rate endpoints
   */
  getHighErrorEndpoints(threshold: number = 0.05): APIPerformanceMetrics[] {
    return this.getMetrics().filter(metric => metric.errorRate > threshold)
  }
}

/**
 * Frontend performance utilities
 */
export class FrontendPerformanceUtils {
  /**
   * Measure component render time
   */
  static measureRenderTime<T>(
    componentName: string,
    renderFn: () => T
  ): T {
    const start = performance.now()
    const result = renderFn()
    const duration = performance.now() - start

    if (duration > 16) { // More than one frame at 60fps
      console.warn(`🐌 Slow component render: ${componentName} took ${duration.toFixed(2)}ms`)
    }

    return result
  }

  /**
   * Get Web Vitals metrics
   */
  static getWebVitals(): Promise<FrontendPerformanceMetrics> {
    return new Promise((resolve) => {
      // This would typically use the web-vitals library
      // For now, we'll return mock data
      resolve({
        pageLoadTime: performance.now(),
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        firstInputDelay: 0,
        bundleSize: 0,
        componentRenderTime: {}
      })
    })
  }

  /**
   * Optimize images for performance
   */
  static optimizeImageUrl(
    url: string,
    width?: number,
    height?: number,
    quality: number = 80
  ): string {
    // For Next.js Image optimization
    const params = new URLSearchParams()
    if (width) params.set('w', width.toString())
    if (height) params.set('h', height.toString())
    params.set('q', quality.toString())

    return `/_next/image?url=${encodeURIComponent(url)}&${params.toString()}`
  }
}

// Export singleton instances
export const performanceMonitor = PerformanceMonitor.getInstance()
export const apiPerformanceTracker = APIPerformanceTracker.getInstance()
export const databasePerformanceAnalyzer = new DatabasePerformanceAnalyzer()