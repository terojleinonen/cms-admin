/**
 * Analytics API Tests
 * Tests the analytics and reporting system
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as analyticsHandler } from '@/app/api/analytics/route';
import { GET as exportHandler } from '@/app/api/analytics/export/route';

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
    product: {
      count: jest.fn(),
      findMany: jest.fn()
    },
    page: {
      count: jest.fn(),
      findMany: jest.fn()
    },
    media: {
      count: jest.fn(),
      findMany: jest.fn()
    },
    user: {
      count: jest.fn()
    },
    contentRevision: {
      count: jest.fn(),
      findMany: jest.fn()
    }
  }))
}));

import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('Analytics API', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock authenticated session
    mockGetServerSession.mockResolvedValue({
      user: { 
        id: 'user-1', 
        email: 'admin@example.com',
        role: 'ADMIN'
      }
    } as any);
  });

  describe('GET /api/analytics', () => {
    it('should return dashboard metrics', async () => {
      // Mock database responses
      mockPrisma.product.count.mockResolvedValueOnce(25); // total products
      mockPrisma.page.count.mockResolvedValueOnce(15); // total pages
      mockPrisma.media.count.mockResolvedValueOnce(100); // total media
      mockPrisma.user.count.mockResolvedValueOnce(5); // total users
      mockPrisma.product.count.mockResolvedValueOnce(20); // published products
      mockPrisma.page.count.mockResolvedValueOnce(12); // published pages
      mockPrisma.product.count.mockResolvedValueOnce(5); // draft products
      mockPrisma.page.count.mockResolvedValueOnce(3); // draft pages
      mockPrisma.product.count.mockResolvedValueOnce(3); // recent products
      mockPrisma.page.count.mockResolvedValueOnce(2); // recent pages
      mockPrisma.media.findMany.mockResolvedValueOnce([
        { fileSize: 1024000 },
        { fileSize: 2048000 },
        { fileSize: 512000 }
      ] as any);

      const request = new NextRequest('http://localhost:3001/api/analytics?type=metrics');
      const response = await analyticsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.totalProducts).toBe(25);
      expect(data.metrics.totalPages).toBe(15);
      expect(data.metrics.totalMedia).toBe(100);
      expect(data.metrics.totalUsers).toBe(5);
      expect(data.metrics.publishedContent).toBe(32); // 20 + 12
      expect(data.metrics.draftContent).toBe(8); // 5 + 3
      expect(data.metrics.recentActivity).toBe(5); // 3 + 2
      expect(data.metrics.storageUsed).toBe(3584000); // Sum of file sizes
    });

    it('should return content performance data', async () => {
      const mockProducts = [
        {
          id: 'product-1',
          name: 'Product 1',
          status: 'PUBLISHED',
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: { name: 'User 1' }
        }
      ];

      const mockPages = [
        {
          id: 'page-1',
          title: 'Page 1',
          status: 'PUBLISHED',
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: { name: 'User 2' }
        }
      ];

      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any);
      mockPrisma.page.findMany.mockResolvedValue(mockPages as any);

      const request = new NextRequest('http://localhost:3001/api/analytics?type=performance&timeframe=30d&limit=10');
      const response = await analyticsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.performance).toBeDefined();
      expect(Array.isArray(data.performance)).toBe(true);
      expect(data.performance.length).toBe(2);
      expect(data.performance[0]).toHaveProperty('id');
      expect(data.performance[0]).toHaveProperty('title');
      expect(data.performance[0]).toHaveProperty('type');
      expect(data.performance[0]).toHaveProperty('views');
    });

    it('should return inventory alerts', async () => {
      const mockProducts = [
        {
          id: 'product-1',
          name: 'Low Stock Product',
          inventoryQuantity: 5,
          updatedAt: new Date()
        },
        {
          id: 'product-2',
          name: 'Out of Stock Product',
          inventoryQuantity: 0,
          updatedAt: new Date()
        }
      ];

      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any);

      const request = new NextRequest('http://localhost:3001/api/analytics?type=inventory');
      const response = await analyticsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.inventory).toBeDefined();
      expect(Array.isArray(data.inventory)).toBe(true);
      expect(data.inventory.length).toBe(2);
      expect(data.inventory[0]).toHaveProperty('productName');
      expect(data.inventory[0]).toHaveProperty('currentStock');
      expect(data.inventory[0]).toHaveProperty('status');
      expect(data.inventory[1].status).toBe('out_of_stock');
    });

    it('should return recent activity', async () => {
      const mockRevisions = [
        {
          id: 'revision-1',
          contentType: 'product',
          contentId: 'product-1',
          revisionData: { action: 'Status changed to PUBLISHED' },
          createdBy: 'user-1',
          createdAt: new Date(),
          creator: { name: 'User 1' }
        }
      ];

      mockPrisma.contentRevision.findMany.mockResolvedValue(mockRevisions as any);
      mockPrisma.product.findUnique.mockResolvedValue({ name: 'Test Product' } as any);

      const request = new NextRequest('http://localhost:3001/api/analytics?type=activity&limit=20');
      const response = await analyticsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.activity).toBeDefined();
      expect(Array.isArray(data.activity)).toBe(true);
      expect(data.activity[0]).toHaveProperty('action');
      expect(data.activity[0]).toHaveProperty('contentType');
      expect(data.activity[0]).toHaveProperty('userName');
    });

    it('should return content trends', async () => {
      // Mock counts for different days
      mockPrisma.product.count.mockResolvedValue(2);
      mockPrisma.page.count.mockResolvedValue(1);
      mockPrisma.contentRevision.count.mockResolvedValue(5);

      const request = new NextRequest('http://localhost:3001/api/analytics?type=trends&timeframe=7d');
      const response = await analyticsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.trends).toBeDefined();
      expect(data.trends.contentCreation).toBeDefined();
      expect(data.trends.userActivity).toBeDefined();
      expect(data.trends.storageGrowth).toBeDefined();
      expect(Array.isArray(data.trends.contentCreation)).toBe(true);
    });

    it('should generate comprehensive report', async () => {
      // Mock all required data for report generation
      mockPrisma.product.count.mockResolvedValue(10);
      mockPrisma.page.count.mockResolvedValue(5);
      mockPrisma.media.count.mockResolvedValue(20);
      mockPrisma.user.count.mockResolvedValue(3);
      mockPrisma.media.findMany.mockResolvedValue([{ fileSize: 1024 }] as any);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.page.findMany.mockResolvedValue([]);
      mockPrisma.contentRevision.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3001/api/analytics?type=report&timeframe=30d');
      const response = await analyticsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.report).toBeDefined();
      expect(data.report.metrics).toBeDefined();
      expect(data.report.contentPerformance).toBeDefined();
      expect(data.report.inventoryAlerts).toBeDefined();
      expect(data.report.recentActivity).toBeDefined();
      expect(data.report.trends).toBeDefined();
    });

    it('should return 400 for invalid analytics type', async () => {
      const request = new NextRequest('http://localhost:3001/api/analytics?type=invalid');
      const response = await analyticsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3001/api/analytics?type=metrics');
      const response = await analyticsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle different timeframes', async () => {
      mockPrisma.product.count.mockResolvedValue(5);
      mockPrisma.page.count.mockResolvedValue(3);
      mockPrisma.media.count.mockResolvedValue(10);
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.media.findMany.mockResolvedValue([]);

      const timeframes = ['7d', '30d', '90d', '1y'];
      
      for (const timeframe of timeframes) {
        const request = new NextRequest(`http://localhost:3001/api/analytics?type=metrics&timeframe=${timeframe}`);
        const response = await analyticsHandler(request);
        
        expect(response.status).toBe(200);
      }
    });
  });

  describe('GET /api/analytics/export', () => {
    beforeEach(() => {
      // Mock report data for export tests
      mockPrisma.product.count.mockResolvedValue(10);
      mockPrisma.page.count.mockResolvedValue(5);
      mockPrisma.media.count.mockResolvedValue(20);
      mockPrisma.user.count.mockResolvedValue(3);
      mockPrisma.media.findMany.mockResolvedValue([{ fileSize: 1024 }] as any);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'product-1',
          name: 'Test Product',
          status: 'PUBLISHED',
          createdAt: new Date(),
          creator: { name: 'User 1' }
        }
      ] as any);
      mockPrisma.page.findMany.mockResolvedValue([]);
      mockPrisma.contentRevision.findMany.mockResolvedValue([]);
    });

    it('should export analytics data as CSV', async () => {
      const request = new NextRequest('http://localhost:3001/api/analytics/export?format=csv&timeframe=30d');
      const response = await exportHandler(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('.csv');

      const csvContent = await response.text();
      expect(csvContent).toContain('DASHBOARD METRICS');
      expect(csvContent).toContain('Total Products,10');
    });

    it('should export analytics data as JSON', async () => {
      const request = new NextRequest('http://localhost:3001/api/analytics/export?format=json&timeframe=30d');
      const response = await exportHandler(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('.json');

      const jsonContent = await response.text();
      const data = JSON.parse(jsonContent);
      expect(data.metrics).toBeDefined();
      expect(data.contentPerformance).toBeDefined();
    });

    it('should return 403 for non-admin users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { 
          id: 'user-1', 
          email: 'editor@example.com',
          role: 'EDITOR'
        }
      } as any);

      const request = new NextRequest('http://localhost:3001/api/analytics/export?format=csv');
      const response = await exportHandler(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions');
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3001/api/analytics/export?format=csv');
      const response = await exportHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid export format', async () => {
      const request = new NextRequest('http://localhost:3001/api/analytics/export?format=pdf');
      const response = await exportHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should handle different timeframes for export', async () => {
      const timeframes = ['7d', '30d', '90d', '1y'];
      
      for (const timeframe of timeframes) {
        const request = new NextRequest(`http://localhost:3001/api/analytics/export?format=csv&timeframe=${timeframe}`);
        const response = await exportHandler(request);
        
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Disposition')).toContain(timeframe);
      }
    });
  });
});