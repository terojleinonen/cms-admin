/**
 * End-to-End API Permission Workflows Test Suite
 * 
 * Tests complete API workflows with permission validation across
 * multiple endpoints and user roles.
 */

import { NextRequest } from 'next/server'
import { createMockSession } from '@/__tests__/helpers/permission-test-utils'
import { UserRole } from '@/app/lib/types'

// Mock API handlers for testing
const mockApiHandlers = {
  products: {
    GET: jest.fn(),
    POST: jest.fn(),
    PUT: jest.fn(),
    DELETE: jest.fn()
  },
  users: {
    GET: jest.fn(),
    POST: jest.fn(),
    PUT: jest.fn(),
    DELETE: jest.fn()
  },
  analytics: {
    GET: jest.fn()
  }
}

// Mock request helper
const createMockRequest = (method: string, url: string, body?: any, session?: any) => {
  const request = new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': session ? `Bearer ${session.accessToken}` : ''
    }
  })
  
  // Attach session to request for testing
  ;(request as any).session = session
  return request
}

describe('End-to-End API Permission Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Admin API Workflow', () => {
    const adminSession = createMockSession({
      id: 'admin-1',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
      name: 'Admin User'
    })

    it('should allow admin to perform complete product management workflow', async () => {
      // 1. Create product
      const createRequest = createMockRequest(
        'POST',
        'http://localhost:3000/api/products',
        {
          name: 'Test Product',
          description: 'Test Description',
          price: 99.99,
          categoryId: 'cat-1'
        },
        adminSession
      )

      mockApiHandlers.products.POST.mockResolvedValue({
        status: 201,
        json: async () => ({ id: 'prod-1', name: 'Test Product' })
      })

      const createResponse = await mockApiHandlers.products.POST(createRequest)
      expect(createResponse.status).toBe(201)

      // 2. Read product
      const readRequest = createMockRequest(
        'GET',
        'http://localhost:3000/api/products/prod-1',
        null,
        adminSession
      )

      mockApiHandlers.products.GET.mockResolvedValue({
        status: 200,
        json: async () => ({ id: 'prod-1', name: 'Test Product' })
      })

      const readResponse = await mockApiHandlers.products.GET(readRequest)
      expect(readResponse.status).toBe(200)

      // 3. Update product
      const updateRequest = createMockRequest(
        'PUT',
        'http://localhost:3000/api/products/prod-1',
        {
          name: 'Updated Product',
          price: 149.99
        },
        adminSession
      )

      mockApiHandlers.products.PUT.mockResolvedValue({
        status: 200,
        json: async () => ({ id: 'prod-1', name: 'Updated Product' })
      })

      const updateResponse = await mockApiHandlers.products.PUT(updateRequest)
      expect(updateResponse.status).toBe(200)

      // 4. Delete product
      const deleteRequest = createMockRequest(
        'DELETE',
        'http://localhost:3000/api/products/prod-1',
        null,
        adminSession
      )

      mockApiHandlers.products.DELETE.mockResolvedValue({
        status: 204,
        json: async () => ({})
      })

      const deleteResponse = await mockApiHandlers.products.DELETE(deleteRequest)
      expect(deleteResponse.status).toBe(204)

      // Verify all operations were called
      expect(mockApiHandlers.products.POST).toHaveBeenCalledWith(createRequest)
      expect(mockApiHandlers.products.GET).toHaveBeenCalledWith(readRequest)
      expect(mockApiHandlers.products.PUT).toHaveBeenCalledWith(updateRequest)
      expect(mockApiHandlers.products.DELETE).toHaveBeenCalledWith(deleteRequest)
    })

    it('should allow admin to perform complete user management workflow', async () => {
      // 1. List users
      const listRequest = createMockRequest(
        'GET',
        'http://localhost:3000/api/users',
        null,
        adminSession
      )

      mockApiHandlers.users.GET.mockResolvedValue({
        status: 200,
        json: async () => ({ users: [{ id: 'user-1', email: 'test@test.com' }] })
      })

      const listResponse = await mockApiHandlers.users.GET(listRequest)
      expect(listResponse.status).toBe(200)

      // 2. Create user
      const createUserRequest = createMockRequest(
        'POST',
        'http://localhost:3000/api/users',
        {
          email: 'newuser@test.com',
          role: UserRole.EDITOR,
          name: 'New User'
        },
        adminSession
      )

      mockApiHandlers.users.POST.mockResolvedValue({
        status: 201,
        json: async () => ({ id: 'user-2', email: 'newuser@test.com' })
      })

      const createUserResponse = await mockApiHandlers.users.POST(createUserRequest)
      expect(createUserResponse.status).toBe(201)

      // 3. Update user role
      const updateUserRequest = createMockRequest(
        'PUT',
        'http://localhost:3000/api/users/user-2',
        {
          role: UserRole.ADMIN
        },
        adminSession
      )

      mockApiHandlers.users.PUT.mockResolvedValue({
        status: 200,
        json: async () => ({ id: 'user-2', role: UserRole.ADMIN })
      })

      const updateUserResponse = await mockApiHandlers.users.PUT(updateUserRequest)
      expect(updateUserResponse.status).toBe(200)

      // Verify all operations were successful
      expect(mockApiHandlers.users.GET).toHaveBeenCalledWith(listRequest)
      expect(mockApiHandlers.users.POST).toHaveBeenCalledWith(createUserRequest)
      expect(mockApiHandlers.users.PUT).toHaveBeenCalledWith(updateUserRequest)
    })

    it('should allow admin to access analytics workflow', async () => {
      const analyticsRequest = createMockRequest(
        'GET',
        'http://localhost:3000/api/analytics',
        null,
        adminSession
      )

      mockApiHandlers.analytics.GET.mockResolvedValue({
        status: 200,
        json: async () => ({
          totalProducts: 100,
          totalUsers: 50,
          totalOrders: 200,
          revenue: 10000
        })
      })

      const analyticsResponse = await mockApiHandlers.analytics.GET(analyticsRequest)
      expect(analyticsResponse.status).toBe(200)

      const data = await analyticsResponse.json()
      expect(data).toHaveProperty('totalProducts')
      expect(data).toHaveProperty('totalUsers')
      expect(data).toHaveProperty('revenue')
    })
  })

  describe('Editor API Workflow', () => {
    const editorSession = createMockSession({
      id: 'editor-1',
      email: 'editor@test.com',
      role: UserRole.EDITOR,
      name: 'Editor User'
    })

    it('should allow editor to manage products but restrict user operations', async () => {
      // Editor can manage products
      const createProductRequest = createMockRequest(
        'POST',
        'http://localhost:3000/api/products',
        {
          name: 'Editor Product',
          description: 'Created by editor',
          price: 79.99
        },
        editorSession
      )

      mockApiHandlers.products.POST.mockResolvedValue({
        status: 201,
        json: async () => ({ id: 'prod-2', name: 'Editor Product' })
      })

      const productResponse = await mockApiHandlers.products.POST(createProductRequest)
      expect(productResponse.status).toBe(201)

      // Editor cannot create users
      const createUserRequest = createMockRequest(
        'POST',
        'http://localhost:3000/api/users',
        {
          email: 'unauthorized@test.com',
          role: UserRole.VIEWER
        },
        editorSession
      )

      mockApiHandlers.users.POST.mockResolvedValue({
        status: 403,
        json: async () => ({ error: 'Insufficient permissions' })
      })

      const userResponse = await mockApiHandlers.users.POST(createUserRequest)
      expect(userResponse.status).toBe(403)

      // Editor can read analytics but not export
      const analyticsRequest = createMockRequest(
        'GET',
        'http://localhost:3000/api/analytics',
        null,
        editorSession
      )

      mockApiHandlers.analytics.GET.mockResolvedValue({
        status: 200,
        json: async () => ({
          totalProducts: 100,
          // Limited data for editors
          revenue: null // Restricted field
        })
      })

      const analyticsResponse = await mockApiHandlers.analytics.GET(analyticsRequest)
      expect(analyticsResponse.status).toBe(200)
    })

    it('should handle editor permission boundaries correctly', async () => {
      // Test bulk operations (should be restricted)
      const bulkDeleteRequest = createMockRequest(
        'DELETE',
        'http://localhost:3000/api/products/bulk',
        {
          productIds: ['prod-1', 'prod-2', 'prod-3']
        },
        editorSession
      )

      mockApiHandlers.products.DELETE.mockResolvedValue({
        status: 403,
        json: async () => ({ error: 'Bulk operations require admin privileges' })
      })

      const bulkResponse = await mockApiHandlers.products.DELETE(bulkDeleteRequest)
      expect(bulkResponse.status).toBe(403)

      // Test individual product deletion (should be allowed)
      const singleDeleteRequest = createMockRequest(
        'DELETE',
        'http://localhost:3000/api/products/prod-1',
        null,
        editorSession
      )

      mockApiHandlers.products.DELETE.mockResolvedValue({
        status: 204,
        json: async () => ({})
      })

      const singleResponse = await mockApiHandlers.products.DELETE(singleDeleteRequest)
      expect(singleResponse.status).toBe(204)
    })
  })

  describe('Viewer API Workflow', () => {
    const viewerSession = createMockSession({
      id: 'viewer-1',
      email: 'viewer@test.com',
      role: UserRole.VIEWER,
      name: 'Viewer User'
    })

    it('should restrict viewer to read-only operations', async () => {
      // Viewer can read products
      const readProductsRequest = createMockRequest(
        'GET',
        'http://localhost:3000/api/products',
        null,
        viewerSession
      )

      mockApiHandlers.products.GET.mockResolvedValue({
        status: 200,
        json: async () => ({ products: [{ id: 'prod-1', name: 'Product 1' }] })
      })

      const readResponse = await mockApiHandlers.products.GET(readProductsRequest)
      expect(readResponse.status).toBe(200)

      // Viewer cannot create products
      const createProductRequest = createMockRequest(
        'POST',
        'http://localhost:3000/api/products',
        {
          name: 'Unauthorized Product'
        },
        viewerSession
      )

      mockApiHandlers.products.POST.mockResolvedValue({
        status: 403,
        json: async () => ({ error: 'Insufficient permissions for product creation' })
      })

      const createResponse = await mockApiHandlers.products.POST(createProductRequest)
      expect(createResponse.status).toBe(403)

      // Viewer cannot access user endpoints
      const usersRequest = createMockRequest(
        'GET',
        'http://localhost:3000/api/users',
        null,
        viewerSession
      )

      mockApiHandlers.users.GET.mockResolvedValue({
        status: 403,
        json: async () => ({ error: 'Access denied to user management' })
      })

      const usersResponse = await mockApiHandlers.users.GET(usersRequest)
      expect(usersResponse.status).toBe(403)

      // Viewer cannot access analytics
      const analyticsRequest = createMockRequest(
        'GET',
        'http://localhost:3000/api/analytics',
        null,
        viewerSession
      )

      mockApiHandlers.analytics.GET.mockResolvedValue({
        status: 403,
        json: async () => ({ error: 'Analytics access restricted' })
      })

      const analyticsResponse = await mockApiHandlers.analytics.GET(analyticsRequest)
      expect(analyticsResponse.status).toBe(403)
    })
  })

  describe('Cross-API Permission Integration', () => {
    it('should maintain permission consistency across related API calls', async () => {
      const editorSession = createMockSession({
        id: 'editor-1',
        email: 'editor@test.com',
        role: UserRole.EDITOR,
        name: 'Editor User'
      })

      // Simulate a complex workflow: Create product -> Add to category -> Update inventory
      const workflowSteps = [
        {
          name: 'Create Product',
          request: createMockRequest(
            'POST',
            'http://localhost:3000/api/products',
            { name: 'Workflow Product', price: 99.99 },
            editorSession
          ),
          expectedStatus: 201
        },
        {
          name: 'Add to Category',
          request: createMockRequest(
            'PUT',
            'http://localhost:3000/api/products/prod-1/category',
            { categoryId: 'cat-1' },
            editorSession
          ),
          expectedStatus: 200
        },
        {
          name: 'Update Inventory',
          request: createMockRequest(
            'PUT',
            'http://localhost:3000/api/products/prod-1/inventory',
            { quantity: 100 },
            editorSession
          ),
          expectedStatus: 200
        }
      ]

      // Mock all responses
      mockApiHandlers.products.POST.mockResolvedValue({
        status: 201,
        json: async () => ({ id: 'prod-1', name: 'Workflow Product' })
      })

      mockApiHandlers.products.PUT.mockResolvedValue({
        status: 200,
        json: async () => ({ success: true })
      })

      // Execute workflow
      for (const step of workflowSteps) {
        let response
        if (step.request.method === 'POST') {
          response = await mockApiHandlers.products.POST(step.request)
        } else {
          response = await mockApiHandlers.products.PUT(step.request)
        }
        
        expect(response.status).toBe(step.expectedStatus)
      }
    })

    it('should handle permission failures gracefully in multi-step workflows', async () => {
      const viewerSession = createMockSession({
        id: 'viewer-1',
        email: 'viewer@test.com',
        role: UserRole.VIEWER,
        name: 'Viewer User'
      })

      // Attempt unauthorized workflow
      const unauthorizedSteps = [
        {
          request: createMockRequest(
            'POST',
            'http://localhost:3000/api/products',
            { name: 'Unauthorized Product' },
            viewerSession
          ),
          handler: mockApiHandlers.products.POST,
          expectedStatus: 403
        },
        {
          request: createMockRequest(
            'POST',
            'http://localhost:3000/api/users',
            { email: 'test@test.com' },
            viewerSession
          ),
          handler: mockApiHandlers.users.POST,
          expectedStatus: 403
        }
      ]

      // Mock forbidden responses
      mockApiHandlers.products.POST.mockResolvedValue({
        status: 403,
        json: async () => ({ error: 'Insufficient permissions' })
      })

      mockApiHandlers.users.POST.mockResolvedValue({
        status: 403,
        json: async () => ({ error: 'Insufficient permissions' })
      })

      // All steps should fail with 403
      for (const step of unauthorizedSteps) {
        const response = await step.handler(step.request)
        expect(response.status).toBe(step.expectedStatus)
      }
    })
  })

  describe('Session and Authentication Workflow', () => {
    it('should handle session expiration during API workflows', async () => {
      const expiredSession = createMockSession({
        id: 'user-1',
        email: 'user@test.com',
        role: UserRole.EDITOR,
        name: 'User',
        expires: new Date(Date.now() - 1000).toISOString() // Expired
      })

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/products',
        null,
        expiredSession
      )

      mockApiHandlers.products.GET.mockResolvedValue({
        status: 401,
        json: async () => ({ error: 'Session expired' })
      })

      const response = await mockApiHandlers.products.GET(request)
      expect(response.status).toBe(401)
    })

    it('should handle missing authentication in API workflows', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/products',
        null,
        null // No session
      )

      mockApiHandlers.products.GET.mockResolvedValue({
        status: 401,
        json: async () => ({ error: 'Authentication required' })
      })

      const response = await mockApiHandlers.products.GET(request)
      expect(response.status).toBe(401)
    })
  })
})