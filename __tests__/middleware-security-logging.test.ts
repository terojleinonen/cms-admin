/**
 * Security Logging Middleware Tests
 * Tests for enhanced security logging, threat detection, and rate limiting
 */

// Mock Next.js server components
const mockNextResponse = {
  next: jest.fn(),
  json: jest.fn(),
  redirect: jest.fn(),
}

const mockNextRequest = jest.fn()

jest.mock('next/server', () => ({
  NextResponse: mockNextResponse,
  NextRequest: mockNextRequest,
}))

// Mock dependencies
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}))

jest.mock('../app/lib/preferences-middleware', () => ({
  applyUserPreferences: jest.fn((req, res) => res)
}))

jest.mock('../app/lib/route-permissions', () => ({
  routePermissionResolver: {
    getRoutePermissions: jest.fn(() => []),
    isPublicRoute: jest.fn(() => false),
    requiresAuthOnly: jest.fn(() => false)
  }
}))

jest.mock('../app/lib/rate-limit', () => ({
  rateLimit: jest.fn(() => Promise.resolve({
    success: true,
    limit: 100,
    remaining: 99,
    reset: Date.now() + 900000
  })),
  rateLimitConfigs: {
    public: { limit: 100, windowMs: 900000 },
    sensitive: { limit: 10, windowMs: 300000 }
  },
  createRateLimitHeaders: jest.fn(() => ({
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': '99',
    'X-RateLimit-Reset': '1234567890'
  }))
}))

// Import after mocking
const { getToken } = require('next-auth/jwt')
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>

// Test utilities
function createMockRequest(
  pathname: string,
  options: {
    method?: string
    ip?: string
    userAgent?: string
    headers?: Record<string, string>
  } = {}
) {
  const url = `https://example.com${pathname}`
  const headers = new Map([
    ['x-forwarded-for', options.ip || '192.168.1.1'],
    ['user-agent', options.userAgent || 'test-agent'],
    ...Object.entries(options.headers || {})
  ])

  return {
    nextUrl: { pathname },
    method: options.method || 'GET',
    url,
    headers: {
      get: (key: string) => headers.get(key) || null,
      set: (key: string, value: string) => headers.set(key, value),
      has: (key: string) => headers.has(key),
      delete: (key: string) => headers.delete(key),
      entries: () => headers.entries(),
      keys: () => headers.keys(),
      values: () => headers.values(),
      forEach: (callback: (value: string, key: string) => void) => headers.forEach(callback)
    }
  }
}

function createMockToken(overrides: any = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    role: 'EDITOR',
    ...overrides
  }
}

