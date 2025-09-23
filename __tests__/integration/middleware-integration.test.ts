/**
 * Middleware Integration Tests
 * Tests middleware integration with actual API routes
 */

import { NextRequest } from 'next/server'
import { middleware } from '../../middleware'
import { getToken } from 'next-auth/jwt'

// Mock next-auth/jwt
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}))

// Mock preferences middleware
jest.mock('../../app/lib/preferences-middleware', () => ({
  applyUserPreferences: jest.fn((req, res) => res),
}))

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>

describe('Middleware Integration Tests', () => {
  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  const createMockRequest = (pathname: string, method: string = 'GET'): NextRequest => {
    const url = `https://example.com${pathname}`
    const request = new NextRequest(url, { method })
    return request
  }

  const createMockToken = (role: string = 'VIEWER', id: string = 'user-1') => ({
    id,
    role,
    email: 'test@example.com',
    name: 'Test User',
  })

  describe('API Route Protection', () => {
    it('should protect admin API routes from unauthorized users', async () => {
      mockGetToken.mockResolvedValue(null)
      
      const request = createMockRequest('/api/admin/users', 'GET')
      const response = await middleware(request)
      
      expect(response.status).toBe(401)
      
      const body = await response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
      expect(body.error.message).toBe('Authentication required')
    })

    it('should protect admin API routes from insufficient permissions', async () => {
      const token = createMockToken('VIEWER')
      mockGetToken.mockResolvedValue(token)
      
      const request = createMockRequest('/api/admin/users', 'GET')
      const response = await middleware(request)
      
      expect(response.status).toBe(403)
      
      const body = await response.json()
      expect(body.error.code).toBe('FORBIDDEN')
      expect(body.error.message).toBe('Insufficient permissions')
    })

    it('should allow admin API access for admin users', async () => {
      const token = createMockToken('ADMIN')
      mockGetToken.mockResolvedValue(token)
      
      const request = createMockRequest('/api/admin/users', 'GET')
      const response = await middleware(request)
      
      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })

    it('should allow content API access for editors', async () => {
      const token = createMockToken('EDITOR')
      mockGetToken.mockResolvedValue(token)
      
      const request = createMockRequest('/api/products', 'GET')
      const response = await middleware(request)
      
      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })

    it('should allow read-only API access for viewers', async () => {
      const token = createMockToken('VIEWER')
      mockGetToken.mockResolvedValue(token)
      
      const request = createMockRequest('/api/products', 'GET')
      const response = await middleware(request)
      
      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })
  })

  describe('Web Route Protection', () => {
    it('should redirect unauthorized users to login', async () => {
      mockGetToken.mockResolvedValue(null)
      
      const request = createMockRequest('/admin/products', 'GET')
      const response = await middleware(request)
      
      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('/auth/login')
      expect(response.headers.get('location')).toContain('callbackUrl=%2Fadmin%2Fproducts')
    })

    it('should redirect users with insufficient permissions', async () => {
      const token = createMockToken('VIEWER')
      mockGetToken.mockResolvedValue(token)
      
      const request = createMockRequest('/admin/users', 'GET')
      const response = await middleware(request)
      
      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('error=forbidden')
    })

    it('should allow access for users with sufficient permissions', async () => {
      const token = createMockToken('ADMIN')
      mockGetToken.mockResolvedValue(token)
      
      const request = createMockRequest('/admin/users', 'GET')
      const response = await middleware(request)
      
      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
      expect(response.status).not.toBe(307)
    })
  })

  describe('Security Logging Integration', () => {
    it('should log all access attempts with proper context', async () => {
      const token = createMockToken('ADMIN')
      mockGetToken.mockResolvedValue(token)
      
      const request = createMockRequest('/api/admin/users', 'GET')
      request.headers.set('x-forwarded-for', '192.168.1.100')
      request.headers.set('user-agent', 'Integration-Test-Agent')
      
      await middleware(request)
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ACCESS_LOG] SUCCESS:',
        expect.stringMatching(/"userId":\s*"user-1"/)
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ACCESS_LOG] SUCCESS:',
        expect.stringMatching(/"ipAddress":\s*"192\.168\.1\.100"/)
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ACCESS_LOG] SUCCESS:',
        expect.stringMatching(/"userAgent":\s*"Integration-Test-Agent"/)
      )
    })

    it('should log security violations with detailed information', async () => {
      const token = createMockToken('VIEWER')
      mockGetToken.mockResolvedValue(token)
      
      const request = createMockRequest('/api/admin/security', 'GET')
      request.headers.set('x-forwarded-for', '10.0.0.1')
      
      await middleware(request)
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ACCESS_LOG] FORBIDDEN:',
        expect.stringMatching(/"result":\s*"FORBIDDEN"/)
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ACCESS_LOG] FORBIDDEN:',
        expect.stringMatching(/Insufficient permissions/)
      )
    })
  })

  describe('Route Pattern Matching Integration', () => {
    it('should correctly match complex dynamic routes', async () => {
      const token = createMockToken('EDITOR')
      mockGetToken.mockResolvedValue(token)
      
      const dynamicRoutes = [
        '/admin/products/123/edit',
        '/admin/pages/456/edit',
        '/api/products/789',
      ]
      
      for (const route of dynamicRoutes) {
        const request = createMockRequest(route, 'GET')
        const response = await middleware(request)
        
        expect(response.status).not.toBe(401)
        expect(response.status).not.toBe(403)
      }
    })

    it('should handle nested API routes correctly', async () => {
      const token = createMockToken('ADMIN')
      mockGetToken.mockResolvedValue(token)
      
      const nestedRoutes = [
        '/api/admin/users/123',
        '/api/admin/security/events',
        '/api/admin/backup/status/456',
      ]
      
      for (const route of nestedRoutes) {
        const request = createMockRequest(route, 'GET')
        const response = await middleware(request)
        
        expect(response.status).not.toBe(401)
        expect(response.status).not.toBe(403)
      }
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle authentication errors gracefully', async () => {
      mockGetToken.mockRejectedValue(new Error('JWT verification failed'))
      
      const request = createMockRequest('/admin/products', 'GET')
      const response = await middleware(request)
      
      expect(response.status).toBe(307) // Redirect to login
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get token:',
        expect.any(Error)
      )
    })

    it('should provide helpful error messages in API responses', async () => {
      mockGetToken.mockResolvedValue(null)
      
      const request = createMockRequest('/api/admin/users', 'POST')
      const response = await middleware(request)
      
      expect(response.status).toBe(401)
      
      const body = await response.json()
      expect(body).toEqual({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          details: { 
            reason: 'Authentication required', 
            path: '/api/admin/users' 
          },
          timestamp: expect.any(String),
        },
        success: false,
      })
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle multiple concurrent requests', async () => {
      const token = createMockToken('ADMIN')
      mockGetToken.mockResolvedValue(token)
      
      const requests = Array.from({ length: 10 }, (_, i) => 
        createMockRequest(`/api/admin/users/${i}`, 'GET')
      )
      
      const responses = await Promise.all(
        requests.map(request => middleware(request))
      )
      
      responses.forEach(response => {
        expect(response.status).not.toBe(401)
        expect(response.status).not.toBe(403)
      })
    })

    it('should handle malformed tokens gracefully', async () => {
      mockGetToken.mockResolvedValue({ 
        id: 'user-1', 
        // Missing role property
        email: 'test@example.com' 
      } as any)
      
      const request = createMockRequest('/admin/users', 'GET')
      const response = await middleware(request)
      
      expect(response.status).toBe(307) // Should redirect due to insufficient permissions
    })

    it('should handle empty or null user IDs', async () => {
      mockGetToken.mockResolvedValue({ 
        id: '', 
        role: 'ADMIN',
        email: 'test@example.com' 
      })
      
      const request = createMockRequest('/admin/users', 'GET')
      const response = await middleware(request)
      
      expect(response.status).toBe(307) // Should redirect due to invalid user
    })
  })
})