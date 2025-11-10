/**
 * Simplified Permission Performance Monitoring
 * Basic monitoring for permission check performance
 */

import { Permission } from './types';

export interface PermissionMetrics {
  timestamp: number;
  operation: 'permission_check' | 'cache_get' | 'cache_set' | 'cache_invalidate';
  duration: number;
  success: boolean;
  cacheHit?: boolean;
}

/**
 * Simplified Permission Performance Monitor
 * Basic tracking for permission check performance
 */
export class PermissionPerformanceMonitor {
  private static instance: PermissionPerformanceMonitor;
  private metrics: PermissionMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1k metrics

  static getInstance(): PermissionPerformanceMonitor {
    if (!PermissionPerformanceMonitor.instance) {
      PermissionPerformanceMonitor.instance = new PermissionPerformanceMonitor();
    }
    return PermissionPerformanceMonitor.instance;
  }

  /**
   * Track permission check performance
   */
  trackPermissionCheck<T>(
    operation: string,
    userId: string,
    permission: Permission,
    fn: () => T
  ): T {
    const start = performance.now();
    let success = true;

    try {
      const result = fn();
      return result;
    } catch (err) {
      success = false;
      throw err;
    } finally {
      const duration = performance.now() - start;
      
      this.addMetric({
        timestamp: Date.now(),
        operation: 'permission_check',
        duration,
        success,
        cacheHit: duration < 1 // Simple cache hit detection
      });
    }
  }

  /**
   * Track cache operation performance
   */
  trackCacheOperation<T>(
    operation: 'cache_get' | 'cache_set' | 'cache_invalidate',
    key: string,
    fn: () => T
  ): T {
    const start = performance.now();
    let success = true;

    try {
      const result = fn();
      return result;
    } catch (err) {
      success = false;
      throw err;
    } finally {
      const duration = performance.now() - start;
      
      this.addMetric({
        timestamp: Date.now(),
        operation,
        duration,
        success
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
   * Get basic performance statistics
   */
  getStats(): { totalChecks: number; avgLatency: number; errorRate: number } {
    const permissionChecks = this.metrics.filter(m => m.operation === 'permission_check');
    
    if (permissionChecks.length === 0) {
      return { totalChecks: 0, avgLatency: 0, errorRate: 0 };
    }

    const totalChecks = permissionChecks.length;
    const avgLatency = permissionChecks.reduce((sum, m) => sum + m.duration, 0) / totalChecks;
    const errors = permissionChecks.filter(m => !m.success).length;
    const errorRate = errors / totalChecks;

    return { totalChecks, avgLatency, errorRate };
  }

  /**
   * Get performance statistics (alias for getStats)
   */
  getPerformanceStats(): { totalChecks: number; avgLatency: number; errorRate: number; cacheHitRatio?: number } {
    const stats = this.getStats();
    const permissionChecks = this.metrics.filter(m => m.operation === 'permission_check');
    const cacheHits = permissionChecks.filter(m => m.cacheHit).length;
    const cacheHitRatio = permissionChecks.length > 0 ? cacheHits / permissionChecks.length : 0;
    
    return { ...stats, cacheHitRatio };
  }

  /**
   * Get cache performance metrics
   */
  getCachePerformanceMetrics(): { hits: number; misses: number; hitRatio: number } {
    const permissionChecks = this.metrics.filter(m => m.operation === 'permission_check');
    const hits = permissionChecks.filter(m => m.cacheHit).length;
    const misses = permissionChecks.length - hits;
    const hitRatio = permissionChecks.length > 0 ? hits / permissionChecks.length : 0;
    
    return { hits, misses, hitRatio };
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    summary: { totalChecks: number; avgLatency: number; errorRate: number };
    cache: { hits: number; misses: number; hitRatio: number };
    operations: Record<string, number>;
  } {
    const summary = this.getPerformanceStats();
    const cache = this.getCachePerformanceMetrics();
    const operations: Record<string, number> = {};
    
    this.metrics.forEach(m => {
      operations[m.operation] = (operations[m.operation] || 0) + 1;
    });
    
    return { summary, cache, operations };
  }

  /**
   * Export metrics
   */
  exportMetrics(): PermissionMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

/**
 * Permission Performance Alerting
 */
export class PermissionPerformanceAlerting {
  private alerts: Array<{ type: string; message: string; timestamp: number }> = [];

  addAlert(type: string, message: string): void {
    this.alerts.push({ type, message, timestamp: Date.now() });
  }

  getAlerts(): Array<{ type: string; message: string; timestamp: number }> {
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }
}

export interface PerformanceAlert {
  type: string;
  message: string;
  timestamp: number;
}

// Singleton instance
export const permissionPerformanceMonitor = PermissionPerformanceMonitor.getInstance();