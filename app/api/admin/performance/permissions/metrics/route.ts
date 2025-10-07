import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { permissionService } from '../../../../../lib/permissions';
import { exportPerformanceMetrics } from '../../../../../lib/permission-performance-init';

/**
 * GET /api/admin/performance/permissions/metrics
 * Export permission system performance metrics
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

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') as 'prometheus' | 'json' || 'json';

    const metrics = exportPerformanceMetrics(format);

    // Set appropriate content type
    const contentType = format === 'prometheus' ? 'text/plain' : 'application/json';

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error exporting performance metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}