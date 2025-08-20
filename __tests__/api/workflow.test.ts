/**
 * Workflow API Tests
 * Tests the content workflow management system
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as workflowHandler, GET as workflowGetHandler } from '@/app/api/workflow/route';
import { GET as revisionsHandler } from '@/app/api/workflow/revisions/route';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}));

// Mock the auth options
jest.mock('@/lib/auth', () => ({
  authOptions: {}
}));

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn()
    },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn()
    },
    page: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn()
    },
    contentRevision: {
      create: jest.fn(),
      findMany: jest.fn()
    }
  }))
}));

import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('Workflow API', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock authenticated session with admin role
    mockGetServerSession.mockResolvedValue({
      user: { 
        id: 'user-1', 
        email: 'admin@example.com',
        role: 'ADMIN'
      }
    } as any);
  });

  describe('POST /api/workflow', () => {
    it('should execute workflow action successfully', async () => {
      // Mock product data
      const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        status: 'DRAFT',
        createdBy: 'user-1',
        creator: { name: 'Test User', email: 'test@example.com' }
      };

      const mockUser = {
        id: 'user-1',
        role: 'ADMIN'
      };

      mockPrisma.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.contentRevision.create.mockResolvedValue({} as any);
      mockPrisma.product.update.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3001/api/workflow', {
        method: 'POST',
        body: JSON.stringify({
          contentType: 'product',
          contentId: 'product-1',
          action: 'submit_for_review',
          comment: 'Ready for review'
        })
      });

      const response = await workflowHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        include: { creator: true }
      });
      expect(mockPrisma.contentRevision.create).toHaveBeenCalled();
      expect(mockPrisma.product.update).toHaveBeenCalled();
    });

    it('should handle page workflow actions', async () => {
      const mockPage = {
        id: 'page-1',
        title: 'Test Page',
        status: 'REVIEW',
        createdBy: 'user-1',
        creator: { name: 'Test User', email: 'test@example.com' }
      };

      const mockUser = {
        id: 'user-1',
        role: 'ADMIN'
      };

      mockPrisma.page.findUnique.mockResolvedValue(mockPage as any);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.contentRevision.create.mockResolvedValue({} as any);
      mockPrisma.page.update.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3001/api/workflow', {
        method: 'POST',
        body: JSON.stringify({
          contentType: 'page',
          contentId: 'page-1',
          action: 'approve'
        })
      });

      const response = await workflowHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'page-1' },
        data: expect.objectContaining({
          status: 'PUBLISHED'
        })
      });
    });

    it('should handle scheduled publishing', async () => {
      const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        status: 'DRAFT',
        createdBy: 'user-1',
        creator: { name: 'Test User', email: 'test@example.com' }
      };

      const mockUser = {
        id: 'user-1',
        role: 'ADMIN'
      };

      mockPrisma.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.contentRevision.create.mockResolvedValue({} as any);
      mockPrisma.product.update.mockResolvedValue({} as any);

      const scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      const request = new NextRequest('http://localhost:3001/api/workflow', {
        method: 'POST',
        body: JSON.stringify({
          contentType: 'product',
          contentId: 'product-1',
          action: 'schedule',
          scheduledFor: scheduledDate.toISOString()
        })
      });

      const response = await workflowHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 for invalid workflow action', async () => {
      const request = new NextRequest('http://localhost:3001/api/workflow', {
        method: 'POST',
        body: JSON.stringify({
          contentType: 'product',
          contentId: 'invalid-id',
          action: 'invalid_action'
        })
      });

      const response = await workflowHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3001/api/workflow', {
        method: 'POST',
        body: JSON.stringify({
          contentType: 'product',
          contentId: 'product-1',
          action: 'publish'
        })
      });

      const response = await workflowHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3001/api/workflow', {
        method: 'POST',
        body: JSON.stringify({
          contentType: 'product',
          // Missing contentId and action
        })
      });

      const response = await workflowHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });
  });

  describe('GET /api/workflow', () => {
    it('should return pending review content', async () => {
      const mockProducts = [
        {
          id: 'product-1',
          name: 'Product 1',
          status: 'DRAFT',
          createdBy: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: { name: 'User 1', email: 'user1@example.com' }
        }
      ];

      const mockPages = [
        {
          id: 'page-1',
          title: 'Page 1',
          status: 'REVIEW',
          createdBy: 'user-2',
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: null,
          creator: { name: 'User 2', email: 'user2@example.com' }
        }
      ];

      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any);
      mockPrisma.page.findMany.mockResolvedValue(mockPages as any);

      const request = new NextRequest('http://localhost:3001/api/workflow?type=pending-review');
      const response = await workflowGetHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toHaveLength(2);
      expect(data.content[0].contentType).toBe('page'); // Pages come first due to REVIEW status
      expect(data.content[1].contentType).toBe('product');
    });

    it('should return workflow statistics', async () => {
      const mockProductStats = [
        { status: 'DRAFT', _count: { status: 5 } },
        { status: 'PUBLISHED', _count: { status: 10 } },
        { status: 'ARCHIVED', _count: { status: 2 } }
      ];

      const mockPageStats = [
        { status: 'DRAFT', _count: { status: 3 } },
        { status: 'REVIEW', _count: { status: 4 } },
        { status: 'PUBLISHED', _count: { status: 8 } }
      ];

      mockPrisma.product.groupBy.mockResolvedValue(mockProductStats as any);
      mockPrisma.page.groupBy.mockResolvedValue(mockPageStats as any);

      const request = new NextRequest('http://localhost:3001/api/workflow?type=stats');
      const response = await workflowGetHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats).toBeDefined();
      expect(data.stats.totalContent).toBe(32); // Sum of all counts
      expect(data.stats.draftContent).toBe(8); // 5 + 3
      expect(data.stats.reviewContent).toBe(4);
      expect(data.stats.publishedContent).toBe(18); // 10 + 8
      expect(data.stats.archivedContent).toBe(2);
    });

    it('should return 400 for invalid type parameter', async () => {
      const request = new NextRequest('http://localhost:3001/api/workflow?type=invalid');
      const response = await workflowGetHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid type parameter');
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3001/api/workflow?type=stats');
      const response = await workflowGetHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/workflow/revisions', () => {
    it('should return content revisions', async () => {
      const mockRevisions = [
        {
          id: 'revision-1',
          contentType: 'product',
          contentId: 'product-1',
          revisionData: { name: 'Product v1', price: 100 },
          createdAt: new Date(),
          creator: { name: 'User 1', email: 'user1@example.com' }
        },
        {
          id: 'revision-2',
          contentType: 'product',
          contentId: 'product-1',
          revisionData: { name: 'Product v2', price: 120 },
          createdAt: new Date(),
          creator: { name: 'User 2', email: 'user2@example.com' }
        }
      ];

      mockPrisma.contentRevision.findMany.mockResolvedValue(mockRevisions as any);

      const request = new NextRequest(
        'http://localhost:3001/api/workflow/revisions?contentType=product&contentId=product-1'
      );
      const response = await revisionsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.revisions).toHaveLength(2);
      expect(mockPrisma.contentRevision.findMany).toHaveBeenCalledWith({
        where: {
          contentType: 'product',
          contentId: 'product-1'
        },
        include: {
          creator: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should return 400 for missing parameters', async () => {
      const request = new NextRequest('http://localhost:3001/api/workflow/revisions');
      const response = await revisionsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('contentType and contentId are required');
    });

    it('should return 400 for invalid content type', async () => {
      const request = new NextRequest(
        'http://localhost:3001/api/workflow/revisions?contentType=invalid&contentId=test-id'
      );
      const response = await revisionsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3001/api/workflow/revisions?contentType=product&contentId=product-1'
      );
      const response = await revisionsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});