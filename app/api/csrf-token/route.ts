/**
 * CSRF Token API
 * Provides CSRF tokens for client-side requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { SecurityService } from '@/lib/security';

// GET /api/csrf-token - Get CSRF token
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const securityService = SecurityService.getInstance();
    const sessionId = session.user.id; // Use user ID as session identifier
    const csrfToken = securityService.generateCSRFToken(sessionId);

    return NextResponse.json({ 
      csrfToken,
      sessionId 
    });

  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}