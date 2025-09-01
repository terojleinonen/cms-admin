/**
 * Performance monitoring middleware
 * Tracks API request performance and provides optimization insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiPerformanceTracker } from '@/lib/performance'

export interface PerformanceMiddlewareOptions {
  enableLogging?: boolean
  slowRequestThreshold?: number
  enableMetrics?: boolean
}

/**
 * Performance monitoring middleware for API routes
 */
export function withPerformanceMonitoring(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: PerformanceMiddlewareOptions = {}
) {
  const {
    enableLogging = true,
    slowRequestThreshold = 1000,
    enableMetrics = true
  } = options

  return async (req: NextRequest): Promise<NextResponse> => {
    const start = performance.now()
    const startTime = Date.now()
    
    // Extract request info
    const method = req.method
    const pathname = new URL(req.url).pathname
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown'

    let response: NextResponse
    let success = true
    let statusCode = 200

    try {
      response = await handler(req)
      statusCode = response.status
      success = statusCode < 400
    } catch (error) {
      success = false
      statusCode = 500
      
      // Create error response
      response = NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
      
      if (enableLogging) {
        console.error(`API Error: ${method} ${pathname}`, error)
      }
    }

    const duration = performance.now() - start

    // Track metrics
    if (enableMetrics) {
      apiPerformanceTracker.trackRequest(pathname, method, duration, success)
    }

    // Log slow requests
    if (enableLogging && duration > slowRequestThreshold) {
      console.warn(
        `🐌 Slow API request: ${method} ${pathname} took ${duration.toFixed(2)}ms`,
        {
          duration,
          statusCode,
          userAgent,
          ip,
          timestamp: new Date(startTime).toISOString()
        }
      )
    }

    // Add performance headers
    response.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`)
    response.headers.set('X-Timestamp', startTime.toString())

    // Add performance timing header for debugging
    if (process.env.NODE_ENV === 'development') {
      response.headers.set('X-Performance-Debug', JSON.stringify({
        duration: `${duration.toFixed(2)}ms`,
        success,
        statusCode,
        timestamp: startTime
      }))
    }

    return response
  }
}

/**
 * Database query performance wrapper
 */
export function withQueryPerformanceMonitoring<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = performance.now()
    
    try {
      const result = await queryFn()
      const duration = performance.now() - start
      
      // Log slow queries
      if (duration > 100) { // 100ms threshold for database queries
        console.warn(
          `🐌 Slow database query: ${queryName} took ${duration.toFixed(2)}ms`
        )
      }
      
      resolve(result)
    } catch (error) {
      const duration = performance.now() - start
      console.error(
        `❌ Database query failed: ${queryName} (${duration.toFixed(2)}ms)`,
        error
      )
      reject(error)
    }
  })
}

/**
 * Cache performance wrapper
 */
export class CachePerformanceMonitor {
  private static hits = 0
  private static misses = 0
  private static totalTime = 0
  private static operations = 0

  static recordHit(duration: number): void {
    this.hits++
    this.totalTime += duration
    this.operations++
  }

  static recordMiss(duration: number): void {
    this.misses++
    this.totalTime += duration
    this.operations++
  }

  static getStats(): {
    hitRate: number
    missRate: number
    avgDuration: number
    totalOperations: number
  } {
    const total = this.hits + this.misses
    return {
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
      missRate: total > 0 ? (this.misses / total) * 100 : 0,
      avgDuration: this.operations > 0 ? this.totalTime / this.operations : 0,
      totalOperations: this.operations
    }
  }

  static reset(): void {
    this.hits = 0
    this.misses = 0
    this.totalTime = 0
    this.operations = 0
  }
}

/**
 * Memory usage monitoring
 */
export class MemoryMonitor {
  private static measurements: Array<{
    timestamp: number
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }> = []

  static recordUsage(): void {
    const usage = process.memoryUsage()
    this.measurements.push({
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss
    })

    // Keep only last 1000 measurements
    if (this.measurements.length > 1000) {
      this.measurements = this.measurements.slice(-1000)
    }

    // Log memory warnings
    const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100
    if (heapUsagePercent > 90) {
      console.warn(
        `⚠️ High memory usage: ${heapUsagePercent.toFixed(1)}% (${Math.round(usage.heapUsed / 1024 / 1024)}MB)`
      )
    }
  }

  static getStats(): {
    current: NodeJS.MemoryUsage
    peak: {
      heapUsed: number
      heapTotal: number
      rss: number
    }
    trend: 'increasing' | 'decreasing' | 'stable'
  } {
    const current = process.memoryUsage()
    
    let peak = {
      heapUsed: 0,
      heapTotal: 0,
      rss: 0
    }

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'

    if (this.measurements.length > 0) {
      // Calculate peak usage
      peak = this.measurements.reduce((max, measurement) => ({
        heapUsed: Math.max(max.heapUsed, measurement.heapUsed),
        heapTotal: Math.max(max.heapTotal, measurement.heapTotal),
        rss: Math.max(max.rss, measurement.rss)
      }), peak)

      // Calculate trend (compare last 10 measurements with previous 10)
      if (this.measurements.length >= 20) {
        const recent = this.measurements.slice(-10)
        const previous = this.measurements.slice(-20, -10)
        
        const recentAvg = recent.reduce((sum, m) => sum + m.heapUsed, 0) / recent.length
        const previousAvg = previous.reduce((sum, m) => sum + m.heapUsed, 0) / previous.length
        
        const change = ((recentAvg - previousAvg) / previousAvg) * 100
        
        if (change > 5) trend = 'increasing'
        else if (change < -5) trend = 'decreasing'
      }
    }

    return {
      current,
      peak,
      trend
    }
  }

  static getMeasurements(): typeof MemoryMonitor.measurements {
    return [...this.measurements]
  }
}

// Start memory monitoring in production
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    MemoryMonitor.recordUsage()
  }, 30000) // Record every 30 seconds
}