/**
 * API Key Statistics
 * Provides usage statistics for specific API keys
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth"
import { ApiAuthService } from '@/lib/api-auth';

// GET /api/admin/api-keys/[id]/stats - Get API key usage statistics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get API key statistics
    const stats = await ApiAuthService.getApiKeyStats(id);

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Error fetching API key stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API key statistics' },
      { status: 500 }
    );
  }
}