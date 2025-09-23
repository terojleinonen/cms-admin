/**
 * Performance Metrics API
 * Provides real-time and historical performance data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { PerformanceMonitor } from '@/lib/performance';
import { CacheService } from '@/lib/cache';

// GET /api/admin/performance/metrics - Get performance metrics
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    , { status: 401 });
    }

    const performanceMonitor = PerformanceMonitor.getInstance();
    const cache = CacheService.getInstance();

    // Get real-time metrics
    const realTimeMetrics = performanceMonitor.getRealTimeMetrics();

    // Get performance report for last hour
    const endTime = Date.now();
    const startTime = endTime - (60 * 60 * 1000); // 1 hour ago
    const performanceReport = performanceMonitor.getPerformanceReport(startTime, endTime);

    // Get cache statistics
    const cacheStats = cache.getStats();

    // Mock image optimization metrics (would come from ImageOptimizationService)
    const imageMetrics = {
      totalProcessed: 150,
      averageCompressionRatio: 65,
      totalSizeSaved: 25 * 1024 * 1024 // 25MB
    };

    const metrics = {
      realTime: realTimeMetrics,
      database: {
        totalQueries: performanceReport.databaseMetrics.totalQueries,
        slowQueries: performanceReport.databaseMetrics.slowestQueries.length,
        averageQueryTime: performanceReport.databaseMetrics.averageQueryTime,
        cacheHitRate: cacheStats.hitRate
      },
      cache: cacheStats,
      images: imageMetrics
    };

    return createApiSuccessResponse( metrics );

  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)