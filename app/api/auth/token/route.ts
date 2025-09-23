/**
 * API Token Authentication
 * Exchanges API key for JWT token
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { ApiAuthService } from '@/lib/api-auth';
import { z } from 'zod';

// Validation schema
const tokenRequestSchema = z.object({
  apiKey: z.string().min(1, 'API key is required')
});

// POST /api/auth/token - Exchange API key for JWT token
export const POST = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    const body = await request.json();
    const validatedData = tokenRequestSchema.parse(body);

    // Validate API key and get JWT token
    const token = await ApiAuthService.validateApiKey(validatedData.apiKey);

    if (!token) {
      return NextResponse.json(
        { error: 'Invalid or expired API key' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      token,
      tokenType: 'Bearer',
      expiresIn: 86400, // 24 hours in seconds
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Token authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)