describe('Security Logging Middleware', () => {
  let consoleSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('Access Logging', () => {
    it('should log successful access to public routes', async () => {
      const { routePermissionResolver } = require('../app/lib/route-permissions')
      routePermissionResolver.isPublicRoute.mockReturnValue(true)

      const request = createMockRequest('/public-page')
      await middleware(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY_LOW] SUCCESS:'),
        expect.stringContaining('"pathname":"/public-page"')
      )
    })

    it('should log unauthorized access attempts', async () => {
      mockGetToken.mockResolvedValue(null)

      const request = createMockRequest('/protected-page')
      await middleware(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY_MEDIUM] UNAUTHORIZED:'),
        expect.stringContaining('"pathname":"/protected-page"')
      )
    })

    it('should log forbidden access attempts with high severity', async () => {
      const { routePermissionResolver } = require('../app/lib/route-permissions')
      routePermissionResolver.getRoutePermissions.mockReturnValue([
        { resource: 'admin', action: 'manage', scope: 'all' }
      ])

      mockGetToken.mockResolvedValue(createMockToken({ role: 'VIEWER' }))

      const request = createMockRequest('/admin/users')
      await middleware(request)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY_HIGH] FORBIDDEN:'),
        expect.stringContaining('"pathname":"/admin/users"')
      )
    })

    it('should include comprehensive metadata in logs', async () => {
      const { routePermissionResolver } = require('../app/lib/route-permissions')
      routePermissionResolver.isPublicRoute.mockReturnValue(true)

      const request = createMockRequest('/test', {
        method: 'POST',
        ip: '10.0.0.1',
        userAgent: 'Mozilla/5.0'
      })

      await middleware(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY_LOW] SUCCESS:'),
        expect.stringMatching(/"method":"POST".*"ipAddress":"10\.0\.0\.1".*"userAgent":"Mozilla\/5\.0"/)
      )
    })
  })

  describe('Rate Limiting', () => {
    it('should apply rate limiting and log violations', async () => {
      const { rateLimit } = require('../app/lib/rate-limit')
      rateLimit.mockResolvedValue({
        success: false,
        limit: 100,
        remaining: 0,
        reset: Date.now() + 900000,
        retryAfter: 60
      })

      const request = createMockRequest('/api/test')
      const response = await middleware(request)

      expect(response.status).toBe(429)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY_MEDIUM] RATE_LIMITED:'),
        expect.stringContaining('"pathname":"/api/test"')
      )
    })

    it('should use sensitive rate limits for admin routes', async () => {
      const { rateLimit, rateLimitConfigs } = require('../app/lib/rate-limit')
      const { routePermissionResolver } = require('../app/lib/route-permissions')
      
      routePermissionResolver.isPublicRoute.mockReturnValue(true)
      mockGetToken.mockResolvedValue(createMockToken({ role: 'ADMIN' }))

      const request = createMockRequest('/admin/security')
      await middleware(request)

      expect(rateLimit).toHaveBeenCalledWith(request, rateLimitConfigs.sensitive)
    })

    it('should add rate limit headers to successful responses', async () => {
      const { routePermissionResolver } = require('../app/lib/route-permissions')
      routePermissionResolver.isPublicRoute.mockReturnValue(true)

      const request = createMockRequest('/test')
      const response = await middleware(request)

      expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('99')
    })
  })

  describe('IP Blocking', () => {
    it('should block requests from blocked IPs', async () => {
      // Simulate multiple violations to trigger IP blocking
      const request = createMockRequest('/test', { ip: '192.168.1.100' })
      
      // First, simulate multiple failed attempts to get IP blocked
      mockGetToken.mockResolvedValue(null)
      
      // Make multiple requests to trigger blocking
      for (let i = 0; i < 11; i++) {
        await middleware(request)
      }

      // Now the IP should be blocked
      const blockedResponse = await middleware(request)
      expect(blockedResponse.status).toBe(403)
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY_CRITICAL] BLOCKED:'),
        expect.stringContaining('"ipAddress":"192.168.1.100"')
      )
    })
  })

  describe('Threat Detection', () => {
    it('should detect brute force attacks', async () => {
      const request = createMockRequest('/login', { ip: '192.168.1.200' })
      mockGetToken.mockResolvedValue(null)

      // Simulate multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await middleware(request)
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 SECURITY ALERT [HIGH] BRUTE_FORCE_ATTACK:'),
        expect.stringContaining('"message":"Potential brute force attack detected"')
      )
    })

    it('should detect privilege escalation attempts', async () => {
      const { routePermissionResolver } = require('../app/lib/route-permissions')
      routePermissionResolver.getRoutePermissions.mockReturnValue([
        { resource: 'admin', action: 'manage', scope: 'all' }
      ])

      mockGetToken.mockResolvedValue(createMockToken({ role: 'VIEWER' }))

      const request = createMockRequest('/admin/security')
      await middleware(request)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 SECURITY ALERT [CRITICAL] PRIVILEGE_ESCALATION:'),
        expect.stringContaining('"message":"Privilege escalation attempt detected"')
      )
    })

    it('should detect suspicious IP activity', async () => {
      const request = createMockRequest('/test', { ip: '192.168.1.300' })
      mockGetToken.mockResolvedValue(null)

      // Generate multiple violations
      for (let i = 0; i < 6; i++) {
        await middleware(request)
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 SECURITY ALERT [HIGH] SUSPICIOUS_IP_ACTIVITY:'),
        expect.stringContaining('"message":"Suspicious activity from IP address"')
      )
    })

    it('should detect access to sensitive endpoints', async () => {
      mockGetToken.mockResolvedValue(createMockToken({ role: 'EDITOR' }))
      const { routePermissionResolver } = require('../app/lib/route-permissions')
      routePermissionResolver.requiresAuthOnly.mockReturnValue(true)

      const request = createMockRequest('/api/admin/users')
      await middleware(request)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Security Alert [MEDIUM] SENSITIVE_ACCESS:'),
        expect.stringContaining('"endpoint":"/api/admin/users"')
      )
    })
  })

  describe('Security Headers', () => {
    it('should add comprehensive security headers', async () => {
      const { routePermissionResolver } = require('../app/lib/route-permissions')
      routePermissionResolver.isPublicRoute.mockReturnValue(true)

      const request = createMockRequest('/test')
      const response = await middleware(request)

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'")
      expect(response.headers.get('X-Security-Monitored')).toBe('true')
      expect(response.headers.get('X-Timestamp')).toBeTruthy()
    })

    it('should include request ID in response headers', async () => {
      const { routePermissionResolver } = require('../app/lib/route-permissions')
      routePermissionResolver.isPublicRoute.mockReturnValue(true)

      const request = createMockRequest('/test')
      const response = await middleware(request)

      expect(response.headers.get('x-request-id')).toMatch(/^req_\d+_[a-z0-9]+$/)
    })

    it('should remove sensitive server headers', async () => {
      const { routePermissionResolver } = require('../app/lib/route-permissions')
      routePermissionResolver.isPublicRoute.mockReturnValue(true)

      const request = createMockRequest('/test')
      const response = await middleware(request)

      expect(response.headers.get('Server')).toBeNull()
      expect(response.headers.get('X-Powered-By')).toBeNull()
    })
  })

  describe('Error Responses', () => {
    it('should include security information in API error responses', async () => {
      mockGetToken.mockResolvedValue(null)

      const request = createMockRequest('/api/protected')
      const response = await middleware(request)

      expect(response.status).toBe(401)
      
      const body = await response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
      expect(body.error.details.requestId).toBeTruthy()
      expect(body.error.timestamp).toBeTruthy()
    })

    it('should redirect web routes with security context', async () => {
      mockGetToken.mockResolvedValue(null)

      const request = createMockRequest('/protected-page')
      const response = await middleware(request)

      expect(response.status).toBe(307) // Redirect
      
      const location = response.headers.get('location')
      expect(location).toContain('/auth/login')
      expect(location).toContain('callbackUrl=%2Fprotected-page')
      expect(location).toContain('error=unauthorized')
    })
  })

  describe('Performance and Cleanup', () => {
    it('should handle token errors gracefully', async () => {
      mockGetToken.mockRejectedValue(new Error('Token validation failed'))

      const request = createMockRequest('/protected')
      const response = await middleware(request)

      expect(response.status).toBe(401)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get token:',
        expect.any(Error)
      )
    })

    it('should skip middleware for static files', async () => {
      const request = createMockRequest('/_next/static/test.js')
      const response = await middleware(request)

      expect(response.status).toBe(200)
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should handle missing IP addresses gracefully', async () => {
      const request = createMockRequest('/test', { 
        headers: {} // No IP headers
      })
      
      const { routePermissionResolver } = require('../app/lib/route-permissions')
      routePermissionResolver.isPublicRoute.mockReturnValue(true)

      await middleware(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY_LOW] SUCCESS:'),
        expect.stringContaining('"ipAddress":"unknown"')
      )
    })
  })

  describe('Integration with Existing Systems', () => {
    it('should work with route permission resolver', async () => {
      const { routePermissionResolver } = require('../app/lib/route-permissions')
      routePermissionResolver.getRoutePermissions.mockReturnValue([
        { resource: 'products', action: 'read', scope: 'all' }
      ])

      mockGetToken.mockResolvedValue(createMockToken({ role: 'EDITOR' }))

      const request = createMockRequest('/products')
      const response = await middleware(request)

      expect(response.status).toBe(200)
      expect(routePermissionResolver.getRoutePermissions).toHaveBeenCalledWith('/products', 'GET')
    })

    it('should apply user preferences for non-API routes', async () => {
      const { applyUserPreferences } = require('../app/lib/preferences-middleware')
      const { routePermissionResolver } = require('../app/lib/route-permissions')
      
      routePermissionResolver.isPublicRoute.mockReturnValue(true)

      const request = createMockRequest('/dashboard')
      await middleware(request)

      expect(applyUserPreferences).toHaveBeenCalled()
    })

    it('should not apply user preferences for API routes', async () => {
      const { applyUserPreferences } = require('../app/lib/preferences-middleware')
      const { routePermissionResolver } = require('../app/lib/route-permissions')
      
      routePermissionResolver.isPublicRoute.mockReturnValue(true)

      const request = createMockRequest('/api/test')
      await middleware(request)

      expect(applyUserPreferences).not.toHaveBeenCalled()
    })
  })
})