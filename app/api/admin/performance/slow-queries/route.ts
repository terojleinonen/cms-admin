/**
 * Slow Queries API
 * Provides information about slow database queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { PerformanceMonitor } from '@/lib/performance';

// GET /api/admin/performance/slow-queries - Get slow queries
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const minDuration = parseInt(searchParams.get('minDuration') || '500');

    const performanceMonitor = PerformanceMonitor.getInstance();
    const slowQueries = performanceMonitor.getSlowQueries(limit, minDuration);

    return createApiSuccessResponse({ slowQueries });

  } catch (error) {
    console.error('Error fetching slow queries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch slow queries' },
      { status: 500 }
    );
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)