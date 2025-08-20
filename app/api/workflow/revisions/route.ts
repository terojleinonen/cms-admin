/**
 * Content Revisions API
 * Handles content revision history and comparison
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { WorkflowService } from '@/app/lib/workflow';
import { z } from 'zod';

// Validation schema
const revisionsQuerySchema = z.object({
  contentType: z.enum(['product', 'page']),
  contentId: z.string().uuid()
});

// GET /api/workflow/revisions - Get content revisions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('contentType');
    const contentId = searchParams.get('contentId');

    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: 'contentType and contentId are required' },
        { status: 400 }
      );
    }

    const validatedQuery = revisionsQuerySchema.parse({
      contentType,
      contentId
    });

    const revisions = await WorkflowService.getContentRevisions(
      validatedQuery.contentType,
      validatedQuery.contentId
    );

    return NextResponse.json({ revisions });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Revisions GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}