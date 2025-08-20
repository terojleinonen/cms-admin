/**
 * Public API Tests
 * Tests the public API endpoints for e-commerce integration
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as productsHandler } from '@/app/api/public/products/route';
import { GET as productHandler } from '@/app/api/public/products/[id]/route';
import { GET as categoriesHandler } from '@/app/api/public/categories/route';
import { POST as tokenHandler } from '@/app/api/auth/token/route';

// Mock API auth service
jest.mock('@/lib/api-auth', () => ({
  ApiAuthService: {
    verifyToken: jest.fn(),
    validateApiKey: jest.fn(),
    hasPermission: jest.fn(),
    checkRateLimit: jest.fn(),
    logApiUsage: jest.fn()
  }
}));

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn()
    },
    category: {
      findMany: jest.fn()
    }
  }))
}));

import { ApiAuthService } from '@/lib/api-auth';
import { PrismaClient } from '@prisma/client';

const mockApiAuthService = ApiAuthService as jest.Mocked<typeof ApiAuthService>;
const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('Public API', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock successful authentication by default
    mockApiAuthService.verifyToken.mockResolvedValue({
      success: true,
      apiKeyId: 'api-key-1',
      permissions: ['products:read', 'categories:read']
    });
    
    mockApiAuthService.hasPermission.mockReturnValue(true);
    mockApiAuthService.checkRateLimit.mockResolvedValue(true);
    mockApiAuthService.logApiUsage.mockResolvedValue();
  });

  describe('POST /api/auth/token', () => {
    it('should exchange API key for JWT token', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      mockApiAuthService.validateApiKey.mockResolvedValue(mockToken);

      const request = new NextRequest('http://localhost:3001/api/auth/token', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: 'kw_test_api_key'
        })
      });

      const response = await tokenHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.token).toBe(mockToken);
      expect(data.tokenType).toBe('Bearer');
      expect(data.expiresIn).toBe(86400);
      expect(mockApiAuthService.validateApiKey).toHaveBeenCalledWith('kw_test_api_key');
    });

    it('should return 401 for invalid API key', async () => {
      mockApiAuthService.validateApiKey.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3001/api/auth/token', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: 'invalid_key'
        })
      });

      const response = await tokenHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid or expired API key');
    });

    it('should return 400 for missing API key', async () => {
      const request = new NextRequest('http://localhost:3001/api/auth/token', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await tokenHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });
  });

  describe('GET /api/public/products', () => {
    it('should return paginated products list', async () => {
      const mockProducts = [
        {
          id: 'product-1',
          name: 'Test Product 1',
          slug: 'test-product-1',
          description: 'Test description',
          shortDescription: 'Short desc',
          price: 99.99,
          comparePrice: null,
          sku: 'TEST-001',
          inventoryQuantity: 10,
          weight: null,
          dimensions: null,
          status: 'PUBLISHED',
          featured: true,
          seoTitle: null,
          seoDescription: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          categories: [],
          media: []
        }
      ];

      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any);
      mockPrisma.product.count.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3001/api/public/products?page=1&limit=10');
      const response = await productsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products).toHaveLength(1);
      expect(data.products[0].name).toBe('Test Product 1');
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.totalCount).toBe(1);
      expect(mockApiAuthService.verifyToken).toHaveBeenCalled();
      expect(mockApiAuthService.hasPermission).toHaveBeenCalledWith(['products:read', 'categories:read'], 'products:read');
    });

    it('should filter products by category', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3001/api/public/products?category=electronics');
      const response = await productsHandler(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: {
              some: {
                category: {
                  slug: 'electronics'
                }
              }
            }
          })
        })
      );
    });

    it('should search products by text', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3001/api/public/products?search=laptop');
      const response = await productsHandler(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'laptop', mode: 'insensitive' } }
            ])
          })
        })
      );
    });

    it('should return 401 for invalid authentication', async () => {
      mockApiAuthService.verifyToken.mockResolvedValue({
        success: false,
        error: 'Invalid token'
      });

      const request = new NextRequest('http://localhost:3001/api/public/products');
      const response = await productsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid token');
    });

    it('should return 403 for insufficient permissions', async () => {
      mockApiAuthService.hasPermission.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3001/api/public/products');
      const response = await productsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions');
    });

    it('should return 429 for rate limit exceeded', async () => {
      mockApiAuthService.checkRateLimit.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3001/api/public/products');
      const response = await productsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
    });
  });

  describe('GET /api/public/products/[id]', () => {
    it('should return single product by ID', async () => {
      const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        slug: 'test-product',
        description: 'Full description',
        shortDescription: 'Short desc',
        price: 99.99,
        comparePrice: null,
        sku: 'TEST-001',
        inventoryQuantity: 10,
        weight: null,
        dimensions: null,
        status: 'PUBLISHED',
        featured: true,
        seoTitle: null,
        seoDescription: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        categories: [],
        media: [],
        creator: { name: 'Test User' }
      };

      mockPrisma.product.findFirst.mockResolvedValueOnce(mockProduct as any);
      mockPrisma.product.findMany.mockResolvedValue([]); // Related products

      const request = new NextRequest('http://localhost:3001/api/public/products/product-1');
      const response = await productHandler(request, { params: { id: 'product-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.product.name).toBe('Test Product');
      expect(data.product.creator).toBe('Test User');
      expect(data.relatedProducts).toBeDefined();
    });

    it('should return single product by slug', async () => {
      const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        slug: 'test-product',
        status: 'PUBLISHED',
        categories: [],
        media: [],
        creator: { name: 'Test User' },
        createdAt: new Date(),
        updatedAt: new Date(),
        price: 99.99
      };

      mockPrisma.product.findFirst.mockResolvedValueOnce(mockProduct as any);
      mockPrisma.product.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3001/api/public/products/test-product');
      const response = await productHandler(request, { params: { id: 'test-product' } });

      expect(response.status).toBe(200);
      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { id: 'test-product' },
              { slug: 'test-product' }
            ],
            status: 'PUBLISHED'
          }
        })
      );
    });

    it('should return 404 for non-existent product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3001/api/public/products/non-existent');
      const response = await productHandler(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Product not found');
    });
  });

  describe('GET /api/public/categories', () => {
    it('should return category hierarchy', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic products',
          parentId: null,
          sortOrder: 1,
          isActive: true,
          children: [],
          _count: { products: 5 }
        }
      ];

      mockPrisma.category.findMany.mockResolvedValue(mockCategories as any);

      const request = new NextRequest('http://localhost:3001/api/public/categories');
      const response = await categoriesHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories).toHaveLength(1);
      expect(data.categories[0].name).toBe('Electronics');
      expect(data.categories[0].productCount).toBe(5);
    });

    it('should include products when requested', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Electronics',
          slug: 'electronics',
          children: [],
          _count: { products: 1 },
          products: [
            {
              product: {
                id: 'prod-1',
                name: 'Laptop',
                slug: 'laptop',
                price: 999.99,
                featured: true,
                media: []
              }
            }
          ]
        }
      ];

      mockPrisma.category.findMany.mockResolvedValue(mockCategories as any);

      const request = new NextRequest('http://localhost:3001/api/public/categories?includeProducts=true');
      const response = await categoriesHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories[0].products).toBeDefined();
      expect(data.categories[0].products[0].name).toBe('Laptop');
    });

    it('should filter by parent category', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3001/api/public/categories?parentId=parent-cat-1');
      const response = await categoriesHandler(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentId: 'parent-cat-1'
          })
        })
      );
    });

    it('should return 401 for invalid authentication', async () => {
      mockApiAuthService.verifyToken.mockResolvedValue({
        success: false,
        error: 'Invalid token'
      });

      const request = new NextRequest('http://localhost:3001/api/public/categories');
      const response = await categoriesHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid token');
    });

    it('should return 403 for insufficient permissions', async () => {
      mockApiAuthService.hasPermission.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3001/api/public/categories');
      const response = await categoriesHandler(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions');
    });
  });

  describe('API Usage Logging', () => {
    it('should log successful API requests', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3001/api/public/products', {
        headers: {
          'user-agent': 'Test Client/1.0',
          'x-forwarded-for': '192.168.1.1'
        }
      });

      await productsHandler(request);

      expect(mockApiAuthService.logApiUsage).toHaveBeenCalledWith({
        apiKeyId: 'api-key-1',
        endpoint: '/api/public/products',
        method: 'GET',
        statusCode: 200,
        responseTime: expect.any(Number),
        userAgent: 'Test Client/1.0',
        ipAddress: '192.168.1.1'
      });
    });

    it('should log failed API requests', async () => {
      mockPrisma.product.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3001/api/public/products');
      await productsHandler(request);

      expect(mockApiAuthService.logApiUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500
        })
      );
    });
  });
});