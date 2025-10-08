#!/usr/bin/env tsx

/**
 * Permission Performance CLI Tool
 * 
 * Command-line interface for analyzing and optimizing permission system performance
 * Requirements: 6.1, 6.2
 */

import { Command } from 'commander'
import { permissionPerformanceService } from '../app/lib/permission-performance-service'
import { createCacheWarmer } from '../app/lib/permission-cache-warmer'
import { permissionQueryOptimizer } from '../app/lib/permission-query-optimizer'
import { globalProfiler } from '../app/lib/permission-performance-profiler'
import { UserRole } from '@prisma/client'

const program = new Command()

program
  .name('permission-perf')
  .description('Permission System Performance Analysis and Optimization Tool')
  .version('1.0.0')

// Cache warming commands
program
  .command('warm-cache')
  .description('Warm permission cache')
  .option('-a, --all', 'Warm cache for all users')
  .option('-p, --priority', 'Warm cache for priority users only')
  .option('-u, --user <userId>', 'Warm cache for specific user')
  .option('-r, --role <role>', 'User role (required with --user)')
  .action(async (options) => {
    console.log('Starting cache warming...')
    
    try {
      const warmer = createCacheWarmer()
      
      if (options.all) {
        const stats = await warmer.warmAllUsers()
        console.log('Cache warming completed for all users:', stats)
      } else if (options.priority) {
        const stats = await warmer.warmPriorityUsers()
        console.log('Cache warming completed for priority users:', stats)
      } else if (options.user && options.role) {
        const entries = await warmer.warmUserCache(options.user, options.role as UserRole)
        console.log(`Cache warming completed for user ${options.user}: ${entries} entries`)
      } else {
        console.error('Please specify --all, --priority, or --user with --role')
        process.exit(1)
      }
    } catch (error) {
      console.error('Cache warming failed:', error)
      process.exit(1)
    }
  })

// Query optimization commands
program
  .command('optimize-queries')
  .description('Optimize database queries')
  .option('--cleanup', 'Clean up expired cache entries')
  .option('--analyze', 'Analyze query performance')
  .option('--suggest-indexes', 'Suggest database index optimizations')
  .action(async (options) => {
    console.log('Starting query optimization...')
    
    try {
      if (options.cleanup) {
        const cleaned = await permissionQueryOptimizer.cleanupExpiredCache()
        console.log(`Cleaned up ${cleaned} expired cache entries`)
      }
      
      if (options.analyze) {
        const stats = permissionQueryOptimizer.getQueryStats()
        const analysis = {
          totalQueries: stats.length,
          averageExecutionTime: permissionQueryOptimizer.getAverageExecutionTime(),
          cacheHitRate: permissionQueryOptimizer.getCacheHitRate(),
          slowQueries: stats.filter(s => s.executionTime > 100).length
        }
        console.log('Query Performance Analysis:', analysis)
      }
      
      if (options.suggestIndexes) {
        const suggestions = [
          'CREATE INDEX IF NOT EXISTS idx_permission_cache_user_resource ON permission_cache(user_id, resource, action)',
          'CREATE INDEX IF NOT EXISTS idx_permission_cache_expires ON permission_cache(expires_at)',
          'CREATE INDEX IF NOT EXISTS idx_user_role_active ON users(role, is_active)',
          'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp)'
        ]
        console.log('Suggested Database Indexes:')
        suggestions.forEach(sql => console.log(`  ${sql}`))
      }
    } catch (error) {
      console.error('Query optimization failed:', error)
      process.exit(1)
    }
  })

// Performance analysis commands
program
  .command('analyze')
  .description('Analyze permission system performance')
  .option('--report', 'Generate performance report')
  .option('--trends', 'Analyze performance trends')
  .option('--anomalies', 'Detect performance anomalies')
  .option('--export <file>', 'Export performance data to file')
  .action(async (options) => {
    console.log('Starting performance analysis...')
    
    try {
      if (options.report) {
        const report = globalProfiler.generateReport()
        console.log('Performance Report:')
        console.log(`  Total Operations: ${report.totalOperations}`)
        console.log(`  Average Duration: ${report.averageDuration.toFixed(2)}ms`)
        console.log(`  95th Percentile: ${report.p95Duration.toFixed(2)}ms`)
        console.log(`  99th Percentile: ${report.p99Duration.toFixed(2)}ms`)
        console.log(`  Operations/sec: ${report.operationsPerSecond.toFixed(2)}`)
        console.log(`  Error Rate: ${report.errorRate.toFixed(2)}%`)
        console.log(`  Cache Hit Rate: ${report.cacheHitRate.toFixed(2)}%`)
        
        if (report.slowOperations.length > 0) {
          console.log('\nSlowest Operations:')
          report.slowOperations.slice(0, 5).forEach((op, i) => {
            console.log(`  ${i + 1}. ${op.name}: ${op.duration.toFixed(2)}ms`)
          })
        }
      }
      
      if (options.trends) {
        const trends = globalProfiler.analyzePerformanceTrends()
        console.log('Performance Trends:')
        console.log(`  Trend: ${trends.trend}`)
        console.log(`  Average Change: ${trends.averageChange.toFixed(2)}%`)
        console.log(`  Recommendation: ${trends.recommendation}`)
      }
      
      if (options.anomalies) {
        const anomalies = globalProfiler.detectAnomalies()
        if (anomalies.length > 0) {
          console.log('Performance Anomalies:')
          anomalies.forEach((anomaly, i) => {
            console.log(`  ${i + 1}. [${anomaly.severity.toUpperCase()}] ${anomaly.type}: ${anomaly.description}`)
          })
        } else {
          console.log('No performance anomalies detected')
        }
      }
      
      if (options.export) {
        const data = globalProfiler.exportData()
        const fs = await import('fs/promises')
        await fs.writeFile(options.export, JSON.stringify(data, null, 2))
        console.log(`Performance data exported to ${options.export}`)
      }
    } catch (error) {
      console.error('Performance analysis failed:', error)
      process.exit(1)
    }
  })

