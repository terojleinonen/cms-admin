import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { SecurityEventDB } from '../../../../lib/permission-db';

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
    
    const options = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      type: searchParams.get('type') || undefined,
      severity: searchParams.get('severity') || undefined,
      userId: searchParams.get('userId') || undefined,
      resolved: searchParams.get('resolved') ? searchParams.get('resolved') === 'true' : undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
    };

    const result = await SecurityEventDB.getEvents(options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get security events:', error);
    return NextResponse.json(
      { error: 'Failed to get security events' },
      { status: 500 }
    );
  }
}