/**
 * Security Events API
 * Provides access to security events and monitoring data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { SecurityService } from '@/app/lib/security';
import { z } from 'zod';

// Validation schema
const eventsQuerySchema = z.object({
  severity: z.enum(['all', 'low', 'medium', 'high', 'critical']).optional().default('all'),
  limit: z.number().min(1).max(200).optional().default(50),
  type: z.string().optional()
});

// GET /api/admin/security/events - Get security events
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      severity: searchParams.get('severity') as 'all' | 'low' | 'medium' | 'high' | 'critical' || 'all',
      limit: parseInt(searchParams.get('limit') || '50'),
      type: searchParams.get('type') || undefined
    };

    const validatedQuery = eventsQuerySchema.parse(queryParams);

    const securityService = SecurityService.getInstance();
    
    // Get events based on severity filter
    const events = securityService.getRecentSecurityEvents(
      validatedQuery.limit,
      validatedQuery.severity === 'all' ? undefined : validatedQuery.severity
    );

    // Filter by type if specified
    const filteredEvents = validatedQuery.type 
      ? events.filter(event => event.type === validatedQuery.type)
      : events;

    return NextResponse.json({ events: filteredEvents });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error fetching security events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security events' },
      { status: 500 }
    );
  }
}