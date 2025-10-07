import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { permissionService } from '../../../../../lib/permissions';
import { getPerformanceMonitoringHealth } from '../../../../../lib/permission-performance-init';

/**
 * GET /api/admin/performance/permissions/health
 * Get permission system performance health check
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view monitoring data
    if (!permissionService.hasResourceAccess(session.user, 'monitoring', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const health = getPerformanceMonitoringHealth();

    // Set appropriate HTTP status based on health
    let status = 200;
    if (health.status === 'degraded') {
      status = 200; // Still OK, but with warnings
    } else if (health.status === 'unhealthy') {
      status = 503; // Service unavailable
    }

    return NextResponse.json(health, { status });
  } catch (error) {
    console.error('Error getting performance health:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'Internal server error',
        lastCheck: Date.now()
      },
      { status: 500 }
    );
  }
}