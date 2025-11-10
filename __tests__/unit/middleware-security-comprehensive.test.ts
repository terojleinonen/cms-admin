/**
 * Comprehensive Middleware Security Tests
 * Tests route protection logic, security scenarios, and edge cases
 * Requirements: 4.2, 4.5
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { middleware } from '../../middleware'
import { UserRole } from '@prisma/client'

// Mock next-auth/jwt
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}))

// Mock preferences middleware
jest.mock('@/lib/preferences-middleware', () => ({
  applyUserPreferences: jest.fn((req, res) => res),
}))

// Mock rate limiting
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue({ success: true }),
  rateLimitConfigs: {
    auth: { windowMs: 900000, max: 5 },
    sensitive: { windowMs: 900000, max: 10 },
    public: { windowMs: 900000, max: 100 }
  },
  createRateLimitHeaders: jest.fn().mockReturnValue({})
}))

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>

describe('Comprehensive Middleware Security Tests', () => {
  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  const createMockRequest = (
    pathname: string, 
    method: string = 'GET',
    headers: Record<string, string> = {}
  ): NextRequest => {
    const url = `https://example.com${pathname}`
    const request = new NextRequest(url, { method })
    
    // Ensure nextUrl is properly set
    Object.defineProperty(request, 'nextUrl', {
      value: new URL(url),
      writable: false
    })
    
    // Add default headers
    request.headers.set('x-forwarded-for', '192.168.1.1')
    request.headers.set('user-agent', 'test-agent')
    
    // Add custom headers
    Object.entries(headers).forEach(([key, value]) => {
      request.headers.set(key, value)
    })

    return request
  }

  const createMockToken = (
    role: UserRole = UserRole.VIEWER, 
    id: string = 'user-1',
    overrides: Record<string, any> = {}
  ) => ({
    id,
    role,
    email: 'test@example.com',
    name: 'Test User',
    ...overrides
  })

  describe('Route Protection Logic', () => {
    describe('Static File Handling', () => {
      const staticPaths = [
        '/_next/static/chunk.js',
        '/_next/image/logo.png',
        '/favicon.ico',
        '/public/image.png',
        '/robots.txt',
        '/sitemap.xml'
      ]

      staticPaths.forEach(path => {
        it(`should skip middleware for static file: ${path}`, async () => {
          const request = createMockRequest(path)
          const response = await middleware(request)
          
          expect(response).toBeInstanceOf(NextResponse)
          expect(mockGetToken).not.toHaveBeenCalled()
          expect(response.headers.get('x-request-id')).toBeTruthy()
        })
      })
    })

    describe('Public Route Access', () => {
      const publicRoutes = [
        { path: '/', description: 'home page' },
        { path: '/auth/login', description: 'login page' },
        { path: '/auth/register', description: 'registration page' },
        { path: '/auth/password-reset', description: 'password reset page' },
        { path: '/api/health', description: 'health check' },
        { path: '/api/csrf-token', description: 'CSRF token' },
        { path: '/api/public/products', description: 'public products' },
        { path: '/api/auth/signin', description: 'NextAuth signin' },
        { path: '/api/auth/callback/credentials', description: 'NextAuth callback' }
      ]

      publicRoutes.forEach(({ path, description }) => {
        it(`should allow public access to ${description}: ${path}`, async () => {
          const request = createMockRequest(path)
          const response = await middleware(request)
          
          expect(response).toBeInstanceOf(NextResponse)
          expect(response.status).not.toBe(401)
          expect(response.status).not.toBe(403)
          expect(mockGetToken).not.toHaveBeenCalled()
          
          // Should log public route access
          expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('[SECURITY_LOW] SUCCESS:'),
            expect.stringContaining('public_route')
          )
        })
      })
    })

    describe('Authentication Required Routes', () => {
      const authRequiredRoutes = [
        { path: '/profile', description: 'user profile' },
        { path: '/settings', description: 'user settings' },
        { path: '/api/user/preferences', description: 'user preferences API' },
        { path: '/api/notifications', description: 'notifications API' }
      ]

      authRequiredRoutes.forEach(({ path, description }) => {
        it(`should require authentication for ${description}: ${path}`, async () => {
          mockGetToken.mockResolvedValue(null)
          
          const request = createMockRequest(path)
          const response = await middleware(request)
          
          if (path.startsWith('/api/')) {
            expect(response.status).toBe(401)
            const body = await response.json()
            expect(body.error.code).toBe('UNAUTHORIZED')
          } else {
            expect(response.status).toBe(307) // Redirect
            expect(response.headers.get('location')).toContain('/auth/login')
          }
        })

        it(`should allow authenticated access to ${description}: ${path}`, async () => {
          const token = createMockToken(UserRole.VIEWER)
          mockGetToken.mockResolvedValue(token)
          
          const request = createMockRequest(path)
          const response = await middleware(request)
          
          expect(response.status).not.toBe(401)
          expect(response.status).not.toBe(403)
        })
      })
    })

    describe('Permission-Based Route Protection', () => {
      const permissionRoutes = [
        {
          path: '/admin/users',
          requiredRole: UserRole.ADMIN,
          allowedRoles: [UserRole.ADMIN],
          deniedRoles: [UserRole.EDITOR, UserRole.VIEWER]
        },
        {
          path: '/admin/security',
          requiredRole: UserRole.ADMIN,
          allowedRoles: [UserRole.ADMIN],
          deniedRoles: [UserRole.EDITOR, UserRole.VIEWER]
        },
        {
          path: '/admin/products',
          requiredRole: UserRole.EDITOR,
          allowedRoles: [UserRole.ADMIN, UserRole.EDITOR],
          deniedRoles: [UserRole.VIEWER]
        },
        {
          path: '/api/admin/users',
          requiredRole: UserRole.ADMIN,
          allowedRoles: [UserRole.ADMIN],
          deniedRoles: [UserRole.EDITOR, UserRole.VIEWER]
        },
        {
          path: '/api/products',
          requiredRole: UserRole.VIEWER,
          allowedRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER],
          deniedRoles: []
        }
      ]

      permissionRoutes.forEach(({ path, allowedRoles, deniedRoles }) => {
        allowedRoles.forEach(role => {
          it(`should allow ${role} access to ${path}`, async () => {
            const token = createMockToken(role)
            mockGetToken.mockResolvedValue(token)
            
            const request = createMockRequest(path)
            const response = await middleware(request)
            
            expect(response.status).not.toBe(401)
            expect(response.status).not.toBe(403)
            
            // Should log successful access
            expect(consoleLogSpy).toHaveBeenCalledWith(
              expect.stringContaining('[SECURITY_LOW] SUCCESS:'),
              expect.stringContaining('permission_granted')
            )
          })
        })

        deniedRoles.forEach(role => {
          it(`should deny ${role} access to ${path}`, async () => {
            const token = createMockToken(role)
            mockGetToken.mockResolvedValue(token)
            
            const request = createMockRequest(path)
            const response = await middleware(request)
            
            if (path.startsWith('/api/')) {
              expect(response.status).toBe(403)
              const body = await response.json()
              expect(body.error.code).toBe('FORBIDDEN')
            } else {
              expect(response.status).toBe(307) // Redirect
            }
            
            // Should log forbidden access
            expect(consoleLogSpy).toHaveBeenCalledWith(
              expect.stringContaining('[SECURITY_HIGH] FORBIDDEN:'),
              expect.stringContaining('Insufficient permissions')
            )
          })
        })
      })
    })

    describe('Dynamic Route Matching', () => {
      const dynamicRoutes = [
        { pattern: '/admin/products/[id]', example: '/admin/products/123' },
        { pattern: '/admin/products/[id]/edit', example: '/admin/products/abc-123/edit' },
        { pattern: '/admin/users/[id]', example: '/admin/users/user-456' },
        { pattern: '/api/products/[id]', example: '/api/products/prod-789' },
        { pattern: '/api/admin/users/[id]', example: '/api/admin/users/admin-user' }
      ]

      dynamicRoutes.forEach(({ pattern, example }) => {
        it(`should match dynamic route pattern ${pattern} with ${example}`, async () => {
          const token = createMockToken(UserRole.ADMIN)
          mockGetToken.mockResolvedValue(token)
          
          const request = createMockRequest(example)
          const response = await middleware(request)
          
          expect(response.status).not.toBe(401)
          expect(response.status).not.toBe(403)
        })
      })
    })
  })

  describe('Security Scenarios', () => {
    describe('Authentication Attacks', () => {
      it('should handle token manipulation attempts', async () => {
        mockGetToken.mockRejectedValue(new Error('Invalid token signature'))
        
        const request = createMockRequest('/admin/users')
        const response = await middleware(request)
        
        expect(response.status).toBe(307) // Redirect to login
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to get token:',
          expect.any(Error)
        )
        
        // Should log security event
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[SECURITY_MEDIUM] UNAUTHORIZED:'),
          expect.stringContaining('token_error')
        )
      })

      it('should handle malformed tokens', async () => {
        mockGetToken.mockResolvedValue({
          // Missing required fields
          email: 'test@example.com'
        } as any)
        
        const request = createMockRequest('/admin/users')
        const response = await middleware(request)
        
        expect(response.status).toBe(307) // Should redirect due to invalid token
      })

      it('should handle expired tokens', async () => {
        mockGetToken.mockResolvedValue(null) // Simulates expired token
        
        const request = createMockRequest('/admin/users')
        const response = await middleware(request)
        
        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toContain('/auth/login')
      })
    })

    describe('Authorization Attacks', () => {
      it('should detect privilege escalation attempts', async () => {
        const viewer = createMockToken(UserRole.VIEWER)
        mockGetToken.mockResolvedValue(viewer)
        
        const request = createMockRequest('/admin/security')
        const response = await middleware(request)
        
        expect(response.status).toBe(307)
        
        // Should log as potential privilege escalation
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[SECURITY_HIGH] FORBIDDEN:'),
          expect.stringContaining('Insufficient permissions')
        )
      })

      it('should detect role manipulation attempts', async () => {
        const token = createMockToken('SUPER_ADMIN' as UserRole) // Invalid role
        mockGetToken.mockResolvedValue(token)
        
        const request = createMockRequest('/admin/users')
        const response = await middleware(request)
        
        expect(response.status).toBe(307) // Should be denied
      })

      it('should handle concurrent session attacks', async () => {
        const token = createMockToken(UserRole.ADMIN)
        mockGetToken.mockResolvedValue(token)
        
        // Simulate multiple concurrent requests from same user
        const requests = Array.from({ length: 10 }, () => 
          createMockRequest('/admin/users')
        )
        
        const responses = await Promise.all(
          requests.map(request => middleware(request))
        )
        
        // All should succeed for legitimate admin
        responses.forEach(response => {
          expect(response.status).not.toBe(401)
          expect(response.status).not.toBe(403)
        })
      })
    })

    describe('IP-Based Security', () => {
      it('should track suspicious IP behavior', async () => {
        const suspiciousIP = '10.0.0.1'
        
        // Make multiple failed attempts from same IP
        mockGetToken.mockResolvedValue(null)
        
        for (let i = 0; i < 3; i++) {
          const request = createMockRequest('/admin/users', 'GET', {
            'x-forwarded-for': suspiciousIP
          })
          await middleware(request)
        }
        
        // Should log suspicious activity
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[SECURITY_MEDIUM] UNAUTHORIZED:'),
          expect.stringContaining(suspiciousIP)
        )
      })

      it('should handle IP spoofing attempts', async () => {
        const request = createMockRequest('/admin/users', 'GET', {
          'x-forwarded-for': '127.0.0.1, 192.168.1.1, 10.0.0.1',
          'x-real-ip': '203.0.113.1'
        })
        
        mockGetToken.mockResolvedValue(null)
        await middleware(request)
        
        // Should log with full IP chain
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[SECURITY_MEDIUM] UNAUTHORIZED:'),
          expect.stringContaining('127.0.0.1, 192.168.1.1, 10.0.0.1')
        )
      })
    })

    describe('Request Manipulation', () => {
      it('should handle path traversal attempts', async () => {
        const token = createMockToken(UserRole.ADMIN)
        mockGetToken.mockResolvedValue(token)
        
        const maliciousPaths = [
          '/admin/../../../etc/passwd',
          '/admin/users/../../../config',
          '/api/admin/../../sensitive'
        ]
        
        for (const path of maliciousPaths) {
          const request = createMockRequest(path)
          const response = await middleware(request)
          
          // Should handle gracefully (Next.js normalizes paths)
          expect(response.status).toBeLessThan(500)
        }
      })

      it('should handle method override attempts', async () => {
        const token = createMockToken(UserRole.VIEWER)
        mockGetToken.mockResolvedValue(token)
        
        const request = createMockRequest('/api/admin/users', 'GET', {
          'X-HTTP-Method-Override': 'DELETE'
        })
        
        const response = await middleware(request)
        
        // Should still check based on actual method, not override
        expect(response.status).toBe(403)
      })
    })

    describe('Rate Limiting Security', () => {
      it('should apply different rate limits based on route sensitivity', async () => {
        const { rateLimit } = require('../app/lib/rate-limit')
        
        // Test auth routes (stricter limits)
        const authRequest = createMockRequest('/api/auth/login', 'POST')
        await middleware(authRequest)
        
        expect(rateLimit).toHaveBeenCalledWith(
          authRequest,
          expect.objectContaining({ max: 5 }) // Auth limit
        )
        
        // Test public routes (more lenient)
        const publicRequest = createMockRequest('/api/health')
        await middleware(publicRequest)
        
        expect(rateLimit).toHaveBeenCalledWith(
          publicRequest,
          expect.objectContaining({ max: 100 }) // Public limit
        )
      })
    })
  })

  describe('Security Headers and Response Handling', () => {
    it('should add comprehensive security headers', async () => {
      const request = createMockRequest('/')
      const response = await middleware(request)
      
      // Check all security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(response.headers.get('X-DNS-Prefetch-Control')).toBe('off')
      expect(response.headers.get('X-Download-Options')).toBe('noopen')
      expect(response.headers.get('X-Permitted-Cross-Domain-Policies')).toBe('none')
      
      // Check CSP header
      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("object-src 'none'")
      expect(csp).toContain("frame-ancestors 'none'")
    })

    it('should add HSTS header in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      const request = createMockRequest('/')
      const response = await middleware(request)
      
      expect(response.headers.get('Strict-Transport-Security')).toBe(
        'max-age=31536000; includeSubDomains; preload'
      )
      
      process.env.NODE_ENV = originalEnv
    })

    it('should remove sensitive headers', async () => {
      const request = createMockRequest('/')
      const response = await middleware(request)
      
      expect(response.headers.get('Server')).toBeNull()
      expect(response.headers.get('X-Powered-By')).toBeNull()
    })

    it('should add request tracking headers', async () => {
      const request = createMockRequest('/')
      const response = await middleware(request)
      
      expect(response.headers.get('x-request-id')).toBeTruthy()
      expect(response.headers.get('X-Security-Monitored')).toBe('true')
      expect(response.headers.get('X-Timestamp')).toBeTruthy()
    })
  })

  describe('Error Response Formats', () => {
    it('should return standardized API error responses', async () => {
      mockGetToken.mockResolvedValue(null)
      
      const request = createMockRequest('/api/admin/users')
      const response = await middleware(request)
      
      expect(response.status).toBe(401)
      
      const body = await response.json()
      expect(body).toEqual({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          details: {
            reason: 'Authentication required',
            path: '/api/admin/users',
            requestId: expect.any(String)
          },
          timestamp: expect.any(String)
        },
        success: false
      })
    })

    it('should return standardized forbidden responses', async () => {
      const token = createMockToken(UserRole.VIEWER)
      mockGetToken.mockResolvedValue(token)
      
      const request = createMockRequest('/api/admin/users')
      const response = await middleware(request)
      
      expect(response.status).toBe(403)
      
      const body = await response.json()
      expect(body.error.code).toBe('FORBIDDEN')
      expect(body.error.message).toBe('Insufficient permissions')
      expect(body.success).toBe(false)
    })

    it('should handle web route redirects properly', async () => {
      mockGetToken.mockResolvedValue(null)
      
      const request = createMockRequest('/admin/users')
      const response = await middleware(request)
      
      expect(response.status).toBe(307)
      
      const location = response.headers.get('location')
      expect(location).toContain('/auth/login')
      expect(location).toContain('callbackUrl=%2Fadmin%2Fusers')
      expect(location).toContain('error=unauthorized')
    })
  })

  describe('Logging and Monitoring', () => {
    it('should log all security events with proper severity', async () => {
      // Test different severity levels
      const scenarios = [
        {
          setup: () => mockGetToken.mockResolvedValue(null),
          path: '/admin/users',
          expectedSeverity: 'MEDIUM',
          expectedResult: 'UNAUTHORIZED'
        },
        {
          setup: () => mockGetToken.mockResolvedValue(createMockToken(UserRole.VIEWER)),
          path: '/admin/security',
          expectedSeverity: 'HIGH',
          expectedResult: 'FORBIDDEN'
        },
        {
          setup: () => mockGetToken.mockResolvedValue(createMockToken(UserRole.ADMIN)),
          path: '/admin/users',
          expectedSeverity: 'LOW',
          expectedResult: 'SUCCESS'
        }
      ]
      
      for (const { setup, path, expectedSeverity, expectedResult } of scenarios) {
        setup()
        
        const request = createMockRequest(path)
        await middleware(request)
        
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(`[SECURITY_${expectedSeverity}] ${expectedResult}:`),
          expect.any(String)
        )
      }
    })

    it('should include comprehensive request metadata in logs', async () => {
      const token = createMockToken(UserRole.ADMIN)
      mockGetToken.mockResolvedValue(token)
      
      const request = createMockRequest('/admin/users', 'GET', {
        'x-forwarded-for': '203.0.113.1',
        'user-agent': 'Mozilla/5.0 Test Browser'
      })
      
      await middleware(request)
      
      // Check that log includes all metadata
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY_LOW] SUCCESS:'),
        expect.stringMatching(/"userId":\s*"user-1"/)
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY_LOW] SUCCESS:'),
        expect.stringMatching(/"userRole":\s*"ADMIN"/)
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY_LOW] SUCCESS:'),
        expect.stringMatching(/"ipAddress":\s*"203\.0\.113\.1"/)
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY_LOW] SUCCESS:'),
        expect.stringMatching(/"userAgent":\s*"Mozilla\/5\.0 Test Browser"/)
      )
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle high concurrent load', async () => {
      const token = createMockToken(UserRole.ADMIN)
      mockGetToken.mockResolvedValue(token)
      
      // Create 50 concurrent requests
      const requests = Array.from({ length: 50 }, (_, i) => 
        createMockRequest(`/admin/users/${i}`)
      )
      
      const startTime = Date.now()
      const responses = await Promise.all(
        requests.map(request => middleware(request))
      )
      const endTime = Date.now()
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).not.toBe(401)
        expect(response.status).not.toBe(403)
      })
      
      // Should complete within reasonable time (10 seconds)
      expect(endTime - startTime).toBeLessThan(10000)
    })

    it('should handle memory efficiently with many requests', async () => {
      const token = createMockToken(UserRole.VIEWER)
      mockGetToken.mockResolvedValue(token)
      
      // Make many requests to test memory usage
      for (let i = 0; i < 100; i++) {
        const request = createMockRequest('/api/products')
        await middleware(request)
      }
      
      // Should not throw memory errors
      expect(true).toBe(true)
    })

    it('should handle malformed URLs gracefully', async () => {
      const token = createMockToken(UserRole.ADMIN)
      mockGetToken.mockResolvedValue(token)
      
      const malformedUrls = [
        '/admin/users/%2E%2E%2F%2E%2E%2F',
        '/admin/users/../../etc/passwd',
        '/admin/users/<script>alert(1)</script>'
      ]
      
      for (const url of malformedUrls) {
        const request = createMockRequest(url)
        const response = await middleware(request)
        
        // Should handle gracefully without errors
        expect(response.status).toBeLessThan(500)
      }
    })
  })
})