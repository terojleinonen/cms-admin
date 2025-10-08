import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../auth/[...nextauth]/route';
import { SecurityEventDB } from '../../../../../../lib/permission-db';

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

    // Acknowledge the security event
    await SecurityEventDB.acknowledge(eventId, session.user.email || session.user.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Security event acknowledged successfully' 
    });
  } catch (error) {
    console.error('Failed to acknowledge security event:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge security event' },
      { status: 500 }
    );
  }
}