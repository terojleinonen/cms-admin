/**
 * Permission System Performance Monitoring
 * Comprehensive monitoring for permission check latency, cache performance, and alerting
 */

import { UserRole } from '@prisma/client';
import { User } from './types';
import { Permission } from './permissions';

export interface PermissionMetrics {
  timestamp: number;
  operation: 'permission_check' | 'cache_get' | 'cache_set' | 'cache_invalidate';
  duration: number;
  success: boolean;
  userId?: string;
  resource?: string;
  action?: string;
  scope?: string;
  cacheHit?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface PermissionPerformanceStats {
  totalChecks: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  cacheHitRatio: number;
  cacheMissRatio: number;
  errorRate: number;
  slowChecks: number;
  recentMetrics: PermissionMetrics[];
}

export interface CachePerformanceMetrics {
  hits: number;
  misses: number;
  hitRatio: number;
  missRatio: number;
  totalOperations: number;
  avgGetLatency: number;
  avgSetLatency: number;
  evictions: number;
  size: number;
  memoryUsage: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'HIGH_LATENCY' | 'LOW_CACHE_HIT_RATIO' | 'HIGH_ERROR_RATE' | 'CACHE_MEMORY_HIGH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  resolved: boolean;
  metadata?: Record<string, unknown>;
}

export interface AlertThresholds {
  maxLatency: number;
  minCacheHitRatio: number;
  maxErrorRate: number;
  maxCacheMemoryUsage: number;
  slowCheckThreshold: number;
}

/**
 * Permission Performance Monitor
 * Tracks and analyzes permission system performance metrics
 */
export class PermissionPerformanceMonitor {
  private static instance: PermissionPerformanceMonitor;
  private metrics: PermissionMetrics[] = [];
  private cacheMetrics: Map<string, { hits: number; misses: number; operations: number }> = new Map();
  private alerts: PerformanceAlert[] = [];
  private readonly maxMetrics = 50000; // Keep last 50k metrics
  private readonly maxAlerts = 1000; // Keep last 1k alerts
  
  private readonly defaultThresholds: AlertThresholds = {
    maxLatency: 100, // 100ms
    minCacheHitRatio: 0.85, // 85%
    maxErrorRate: 0.05, // 5%
    maxCacheMemoryUsage: 0.8, // 80%
    slowCheckThreshold: 50 // 50ms
  };

  private thresholds: AlertThresholds;

  constructor(thresholds?: Partial<AlertThresholds>) {
    this.thresholds = { ...this.defaultThresholds, ...thresholds };
  }

  static getInstance(thresholds?: Partial<AlertThresholds>): PermissionPerformanceMonitor {
    if (!PermissionPerformanceMonitor.instance) {
      PermissionPerformanceMonitor.instance = new PermissionPerformanceMonitor(thresholds);
    }
    return PermissionPerformanceMonitor.instance;
  }

  /**
   * Track permission check performance
   */
  async trackPermissionCheck<T>(
    operation: string,
    userId: string,
    permission: Permission,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const start = performance.now();
    let success = true;
    let error: string | undefined;
    let cacheHit: boolean | undefined;

    try {
      const result = await fn();
      
      // Detect if this was a cache hit based on execution time
      const duration = performance.now() - start;
      cacheHit = duration < 1; // Cache hits should be very fast
      
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const duration = performance.now() - start;
      
      this.addMetric({
        timestamp: Date.now(),
        operation: 'permission_check',
        duration,
        success,
        userId,
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope,
        cacheHit,
        error,
        metadata: { operation }
      });

      // Update cache metrics
      this.updateCacheMetrics(permission, cacheHit || false);

      // Check for performance alerts
      this.checkPerformanceAlerts(duration, success);
    }
  }

  /**
   * Track cache operation performance
   */
  async trackCacheOperation<T>(
    operation: 'cache_get' | 'cache_set' | 'cache_invalidate',
    key: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const start = performance.now();
    let success = true;
    let error: string | undefined;

    try {
      const result = await fn();
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const duration = performance.now() - start;
      
      this.addMetric({
        timestamp: Date.now(),
        operation,
        duration,
        success,
        error,
        metadata: { key }
      });
    }
  }

