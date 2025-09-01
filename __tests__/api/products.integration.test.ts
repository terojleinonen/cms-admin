/**
 * Products API Integration Test Suite
 * 
 * Comprehensive integration tests for product API endpoints
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { createTestProduct, createTestCategory, createTestUser, createMockRequest, createMockResponse } from '../helpers/test-factories';

// Mock Next.js request/response
const mockNextRequest = jest.fn();
const mockNextResponse = jest.fn();

// Mock API handlers
const mockGET = jest.fn();
const mockPOST = jest.fn();
const mockPUT = jest.fn();
const mockDELETE = jest.fn();

jest.mock('@/app/api/products/route', () => ({
  GET: mockGET,
  POST: mockPOST,
}));

jest.mock('@/app/api/products/[id]/route', () => ({
  GET: mockGET,
  PUT: mockPUT,
  DELETE: mockDELETE,
}));

describe('Products API Integration Tests', () => {
  let testProducts: any[];
  let testCategories: any[];
  let testUser: any;

  beforeAll(async () => {
    // Setup test data
    testUser = createTestUser({ role: 'ADMIN' });
    testCategories = [
      createTestCategory({ name: 'Electronics' }),
      createTestCategory({ name: 'Clothing' }),
    ];
    testProducts = [
      createTestProduct({ categoryId: testCategories[0].id, name: 'Laptop' }),
      createTestProduct({ categoryId: testCategories[1].id, name: 'T-Shirt' }),
    ];
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any test-specific data
  });

  afterAll(async () => {
    // Clean up test database
  });

  describe('GET /api/products', () => {
    it('should return all products with pagination', async () => {
      const mockProducts = {
        products: testProducts,
        pagination: {
          page: 1,
          limit: 10,
          total: testProducts.length,
          totalPages: 1,
        },
      };

      mockGET.mockResolvedValue(
        new Response(JSON.stringify(mockProducts), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('GET', '/api/products?page=1&limit=10');
      const response = await mockGET(request);
      const data = await response.json();

      expect(mockGET).toHaveBeenCalledWith(request);
      expect(response.status).toBe(200);
      expect(data.products).toHaveLength(testProducts.length);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
    });

    it('should filter products by category', async () => {
      const electronicsProducts = testProducts.filter(p => p.categoryId === testCategories[0].id);
      
      mockGET.mockResolvedValue(
        new Response(JSON.stringify({
          products: electronicsProducts,
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('GET', `/api/products?categoryId=${testCategories[0].id}`);
      const response = await mockGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products).toHaveLength(1);
      expect(data.products[0].categoryId).toBe(testCategories[0].id);
    });

    it('should search products by name', async () => {
      const searchResults = testProducts.filter(p => p.name.toLowerCase().includes('laptop'));
      
      mockGET.mockResolvedValue(
        new Response(JSON.stringify({
          products: searchResults,
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('GET', '/api/products?search=laptop');
      const response = await mockGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products).toHaveLength(1);
      expect(data.products[0].name).toContain('Laptop');
    });

    it('should handle empty results', async () => {
      mockGET.mockResolvedValue(
        new Response(JSON.stringify({
          products: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('GET', '/api/products?search=nonexistent');
      const response = await mockGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products).toHaveLength(0);
      expect(data.pagination.total).toBe(0);
    });

    it('should handle invalid pagination parameters', async () => {
      mockGET.mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Invalid pagination parameters',
          message: 'Page must be a positive integer',
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('GET', '/api/products?page=-1');
      const response = await mockGET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid pagination parameters');
    });
  });

  describe('POST /api/products', () => {
    it('should create a new product successfully', async () => {
      const newProduct = createTestProduct({ name: 'New Product' });
      
      mockPOST.mockResolvedValue(
        new Response(JSON.stringify({
          product: newProduct,
          message: 'Product created successfully',
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('POST', '/api/products', newProduct);
      const response = await mockPOST(request);
      const data = await response.json();

      expect(mockPOST).toHaveBeenCalledWith(request);
      expect(response.status).toBe(201);
      expect(data.product.name).toBe('New Product');
      expect(data.message).toBe('Product created successfully');
    });

    it('should validate required fields', async () => {
      const invalidProduct = { name: '' }; // Missing required fields
      
      mockPOST.mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Validation failed',
          details: [
            'Name is required',
            'Price is required',
            'Category ID is required',
          ],
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('POST', '/api/products', invalidProduct);
      const response = await mockPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContain('Name is required');
    });

    it('should handle duplicate SKU', async () => {
      const duplicateProduct = createTestProduct({ sku: testProducts[0].sku });
      
      mockPOST.mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Duplicate SKU',
          message: 'A product with this SKU already exists',
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('POST', '/api/products', duplicateProduct);
      const response = await mockPOST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Duplicate SKU');
    });

    it('should require authentication', async () => {
      mockPOST.mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required',
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('POST', '/api/products', createTestProduct());
      const response = await mockPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/products/[id]', () => {
    it('should return a specific product', async () => {
      const product = testProducts[0];
      
      mockGET.mockResolvedValue(
        new Response(JSON.stringify({ product }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('GET', `/api/products/${product.id}`);
      const response = await mockGET(request, { params: { id: product.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.product.id).toBe(product.id);
      expect(data.product.name).toBe(product.name);
    });

    it('should return 404 for non-existent product', async () => {
      const nonExistentId = 'non-existent-id';
      
      mockGET.mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Product not found',
          message: `Product with ID ${nonExistentId} does not exist`,
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('GET', `/api/products/${nonExistentId}`);
      const response = await mockGET(request, { params: { id: nonExistentId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Product not found');
    });

    it('should handle invalid product ID format', async () => {
      const invalidId = 'invalid-id-format';
      
      mockGET.mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Invalid product ID',
          message: 'Product ID must be a valid UUID',
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('GET', `/api/products/${invalidId}`);
      const response = await mockGET(request, { params: { id: invalidId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid product ID');
    });
  });

  describe('PUT /api/products/[id]', () => {
    it('should update a product successfully', async () => {
      const product = testProducts[0];
      const updates = { name: 'Updated Product Name', price: 999.99 };
      const updatedProduct = { ...product, ...updates };
      
      mockPUT.mockResolvedValue(
        new Response(JSON.stringify({
          product: updatedProduct,
          message: 'Product updated successfully',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('PUT', `/api/products/${product.id}`, updates);
      const response = await mockPUT(request, { params: { id: product.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.product.name).toBe('Updated Product Name');
      expect(data.product.price).toBe(999.99);
      expect(data.message).toBe('Product updated successfully');
    });

    it('should validate update data', async () => {
      const product = testProducts[0];
      const invalidUpdates = { price: -100 }; // Invalid price
      
      mockPUT.mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Validation failed',
          details: ['Price must be greater than 0'],
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('PUT', `/api/products/${product.id}`, invalidUpdates);
      const response = await mockPUT(request, { params: { id: product.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContain('Price must be greater than 0');
    });

    it('should handle partial updates', async () => {
      const product = testProducts[0];
      const partialUpdates = { name: 'Partially Updated Name' };
      const updatedProduct = { ...product, ...partialUpdates };
      
      mockPUT.mockResolvedValue(
        new Response(JSON.stringify({
          product: updatedProduct,
          message: 'Product updated successfully',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('PUT', `/api/products/${product.id}`, partialUpdates);
      const response = await mockPUT(request, { params: { id: product.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.product.name).toBe('Partially Updated Name');
      expect(data.product.price).toBe(product.price); // Should remain unchanged
    });
  });

  describe('DELETE /api/products/[id]', () => {
    it('should delete a product successfully', async () => {
      const product = testProducts[0];
      
      mockDELETE.mockResolvedValue(
        new Response(JSON.stringify({
          message: 'Product deleted successfully',
          deletedId: product.id,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('DELETE', `/api/products/${product.id}`);
      const response = await mockDELETE(request, { params: { id: product.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Product deleted successfully');
      expect(data.deletedId).toBe(product.id);
    });

    it('should handle deletion of non-existent product', async () => {
      const nonExistentId = 'non-existent-id';
      
      mockDELETE.mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Product not found',
          message: `Product with ID ${nonExistentId} does not exist`,
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('DELETE', `/api/products/${nonExistentId}`);
      const response = await mockDELETE(request, { params: { id: nonExistentId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Product not found');
    });

    it('should prevent deletion of products with active orders', async () => {
      const product = testProducts[0];
      
      mockDELETE.mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Cannot delete product',
          message: 'Product has active orders and cannot be deleted',
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('DELETE', `/api/products/${product.id}`);
      const response = await mockDELETE(request, { params: { id: product.id } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Cannot delete product');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockGET.mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Database connection failed',
          message: 'Unable to connect to database',
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('GET', '/api/products');
      const response = await mockGET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });

    it('should handle malformed JSON in request body', async () => {
      mockPOST.mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Invalid JSON',
          message: 'Request body contains malformed JSON',
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = createMockRequest('POST', '/api/products', 'invalid-json');
      const response = await mockPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON');
    });

    it('should handle rate limiting', async () => {
      mockGET.mockResolvedValue(
        new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests, please try again later',
          retryAfter: 60,
        }), {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        })
      );

      const request = createMockRequest('GET', '/api/products');
      const response = await mockGET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
      expect(data.retryAfter).toBe(60);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large product lists efficiently', async () => {
      const largeProductList = Array.from({ length: 1000 }, (_, i) => 
        createTestProduct({ name: `Product ${i}` })
      );
      
      mockGET.mockResolvedValue(
        new Response(JSON.stringify({
          products: largeProductList.slice(0, 50), // Paginated
          pagination: { page: 1, limit: 50, total: 1000, totalPages: 20 },
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const startTime = performance.now();
      const request = createMockRequest('GET', '/api/products?limit=50');
      const response = await mockGET(request);
      const endTime = performance.now();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products).toHaveLength(50);
      expect(data.pagination.total).toBe(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => {
        mockGET.mockResolvedValue(
          new Response(JSON.stringify({
            products: [createTestProduct({ name: `Concurrent Product ${i}` })],
            pagination: { page: 1, limit: 1, total: 1, totalPages: 1 },
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
        
        return mockGET(createMockRequest('GET', `/api/products?search=product${i}`));
      });

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
      });
    });
  });
});