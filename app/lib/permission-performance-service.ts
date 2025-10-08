/**
 * Permission Performance Service
 * 
 * Integrates all performance optimization tools for the permission system
 * Requirements: 6.1, 6.2
 */

import { PermissionCacheWarmer, createCacheWarmer } from './permission-cache-warmer'
import { PermissionQueryOptimizer, permissionQueryOptimizer } from './permission-query-optimizer'
import { PermissionPerformanceProfiler, globalProfiler } from './permission-performance-profiler'
import { UserRole } from '@prisma/client'

interface PerformanceConfig {
  enableCacheWarming: boolean
  enableQueryOptimization: boolean
  enableProfiling: boolean
  monitoringInterval: number
  alertThresholds: {
    maxResponseTime: number
    minCacheHitRate: number
    maxErrorRate: number
  }
}

interface PerformanceStatus {
  cacheWarming: {
    enabled: boolean
    lastWarmed: Date | null
    entriesWarmed: number
  }
  queryOptimization: {
    enabled: boolean
    cacheHitRate: number
    averageQueryTime: number
  }
  profiling: {
    enabled: boolean
    totalOperations: number
    averageResponseTime: number
    errorRate: number
  }
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical'
    issues: string[]
    recommendations: string[]
  }
}

export class PermissionPerformanceService {
  private cacheWarmer: PermissionCacheWarmer
  private queryOptimizer: PermissionQueryOptimizer
  private profiler: PermissionPerformanceProfiler
  private config: PerformanceConfig
  private monitoringInterval: NodeJS.Timeout | null = null

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      enableCacheWarming: true,
      enableQueryOptimization: true,
      enableProfiling: true,
      monitoringInterval: 60, // seconds
      alertThresholds: {
        maxResponseTime: 200, // ms
        minCacheHitRate: 80, // %
        maxErrorRate: 5 // %
      },
      ...config
    }

    this.cacheWarmer = createCacheWarmer()
    this.queryOptimizer = permissionQueryOptimizer
    this.profiler = globalProfiler
  }

  /**
   * Initialize the performance service
   */
  async initialize(): Promise<void> {
    console.log('Initializing Permission Performance Service...')

    try {
      // Start cache warming if enabled
      if (this.config.enableCacheWarming) {
        await this.initializeCacheWarming()
      }

      // Start profiling if enabled
      if (this.config.enableProfiling) {
        this.initializeProfiling()
      }

      // Start monitoring
      this.startMonitoring()

      console.log('Permission Performance Service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Permission Performance Service:', error)
      throw error
    }
  }

  /**
   * Get current performance status
   */
  async getPerformanceStatus(): Promise<PerformanceStatus> {
    const queryStats = this.queryOptimizer.getQueryStats()
    const performanceReport = this.profiler.generateReport()
    const anomalies = this.profiler.detectAnomalies()

    const status: PerformanceStatus = {
      cacheWarming: {
        enabled: this.config.enableCacheWarming,
        lastWarmed: null, // Would be tracked in actual implementation
        entriesWarmed: 0 // Would be tracked in actual implementation
      },
      queryOptimization: {
        enabled: this.config.enableQueryOptimization,
        cacheHitRate: this.queryOptimizer.getCacheHitRate(),
        averageQueryTime: this.queryOptimizer.getAverageExecutionTime()
      },
      profiling: {
        enabled: this.config.enableProfiling,
        totalOperations: performanceReport.totalOperations,
        averageResponseTime: performanceReport.averageDuration,
        errorRate: performanceReport.errorRate
      },
      systemHealth: this.assessSystemHealth(performanceReport, anomalies)
    }

    return status
  }

  /**
   * Optimize permission system performance
   */
  async optimizePerformance(): Promise<{
    cacheWarming: any
    queryOptimization: any
    recommendations: string[]
  }> {
    const results = {
      cacheWarming: null as any,
      queryOptimization: null as any,
      recommendations: [] as string[]
    }

    try {
      // Warm priority user caches
      if (this.config.enableCacheWarming) {
        console.log('Starting cache warming optimization...')
        results.cacheWarming = await this.cacheWarmer.warmPriorityUsers()
      }

      // Clean up expired cache entries
      if (this.config.enableQueryOptimization) {
        console.log('Starting query optimization...')
        const cleanedEntries = await this.queryOptimizer.cleanupExpiredCache()
        results.queryOptimization = { cleanedEntries }
      }

      // Generate recommendations
      results.recommendations = this.generateOptimizationRecommendations()

      console.log('Performance optimization completed:', results)
      return results
    } catch (error) {
      console.error('Performance optimization failed:', error)
      throw error
    }
  }

  /**
   * Handle user login performance optimization
   */
  async optimizeForUserLogin(userId: string, role: UserRole): Promise<void> {
    if (!this.config.enableCacheWarming) return

    try {
      // Warm cache for the logged-in user
      await this.cacheWarmer.warmUserCache(userId, role)
      
      // Record the operation for profiling
      if (this.config.enableProfiling) {
        this.profiler.recordCacheHit(true)
      }
    } catch (error) {
      console.error(`Failed to optimize performance for user login ${userId}:`, error)
    }
  }

  /**
   * Handle role change performance optimization
   */
  async optimizeForRoleChange(userId: string, newRole: UserRole): Promise<void> {
    if (!this.config.enableCacheWarming) return

    try {
      await this.cacheWarmer.warmAfterRoleChange(userId, newRole)
    } catch (error) {
      console.error(`Failed to optimize performance for role change ${userId}:`, error)
    }
  }

  /**
   * Get performance metrics for dashboard
   */
  getPerformanceMetrics(): {
    summary: any
    trends: any
    anomalies: any
    recommendations: string[]
  } {
    const performanceReport = this.profiler.generateReport()
    const trends = this.profiler.analyzePerformanceTrends()
    const anomalies = this.profiler.detectAnomalies()
    const recommendations = this.generateOptimizationRecommendations()

    return {
      summary: performanceReport,
      trends,
      anomalies,
      recommendations
    }
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData(): any {
    return {
      profilerData: this.profiler.exportData(),
      queryStats: this.queryOptimizer.getQueryStats(),
      systemStatus: this.getPerformanceStatus(),
      config: this.config
    }
  }

  /**
   * Shutdown the performance service
   */
  shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    console.log('Permission Performance Service shutdown')
  }

  /**
   * Private helper methods
   */
  private async initializeCacheWarming(): Promise<void> {
    try {
      // Warm priority users on startup
      const stats = await this.cacheWarmer.warmPriorityUsers()
      console.log('Initial cache warming completed:', stats)

      // Schedule periodic warming
      this.cacheWarmer.schedulePeriodicWarming(6) // Every 6 hours
    } catch (error) {
      console.error('Cache warming initialization failed:', error)
    }
  }

  private initializeProfiling(): void {
    // Start continuous monitoring
    this.profiler.startContinuousMonitoring(this.config.monitoringInterval)
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        const status = await this.getPerformanceStatus()
        
        // Check for performance issues
        const issues = this.checkPerformanceThresholds(status)
        if (issues.length > 0) {
          console.warn('Performance issues detected:', issues)
          
          // Trigger automatic optimization if needed
          if (issues.some(issue => issue.includes('cache'))) {
            await this.optimizePerformance()
          }
        }
      } catch (error) {
        console.error('Performance monitoring error:', error)
      }
    }, this.config.monitoringInterval * 1000)
  }

  private assessSystemHealth(performanceReport: any, anomalies: any[]): {
    status: 'healthy' | 'warning' | 'critical'
    issues: string[]
    recommendations: string[]
  } {
    const issues = []
    const recommendations = []
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'

    // Check response time
    if (performanceReport.p95Duration > this.config.alertThresholds.maxResponseTime) {
      issues.push(`High response time: ${performanceReport.p95Duration.toFixed(2)}ms`)
      recommendations.push('Consider query optimization or cache warming')
      status = 'warning'
    }

    // Check cache hit rate
    if (performanceReport.cacheHitRate < this.config.alertThresholds.minCacheHitRate) {
      issues.push(`Low cache hit rate: ${performanceReport.cacheHitRate.toFixed(2)}%`)
      recommendations.push('Implement cache warming strategies')
      status = 'warning'
    }

    // Check error rate
    if (performanceReport.errorRate > this.config.alertThresholds.maxErrorRate) {
      issues.push(`High error rate: ${performanceReport.errorRate.toFixed(2)}%`)
      recommendations.push('Investigate and fix permission check errors')
      status = 'critical'
    }

    // Add anomaly-based issues
    anomalies.forEach(anomaly => {
      if (anomaly.severity === 'high') {
        issues.push(anomaly.description)
        status = 'critical'
      } else if (anomaly.severity === 'medium' && status === 'healthy') {
        status = 'warning'
      }
    })

    return { status, issues, recommendations }
  }

  private checkPerformanceThresholds(status: PerformanceStatus): string[] {
    const issues = []

    if (status.queryOptimization.averageQueryTime > this.config.alertThresholds.maxResponseTime) {
      issues.push('Query response time exceeds threshold')
    }

    if (status.queryOptimization.cacheHitRate < this.config.alertThresholds.minCacheHitRate) {
      issues.push('Cache hit rate below threshold')
    }

    if (status.profiling.errorRate > this.config.alertThresholds.maxErrorRate) {
      issues.push('Error rate exceeds threshold')
    }

    return issues
  }

  private generateOptimizationRecommendations(): string[] {
    const recommendations = []
    const performanceReport = this.profiler.generateReport()

    if (performanceReport.cacheHitRate < 80) {
      recommendations.push('Implement more aggressive cache warming')
    }

    if (performanceReport.p95Duration > 100) {
      recommendations.push('Optimize database queries for permission checks')
    }

    if (performanceReport.operationsPerSecond > 1000) {
      recommendations.push('Consider implementing rate limiting')
    }

    if (performanceReport.slowOperations.length > 0) {
      recommendations.push('Investigate and optimize slow permission operations')
    }

    return recommendations
  }
}

/**
 * Global performance service instance
 */
export const permissionPerformanceService = new PermissionPerformanceService()

/**
 * Utility functions for performance optimization
 */
export const performanceOptimizationUtils = {
  /**
   * Initialize performance optimization on app startup
   */
  initializeOnStartup: async () => {
    try {
      await permissionPerformanceService.initialize()
    } catch (error) {
      console.error('Failed to initialize performance optimization:', error)
    }
  },

  /**
   * Optimize for user session
   */
  optimizeForSession: async (userId: string, role: UserRole) => {
    await permissionPerformanceService.optimizeForUserLogin(userId, role)
  },

  /**
   * Get performance dashboard data
   */
  getDashboardData: () => {
    return permissionPerformanceService.getPerformanceMetrics()
  },

  /**
   * Manual performance optimization trigger
   */
  triggerOptimization: async () => {
    return await permissionPerformanceService.optimizePerformance()
  }
}