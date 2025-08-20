/**
 * API Key Statistics
 * Provides usage statistics for specific API keys
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { ApiAuthService } from '@/app/lib/api-auth';

// GET /api/admin/api-keys/[id]/stats - Get API key usage statistics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') as '24h' | '7d' | '30d' || '24h';

    // Get API key statistics
    const stats = await ApiAuthService.getApiKeyStats(params.id, timeframe);

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Error fetching API key stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API key statistics' },
      { status: 500 }
    );
  }
}