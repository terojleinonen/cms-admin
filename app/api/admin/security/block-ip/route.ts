import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '../../../../lib/db';
import { AuditService } from '../../../../lib/audit-service';
import { getSecurityMonitoringService } from '../../../../lib/security-monitoring';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { ipAddress, duration = 3600, reason = 'Manual block by admin' } = body;

    if (!ipAddress) {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
    }

    // Initialize services
    const auditService = new AuditService(prisma);
    const securityService = getSecurityMonitoringService(prisma, auditService);

    // Block the IP address
    await securityService.blockIP(ipAddress, { duration });

    // Log the action
    await auditService.logSecurity(
      session.user.id,
      'IP_BLOCKED',
      {
        ipAddress,
        duration,
        reason,
        blockedBy: session.user.email
      },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({ 
      success: true, 
      message: `IP address ${ipAddress} blocked successfully for ${duration} seconds` 
    });
  } catch (error) {
    console.error('Failed to block IP address:', error);
    return NextResponse.json(
      { error: 'Failed to block IP address' },
      { status: 500 }
    );
  }
}