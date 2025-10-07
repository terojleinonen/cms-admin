/**
 * Permission Performance Monitoring Initialization
 * Sets up performance monitoring and alerting for the permission system
 */

import { permissionPerformanceMonitor, permissionPerformanceAlerting } from './permission-performance-monitor';

/**
 * Initialize permission performance monitoring
 */
export function initializePermissionPerformanceMonitoring() {
  // Set up custom alert thresholds based on environment
  const thresholds = {
    maxLatency: process.env.PERMISSION_MAX_LATENCY ? parseInt(process.env.PERMISSION_MAX_LATENCY) : 100,
    minCacheHitRatio: process.env.PERMISSION_MIN_CACHE_HIT_RATIO ? parseFloat(process.env.PERMISSION_MIN_CACHE_HIT_RATIO) : 0.85,
    maxErrorRate: process.env.PERMISSION_MAX_ERROR_RATE ? parseFloat(process.env.PERMISSION_MAX_ERROR_RATE) : 0.05,
    maxCacheMemoryUsage: process.env.PERMISSION_MAX_CACHE_MEMORY ? parseFloat(process.env.PERMISSION_MAX_CACHE_MEMORY) : 0.8,
    slowCheckThreshold: process.env.PERMISSION_SLOW_CHECK_THRESHOLD ? parseInt(process.env.PERMISSION_SLOW_CHECK_THRESHOLD) : 50
  };

  permissionPerformanceMonitor.updateThresholds(thresholds);

  // Set up enhanced alert handlers for production
  if (process.env.NODE_ENV === 'production') {
    setupProductionAlertHandlers();
  }

  // Start monitoring
  permissionPerformanceAlerting.startMonitoring(60000); // Check every minute

  console.log('✅ Permission performance monitoring initialized');
}

/**
 * Set up production alert handlers
 */
function setupProductionAlertHandlers() {
  // High latency alerts
  permissionPerformanceAlerting.onAlert('HIGH_LATENCY', async (alert) => {
    console.error(`🚨 HIGH LATENCY ALERT: ${alert.message}`);
    
    // Send to monitoring service (e.g., DataDog, New Relic)
    if (process.env.MONITORING_WEBHOOK_URL) {
      try {
        await fetch(process.env.MONITORING_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert_type: 'permission_high_latency',
            severity: alert.severity,
            message: alert.message,
            value: alert.value,
            threshold: alert.threshold,
            timestamp: alert.timestamp
          })
        });
      } catch (error) {
        console.error('Failed to send monitoring alert:', error);
      }
    }

    // Send to Slack if configured
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 Permission System Alert`,
            attachments: [{
              color: alert.severity === 'CRITICAL' ? 'danger' : 'warning',
              fields: [
                { title: 'Type', value: 'High Latency', short: true },
                { title: 'Severity', value: alert.severity, short: true },
                { title: 'Value', value: `${alert.value.toFixed(2)}ms`, short: true },
                { title: 'Threshold', value: `${alert.threshold}ms`, short: true },
                { title: 'Message', value: alert.message, short: false }
              ],
              ts: Math.floor(alert.timestamp / 1000)
            }]
          })
        });
      } catch (error) {
        console.error('Failed to send Slack alert:', error);
      }
    }
  });

  // Low cache hit ratio alerts
  permissionPerformanceAlerting.onAlert('LOW_CACHE_HIT_RATIO', async (alert) => {
    console.warn(`⚠️ LOW CACHE HIT RATIO ALERT: ${alert.message}`);
    
    // Auto-remediation: Clear and warm cache
    try {
      console.log('🔄 Attempting cache remediation...');
      
      // This would trigger cache warming in a real implementation
      // For now, just log the action
      console.log('Cache warming would be triggered here');
      
    } catch (error) {
      console.error('Failed to perform cache remediation:', error);
    }
  });

  // High error rate alerts
  permissionPerformanceAlerting.onAlert('HIGH_ERROR_RATE', async (alert) => {
    console.error(`🚨 HIGH ERROR RATE ALERT: ${alert.message}`);
    
    // This is critical - might indicate a system issue
    if (process.env.PAGERDUTY_INTEGRATION_KEY) {
      try {
        await fetch('https://events.pagerduty.com/v2/enqueue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
            event_action: 'trigger',
            payload: {
              summary: `Permission System High Error Rate: ${alert.message}`,
              severity: alert.severity.toLowerCase(),
              source: 'permission-system',
              component: 'rbac',
              group: 'security',
              class: 'performance',
              custom_details: {
                error_rate: `${(alert.value * 100).toFixed(2)}%`,
                threshold: `${(alert.threshold * 100).toFixed(2)}%`,
                timestamp: new Date(alert.timestamp).toISOString()
              }
            }
          })
        });
      } catch (error) {
        console.error('Failed to send PagerDuty alert:', error);
      }
    }
  });

  // Cache memory high alerts
  permissionPerformanceAlerting.onAlert('CACHE_MEMORY_HIGH', async (alert) => {
    console.warn(`⚠️ HIGH CACHE MEMORY USAGE ALERT: ${alert.message}`);
    
    // Auto-remediation: Trigger cache cleanup
    try {
      console.log('🧹 Triggering cache cleanup...');
      
      // This would trigger cache cleanup in a real implementation
      console.log('Cache cleanup would be triggered here');
      
    } catch (error) {
      console.error('Failed to perform cache cleanup:', error);
    }
  });
}

/**
 * Get performance monitoring health check
 */
export function getPerformanceMonitoringHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: {
    totalChecks: number;
    avgLatency: number;
    cacheHitRatio: number;
    errorRate: number;
    activeAlerts: number;
  };
  lastCheck: number;
} {
  const stats = permissionPerformanceMonitor.getPerformanceStats(5 * 60 * 1000); // Last 5 minutes
  const alerts = permissionPerformanceMonitor.getAlerts(undefined, false); // Unresolved alerts

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Determine health status
  if (stats.errorRate > 0.1 || stats.avgLatency > 200 || alerts.some(a => a.severity === 'CRITICAL')) {
    status = 'unhealthy';
  } else if (stats.errorRate > 0.05 || stats.avgLatency > 100 || stats.cacheHitRatio < 0.8 || alerts.length > 5) {
    status = 'degraded';
  }

  return {
    status,
    metrics: {
      totalChecks: stats.totalChecks,
      avgLatency: stats.avgLatency,
      cacheHitRatio: stats.cacheHitRatio,
      errorRate: stats.errorRate,
      activeAlerts: alerts.length
    },
    lastCheck: Date.now()
  };
}

/**
 * Export performance metrics for external monitoring
 */
export function exportPerformanceMetrics(format: 'prometheus' | 'json' = 'json'): string {
  const stats = permissionPerformanceMonitor.getPerformanceStats();
  const cacheMetrics = permissionPerformanceMonitor.getCachePerformanceMetrics();
  
  if (format === 'prometheus') {
    return `
