import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { permissionService } from '../../../../lib/permissions';
import { permissionPerformanceMonitor } from '../../../../lib/permission-performance-monitor';

/**
 * GET /api/admin/performance/permissions
 * Get permission system performance metrics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view performance metrics
    if (!permissionService.hasResourceAccess(session.user, 'monitoring', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeWindow = parseInt(searchParams.get('timeWindow') || '86400000'); // Default 24 hours

    // Get performance data
    const performanceReport = permissionPerformanceMonitor.getPerformanceReport(timeWindow);

    return NextResponse.json(performanceReport);
  } catch (error) {
    console.error('Error fetching permission performance metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/performance/permissions/alerts/resolve
 * Resolve a performance alert
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage performance alerts
    if (!permissionService.hasResourceAccess(session.user, 'monitoring', 'manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { alertId } = await request.json();

    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 });
    }

    const resolved = permissionPerformanceMonitor.resolveAlert(alertId);

    if (!resolved) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resolving performance alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/performance/permissions/thresholds
 * Update performance alert thresholds
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage performance settings
    if (!permissionService.hasResourceAccess(session.user, 'settings', 'manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const thresholds = await request.json();

    // Validate thresholds
    const validFields = ['maxLatency', 'minCacheHitRatio', 'maxErrorRate', 'maxCacheMemoryUsage', 'slowCheckThreshold'];
    const validThresholds: Record<string, number> = {};

    for (const [key, value] of Object.entries(thresholds)) {
      if (validFields.includes(key) && typeof value === 'number' && value > 0) {
        validThresholds[key] = value;
      }
    }

    if (Object.keys(validThresholds).length === 0) {
      return NextResponse.json({ error: 'No valid thresholds provided' }, { status: 400 });
    }

    permissionPerformanceMonitor.updateThresholds(validThresholds);

    return NextResponse.json({ success: true, updatedThresholds: validThresholds });
  } catch (error) {
    console.error('Error updating performance thresholds:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}