  /**
   * Add performance metric
   */
  private addMetric(metric: PermissionMetrics): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Update cache performance metrics
   */
  private updateCacheMetrics(permission: Permission, isHit: boolean): void {
    const key = `${permission.resource}:${permission.action}:${permission.scope || 'default'}`;
    const existing = this.cacheMetrics.get(key) || { hits: 0, misses: 0, operations: 0 };
    
    if (isHit) {
      existing.hits++;
    } else {
      existing.misses++;
    }
    existing.operations++;
    
    this.cacheMetrics.set(key, existing);
  }

  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts(latency: number, success: boolean): void {
    const now = Date.now();
    
    // Check high latency
    if (latency > this.thresholds.maxLatency) {
      this.addAlert({
        id: `latency-${now}`,
        type: 'HIGH_LATENCY',
        severity: latency > this.thresholds.maxLatency * 2 ? 'CRITICAL' : 'HIGH',
        message: `Permission check took ${latency.toFixed(2)}ms (threshold: ${this.thresholds.maxLatency}ms)`,
        value: latency,
        threshold: this.thresholds.maxLatency,
        timestamp: now,
        resolved: false
      });
    }

    // Check cache hit ratio (every 100 operations)
    if (this.metrics.length % 100 === 0) {
      const stats = this.getPerformanceStats();
      if (stats.cacheHitRatio < this.thresholds.minCacheHitRatio) {
        this.addAlert({
          id: `cache-hit-ratio-${now}`,
          type: 'LOW_CACHE_HIT_RATIO',
          severity: stats.cacheHitRatio < this.thresholds.minCacheHitRatio * 0.8 ? 'CRITICAL' : 'HIGH',
          message: `Cache hit ratio is ${(stats.cacheHitRatio * 100).toFixed(1)}% (threshold: ${(this.thresholds.minCacheHitRatio * 100).toFixed(1)}%)`,
          value: stats.cacheHitRatio,
          threshold: this.thresholds.minCacheHitRatio,
          timestamp: now,
          resolved: false
        });
      }

      // Check error rate
      if (stats.errorRate > this.thresholds.maxErrorRate) {
        this.addAlert({
          id: `error-rate-${now}`,
          type: 'HIGH_ERROR_RATE',
          severity: stats.errorRate > this.thresholds.maxErrorRate * 2 ? 'CRITICAL' : 'HIGH',
          message: `Permission check error rate is ${(stats.errorRate * 100).toFixed(1)}% (threshold: ${(this.thresholds.maxErrorRate * 100).toFixed(1)}%)`,
          value: stats.errorRate,
          threshold: this.thresholds.maxErrorRate,
          timestamp: now,
          resolved: false
        });
      }
    }
  }

  /**
   * Add performance alert
   */
  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    // Log critical alerts
    if (alert.severity === 'CRITICAL') {
      console.error(`🚨 CRITICAL Permission Performance Alert: ${alert.message}`);
    } else if (alert.severity === 'HIGH') {
      console.warn(`⚠️ HIGH Permission Performance Alert: ${alert.message}`);
    }
  }

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStats(timeWindow?: number): PermissionPerformanceStats {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;
    
    const filteredMetrics = this.metrics.filter(m => 
      m.operation === 'permission_check' && m.timestamp >= windowStart
    );

    if (filteredMetrics.length === 0) {
      return {
        totalChecks: 0,
        avgLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        cacheHitRatio: 0,
        cacheMissRatio: 0,
        errorRate: 0,
        slowChecks: 0,
        recentMetrics: []
      };
    }

    // Calculate latency statistics
    const latencies = filteredMetrics.map(m => m.duration).sort((a, b) => a - b);
    const totalChecks = filteredMetrics.length;
    const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / totalChecks;
    const p95Index = Math.floor(totalChecks * 0.95);
    const p99Index = Math.floor(totalChecks * 0.99);
    const p95Latency = latencies[p95Index] || 0;
    const p99Latency = latencies[p99Index] || 0;

    // Calculate cache statistics
    const cacheHits = filteredMetrics.filter(m => m.cacheHit === true).length;
    const cacheMisses = filteredMetrics.filter(m => m.cacheHit === false).length;
    const totalCacheOperations = cacheHits + cacheMisses;
    const cacheHitRatio = totalCacheOperations > 0 ? cacheHits / totalCacheOperations : 0;
    const cacheMissRatio = totalCacheOperations > 0 ? cacheMisses / totalCacheOperations : 0;

    // Calculate error rate
    const errors = filteredMetrics.filter(m => !m.success).length;
    const errorRate = totalChecks > 0 ? errors / totalChecks : 0;

    // Count slow checks
    const slowChecks = filteredMetrics.filter(m => m.duration > this.thresholds.slowCheckThreshold).length;

    return {
      totalChecks,
      avgLatency,
      p95Latency,
      p99Latency,
      cacheHitRatio,
      cacheMissRatio,
      errorRate,
      slowChecks,
      recentMetrics: filteredMetrics.slice(-100) // Last 100 metrics
    };
  }

