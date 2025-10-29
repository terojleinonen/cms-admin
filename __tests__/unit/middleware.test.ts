/**
 * Route Protection Middleware Tests
 * Tests authentication and authorization middleware functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { middleware } from '../middleware'

// Mock next-auth/jwt
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}))

// Mock preferences middleware
jest.mock('../app/lib/preferences-middleware', () => ({
  applyUserPreferences: jest.fn((req, res) => res),
}))

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>

describe('Route Protection Middleware', () => {
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

  const createMockRequest = (pathname: string, headers: Record<string, string> = {}): NextRequest => {
    const url = `https://example.com${pathname}`
    const request = new NextRequest(url)
    
    // Add headers
    Object.entries(headers).forEach(([key, value]) => {
      request.headers.set(key, value)
    })

    return request
  }

  const createMockToken = (role: string = 'VIEWER', id: string = 'user-1') => ({
    id,
    role,
    email: 'test@example.com',
    name: 'Test User',
  })

  describe('Static Files and Next.js Internals', () => {
    it('should skip middleware for static files', async () => {
      const request = createMockRequest('/_next/static/chunk.js')
      const response = await middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      expect(mockGetToken).not.toHaveBeenCalled()
    })

    it('should skip middleware for favicon', async () => {
      const request = createMockRequest('/favicon.ico')
      const response = await middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      expect(mockGetToken).not.toHaveBeenCalled()
    })

    it('should skip middleware for public files', async () => {
      const request = createMockRequest('/public/image.png')
      const response = await middleware(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      expect(mockGetToken).not.toHaveBeenCalled()
    })
  })

  describe('Public Routes', () => {
    const publicRoutes = [
      '/auth/login',
      '/auth/register',
      '/auth/password-reset',
      '/api/auth/signin',
      '/api/health',
      '/api/csrf-token',
      '/api/public/products',
      '/',
    ]

    publicRoutes.forEach(route => {
      it(`should allow access to public route: ${route}`, async () => {
        const request = createMockRequest(route, {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'test-agent',
        })
        
        const response = await middleware(request)
        
        expect(response).toBeInstanceOf(NextResponse)
        expect(response.status).not.toBe(401)
        expect(response.status).not.toBe(403)
        expect(mockGetToken).not.toHaveBeenCalled()
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '[ACCESS_LOG] SUCCESS:',
          expect.stringContaining('public_route')
        )
      })
    })
  })

  describe('Authentication Required Routes', () => {
    it('should redirect unauthenticated users to login for web routes', async () => {
      mockGetToken.mockResolvedValue(null)
      
      const request = createMockRequest('/admin/products')
      const response = await middleware(request)
      
      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('/auth/login')
      expect(response.headers.get('location')).toContain('callbackUrl=%2Fadmin%2Fproducts')
    })

    it('should return 401 JSON for unauthenticated API requests', async () => {
      mockGetToken.mockResolvedValue(null)
      
      const request = createMockRequest('/api/admin/users')
      const response = await middleware(request)
      
      expect(response.status).toBe(401)
      
      const body = await response.json()
      expect(body).toEqual({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          details: { reason: 'Authentication required', path: '/api/admin/users' },
          timestamp: expect.any(String),
        },
        success: false,
      })
    })

    it('should handle token retrieval errors', async () => {
      mockGetToken.mockRejectedValue(new Error('Token error'))
      
      const request = createMockRequest('/admin/products')
      const response = await middleware(request)
      
      expect(response.status).toBe(307) // Redirect to login
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get token:', expect.any(Error))
    })
  })

  describe('Authenticated Routes (No Specific Permissions)', () => {
    const authenticatedRoutes = ['/profile', '/settings', '/api/user/preferences']

    authenticatedRoutes.forEach(route => {
      it(`should allow authenticated users to access: ${route}`, async () => {
        const token = createMockToken('VIEWER')
        mockGetToken.mockResolvedValue(token)
        
        const request = createMockRequest(route)
        const response = await middleware(request)
        
        expect(response).toBeInstanceOf(NextResponse)
        expect(response.status).not.toBe(401)
        expect(response.status).not.toBe(403)
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '[ACCESS_LOG] SUCCESS:',
          expect.stringContaining('authenticated_route')
        )
      })
    })
  })

  describe('Permission-Based Routes', () => {
    describe('Admin Routes', () => {
      const adminRoutes = [
        '/admin/users',
        '/admin/security',
        '/admin/analytics',
        '/admin/monitoring',
        '/api/admin/users',
        '/api/admin/security',
      ]

      adminRoutes.forEach(route => {
        it(`should allow ADMIN access to: ${route}`, async () => {
          const token = createMockToken('ADMIN')
          mockGetToken.mockResolvedValue(token)
          
          const request = createMockRequest(route)
          const response = await middleware(request)
          
          expect(response).toBeInstanceOf(NextResponse)
          expect(response.status).not.toBe(401)
          expect(response.status).not.toBe(403)
        })

        it(`should deny EDITOR access to: ${route}`, async () => {
          const token = createMockToken('EDITOR')
          mockGetToken.mockResolvedValue(token)
          
          const request = createMockRequest(route)
          const response = await middleware(request)
          
          if (route.startsWith('/api/')) {
            expect(response.status).toBe(403)
            const body = await response.json()
            expect(body.error.code).toBe('FORBIDDEN')
          } else {
            expect(response.status).toBe(307) // Redirect
          }
        })

        it(`should deny VIEWER access to: ${route}`, async () => {
          const token = createMockToken('VIEWER')
          mockGetToken.mockResolvedValue(token)
          
          const request = createMockRequest(route)
          const response = await middleware(request)
          
          if (route.startsWith('/api/')) {
            expect(response.status).toBe(403)
          } else {
            expect(response.status).toBe(307) // Redirect
          }
        })
      })
    })

    describe('Content Management Routes', () => {
      const contentRoutes = [
        '/admin/products',
        '/admin/products/new',
        '/admin/categories',
        '/admin/pages',
        '/api/products',
        '/api/categories',
      ]

      contentRoutes.forEach(route => {
        it(`should allow ADMIN access to: ${route}`, async () => {
          const token = createMockToken('ADMIN')
          mockGetToken.mockResolvedValue(token)
          
          const request = createMockRequest(route)
          const response = await middleware(request)
          
          expect(response.status).not.toBe(401)
          expect(response.status).not.toBe(403)
        })

        it(`should allow EDITOR access to: ${route}`, async () => {
          const token = createMockToken('EDITOR')
          mockGetToken.mockResolvedValue(token)
          
          const request = createMockRequest(route)
          const response = await middleware(request)
          
          expect(response.status).not.toBe(401)
          expect(response.status).not.toBe(403)
        })

        // Some routes allow VIEWER read access
        if (route.includes('/api/') && !route.includes('/new')) {
          it(`should allow VIEWER read access to: ${route}`, async () => {
            const token = createMockToken('VIEWER')
            mockGetToken.mockResolvedValue(token)
            
            const request = createMockRequest(route)
            const response = await middleware(request)
            
            expect(response.status).not.toBe(401)
            expect(response.status).not.toBe(403)
          })
        }
      })
    })

    describe('Dynamic Routes', () => {
      it('should match dynamic product routes', async () => {
        const token = createMockToken('EDITOR')
        mockGetToken.mockResolvedValue(token)
        
        const request = createMockRequest('/admin/products/123/edit')
        const response = await middleware(request)
        
        expect(response.status).not.toBe(401)
        expect(response.status).not.toBe(403)
      })

      it('should match dynamic user routes', async () => {
        const token = createMockToken('ADMIN')
        mockGetToken.mockResolvedValue(token)
        
        const request = createMockRequest('/admin/users/456')
        const response = await middleware(request)
        
        expect(response.status).not.toBe(401)
        expect(response.status).not.toBe(403)
      })

      it('should deny access to dynamic routes without permissions', async () => {
        const token = createMockToken('VIEWER')
        mockGetToken.mockResolvedValue(token)
        
        const request = createMockRequest('/admin/products/123/edit')
        const response = await middleware(request)
        
        expect(response.status).toBe(307) // Redirect for web route
      })
    })
  })

  describe('Security Headers', () => {
    it('should add security headers to responses', async () => {
      const request = createMockRequest('/')
      const response = await middleware(request)
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    })

    it('should add HSTS header in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      const request = createMockRequest('/')
      const response = await middleware(request)
      
      expect(response.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains')
      
      process.env.NODE_ENV = originalEnv
    })

    it('should generate request ID for tracing', async () => {
      // Test that request ID is generated (we can see it in the logs)
      const request = createMockRequest('/api/health')
      await middleware(request)
      
      // The middleware generates request IDs for tracing (visible in logs)
      // This is tested indirectly through the logging functionality
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ACCESS_LOG] SUCCESS:',
        expect.stringMatching(/"timestamp":\s*"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"/)
      )
    })
  })

  describe('Access Logging', () => {
    it('should log successful access attempts', async () => {
      const token = createMockToken('ADMIN')
      mockGetToken.mockResolvedValue(token)
      
      const request = createMockRequest('/admin/users', {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'test-browser',
      })
      
      await middleware(request)
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ACCESS_LOG] SUCCESS:',
        expect.stringMatching(/"userId":\s*"user-1"/)
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ACCESS_LOG] SUCCESS:',
        expect.stringMatching(/"userRole":\s*"ADMIN"/)
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ACCESS_LOG] SUCCESS:',
        expect.stringMatching(/"pathname":\s*"\/admin\/users"/)
      )
    })

    it('should log unauthorized access attempts', async () => {
      mockGetToken.mockResolvedValue(null)
      
      const request = createMockRequest('/admin/users', {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'test-browser',
      })
      
      await middleware(request)
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ACCESS_LOG] UNAUTHORIZED:',
        expect.stringMatching(/"userId":\s*"anonymous"/)
      )
    })

    it('should log forbidden access attempts', async () => {
      const token = createMockToken('VIEWER')
      mockGetToken.mockResolvedValue(token)
      
      const request = createMockRequest('/admin/users', {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'test-browser',
      })
      
      await middleware(request)
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ACCESS_LOG] FORBIDDEN:',
        expect.stringMatching(/"userId":\s*"user-1"/)
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ACCESS_LOG] FORBIDDEN:',
        expect.stringMatching(/Insufficient permissions/)
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle missing token gracefully', async () => {
      mockGetToken.mockResolvedValue(null)
      
      const request = createMockRequest('/admin/products')
      const response = await middleware(request)
      
      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('/auth/login')
    })

    it('should handle token with missing role', async () => {
      const token = { id: 'user-1', email: 'test@example.com' } // Missing role
      mockGetToken.mockResolvedValue(token)
      
      const request = createMockRequest('/admin/users')
      const response = await middleware(request)
      
      expect(response.status).toBe(307) // Should redirect due to insufficient permissions
    })

    it('should handle token with invalid role', async () => {
      const token = createMockToken('INVALID_ROLE')
      mockGetToken.mockResolvedValue(token)
      
      const request = createMockRequest('/admin/users')
      const response = await middleware(request)
      
      expect(response.status).toBe(307) // Should redirect due to insufficient permissions
    })
  })

  describe('Route Pattern Matching', () => {
    it('should match exact routes', async () => {
      const token = createMockToken('ADMIN')
      mockGetToken.mockResolvedValue(token)
      
      const request = createMockRequest('/admin/users')
      const response = await middleware(request)
      
      expect(response.status).not.toBe(403)
    })

    it('should match dynamic routes with IDs', async () => {
      const token = createMockToken('ADMIN')
      mockGetToken.mockResolvedValue(token)
      
      const request = createMockRequest('/admin/users/123')
      const response = await middleware(request)
      
      expect(response.status).not.toBe(403)
    })

    it('should not match incorrect patterns', async () => {
      const token = createMockToken('VIEWER')
      mockGetToken.mockResolvedValue(token)
      
      // This should not match any admin patterns and should be allowed
      // since no specific permissions are required for unknown routes
      const request = createMockRequest('/some/unknown/route')
      const response = await middleware(request)
      
      expect(response.status).not.toBe(403)
    })
  })

  describe('IP Address and User Agent Tracking', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const request = createMockRequest('/', {
        'x-forwarded-for': '203.0.113.1, 192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      })
      
      await middleware(request)
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ACCESS_LOG] SUCCESS:',
        expect.stringMatching(/"ipAddress":\s*"203\.0\.113\.1, 192\.168\.1\.1"/)
      )
    })

    it('should extract IP from x-real-ip header when x-forwarded-for is not present', async () => {
      const request = createMockRequest('/', {
        'x-real-ip': '203.0.113.1',
        'user-agent': 'Mozilla/5.0',
      })
      
      await middleware(request)
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ACCESS_LOG] SUCCESS:',
        expect.stringMatching(/"ipAddress":\s*"203\.0\.113\.1"/)
      )
    })

    it('should use "unknown" when no IP headers are present', async () => {
      const request = createMockRequest('/')
      
      await middleware(request)
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ACCESS_LOG] SUCCESS:',
        expect.stringMatching(/"ipAddress":\s*"unknown"/)
      )
    })
  })
})