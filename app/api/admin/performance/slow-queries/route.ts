/**
 * Slow Queries API
 * Provides information about slow database queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { PerformanceMonitor } from '@/app/lib/performance';

// GET /api/admin/performance/slow-queries - Get slow queries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const minDuration = parseInt(searchParams.get('minDuration') || '500');

    const performanceMonitor = PerformanceMonitor.getInstance();
    const slowQueries = performanceMonitor.getSlowQueries(limit, minDuration);

    return NextResponse.json({ slowQueries });

  } catch (error) {
    console.error('Error fetching slow queries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch slow queries' },
      { status: 500 }
    );
  }
}