  /**
   * Get cache performance metrics
   */
  getCachePerformanceMetrics(): CachePerformanceMetrics {
    let totalHits = 0;
    let totalMisses = 0;
    let totalOperations = 0;

    for (const metrics of this.cacheMetrics.values()) {
      totalHits += metrics.hits;
      totalMisses += metrics.misses;
      totalOperations += metrics.operations;
    }

    const hitRatio = totalOperations > 0 ? totalHits / totalOperations : 0;
    const missRatio = totalOperations > 0 ? totalMisses / totalOperations : 0;

    // Calculate average latencies for cache operations
    const cacheGetMetrics = this.metrics.filter(m => m.operation === 'cache_get');
    const cacheSetMetrics = this.metrics.filter(m => m.operation === 'cache_set');
    
    const avgGetLatency = cacheGetMetrics.length > 0 
      ? cacheGetMetrics.reduce((sum, m) => sum + m.duration, 0) / cacheGetMetrics.length 
      : 0;
    
    const avgSetLatency = cacheSetMetrics.length > 0 
      ? cacheSetMetrics.reduce((sum, m) => sum + m.duration, 0) / cacheSetMetrics.length 
      : 0;

    return {
      hits: totalHits,
      misses: totalMisses,
      hitRatio,
      missRatio,
      totalOperations,
      avgGetLatency,
      avgSetLatency,
      evictions: 0, // Would need to track this separately
      size: this.cacheMetrics.size,
      memoryUsage: 0 // Would need to calculate actual memory usage
    };
  }

