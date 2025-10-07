import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../auth/[...nextauth]/route';
import { prisma } from '../../../../../../lib/db';
import { AuditService } from '../../../../../../lib/audit-service';
import { getSecurityMonitoringService } from '../../../../../../lib/security-monitoring';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const eventId = params.id;
    
    // Initialize services
    const auditService = new AuditService(prisma);
    const securityService = getSecurityMonitoringService(prisma, auditService);

    // Resolve the security event
    await securityService.resolveSecurityEvent(eventId, session.user.id);

    // Log the resolution action
    await auditService.logSecurity(
      session.user.id,
      'SUSPICIOUS_ACTIVITY',
      {
        action: 'security_event_resolved',
        eventId,
        resolvedBy: session.user.id
      },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to resolve security event:', error);
    return NextResponse.json(
      { error: 'Failed to resolve security event' },
      { status: 500 }
    );
  }
}