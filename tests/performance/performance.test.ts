/**
 * Performance optimization tests
 * Validates database query performance, API response times, and frontend optimizations
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import { DatabasePerformanceAnalyzer, DatabaseQueryOptimizer } from '@/lib/database-optimization'
import { performanceMonitor, apiPerformanceTracker } from '@/lib/performance'

const prisma = new PrismaClient()

describe('Performance Optimization', () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Database Performance', () => {
    it('should have acceptable database connection time', async () => {
      const start = performance.now()
      await prisma.$queryRaw`SELECT 1`
      const duration = performance.now() - start

      expect(duration).toBeLessThan(100) // Should connect within 100ms
    })

    it('should have optimized indexes for common queries', async () => {
      const analyzer = new DatabasePerformanceAnalyzer()
      const metrics = await analyzer.getPerformanceMetrics()

      // Index usage should be high
      expect(metrics.indexUsage).toBeGreaterThan(70)
      
      // Cache hit ratio should be good
      expect(metrics.cacheHitRatio).toBeGreaterThan(90)
    })

    it('should execute product queries efficiently', async () => {
      const start = performance.now()
      
      // Test optimized product listing query
      const products = await prisma.product.findMany({
        where: { published: true },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          imageUrl: true,
          category: {
            select: {
              name: true,
              slug: true
            }
          }
        },
        take: 20
      })
      
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(200) // Should complete within 200ms
      expect(products).toBeDefined()
    })

    it('should execute user order queries efficiently', async () => {
      // Create test user and order if they don't exist
      const testUser = await prisma.user.upsert({
        where: { email: 'performance-test@example.com' },
        update: {},
        create: {
          email: 'performance-test@example.com',
          name: 'Performance Test User',
          password: 'hashed-password'
        }
      })

      const start = performance.now()
      
      // Test optimized user orders query
      const orders = await prisma.order.findMany({
        where: { userId: testUser.id },
        select: {
          id: true,
          status: true,
          total: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
              price: true,
              product: {
                select: {
                  name: true,
                  imageUrl: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
      
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(150) // Should complete within 150ms
      expect(orders).toBeDefined()
    })

    it('should provide optimization suggestions', async () => {
      const analyzer = new DatabasePerformanceAnalyzer()
      const optimization = await analyzer.analyzeAndSuggestOptimizations()

      expect(optimization.healthScore).toBeGreaterThan(70)
      expect(optimization.suggestions).toBeDefined()
      expect(Array.isArray(optimization.suggestions)).toBe(true)
    })

    it('should have optimized query patterns', async () => {
      const optimizedQueries = DatabaseQueryOptimizer.getOptimizedQueries()
      
      expect(optimizedQueries.productListing).toBeDefined()
      expect(optimizedQueries.userOrderHistory).toBeDefined()
      expect(optimizedQueries.categoryWithCount).toBeDefined()
      expect(optimizedQueries.dashboardStats).toBeDefined()
    })
  })

  describe('API Performance', () => {
    it('should track API performance metrics', () => {
      // Simulate API request tracking
      apiPerformanceTracker.trackRequest('/api/products', 'GET', 150, true)
      apiPerformanceTracker.trackRequest('/api/orders', 'GET', 200, true)
      apiPerformanceTracker.trackRequest('/api/users', 'GET', 1200, false) // Slow request

      const metrics = apiPerformanceTracker.getMetrics()
      expect(metrics.length).toBeGreaterThan(0)

      const slowEndpoints = apiPerformanceTracker.getSlowEndpoints(1000)
      expect(slowEndpoints.length).toBeGreaterThan(0)
      expect(slowEndpoints[0].endpoint).toBe('/api/users')
    })

    it('should identify high error rate endpoints', () => {
      // Track some failed requests
      apiPerformanceTracker.trackRequest('/api/error-prone', 'POST', 100, false)
      apiPerformanceTracker.trackRequest('/api/error-prone', 'POST', 120, false)
      apiPerformanceTracker.trackRequest('/api/error-prone', 'POST', 110, true)

      const highErrorEndpoints = apiPerformanceTracker.getHighErrorEndpoints(0.5)
      expect(highErrorEndpoints.length).toBeGreaterThan(0)
    })
  })

  describe('Performance Monitoring', () => {
    it('should track operation performance', async () => {
      const result = await performanceMonitor.trackOperation(
        'test-operation',
        async () => {
          // Simulate some work
          await new Promise(resolve => setTimeout(resolve, 50))
          return 'test-result'
        },
        { testMetadata: 'value' }
      )

      expect(result).toBe('test-result')

      const stats = performanceMonitor.getStats('test-operation')
      expect(stats.totalOperations).toBeGreaterThan(0)
      expect(stats.avgDuration).toBeGreaterThan(40)
      expect(stats.successRate).toBe(100)
    })

    it('should track slow operations', async () => {
      await performanceMonitor.trackOperation(
        'slow-operation',
        async () => {
          // Simulate slow work
          await new Promise(resolve => setTimeout(resolve, 1100))
          return 'slow-result'
        }
      )

      const stats = performanceMonitor.getStats('slow-operation')
      expect(stats.slowOperations).toBe(1)
    })

    it('should handle operation failures', async () => {
      try {
        await performanceMonitor.trackOperation(
          'failing-operation',
          async () => {
            throw new Error('Test error')
          }
        )
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }

      const stats = performanceMonitor.getStats('failing-operation')
      expect(stats.successRate).toBe(0)
    })
  })

  describe('Database Query Optimization', () => {
    it('should analyze common queries', async () => {
      const optimizations = await DatabaseQueryOptimizer.analyzeCommonQueries()
      
      expect(optimizations.length).toBeGreaterThan(0)
      
      optimizations.forEach(opt => {
        expect(opt.originalQuery).toBeDefined()
        expect(opt.suggestions).toBeDefined()
        expect(opt.estimatedImprovement).toBeGreaterThan(0)
        expect(Array.isArray(opt.suggestions)).toBe(true)
      })
    })

    it('should analyze indexes', async () => {
      const indexAnalysis = await DatabaseQueryOptimizer.analyzeIndexes()
      
      expect(Array.isArray(indexAnalysis)).toBe(true)
      
      indexAnalysis.forEach(analysis => {
        expect(analysis.table).toBeDefined()
        expect(analysis.column).toBeDefined()
        expect(['create', 'drop', 'optimize']).toContain(analysis.suggestion)
        expect(['high', 'medium', 'low']).toContain(analysis.impact)
      })
    })

    it('should execute optimized queries with monitoring', async () => {
      const query = 'SELECT COUNT(*) as count FROM "Product" WHERE published = true'
      
      const result = await DatabaseQueryOptimizer.executeOptimized<Array<{ count: number }>>(
        'product-count',
        query
      )
      
      expect(result.data).toBeDefined()
      expect(result.duration).toBeGreaterThan(0)
      expect(Array.isArray(result.data)).toBe(true)
      
      if (result.duration > 100) {
        expect(result.suggestions).toBeDefined()
        expect(result.suggestions!.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Connection Pool Performance', () => {
    it('should monitor connection pool health', async () => {
      const { ConnectionPoolOptimizer } = await import('@/lib/database-optimization')
      const health = await ConnectionPoolOptimizer.monitorHealth()
      
      expect(health.status).toBeDefined()
      expect(['healthy', 'warning', 'critical']).toContain(health.status)
      expect(health.metrics).toBeDefined()
      expect(health.metrics.totalConnections).toBeGreaterThanOrEqual(0)
      expect(health.recommendations).toBeDefined()
      expect(Array.isArray(health.recommendations)).toBe(true)
    })

    it('should provide optimal connection settings', () => {
      const { ConnectionPoolOptimizer } = require('@/lib/database-optimization')
      const settings = ConnectionPoolOptimizer.getOptimalSettings()
      
      expect(settings.connectionLimit).toBeGreaterThan(0)
      expect(settings.poolTimeout).toBeGreaterThan(0)
      expect(settings.queryTimeout).toBeGreaterThan(0)
      expect(settings.idleTimeout).toBeGreaterThan(0)
    })
  })

  describe('Performance Benchmarks', () => {
    it('should meet database query performance benchmarks', async () => {
      const benchmarks = [
        {
          name: 'Simple product select',
          query: () => prisma.product.findFirst({ where: { published: true } }),
          maxTime: 50
        },
        {
          name: 'Product with category join',
          query: () => prisma.product.findFirst({
            where: { published: true },
            include: { category: true }
          }),
          maxTime: 100
        },
        {
          name: 'Category with product count',
          query: () => prisma.category.findMany({
            include: {
              _count: {
                select: { products: { where: { published: true } } }
              }
            }
          }),
          maxTime: 200
        }
      ]

      for (const benchmark of benchmarks) {
        const start = performance.now()
        await benchmark.query()
        const duration = performance.now() - start
        
        expect(duration).toBeLessThan(benchmark.maxTime)
        console.log(`✅ ${benchmark.name}: ${duration.toFixed(2)}ms (max: ${benchmark.maxTime}ms)`)
      }
    })

    it('should have acceptable memory usage', () => {
      const memoryUsage = process.memoryUsage()
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024
      
      // Memory usage should be reasonable
      expect(heapUsedMB).toBeLessThan(500) // Less than 500MB heap used
      expect(heapTotalMB).toBeLessThan(1000) // Less than 1GB heap total
      
      console.log(`📊 Memory usage: ${heapUsedMB.toFixed(2)}MB used / ${heapTotalMB.toFixed(2)}MB total`)
    })
  })
})