# HELP permission_checks_total Total number of permission checks
# TYPE permission_checks_total counter
permission_checks_total ${stats.totalChecks}

# HELP permission_check_duration_ms Average permission check duration in milliseconds
# TYPE permission_check_duration_ms gauge
permission_check_duration_ms ${stats.avgLatency}

# HELP permission_cache_hit_ratio Cache hit ratio for permission checks
# TYPE permission_cache_hit_ratio gauge
permission_cache_hit_ratio ${stats.cacheHitRatio}

# HELP permission_error_rate Error rate for permission checks
# TYPE permission_error_rate gauge
permission_error_rate ${stats.errorRate}

# HELP permission_cache_operations_total Total cache operations
# TYPE permission_cache_operations_total counter
permission_cache_operations_total ${cacheMetrics.totalOperations}

# HELP permission_cache_hits_total Total cache hits
# TYPE permission_cache_hits_total counter
permission_cache_hits_total ${cacheMetrics.hits}

# HELP permission_cache_misses_total Total cache misses
# TYPE permission_cache_misses_total counter
permission_cache_misses_total ${cacheMetrics.misses}
`.trim();
  }

  return JSON.stringify({
    permission_system: {
      checks: {
        total: stats.totalChecks,
        avg_latency_ms: stats.avgLatency,
        p95_latency_ms: stats.p95Latency,
        p99_latency_ms: stats.p99Latency,
        error_rate: stats.errorRate,
        slow_checks: stats.slowChecks
      },
      cache: {
        hit_ratio: stats.cacheHitRatio,
        miss_ratio: stats.cacheMissRatio,
        total_operations: cacheMetrics.totalOperations,
        hits: cacheMetrics.hits,
        misses: cacheMetrics.misses,
        avg_get_latency_ms: cacheMetrics.avgGetLatency,
        avg_set_latency_ms: cacheMetrics.avgSetLatency
      },
      alerts: {
        active: permissionPerformanceMonitor.getAlerts(undefined, false).length,
        critical: permissionPerformanceMonitor.getAlerts('CRITICAL', false).length,
        high: permissionPerformanceMonitor.getAlerts('HIGH', false).length
      }
    },
    timestamp: Date.now()
  }, null, 2);
}