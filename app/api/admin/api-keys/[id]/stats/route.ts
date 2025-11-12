/**
 * API Key Statistics
 * Provides usage statistics for specific API keys
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { ApiAuthService } from '@/lib/api-auth';

// GET /api/admin/api-keys/[id]/stats - Get API key usage statistics
export const GET = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    try {
      const { id } = await params || {};

    // Get API key statistics
    const stats = await ApiAuthService.getApiKeyStats(id);

    return createApiSuccessResponse( stats );

  } catch (error) {
    console.error('Error fetching API key stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API key statistics' },
      { status: 500 }
    );
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)