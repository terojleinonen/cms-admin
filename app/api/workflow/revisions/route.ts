/**
 * Content Revisions API
 * Handles content revision history and comparison
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { WorkflowService } from '@/app/lib/workflow';
import { prisma } from '@/app/lib/db';
import { z } from 'zod';

// Validation schemas
const revisionsQuerySchema = z.object({
  contentType: z.enum(['product', 'page', 'category']),
  contentId: z.string().uuid(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional()
});

const revisionCompareSchema = z.object({
  contentType: z.enum(['product', 'page', 'category']),
  contentId: z.string().uuid(),
  revisionId1: z.string().uuid(),
  revisionId2: z.string().uuid()
});

const createRevisionSchema = z.object({
  contentType: z.enum(['product', 'page', 'category']),
  contentId: z.string().uuid(),
  comment: z.string().optional()
});

// GET /api/workflow/revisions - Get content revisions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Handle revision comparison
    if (searchParams.get('compare') === 'true') {
      const validatedQuery = revisionCompareSchema.parse(queryParams);
      
      const [revision1, revision2] = await Promise.all([
        prisma.contentRevision.findUnique({
          where: { id: validatedQuery.revisionId1 },
          include: { creator: { select: { name: true, email: true } } }
        }),
        prisma.contentRevision.findUnique({
          where: { id: validatedQuery.revisionId2 },
          include: { creator: { select: { name: true, email: true } } }
        })
      ]);

      if (!revision1 || !revision2) {
        return NextResponse.json(
          { error: 'One or both revisions not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        comparison: {
          revision1,
          revision2,
          differences: compareRevisions(revision1.revisionData, revision2.revisionData)
        }
      });
    }

    // Handle regular revision listing
    const validatedQuery = revisionsQuerySchema.parse(queryParams);

    const revisions = await WorkflowService.getContentRevisions(
      validatedQuery.contentType,
      validatedQuery.contentId
    );

    // Apply pagination if specified
    const limit = validatedQuery.limit || 50;
    const offset = validatedQuery.offset || 0;
    const paginatedRevisions = revisions.slice(offset, offset + limit);

    return NextResponse.json({ 
      revisions: paginatedRevisions,
      total: revisions.length,
      limit,
      offset
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Revisions GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/workflow/revisions - Create manual revision
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user permissions
    if (!session.user.role || !['ADMIN', 'EDITOR'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create revisions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createRevisionSchema.parse(body);

    // Get current content data
    let revisionData: any = {};
    
    if (validatedData.contentType === 'product') {
      const product = await prisma.product.findUnique({
        where: { id: validatedData.contentId },
        include: { 
          categories: { include: { category: true } },
          media: { include: { media: true } }
        }
      });
      
      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      
      revisionData = product;
    } else if (validatedData.contentType === 'page') {
      const page = await prisma.page.findUnique({
        where: { id: validatedData.contentId }
      });
      
      if (!page) {
        return NextResponse.json(
          { error: 'Page not found' },
          { status: 404 }
        );
      }
      
      revisionData = page;
    }

    // Create the revision
    const revision = await prisma.contentRevision.create({
      data: {
        contentType: validatedData.contentType,
        contentId: validatedData.contentId,
        revisionData: {
          ...revisionData,
          comment: validatedData.comment,
          manualRevision: true
        },
        createdBy: session.user.id
      },
      include: {
        creator: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      revision,
      message: 'Manual revision created successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Create revision error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/workflow/revisions - Delete revision
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete revisions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can delete revisions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const revisionId = searchParams.get('revisionId');

    if (!revisionId) {
      return NextResponse.json(
        { error: 'revisionId is required' },
        { status: 400 }
      );
    }

    const revision = await prisma.contentRevision.findUnique({
      where: { id: revisionId }
    });

    if (!revision) {
      return NextResponse.json(
        { error: 'Revision not found' },
        { status: 404 }
      );
    }

    await prisma.contentRevision.delete({
      where: { id: revisionId }
    });

    return NextResponse.json({
      success: true,
      message: 'Revision deleted successfully'
    });

  } catch (error) {
    console.error('Delete revision error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Compare two revision data objects and return differences
 */
function compareRevisions(data1: any, data2: any): any {
  const differences: any = {};
  
  // Simple comparison - in a real implementation, you'd want a more sophisticated diff
  const keys = new Set([...Object.keys(data1 || {}), ...Object.keys(data2 || {})]);
  
  keys.forEach(key => {
    if (key === 'updatedAt' || key === 'createdAt') return; // Skip timestamp fields
    
    const value1 = data1?.[key];
    const value2 = data2?.[key];
    
    if (JSON.stringify(value1) !== JSON.stringify(value2)) {
      differences[key] = {
        old: value1,
        new: value2
      };
    }
  });
  
  return differences;
}