  /**
   * Get performance alerts
   */
  getAlerts(severity?: PerformanceAlert['severity'], resolved?: boolean): PerformanceAlert[] {
    return this.alerts.filter(alert => {
      if (severity && alert.severity !== severity) return false;
      if (resolved !== undefined && alert.resolved !== resolved) return false;
      return true;
    });
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Get performance report
   */
  getPerformanceReport(timeWindow: number = 24 * 60 * 60 * 1000): {
    summary: PermissionPerformanceStats;
    cacheMetrics: CachePerformanceMetrics;
    alerts: PerformanceAlert[];
    recommendations: Array<{
      type: 'performance' | 'cache' | 'alerting';
      priority: 'low' | 'medium' | 'high';
      description: string;
      impact: string;
      implementation: string;
    }>;
  } {
    const summary = this.getPerformanceStats(timeWindow);
    const cacheMetrics = this.getCachePerformanceMetrics();
    const alerts = this.getAlerts(undefined, false); // Unresolved alerts

    const recommendations: Array<{
      type: 'performance' | 'cache' | 'alerting';
      priority: 'low' | 'medium' | 'high';
      description: string;
      impact: string;
      implementation: string;
    }> = [];

    // Performance recommendations
    if (summary.avgLatency > this.thresholds.maxLatency * 0.8) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        description: `Average permission check latency is ${summary.avgLatency.toFixed(2)}ms`,
        impact: 'Slower user experience and increased server load',
        implementation: 'Optimize permission validation logic and consider caching improvements'
      });
    }

    // Cache recommendations
    if (cacheMetrics.hitRatio < this.thresholds.minCacheHitRatio) {
      recommendations.push({
        type: 'cache',
        priority: 'high',
        description: `Cache hit ratio is ${(cacheMetrics.hitRatio * 100).toFixed(1)}%`,
        impact: 'Increased database load and slower permission checks',
        implementation: 'Increase cache TTL, improve cache warming, or optimize cache key strategy'
      });
    }

    // Alert recommendations
    if (alerts.length > 10) {
      recommendations.push({
        type: 'alerting',
        priority: 'medium',
        description: `${alerts.length} unresolved performance alerts`,
        impact: 'Potential performance issues going unaddressed',
        implementation: 'Review and resolve alerts, adjust thresholds if needed'
      });
    }

    return {
      summary,
      cacheMetrics,
      alerts,
      recommendations
    };
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(newThresholds: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Clear metrics and alerts
   */
  clearMetrics(): void {
    this.metrics = [];
    this.cacheMetrics.clear();
    this.alerts = [];
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'operation', 'duration', 'success', 'userId', 'resource', 'action', 'scope', 'cacheHit', 'error'];
      const rows = this.metrics.map(m => [
        m.timestamp,
        m.operation,
        m.duration,
        m.success,
        m.userId || '',
        m.resource || '',
        m.action || '',
        m.scope || '',
        m.cacheHit || '',
        m.error || ''
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify({
      metrics: this.metrics,
      cacheMetrics: Object.fromEntries(this.cacheMetrics),
      alerts: this.alerts,
      thresholds: this.thresholds
    }, null, 2);
  }
}

/**
 * Performance alerting system
 */
export class PermissionPerformanceAlerting {
  private monitor: PermissionPerformanceMonitor;
  private alertHandlers: Map<string, (alert: PerformanceAlert) => void> = new Map();

  constructor(monitor: PermissionPerformanceMonitor) {
    this.monitor = monitor;
  }

  /**
   * Register alert handler
   */
  onAlert(type: PerformanceAlert['type'], handler: (alert: PerformanceAlert) => void): void {
    this.alertHandlers.set(type, handler);
  }

  /**
   * Start monitoring and alerting
   */
  startMonitoring(interval: number = 60000): void { // Default 1 minute
    setInterval(() => {
      const alerts = this.monitor.getAlerts(undefined, false);
      
      for (const alert of alerts) {
        const handler = this.alertHandlers.get(alert.type);
        if (handler) {
          handler(alert);
        }
      }
    }, interval);
  }

  /**
   * Send alert notification (placeholder for actual implementation)
   */
  private async sendNotification(alert: PerformanceAlert): Promise<void> {
    // This would integrate with your notification system
    // (email, Slack, PagerDuty, etc.)
    console.log(`📧 Sending alert notification: ${alert.message}`);
  }
}

// Singleton instance
export const permissionPerformanceMonitor = PermissionPerformanceMonitor.getInstance();
export const permissionPerformanceAlerting = new PermissionPerformanceAlerting(permissionPerformanceMonitor);

// Default alert handlers
permissionPerformanceAlerting.onAlert('HIGH_LATENCY', (alert) => {
  console.warn(`⚠️ High Latency Alert: ${alert.message}`);
});

permissionPerformanceAlerting.onAlert('LOW_CACHE_HIT_RATIO', (alert) => {
  console.warn(`⚠️ Low Cache Hit Ratio Alert: ${alert.message}`);
});

permissionPerformanceAlerting.onAlert('HIGH_ERROR_RATE', (alert) => {
  console.error(`🚨 High Error Rate Alert: ${alert.message}`);
});

permissionPerformanceAlerting.onAlert('CACHE_MEMORY_HIGH', (alert) => {
  console.warn(`⚠️ High Cache Memory Usage Alert: ${alert.message}`);
});