/**
 * Workflow Management API
 * Handles content workflow operations and status transitions
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { WorkflowService, WorkflowAction, WorkflowStatus } from '@/lib/workflow';
import { z } from 'zod';

// Validation schemas
const workflowActionSchema = z.object({
  contentType: z.enum(['product', 'page', 'category']),
  contentId: z.string().uuid(),
  action: z.enum(['submit_for_review', 'approve', 'reject', 'publish', 'archive', 'schedule']),
  comment: z.string().optional(),
  scheduledFor: z.string().datetime().optional()
});

const workflowQuerySchema = z.object({
  type: z.enum(['pending-review', 'stats', 'by-status', 'all']),
  userId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).optional(),
  contentType: z.enum(['product', 'page', 'category']).optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional()
});

// POST /api/workflow - Execute workflow action
export const POST = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    , { status: 401 });
    }

    const body = await request.json();
    const validatedData = workflowActionSchema.parse(body);

    // Check user permissions for workflow actions
    ,
        { status: 403 }
      );
    }

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

    return NextResponse.json({ 
      success: true,
      message: `${validatedData.action} action completed successfully`,
      actionId: workflowAction.id
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Workflow action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }

  },
  {
  permissions: [{ resource: 'workflow', action: 'create', scope: 'all' }]
}
)

// GET /api/workflow - Get workflow data
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    , { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validatedQuery = workflowQuerySchema.parse(queryParams);

    switch (validatedQuery.type) {
      case 'pending-review':
        const pendingContent = await WorkflowService.getContentPendingReview(
          validatedQuery.userId || undefined
        );
        return createApiSuccessResponse( 
          content: pendingContent,
          total: pendingContent.length
        );

      case 'stats':
        const stats = await WorkflowService.getWorkflowStats();
        return createApiSuccessResponse( stats );

      case 'by-status':
        if (!validatedQuery.status) {
          return NextResponse.json(
            { error: 'Status parameter is required for by-status query' },
            { status: 400 }
          );
        }
        const contentByStatus = await WorkflowService.getContentByStatus(
          validatedQuery.status as WorkflowStatus,
          validatedQuery.userId || undefined
        );
        return createApiSuccessResponse( 
          content: contentByStatus,
          status: validatedQuery.status,
          total: contentByStatus.length
        );

      case 'all':
        // Get all content with optional filtering
        const allContent = await WorkflowService.getContentPendingReview();
        return createApiSuccessResponse( 
          content: allContent,
          total: allContent.length
        );

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Workflow GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }

  },
  {
  permissions: [{ resource: 'workflow', action: 'read', scope: 'all' }]
}
)

// PUT /api/workflow - Bulk workflow actions
export const PUT = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    , { status: 401 });
    }

    // Check user permissions for bulk workflow actions
    ,
        { status: 403 }
      );
    }

    const body = await request.json();
    const bulkActionSchema = z.object({
      contentIds: z.array(z.string().uuid()),
      contentType: z.enum(['product', 'page', 'category']),
      action: z.enum(['submit_for_review', 'approve', 'reject', 'publish', 'archive']),
      comment: z.string().optional()
    });

    const validatedData = bulkActionSchema.parse(body);

    const results = await Promise.allSettled(
      validatedData.contentIds.map(contentId => {
        const workflowAction: WorkflowAction = {
          id: crypto.randomUUID(),
          contentType: validatedData.contentType,
          contentId,
          action: validatedData.action,
          userId: session.user.id,
          comment: validatedData.comment
        };
        return WorkflowService.executeWorkflowAction(workflowAction);
      })
    );

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      message: `Bulk action completed: ${successful} successful, ${failed} failed`,
      results: {
        successful,
        failed,
        total: validatedData.contentIds.length
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Bulk workflow action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }

  },
  {
  permissions: [{ resource: 'workflow', action: 'update', scope: 'all' }]
}
)