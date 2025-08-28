/**
 * Workflow API Tests
 * Tests for workflow management and revision tracking endpoints
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT } from '@/api/workflow/route';
import { GET as GET_REVISIONS, POST as POST_REVISIONS, DELETE as DELETE_REVISIONS } from '@/api/workflow/revisions/route';
import { getServerSession } from 'next-auth';
import { WorkflowService } from '@/lib/workflow';
import { prisma } from '@/lib/db';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/app/lib/workflow');
jest.mock('@/app/lib/db', () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn()
    },
    page: {
      findUnique: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn()
    },
    contentRevision: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn()
    }
  }
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockWorkflowService = WorkflowService as jest.Mocked<typeof WorkflowService>;

describe('/api/workflow', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'EDITOR'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);
  });

  describe('POST /api/workflow', () => {
    it('should execute workflow action successfully', async () => {
      mockWorkflowService.executeWorkflowAction.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/workflow', {
        method: 'POST',
        body: JSON.stringify({
          contentType: 'product',
          contentId: '123e4567-e89b-12d3-a456-426614174000',
          action: 'submit_for_review',
          comment: 'Ready for review'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('submit_for_review action completed successfully');
      expect(mockWorkflowService.executeWorkflowAction).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'product',
          contentId: '123e4567-e89b-12d3-a456-426614174000',
          action: 'submit_for_review',
          userId: 'user-1',
          comment: 'Ready for review'
        })
      );
    });

    it('should reject unauthorized requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/workflow', {
        method: 'POST',
        body: JSON.stringify({
          contentType: 'product',
          contentId: '123e4567-e89b-12d3-a456-426614174000',
          action: 'submit_for_review'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject requests from users without proper permissions', async () => {
      mockGetServerSession.mockResolvedValue({
        ...mockSession,
        user: { ...mockSession.user, role: 'VIEWER' }
      });

      const request = new NextRequest('http://localhost:3000/api/workflow', {
        method: 'POST',
        body: JSON.stringify({
          contentType: 'product',
          contentId: '123e4567-e89b-12d3-a456-426614174000',
          action: 'submit_for_review'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions for workflow actions');
    });

    it('should validate request data', async () => {
      const request = new NextRequest('http://localhost:3000/api/workflow', {
        method: 'POST',
        body: JSON.stringify({
          contentType: 'invalid',
          contentId: 'not-a-uuid',
          action: 'invalid_action'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });
  });

  describe('GET /api/workflow', () => {
    it('should get pending review content', async () => {
      const mockContent = [
        {
          id: 'content-1',
          title: 'Test Product',
          status: 'REVIEW',
          contentType: 'product',
          createdBy: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: { name: 'Test User', email: 'test@example.com' }
        }
      ];

      mockWorkflowService.getContentPendingReview.mockResolvedValue(mockContent);

      const request = new NextRequest('http://localhost:3000/api/workflow?type=pending-review');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toEqual(mockContent);
      expect(data.total).toBe(1);
    });

    it('should get workflow stats', async () => {
      const mockStats = {
        totalContent: 100,
        draftContent: 20,
        reviewContent: 10,
        publishedContent: 60,
        archivedContent: 10,
        pendingApprovals: 5
      };

      mockWorkflowService.getWorkflowStats.mockResolvedValue(mockStats);

      const request = new NextRequest('http://localhost:3000/api/workflow?type=stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats).toEqual(mockStats);
    });

    it('should get content by status', async () => {
      const mockContent = [
        {
          id: 'content-1',
          title: 'Draft Product',
          status: 'DRAFT',
          contentType: 'product',
          createdBy: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: { name: 'Test User', email: 'test@example.com' }
        }
      ];

      mockWorkflowService.getContentByStatus.mockResolvedValue(mockContent);

      const request = new NextRequest('http://localhost:3000/api/workflow?type=by-status&status=DRAFT');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toEqual(mockContent);
      expect(data.status).toBe('DRAFT');
      expect(data.total).toBe(1);
    });
  });

  describe('PUT /api/workflow', () => {
    it('should execute bulk workflow actions', async () => {
      mockWorkflowService.executeWorkflowAction.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/workflow', {
        method: 'PUT',
        body: JSON.stringify({
          contentIds: [
            '123e4567-e89b-12d3-a456-426614174000',
            '123e4567-e89b-12d3-a456-426614174001'
          ],
          contentType: 'product',
          action: 'publish',
          comment: 'Bulk publish'
        })
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results.successful).toBe(2);
      expect(data.results.failed).toBe(0);
      expect(data.results.total).toBe(2);
    });
  });
});

describe('/api/workflow/revisions', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'EDITOR'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);
  });

  describe('GET /api/workflow/revisions', () => {
    it('should get content revisions', async () => {
      const mockRevisions = [
        {
          id: 'revision-1',
          contentType: 'product',
          contentId: 'content-1',
          revisionData: { title: 'Test Product' },
          createdAt: new Date(),
          creator: { name: 'Test User', email: 'test@example.com' }
        }
      ];

      mockWorkflowService.getContentRevisions.mockResolvedValue(mockRevisions);

      const request = new NextRequest(
        'http://localhost:3000/api/workflow/revisions?contentType=product&contentId=123e4567-e89b-12d3-a456-426614174000'
      );
      const response = await GET_REVISIONS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.revisions).toEqual(mockRevisions);
      expect(data.total).toBe(1);
    });

    it('should compare revisions', async () => {
      const mockRevision1 = {
        id: 'revision-1',
        revisionData: { title: 'Old Title', price: 100 },
        creator: { name: 'User 1', email: 'user1@example.com' }
      };
      const mockRevision2 = {
        id: 'revision-2',
        revisionData: { title: 'New Title', price: 150 },
        creator: { name: 'User 2', email: 'user2@example.com' }
      };

      (prisma.contentRevision.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockRevision1)
        .mockResolvedValueOnce(mockRevision2);

      const request = new NextRequest(
        'http://localhost:3000/api/workflow/revisions?compare=true&contentType=product&contentId=123e4567-e89b-12d3-a456-426614174000&revisionId1=revision-1&revisionId2=revision-2'
      );
      const response = await GET_REVISIONS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.comparison.revision1).toEqual(mockRevision1);
      expect(data.comparison.revision2).toEqual(mockRevision2);
      expect(data.comparison.differences).toBeDefined();
    });
  });

  describe('POST /api/workflow/revisions', () => {
    it('should create manual revision', async () => {
      const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        price: 100
      };

      const mockRevision = {
        id: 'revision-1',
        contentType: 'product',
        contentId: 'product-1',
        revisionData: mockProduct,
        createdBy: 'user-1',
        creator: { name: 'Test User', email: 'test@example.com' }
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.contentRevision.create as jest.Mock).mockResolvedValue(mockRevision);

      const request = new NextRequest('http://localhost:3000/api/workflow/revisions', {
        method: 'POST',
        body: JSON.stringify({
          contentType: 'product',
          contentId: '123e4567-e89b-12d3-a456-426614174000',
          comment: 'Manual revision'
        })
      });

      const response = await POST_REVISIONS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.revision).toEqual(mockRevision);
    });
  });

  describe('DELETE /api/workflow/revisions', () => {
    it('should delete revision (admin only)', async () => {
      mockGetServerSession.mockResolvedValue({
        ...mockSession,
        user: { ...mockSession.user, role: 'ADMIN' }
      });

      const mockRevision = {
        id: 'revision-1',
        contentType: 'product',
        contentId: 'product-1'
      };

      (prisma.contentRevision.findUnique as jest.Mock).mockResolvedValue(mockRevision);
      (prisma.contentRevision.delete as jest.Mock).mockResolvedValue(mockRevision);

      const request = new NextRequest(
        'http://localhost:3000/api/workflow/revisions?revisionId=revision-1',
        { method: 'DELETE' }
      );
      const response = await DELETE_REVISIONS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject non-admin users', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflow/revisions?revisionId=revision-1',
        { method: 'DELETE' }
      );
      const response = await DELETE_REVISIONS(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only administrators can delete revisions');
    });
  });
});