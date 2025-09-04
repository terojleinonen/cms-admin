/**
 * API middleware for performance monitoring and optimization
 * Automatically tracks API performance and provides optimization insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { withPerformanceMonitoring } from '@/middleware/performance'

/**
 * Enhanced API middleware with performance monitoring
 */
export function withAPIPerformanceMonitoring(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return withPerformanceMonitoring(handler, {
    enableLogging: process.env.NODE_ENV !== 'test',
    slowRequestThreshold: 1000,
    enableMetrics: true
  })
}

/**
 * Database query middleware with performance tracking
 */
export function withDatabasePerformanceMonitoring<T>(
  operation: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = performance.now()
    
    try {
      const result = await queryFn()
      const duration = performance.now() - start
      
      // Log slow queries
      if (duration > 100) {
        console.warn(
          `🐌 Slow database query: ${operation} took ${duration.toFixed(2)}ms`
        )
      }
      
      // Track metrics in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Query: ${operation} - ${duration.toFixed(2)}ms`)
      }
      
      resolve(result)
    } catch (error) {
      const duration = performance.now() - start
      console.error(
        `❌ Database query failed: ${operation} (${duration.toFixed(2)}ms)`,
        error
      )
      reject(error)
    }
  })
}

/**
 * Cache middleware with performance tracking
 */
export class CacheMiddleware {
  private static cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>()

  static async withCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 300000 // 5 minutes default
  ): Promise<T> {
    const start = performance.now()
    const cached = this.cache.get(key)
    
    // Check if cache is valid
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      const duration = performance.now() - start
      console.log(`🎯 Cache hit: ${key} (${duration.toFixed(2)}ms)`)
      return cached.data as T
    }
    
    // Fetch fresh data
    try {
      const data = await fetchFn()
      const duration = performance.now() - start
      
      // Store in cache
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      })
      
      console.log(`💾 Cache miss: ${key} (${duration.toFixed(2)}ms)`)
      return data
    } catch (error) {
      const duration = performance.now() - start
      console.error(`❌ Cache fetch failed: ${key} (${duration.toFixed(2)}ms)`, error)
      throw error
    }
  }

  static clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern)
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }

  static getCacheStats(): {
    size: number
    hitRate: number
    keys: string[]
  } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses
      keys: Array.from(this.cache.keys())
    }
  }
}

/**
 * Rate limiting middleware
 */
export class RateLimitMiddleware {
  private static requests = new Map<string, { count: number; resetTime: number }>()

  static async checkRateLimit(
    identifier: string,
    limit: number = 100,
    windowMs: number = 60000 // 1 minute
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now()
    const key = `${identifier}:${Math.floor(now / windowMs)}`
    
    const current = this.requests.get(key) || { count: 0, resetTime: now + windowMs }
    
    if (current.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      }
    }
    
    current.count++
    this.requests.set(key, current)
    
    // Cleanup old entries
    this.cleanup()
    
    return {
      allowed: true,
      remaining: limit - current.count,
      resetTime: current.resetTime
    }
  }

  private static cleanup(): void {
    const now = Date.now()
    for (const [key, data] of this.requests) {
      if (data.resetTime < now) {
        this.requests.delete(key)
      }
    }
  }
}

/**
 * Response compression middleware
 */
export function withCompression(response: NextResponse): NextResponse {
  // Add compression headers
  response.headers.set('Vary', 'Accept-Encoding')
  
  // Enable compression for JSON responses
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    response.headers.set('Content-Encoding', 'gzip')
  }
  
  return response
}

/**
 * Security headers middleware
 */
export function withSecurityHeaders(response: NextResponse): NextResponse {
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Add CSP header for API routes
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'none'; object-src 'none';"
  )
  
  return response
}

/**
 * Complete API middleware stack
 */
export function withAPIMiddleware(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Performance monitoring
    const performanceHandler = withAPIPerformanceMonitoring(handler)
    
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown'
    
    const rateLimit = await RateLimitMiddleware.checkRateLimit(ip)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetTime.toString()
          }
        }
      )
    }
    
    // Execute handler with performance monitoring
    let response = await performanceHandler(req)
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '100')
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString())
    
    // Apply compression
    response = withCompression(response)
    
    // Apply security headers
    response = withSecurityHeaders(response)
    
    return response
  }
}