/**
 * Analytics Export API
 * Handles report exports in various formats (CSV, PDF)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { AnalyticsService } from '@/app/lib/analytics';
import { z } from 'zod';

// Validation schema
const exportQuerySchema = z.object({
  format: z.enum(['csv', 'json']),
  timeframe: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  type: z.enum(['full', 'metrics', 'performance', 'inventory']).optional().default('full')
});

// GET /api/analytics/export - Export analytics data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role for exports
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const timeframe = searchParams.get('timeframe') || '30d';
    const type = searchParams.get('type') || 'full';

    // Validate query parameters
    const validatedQuery = exportQuerySchema.parse({
      format,
      timeframe,
      type
    });

    const timeframeData = AnalyticsService.getTimeframe(validatedQuery.timeframe);

    // Generate report data
    const reportData = await AnalyticsService.generateReport(timeframeData);

    // Handle different export formats
    switch (validatedQuery.format) {
      case 'csv':
        const csvData = await AnalyticsService.exportToCSV(reportData);
        
        return new NextResponse(csvData, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="analytics-report-${validatedQuery.timeframe}-${Date.now()}.csv"`
          }
        });

      case 'json':
        const jsonData = JSON.stringify(reportData, null, 2);
        
        return new NextResponse(jsonData, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="analytics-report-${validatedQuery.timeframe}-${Date.now()}.json"`
          }
        });

      default:
        return NextResponse.json(
          { error: 'Unsupported export format' },
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

    console.error('Analytics export error:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}