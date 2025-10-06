/**
 * Performance Monitoring Utilities
 * Tools for monitoring and measuring permission system performance
 */

import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  timestamp: number;
  operation: string;
  duration: number;
  success: boolean;
  memoryUsage: NodeJS.MemoryUsage;
  cacheHit?: boolean;
  userId?: string;
  resource?: string;
  action?: string;
}

export interface AggregatedMetrics {
  operation: string;
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  successRate: number;
  errorRate: number;
  throughput: number; // operations per second
  cacheHitRate?: number;
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics[] = [];
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private startTime: number = 0;

  constructor(private options: {
    maxMetrics?: number;
    aggregationInterval?: number;
    enableRealTimeReporting?: boolean;
  } = {}) {
    super();
    this.options = {
      maxMetrics: 10000,
      aggregationInterval: 5000, // 5 seconds
      enableRealTimeReporting: false,
      ...options,
    };
  }

  start(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.startTime = Date.now();
    this.metrics = [];

    if (this.options.enableRealTimeReporting && this.options.aggregationInterval) {
      this.monitoringInterval = setInterval(() => {
        this.emitAggregatedMetrics();
      }, this.options.aggregationInterval);
    }

    this.emit('monitoring-started');
  }

  stop(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.emit('monitoring-stopped');
  }

  recordMetric(metric: Omit<PerformanceMetrics, 'timestamp' | 'memoryUsage'>): void {
    if (!this.isMonitoring) return;

    const fullMetric: PerformanceMetrics = {
      ...metric,
      timestamp: Date.now(),
      memoryUsage: process.memoryUsage(),
    };

    this.metrics.push(fullMetric);

    // Limit metrics array size
    if (this.metrics.length > (this.options.maxMetrics || 10000)) {
      this.metrics = this.metrics.slice(-Math.floor((this.options.maxMetrics || 10000) * 0.8));
    }

    this.emit('metric-recorded', fullMetric);
  }

  measureSync<T>(operation: string, fn: () => T, context?: { userId?: string; resource?: string; action?: string }): T {
    const startTime = performance.now();
    let success = true;
    let result: T;

    try {
      result = fn();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const endTime = performance.now();
      this.recordMetric({
        operation,
        duration: endTime - startTime,
        success,
        ...context,
      });
    }
  }

  async measureAsync<T>(
    operation: string, 
    fn: () => Promise<T>, 
    context?: { userId?: string; resource?: string; action?: string; cacheHit?: boolean }
  ): Promise<T> {
    const startTime = performance.now();
    let success = true;
    let result: T;

    try {
      result = await fn();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const endTime = performance.now();
      this.recordMetric({
        operation,
        duration: endTime - startTime,
        success,
        ...context,
      });
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAggregatedMetrics(operation?: string): AggregatedMetrics[] {
    const filteredMetrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    const groupedMetrics = this.groupMetricsByOperation(filteredMetrics);
    
    return Object.entries(groupedMetrics).map(([op, metrics]) => 
      this.calculateAggregatedMetrics(op, metrics)
    );
  }

  getRealtimeStats(): {
    totalOperations: number;
    operationsPerSecond: number;
    avgResponseTime: number;
    errorRate: number;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  } {
    const now = Date.now();
    const uptime = now - this.startTime;
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 60000); // Last minute

    const totalOperations = this.metrics.length;
    const operationsPerSecond = recentMetrics.length / 60; // Operations in last minute / 60
    
    const durations = recentMetrics.map(m => m.duration);
    const avgResponseTime = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;

    const errors = recentMetrics.filter(m => !m.success).length;
    const errorRate = recentMetrics.length > 0 ? (errors / recentMetrics.length) * 100 : 0;

    return {
      totalOperations,
      operationsPerSecond,
      avgResponseTime,
      errorRate,
      memoryUsage: process.memoryUsage(),
      uptime,
    };
  }

  getCacheStats(): {
    totalCacheableOperations: number;
    cacheHits: number;
    cacheMisses: number;
    cacheHitRate: number;
  } {
    const cacheableMetrics = this.metrics.filter(m => m.cacheHit !== undefined);
    const cacheHits = cacheableMetrics.filter(m => m.cacheHit === true).length;
    const cacheMisses = cacheableMetrics.filter(m => m.cacheHit === false).length;
    const cacheHitRate = cacheableMetrics.length > 0 ? (cacheHits / cacheableMetrics.length) * 100 : 0;

    return {
      totalCacheableOperations: cacheableMetrics.length,
      cacheHits,
      cacheMisses,
      cacheHitRate,
    };
  }

  getTopSlowOperations(limit: number = 10): PerformanceMetrics[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  getOperationsByUser(userId: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.userId === userId);
  }

  getOperationsByResource(resource: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.resource === resource);
  }

  exportMetrics(): string {
    const data = {
      exportTime: new Date().toISOString(),
      monitoringDuration: Date.now() - this.startTime,
      totalMetrics: this.metrics.length,
      aggregatedMetrics: this.getAggregatedMetrics(),
      realtimeStats: this.getRealtimeStats(),
      cacheStats: this.getCacheStats(),
      topSlowOperations: this.getTopSlowOperations(),
      rawMetrics: this.metrics,
    };

    return JSON.stringify(data, null, 2);
  }

  clear(): void {
    this.metrics = [];
    this.startTime = Date.now();
    this.emit('metrics-cleared');
  }