// System status command
program
  .command('status')
  .description('Get permission system performance status')
  .action(async () => {
    console.log('Checking permission system status...')
    
    try {
      const status = await permissionPerformanceService.getPerformanceStatus()
      
      console.log('Permission System Status:')
      console.log(`\nCache Warming:`)
      console.log(`  Enabled: ${status.cacheWarming.enabled}`)
      console.log(`  Entries Warmed: ${status.cacheWarming.entriesWarmed}`)
      
      console.log(`\nQuery Optimization:`)
      console.log(`  Enabled: ${status.queryOptimization.enabled}`)
      console.log(`  Cache Hit Rate: ${status.queryOptimization.cacheHitRate.toFixed(2)}%`)
      console.log(`  Average Query Time: ${status.queryOptimization.averageQueryTime.toFixed(2)}ms`)
      
      console.log(`\nProfiling:`)
      console.log(`  Enabled: ${status.profiling.enabled}`)
      console.log(`  Total Operations: ${status.profiling.totalOperations}`)
      console.log(`  Average Response Time: ${status.profiling.averageResponseTime.toFixed(2)}ms`)
      console.log(`  Error Rate: ${status.profiling.errorRate.toFixed(2)}%`)
      
      console.log(`\nSystem Health: ${status.systemHealth.status.toUpperCase()}`)
      if (status.systemHealth.issues.length > 0) {
        console.log('Issues:')
        status.systemHealth.issues.forEach(issue => console.log(`  - ${issue}`))
      }
      if (status.systemHealth.recommendations.length > 0) {
        console.log('Recommendations:')
        status.systemHealth.recommendations.forEach(rec => console.log(`  - ${rec}`))
      }
    } catch (error) {
      console.error('Status check failed:', error)
      process.exit(1)
    }
  })

// Optimization command
program
  .command('optimize')
  .description('Run comprehensive performance optimization')
  .option('--cache-only', 'Only run cache optimization')
  .option('--queries-only', 'Only run query optimization')
  .action(async (options) => {
    console.log('Starting performance optimization...')
    
    try {
      if (options.cacheOnly) {
        const warmer = createCacheWarmer()
        const stats = await warmer.warmPriorityUsers()
        console.log('Cache optimization completed:', stats)
      } else if (options.queriesOnly) {
        const cleaned = await permissionQueryOptimizer.cleanupExpiredCache()
        console.log(`Query optimization completed: ${cleaned} entries cleaned`)
      } else {
        const results = await permissionPerformanceService.optimizePerformance()
        console.log('Comprehensive optimization completed:', results)
      }
    } catch (error) {
      console.error('Optimization failed:', error)
      process.exit(1)
    }
  })

// Monitoring command
program
  .command('monitor')
  .description('Start real-time performance monitoring')
  .option('-i, --interval <seconds>', 'Monitoring interval in seconds', '60')
  .action(async (options) => {
    console.log(`Starting real-time monitoring (interval: ${options.interval}s)...`)
    console.log('Press Ctrl+C to stop')
    
    const interval = parseInt(options.interval)
    
    const monitoringInterval = setInterval(async () => {
      try {
        const metrics = permissionPerformanceService.getPerformanceMetrics()
        const timestamp = new Date().toISOString()
        
        console.log(`\n[${timestamp}] Performance Metrics:`)
        console.log(`  Operations: ${metrics.summary.totalOperations}`)
        console.log(`  Avg Response: ${metrics.summary.averageDuration.toFixed(2)}ms`)
        console.log(`  P95 Response: ${metrics.summary.p95Duration.toFixed(2)}ms`)
        console.log(`  Cache Hit Rate: ${metrics.summary.cacheHitRate.toFixed(2)}%`)
        console.log(`  Error Rate: ${metrics.summary.errorRate.toFixed(2)}%`)
        
        if (metrics.anomalies.length > 0) {
          console.log('  ⚠️  Anomalies detected:', metrics.anomalies.length)
        }
      } catch (error) {
        console.error('Monitoring error:', error)
      }
    }, interval * 1000)
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nStopping monitoring...')
      clearInterval(monitoringInterval)
      process.exit(0)
    })
  })

// Benchmark command
program
  .command('benchmark')
  .description('Run performance benchmarks')
  .option('-n, --operations <number>', 'Number of operations to benchmark', '1000')
  .option('-c, --concurrency <number>', 'Concurrent operations', '10')
  .action(async (options) => {
    console.log(`Running benchmark: ${options.operations} operations with ${options.concurrency} concurrency...`)
    
    const operations = parseInt(options.operations)
    const concurrency = parseInt(options.concurrency)
    
    try {
      // This would implement actual benchmarking logic
      console.log('Benchmark completed (placeholder implementation)')
      console.log(`  Total Operations: ${operations}`)
      console.log(`  Concurrency: ${concurrency}`)
      console.log(`  Average Response Time: N/A`)
      console.log(`  Throughput: N/A ops/sec`)
    } catch (error) {
      console.error('Benchmark failed:', error)
      process.exit(1)
    }
  })

// Parse command line arguments
program.parse()