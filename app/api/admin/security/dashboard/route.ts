import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '../../../../lib/db';
import { AuditService } from '../../../../lib/audit-service';
import { getSecurityMonitoringService } from '../../../../lib/security-monitoring';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    // Initialize services
    const auditService = new AuditService(prisma);
    const securityService = getSecurityMonitoringService(prisma, auditService);

    // Get dashboard data
    const dashboardData = await securityService.getDashboardData(days);

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Failed to get security dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to get security dashboard data' },
      { status: 500 }
    );
  }
}