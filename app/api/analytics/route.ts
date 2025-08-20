/**
 * Analytics API
 * Provides dashboard metrics, performance data, and reporting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { AnalyticsService } from '@/app/lib/analytics';
import { z } from 'zod';

// Validation schemas
const analyticsQuerySchema = z.object({
  type: z.enum(['metrics', 'performance', 'inventory', 'activity', 'trends', 'report']),
  timeframe: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  limit: z.number().min(1).max(100).optional().default(10)
});

// GET /api/analytics - Get analytics data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'metrics';
    const timeframe = searchParams.get('timeframe') || '30d';
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate query parameters
    const validatedQuery = analyticsQuerySchema.parse({
      type,
      timeframe,
      limit
    });

    const timeframeData = AnalyticsService.getTimeframe(validatedQuery.timeframe);

    switch (validatedQuery.type) {
      case 'metrics':
        const metrics = await AnalyticsService.getDashboardMetrics();
        return NextResponse.json({ metrics });

      case 'performance':
        const performance = await AnalyticsService.getContentPerformance(
          validatedQuery.limit,
          timeframeData
        );
        return NextResponse.json({ performance });

      case 'inventory':
        const inventory = await AnalyticsService.getInventoryAlerts();
        return NextResponse.json({ inventory });

      case 'activity':
        const activity = await AnalyticsService.getRecentActivity(validatedQuery.limit);
        return NextResponse.json({ activity });

      case 'trends':
        const trends = await AnalyticsService.getContentTrends(timeframeData);
        const storageGrowth = await AnalyticsService.getStorageGrowth(timeframeData);
        return NextResponse.json({ 
          trends: {
            ...trends,
            storageGrowth
          }
        });

      case 'report':
        const report = await AnalyticsService.generateReport(timeframeData);
        return NextResponse.json({ report });

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        );
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}