/**
 * Workflow Management API
 * Handles content workflow operations and status transitions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { WorkflowService, WorkflowAction } from '@/app/lib/workflow';
import { z } from 'zod';

// Validation schemas
const workflowActionSchema = z.object({
  contentType: z.enum(['product', 'page']),
  contentId: z.string().uuid(),
  action: z.enum(['submit_for_review', 'approve', 'reject', 'publish', 'archive', 'schedule']),
  comment: z.string().optional(),
  scheduledFor: z.string().datetime().optional()
});

// POST /api/workflow - Execute workflow action
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = workflowActionSchema.parse(body);

    const workflowAction: WorkflowAction = {
      id: crypto.randomUUID(),
      contentType: validatedData.contentType,
      contentId: validatedData.contentId,
      action: validatedData.action,
      userId: session.user.id,
      comment: validatedData.comment,
      scheduledFor: validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : undefined
    };

    const success = await WorkflowService.executeWorkflowAction(workflowAction);

    if (!success) {
      return NextResponse.json(
        { error: 'Workflow action failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Workflow action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/workflow - Get workflow data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const userId = searchParams.get('userId');

    switch (type) {
      case 'pending-review':
        const pendingContent = await WorkflowService.getContentPendingReview(
          userId || undefined
        );
        return NextResponse.json({ content: pendingContent });

      case 'stats':
        const stats = await WorkflowService.getWorkflowStats();
        return NextResponse.json({ stats });

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Workflow GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}