  private groupMetricsByOperation(metrics: PerformanceMetrics[]): Record<string, PerformanceMetrics[]> {
    return metrics.reduce((groups, metric) => {
      if (!groups[metric.operation]) {
        groups[metric.operation] = [];
      }
      groups[metric.operation].push(metric);
      return groups;
    }, {} as Record<string, PerformanceMetrics[]>);
  }

  private calculateAggregatedMetrics(operation: string, metrics: PerformanceMetrics[]): AggregatedMetrics {
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const successfulOps = metrics.filter(m => m.success).length;
    const cacheableOps = metrics.filter(m => m.cacheHit !== undefined);
    const cacheHits = cacheableOps.filter(m => m.cacheHit === true).length;

    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const avgDuration = totalDuration / durations.length;
    
    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    const timeSpan = metrics.length > 1 
      ? (Math.max(...metrics.map(m => m.timestamp)) - Math.min(...metrics.map(m => m.timestamp))) / 1000
      : 1;
    const throughput = metrics.length / timeSpan;

    return {
      operation,
      count: metrics.length,
      totalDuration,
      avgDuration,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p50Duration: durations[p50Index] || 0,
      p95Duration: durations[p95Index] || 0,
      p99Duration: durations[p99Index] || 0,
      successRate: (successfulOps / metrics.length) * 100,
      errorRate: ((metrics.length - successfulOps) / metrics.length) * 100,
      throughput,
      cacheHitRate: cacheableOps.length > 0 ? (cacheHits / cacheableOps.length) * 100 : undefined,
    };
  }

  private emitAggregatedMetrics(): void {
    const aggregated = this.getAggregatedMetrics();
    const realtimeStats = this.getRealtimeStats();
    const cacheStats = this.getCacheStats();

    this.emit('aggregated-metrics', {
      aggregated,
      realtimeStats,
      cacheStats,
      timestamp: Date.now(),
    });
  }
}

// Singleton instance for global monitoring
export const globalPerformanceMonitor = new PerformanceMonitor({
  maxMetrics: 50000,
  aggregationInterval: 10000, // 10 seconds
  enableRealTimeReporting: process.env.NODE_ENV === 'development',
});

// Utility functions for common monitoring patterns
export function withPerformanceMonitoring<T>(
  monitor: PerformanceMonitor,
  operation: string,
  fn: () => T,
  context?: { userId?: string; resource?: string; action?: string }
): T {
  return monitor.measureSync(operation, fn, context);
}

export async function withAsyncPerformanceMonitoring<T>(
  monitor: PerformanceMonitor,
  operation: string,
  fn: () => Promise<T>,
  context?: { userId?: string; resource?: string; action?: string; cacheHit?: boolean }
): Promise<T> {
  return monitor.measureAsync(operation, fn, context);
}

// Performance test helpers
export class PerformanceTestHelper {
  static async runLoadTest(
    operation: () => Promise<any>,
    options: {
      duration: number; // milliseconds
      targetRps: number;
      warmupTime?: number;
    }
  ): Promise<{
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    actualRps: number;
    errorRate: number;
  }> {
    const monitor = new PerformanceMonitor();
    monitor.start();

    const startTime = Date.now();
    const endTime = startTime + options.duration;
    const interval = 1000 / options.targetRps;

    // Warmup phase
    if (options.warmupTime) {
      const warmupEnd = startTime + options.warmupTime;
      while (Date.now() < warmupEnd) {
        try {
          await operation();
        } catch (error) {
          // Ignore warmup errors
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    // Main test phase
    const operations: Promise<void>[] = [];
    while (Date.now() < endTime) {
      const operationPromise = monitor.measureAsync('load-test-operation', operation)
        .catch(() => {}); // Handle errors in monitoring
      
      operations.push(operationPromise);
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    // Wait for all operations to complete
    await Promise.allSettled(operations);
    
    monitor.stop();

    // Calculate results
    const metrics = monitor.getMetrics();
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const successfulOps = metrics.filter(m => m.success).length;
    const totalDuration = Date.now() - startTime;

    return {
      totalOperations: metrics.length,
      successfulOperations: successfulOps,
      failedOperations: metrics.length - successfulOps,
      avgResponseTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p95ResponseTime: durations[Math.floor(durations.length * 0.95)] || 0,
      p99ResponseTime: durations[Math.floor(durations.length * 0.99)] || 0,
      actualRps: (metrics.length / totalDuration) * 1000,
      errorRate: ((metrics.length - successfulOps) / metrics.length) * 100,
    };
  }

  static createPerformanceAssertion(threshold: {
    maxAvgResponseTime?: number;
    minThroughput?: number;
    maxErrorRate?: number;
    minCacheHitRate?: number;
  }) {
    return (results: any) => {
      if (threshold.maxAvgResponseTime && results.avgResponseTime > threshold.maxAvgResponseTime) {
        throw new Error(`Average response time ${results.avgResponseTime}ms exceeds threshold ${threshold.maxAvgResponseTime}ms`);
      }

      if (threshold.minThroughput && results.actualRps < threshold.minThroughput) {
        throw new Error(`Throughput ${results.actualRps} RPS below threshold ${threshold.minThroughput} RPS`);
      }

      if (threshold.maxErrorRate && results.errorRate > threshold.maxErrorRate) {
        throw new Error(`Error rate ${results.errorRate}% exceeds threshold ${threshold.maxErrorRate}%`);
      }

      if (threshold.minCacheHitRate && results.cacheHitRate < threshold.minCacheHitRate) {
        throw new Error(`Cache hit rate ${results.cacheHitRate}% below threshold ${threshold.minCacheHitRate}%`);
      }
    };
  }
}