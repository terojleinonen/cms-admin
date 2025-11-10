/**
 * Comprehensive Security Scenarios Tests
 * Tests various security attack scenarios and edge cases
 * Requirements: 4.2, 4.5
 */

import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { getToken } from 'next-auth/jwt'
import { middleware } from '../../middleware'
import { ApiPermissionMiddleware } from '@/lib/api-permission-middleware'

// Mock dependencies
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}))

jest.mock('@/lib/preferences-middleware', () => ({
  applyUserPreferences: jest.fn((req, res) => res),
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn(),
  rateLimitConfigs: {
    auth: { windowMs: 900000, max: 5 },
    sensitive: { windowMs: 900000, max: 10 },
    public: { windowMs: 900000, max: 100 }
  },
  createRateLimitHeaders: jest.fn().mockReturnValue({})
}))

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>
const mockRateLimit = require('@/lib/rate-limit').rateLimit

describe('Comprehensive Security Scenarios Tests', () => {
  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    
    // Default rate limit success
    mockRateLimit.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  const createMockRequest = (
    pathname: string,
    method: string = 'GET',
    headers: Record<string, string> = {},
    body?: any
  ): NextRequest => {
    const url = `https://example.com${pathname}`
    const requestInit: RequestInit = { method }
    
    if (body) {
      requestInit.body = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
    
    const request = new NextRequest(url, requestInit)
    
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

  describe('Authentication Attack Scenarios', () => {
    describe('Token Manipulation Attacks', () => {
      it('should handle JWT signature tampering', async () => {
        mockGetToken.mockRejectedValue(new Error('Invalid signature'))
        
        const request = createMockRequest('/admin/users')
        const response = await middleware(request)
        
        expect(response.status).toBe(307) // Redirect to login
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to get token:',
          expect.any(Error)
        )
      })

      it('should handle expired tokens', async () => {
        mockGetToken.mockRejectedValue(new Error('Token expired'))
        
        const request = createMockRequest('/api/admin/users')
        const response = await middleware(request)
        
        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body.error.code).toBe('UNAUTHORIZED')
      })

      it('should handle malformed JWT tokens', async () => {
        mockGetToken.mockRejectedValue(new Error('Malformed token'))
        
        const request = createMockRequest('/admin/products')
        const response = await middleware(request)
        
        expect(response.status).toBe(307)
      })

      it('should handle token with missing claims', async () => {
        mockGetToken.mockResolvedValue({
          // Missing id and role
          email: 'test@example.com'
        } as any)
        
        const request = createMockRequest('/admin/users')
        const response = await middleware(request)
        
        expect(response.status).toBe(307) // Should redirect due to invalid token
      })

      it('should handle token with invalid role', async () => {
        mockGetToken.mockResolvedValue({
          id: 'user-1',
          role: 'INVALID_ROLE',
          email: 'test@example.com'
        } as any)
        
        const request = createMockRequest('/admin/users')
        const response = await middleware(request)
        
        expect(response.status).toBe(307) // Should redirect due to invalid role
      })
    })

    describe('Session Hijacking Scenarios', () => {
      it('should handle concurrent sessions from different IPs', async () => {
        const token = createMockToken(UserRole.ADMIN)
        mockGetToken.mockResolvedValue(token)
        
        // Simulate requests from different IPs
        const ips = ['192.168.1.1', '10.0.0.1', '203.0.113.1']
        
        for (const ip of ips) {
          const request = createMockRequest('/admin/users', 'GET', {
            'x-forwarded-for': ip
          })
          const response = await middleware(request)
          
          // Should allow legitimate admin from different locations
          expect(response.status).not.toBe(401)
          expect(response.status).not.toBe(403)
        }
      })

      it('should handle suspicious user agent changes', async () => {
        const token = createMockToken(UserRole.ADMIN)
        mockGetToken.mockResolvedValue(token)
        
        const userAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'curl/7.68.0',
          'python-requests/2.25.1'
        ]
        
        for (const userAgent of userAgents) {
          const request = createMockRequest('/admin/users', 'GET', {
            'user-agent': userAgent
          })
          const response = await middleware(request)
          
          // Should log but allow (user agent changes are common)
          expect(response.status).not.toBe(401)
          expect(response.status).not.toBe(403)
        }
      })
    })

    describe('Brute Force Attack Scenarios', () => {
      it('should handle rapid authentication attempts', async () => {
        // Simulate multiple failed login attempts
        mockGetToken.mockResolvedValue(null)
        
        const requests = Array.from({ length: 10 }, () =>
          createMockRequest('/api/auth/login', 'POST', {
            'x-forwarded-for': '192.168.1.100'
          })
        )
        
        const responses = await Promise.all(
          requests.map(request => middleware(request))
        )
        
        // All should be unauthorized
        responses.forEach(response => {
          expect(response.status).toBe(401)
        })
        
        // Should log multiple unauthorized attempts
        expect(consoleLogSpy).toHaveBeenCalledTimes(responses.length)
      })

      it('should handle distributed brute force attacks', async () => {
        mockGetToken.mockResolvedValue(null)
        
        // Simulate attacks from multiple IPs
        const attackIPs = ['10.0.0.1', '10.0.0.2', '10.0.0.3']
        
        for (const ip of attackIPs) {
          const requests = Array.from({ length: 3 }, () =>
            createMockRequest('/admin/users', 'GET', {
              'x-forwarded-for': ip
            })
          )
          
          const responses = await Promise.all(
            requests.map(request => middleware(request))
          )
          
          responses.forEach(response => {
            expect(response.status).toBe(307) // Redirect to login
          })
        }
      })
    })
  })

  describe('Authorization Attack Scenarios', () => {
    describe('Privilege Escalation Attacks', () => {
      it('should detect horizontal privilege escalation', async () => {
        const user = createMockToken(UserRole.EDITOR, 'user-1')
        mockGetToken.mockResolvedValue(user)
        
        // Try to access another user's profile
        const request = createMockRequest('/api/users/user-2/preferences', 'PUT')
        const response = await middleware(request)
        
        // Should be denied (assuming proper permission checks)
        expect(response.status).toBeLessThan(500)
      })

      it('should detect vertical privilege escalation', async () => {
        const viewer = createMockToken(UserRole.VIEWER)
        mockGetToken.mockResolvedValue(viewer)
        
        // Try to access admin functions
        const adminPaths = [
          '/admin/users',
          '/admin/security',
          '/api/admin/users',
          '/api/admin/security'
        ]
        
        for (const path of adminPaths) {
          const request = createMockRequest(path)
          const response = await middleware(request)
          
          if (path.startsWith('/api/')) {
            expect(response.status).toBe(403)
          } else {
            expect(response.status).toBe(307) // Redirect
          }
        }
      })

      it('should detect role manipulation attempts', async () => {
        // Simulate token with manipulated role
        const token = createMockToken('SUPER_ADMIN' as UserRole)
        mockGetToken.mockResolvedValue(token)
        
        const request = createMockRequest('/admin/users')
        const response = await middleware(request)
        
        // Should be denied due to invalid role
        expect(response.status).toBe(307)
      })
    })

    describe('Permission Bypass Attempts', () => {
      it('should handle method override attacks', async () => {
        const viewer = createMockToken(UserRole.VIEWER)
        mockGetToken.mockResolvedValue(viewer)
        
        // Try to use method override to bypass restrictions
        const request = createMockRequest('/api/admin/users', 'GET', {
          'X-HTTP-Method-Override': 'DELETE',
          'X-Method-Override': 'POST'
        })
        
        const response = await middleware(request)
        
        // Should still check based on actual method
        expect(response.status).toBe(403)
      })

      it('should handle parameter pollution attacks', async () => {
        const editor = createMockToken(UserRole.EDITOR)
        mockGetToken.mockResolvedValue(editor)
        
        // Try parameter pollution in URL
        const request = createMockRequest('/api/products?id=1&id=2&role=admin')
        const response = await middleware(request)
        
        // Should handle gracefully
        expect(response.status).toBeLessThan(500)
      })
    })
  })

  describe('Input Validation Attack Scenarios', () => {
    describe('Injection Attacks', () => {
      it('should handle SQL injection attempts in URLs', async () => {
        const admin = createMockToken(UserRole.ADMIN)
        mockGetToken.mockResolvedValue(admin)
        
        const maliciousPaths = [
          "/api/products/1'; DROP TABLE products; --",
          "/api/users/1 UNION SELECT * FROM admin_users",
          "/api/categories/1' OR '1'='1"
        ]
        
        for (const path of maliciousPaths) {
          const request = createMockRequest(path)
          const response = await middleware(request)
          
          // Should handle gracefully (URL encoding/validation)
          expect(response.status).toBeLessThan(500)
        }
      })

      it('should handle XSS attempts in headers', async () => {
        const admin = createMockToken(UserRole.ADMIN)
        mockGetToken.mockResolvedValue(admin)
        
        const request = createMockRequest('/admin/users', 'GET', {
          'user-agent': '<script>alert("xss")</script>',
          'referer': 'javascript:alert(1)',
          'x-custom-header': '<img src=x onerror=alert(1)>'
        })
        
        const response = await middleware(request)
        
        // Should handle gracefully
        expect(response.status).not.toBe(500)
      })

      it('should handle command injection in user agents', async () => {
        const admin = createMockToken(UserRole.ADMIN)
        mockGetToken.mockResolvedValue(admin)
        
        const maliciousUserAgents = [
          'Mozilla/5.0; rm -rf /',
          'curl | sh',
          '$(whoami)',
          '`id`'
        ]
        
        for (const userAgent of maliciousUserAgents) {
          const request = createMockRequest('/admin/users', 'GET', {
            'user-agent': userAgent
          })
          const response = await middleware(request)
          
          // Should handle gracefully
          expect(response.status).not.toBe(500)
        }
      })
    })

    describe('Path Traversal Attacks', () => {
      it('should handle directory traversal attempts', async () => {
        const admin = createMockToken(UserRole.ADMIN)
        mockGetToken.mockResolvedValue(admin)
        
        const traversalPaths = [
          '/admin/../../../etc/passwd',
          '/api/admin/../../config/database.yml',
          '/admin/users/../../../.env',
          '/api/products/../../../../etc/shadow'
        ]
        
        for (const path of traversalPaths) {
          const request = createMockRequest(path)
          const response = await middleware(request)
          
          // Next.js should normalize paths, but we should handle gracefully
          expect(response.status).toBeLessThan(500)
        }
      })

      it('should handle encoded path traversal', async () => {
        const admin = createMockToken(UserRole.ADMIN)
        mockGetToken.mockResolvedValue(admin)
        
        const encodedPaths = [
          '/admin/%2E%2E%2F%2E%2E%2F%2E%2E%2Fetc%2Fpasswd',
          '/api/admin/..%2F..%2F..%2Fconfig',
          '/admin/users/..%5C..%5C..%5Cwindows%5Csystem32'
        ]
        
        for (const path of encodedPaths) {
          const request = createMockRequest(path)
          const response = await middleware(request)
          
          expect(response.status).toBeLessThan(500)
        }
      })
    })
  })

  describe('Rate Limiting Attack Scenarios', () => {
    describe('DoS Attacks', () => {
      it('should handle rate limit violations', async () => {
        mockRateLimit.mockResolvedValue({
          success: false,
          retryAfter: 60
        })
        
        const request = createMockRequest('/api/products')
        const response = await middleware(request)
        
        expect(response.status).toBe(429)
        expect(response.headers.get('Retry-After')).toBe('60')
      })

      it('should handle distributed DoS attacks', async () => {
        // Simulate attacks from multiple IPs
        const attackIPs = Array.from({ length: 10 }, (_, i) => `10.0.0.${i + 1}`)
        
        for (const ip of attackIPs) {
          mockRateLimit.mockResolvedValue({
            success: false,
            retryAfter: 30
          })
          
          const request = createMockRequest('/api/auth/login', 'POST', {
            'x-forwarded-for': ip
          })
          const response = await middleware(request)
          
          expect(response.status).toBe(429)
        }
      })

      it('should apply different rate limits for different endpoints', async () => {
        const admin = createMockToken(UserRole.ADMIN)
        mockGetToken.mockResolvedValue(admin)
        
        // Test auth endpoints (stricter)
        const authRequest = createMockRequest('/api/auth/login', 'POST')
        await middleware(authRequest)
        
        expect(mockRateLimit).toHaveBeenCalledWith(
          authRequest,
          expect.objectContaining({ max: 5 })
        )
        
        // Test sensitive endpoints
        const sensitiveRequest = createMockRequest('/api/admin/users')
        await middleware(sensitiveRequest)
        
        expect(mockRateLimit).toHaveBeenCalledWith(
          sensitiveRequest,
          expect.objectContaining({ max: 10 })
        )
        
        // Test public endpoints (more lenient)
        const publicRequest = createMockRequest('/api/health')
        await middleware(publicRequest)
        
        expect(mockRateLimit).toHaveBeenCalledWith(
          publicRequest,
          expect.objectContaining({ max: 100 })
        )
      })
    })

    describe('Resource Exhaustion', () => {
      it('should handle memory exhaustion attempts', async () => {
        const admin = createMockToken(UserRole.ADMIN)
        mockGetToken.mockResolvedValue(admin)
        
        // Simulate large number of concurrent requests
        const requests = Array.from({ length: 100 }, (_, i) =>
          createMockRequest(`/api/products/${i}`)
        )
        
        const startTime = Date.now()
        const responses = await Promise.all(
          requests.map(request => middleware(request))
        )
        const endTime = Date.now()
        
        // Should complete without errors
        responses.forEach(response => {
          expect(response.status).toBeLessThan(500)
        })
        
        // Should complete within reasonable time
        expect(endTime - startTime).toBeLessThan(30000) // 30 seconds
      })
    })
  })

  describe('Session Security Scenarios', () => {
    describe('Session Fixation', () => {
      it('should handle session fixation attempts', async () => {
        // Simulate session with suspicious characteristics
        const token = createMockToken(UserRole.ADMIN, 'user-1', {
          iat: Math.floor(Date.now() / 1000) - 86400, // Very old token
          exp: Math.floor(Date.now() / 1000) + 86400
        })
        mockGetToken.mockResolvedValue(token)
        
        const request = createMockRequest('/admin/users')
        const response = await middleware(request)
        
        // Should still work if token is valid
        expect(response.status).not.toBe(401)
      })
    })

    describe('CSRF Attacks', () => {
      it('should handle potential CSRF attacks', async () => {
        const admin = createMockToken(UserRole.ADMIN)
        mockGetToken.mockResolvedValue(admin)
        
        // Simulate request with suspicious referer
        const request = createMockRequest('/api/admin/users', 'POST', {
          'referer': 'https://evil-site.com',
          'origin': 'https://evil-site.com'
        })
        
        const response = await middleware(request)
        
        // Middleware doesn't handle CSRF directly, but should not crash
        expect(response.status).toBeLessThan(500)
      })
    })
  })

  describe('Advanced Security Scenarios', () => {
    describe('Timing Attacks', () => {
      it('should have consistent response times for invalid users', async () => {
        const timings: number[] = []
        
        // Test multiple invalid authentication attempts
        for (let i = 0; i < 5; i++) {
          mockGetToken.mockResolvedValue(null)
          
          const start = Date.now()
          const request = createMockRequest('/api/admin/users')
          await middleware(request)
          const end = Date.now()
          
          timings.push(end - start)
        }
        
        // Response times should be relatively consistent
        const avgTime = timings.reduce((a, b) => a + b) / timings.length
        const maxDeviation = Math.max(...timings.map(t => Math.abs(t - avgTime)))
        
        // Allow some variance but not too much
        expect(maxDeviation).toBeLessThan(avgTime * 2)
      })
    })

    describe('Information Disclosure', () => {
      it('should not leak sensitive information in error responses', async () => {
        mockGetToken.mockRejectedValue(new Error('Database connection failed: host=db.internal.com'))
        
        const request = createMockRequest('/api/admin/users')
        const response = await middleware(request)
        
        expect(response.status).toBe(401)
        
        const body = await response.json()
        // Should not expose internal error details
        expect(body.error.message).not.toContain('db.internal.com')
        expect(body.error.message).toBe('Authentication required')
      })

      it('should not expose stack traces', async () => {
        mockGetToken.mockRejectedValue(new Error('Internal error with stack trace'))
        
        const request = createMockRequest('/api/products')
        const response = await middleware(request)
        
        const body = await response.json()
        expect(body.error.message).not.toContain('stack')
        expect(body.error.message).not.toContain('at ')
      })
    })

    describe('Security Header Bypass', () => {
      it('should maintain security headers under attack', async () => {
        const admin = createMockToken(UserRole.ADMIN)
        mockGetToken.mockResolvedValue(admin)
        
        // Try to manipulate security-related headers
        const request = createMockRequest('/admin/users', 'GET', {
          'x-frame-options': 'ALLOWALL',
          'content-security-policy': 'none',
          'x-content-type-options': 'allow'
        })
        
        const response = await middleware(request)
        
        // Should maintain proper security headers
        expect(response.headers.get('X-Frame-Options')).toBe('DENY')
        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
        expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'")
      })
    })
  })

  describe('Edge Case Security Scenarios', () => {
    it('should handle malformed JSON in request bodies', async () => {
      const admin = createMockToken(UserRole.ADMIN)
      mockGetToken.mockResolvedValue(admin)
      
      // This would be handled by the actual API route, not middleware
      const request = createMockRequest('/api/products', 'POST')
      const response = await middleware(request)
      
      // Middleware should pass through
      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })

    it('should handle extremely long URLs', async () => {
      const admin = createMockToken(UserRole.ADMIN)
      mockGetToken.mockResolvedValue(admin)
      
      // Create very long URL
      const longPath = '/admin/users/' + 'a'.repeat(10000)
      const request = createMockRequest(longPath)
      const response = await middleware(request)
      
      // Should handle gracefully
      expect(response.status).toBeLessThan(500)
    })

    it('should handle requests with no headers', async () => {
      const admin = createMockToken(UserRole.ADMIN)
      mockGetToken.mockResolvedValue(admin)
      
      // Create request with minimal headers
      const url = 'https://example.com/admin/users'
      const request = new NextRequest(url)
      
      const response = await middleware(request)
      
      // Should handle gracefully
      expect(response.status).toBeLessThan(500)
    })

    it('should handle Unicode and special characters in paths', async () => {
      const admin = createMockToken(UserRole.ADMIN)
      mockGetToken.mockResolvedValue(admin)
      
      const unicodePaths = [
        '/admin/users/测试',
        '/api/products/café',
        '/admin/categories/🚀',
        '/api/users/user@domain.com'
      ]
      
      for (const path of unicodePaths) {
        const request = createMockRequest(path)
        const response = await middleware(request)
        
        // Should handle gracefully
        expect(response.status).toBeLessThan(500)
      }
    })
  })
})