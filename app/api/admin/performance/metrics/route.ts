/**
 * Performance Metrics API
 * Provides real-time and historical performance data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { PerformanceMonitor } from '@/app/lib/performance';
import { CacheService } from '@/app/lib/cache';

// GET /api/admin/performance/metrics - Get performance metrics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    return NextResponse.json({ metrics });

  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}