/**
 * CSRF Protection Tests
 * Tests for CSRF token generation, validation, and middleware
 */

import { jest } from '@jest/globals'
import { CSRFProtection, generateCSRFToken, validateCSRFToken, csrfMiddleware } from '@/lib/csrf-protection'

// Mock SecurityService
jest.mock('@/lib/security', () => ({
  SecurityService: {
    getInstance: () => ({
      logSecurityEvent: jest.fn().mockResolvedValue(undefined)
    })
  }
}))

// Mock NextRequest class for testing
class MockNextRequest {
  url: string
  method: string
  headers: Map<string, string>

  constructor(url: string, options: any = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Map()
    
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        this.headers.set(key, value as string)
      })
    }
  }

  get(key: string) {
    return this.headers.get(key)
  }

  cookies = {
    get: jest.fn().mockReturnValue(undefined)
  }
}

// Mock NextRequest for testing
function createMockRequest(options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  cookies?: Record<string, string>
}): any {
  const { method = 'GET', url = 'http://localhost:3000/api/test', headers = {}, cookies = {} } = options
  
  // Convert cookies to cookie header format
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')
  
  if (cookieHeader) {
    headers.cookie = cookieHeader
  }
  
  const request = new MockNextRequest(url, {
    method,
    headers,
  })

  // Mock cookies.get method
  request.cookies.get = jest.fn().mockImplementation((name: string) => {
    if (cookies[name]) {
      return { value: cookies[name] }
    }
    return undefined
  })
  
  return request
}

describe('CSRFProtection', () => {
  beforeEach(() => {
    // Clear any existing tokens
    CSRFProtection['tokens'].clear()
  })

  describe('generateToken', () => {
    it('should generate a valid token', () => {
      const sessionId = 'test-session-123'
      const userAgent = 'Mozilla/5.0 Test Browser'
      const ipAddress = '192.168.1.1'
      
      const token = CSRFProtection.generateToken(sessionId, userAgent, ipAddress)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
      expect(token).toContain('.') // Should have signature separator
    })

    it('should generate unique tokens', () => {
      const sessionId = 'test-session'
      const token1 = CSRFProtection.generateToken(sessionId)
      const token2 = CSRFProtection.generateToken(sessionId)
      
      expect(token1).not.toBe(token2)
    })

    it('should store token data internally', () => {
      const sessionId = 'test-session'
      const userAgent = 'Test Browser'
      const ipAddress = '127.0.0.1'
      
      CSRFProtection.generateToken(sessionId, userAgent, ipAddress)
      
      const stats = CSRFProtection.getStats()
      expect(stats.totalTokens).toBe(1)
      expect(stats.tokensPerSession[sessionId]).toBe(1)
    })
  })

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const sessionId = 'test-session'
      const token = CSRFProtection.generateToken(sessionId)
      
      const result = await CSRFProtection.validateToken(token, sessionId)
      expect(result.valid).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should reject missing token', async () => {
      const result = await CSRFProtection.validateToken('', 'session')
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Token missing')
    })

    it('should reject malformed token', async () => {
      const result = await CSRFProtection.validateToken('invalid-token', 'session')
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Invalid token format')
    })

    it('should reject token with invalid signature', async () => {
      const sessionId = 'test-session'
      const validToken = CSRFProtection.generateToken(sessionId)
      
      // Tamper with the token
      const [payload] = validToken.split('.')
      const tamperedToken = `${payload}.invalid-signature`
      
      const result = await CSRFProtection.validateToken(tamperedToken, sessionId)
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Invalid signature')
    })

    it('should reject token for wrong session', async () => {
      const sessionId = 'test-session'
      const token = CSRFProtection.generateToken(sessionId)
      
      const result = await CSRFProtection.validateToken(token, 'different-session')
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Session mismatch')
    })

    it('should reject expired token', async () => {
      const sessionId = 'test-session'
      const token = CSRFProtection.generateToken(sessionId)
      
      // Find and expire the token
      const tokenEntries = Array.from(CSRFProtection['tokens'].entries())
      const [tokenId, tokenData] = tokenEntries[0]
      tokenData.expires = Date.now() - 1000 // Expired 1 second ago
      
      const result = await CSRFProtection.validateToken(token, sessionId)
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Token expired')
    })

    it('should validate token with request context', async () => {
      const sessionId = 'test-session'
      const userAgent = 'Test Browser'
      const ipAddress = '192.168.1.1'
      
      const token = CSRFProtection.generateToken(sessionId, userAgent, ipAddress)
      
      const request = createMockRequest({
        headers: { 'user-agent': userAgent }
      })
      
      const result = await CSRFProtection.validateToken(token, sessionId, request)
      expect(result.valid).toBe(true)
    })
  })

  describe('invalidateToken', () => {
    it('should invalidate a specific token', () => {
      const sessionId = 'test-session'
      const token = CSRFProtection.generateToken(sessionId)
      
      const result = CSRFProtection.invalidateToken(token)
      expect(result).toBe(true)
      
      // Verify token is no longer in store
      const stats = CSRFProtection.getStats()
      expect(stats.totalTokens).toBe(0)
    })

    it('should return false for invalid token', () => {
      const result = CSRFProtection.invalidateToken('invalid-token')
      expect(result).toBe(false)
    })
  })

  describe('invalidateSessionTokens', () => {
    it('should invalidate all tokens for a session', () => {
      const sessionId = 'test-session'
      const otherSessionId = 'other-session'
      
      // Generate multiple tokens for the same session
      CSRFProtection.generateToken(sessionId)
      CSRFProtection.generateToken(sessionId)
      CSRFProtection.generateToken(otherSessionId)
      
      const count = CSRFProtection.invalidateSessionTokens(sessionId)
      expect(count).toBe(2)
      
      // Verify only the other session token remains
      const stats = CSRFProtection.getStats()
      expect(stats.totalTokens).toBe(1)
      expect(stats.tokensPerSession[otherSessionId]).toBe(1)
      expect(stats.tokensPerSession[sessionId]).toBeUndefined()
    })
  })

  describe('getTokenFromRequest', () => {
    it('should get token from x-csrf-token header', () => {
      const token = 'test-token-123'
      const request = createMockRequest({
        headers: { 'x-csrf-token': token }
      })
      
      const result = CSRFProtection.getTokenFromRequest(request)
      expect(result).toBe(token)
    })

    it('should get token from cookie as fallback', () => {
      const token = 'test-token-123'
      const request = createMockRequest({
        cookies: { 'csrf-token': token }
      })
      
      const result = CSRFProtection.getTokenFromRequest(request)
      expect(result).toBe(token)
    })

    it('should prefer header over cookie', () => {
      const headerToken = 'header-token'
      const cookieToken = 'cookie-token'
      
      const request = createMockRequest({
        headers: { 'x-csrf-token': headerToken },
        cookies: { 'csrf-token': cookieToken }
      })
      
      const result = CSRFProtection.getTokenFromRequest(request)
      expect(result).toBe(headerToken)
    })

    it('should return null if no token found', () => {
      const request = createMockRequest({})
      
      const result = CSRFProtection.getTokenFromRequest(request)
      expect(result).toBeNull()
    })
  })

  describe('middleware', () => {
    it('should allow GET requests by default', async () => {
      const middleware = CSRFProtection.middleware()
      const request = createMockRequest({ method: 'GET' })
      
      const result = await middleware(request)
      expect(result).toBeNull() // null means continue processing
    })

    it('should require CSRF token for POST requests', async () => {
      const middleware = CSRFProtection.middleware()
      const request = createMockRequest({ method: 'POST' })
      
      const result = await middleware(request)
      expect(result).not.toBeNull()
      expect(result?.status).toBe(403)
    })

    it('should validate CSRF token for POST requests', async () => {
      const sessionId = 'test-session'
      const token = CSRFProtection.generateToken(sessionId)
      
      const middleware = CSRFProtection.middleware()
      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-csrf-token': token,
          'x-session-id': sessionId
        }
      })
      
      const result = await middleware(request)
      expect(result).toBeNull() // Should allow the request
    })

    it('should reject invalid CSRF token', async () => {
      const middleware = CSRFProtection.middleware()
      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-csrf-token': 'invalid-token',
          'x-session-id': 'test-session'
        }
      })
      
      const result = await middleware(request)
      expect(result).not.toBeNull()
      expect(result?.status).toBe(403)
    })

    it('should skip specified paths', async () => {
      const middleware = CSRFProtection.middleware({
        skipPaths: ['/api/public']
      })
      
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/public/test'
      })
      
      const result = await middleware(request)
      expect(result).toBeNull() // Should skip CSRF check
    })

    it('should validate double-submit cookie when required', async () => {
      const sessionId = 'test-session'
      const token = CSRFProtection.generateToken(sessionId)
      
      const middleware = CSRFProtection.middleware({
        requireDoubleSubmit: true
      })
      
      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-csrf-token': token,
          'x-session-id': sessionId
        },
        cookies: {
          'csrf-token': token
        }
      })
      
      const result = await middleware(request)
      expect(result).toBeNull() // Should allow the request
    })

    it('should reject mismatched double-submit cookie', async () => {
      const sessionId = 'test-session'
      const token = CSRFProtection.generateToken(sessionId)
      
      const middleware = CSRFProtection.middleware({
        requireDoubleSubmit: true
      })
      
      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-csrf-token': token,
          'x-session-id': sessionId
        },
        cookies: {
          'csrf-token': 'different-token'
        }
      })
      
      const result = await middleware(request)
      expect(result).not.toBeNull()
      expect(result?.status).toBe(403)
    })
  })

  describe('createTokenResponse', () => {
    it('should create a valid token response', () => {
      const sessionId = 'test-session'
      const request = createMockRequest({
        headers: { 'user-agent': 'Test Browser' }
      })
      
      const response = CSRFProtection.createTokenResponse(sessionId, request)
      
      expect(response.status).toBe(200)
      
      // Check if response contains token
      response.json().then(data => {
        expect(data.token).toBeDefined()
        expect(data.expires).toBeDefined()
        expect(data.success).toBe(true)
      })
    })

    it('should set secure cookie', () => {
      const sessionId = 'test-session'
      const response = CSRFProtection.createTokenResponse(sessionId)
      
      const setCookieHeader = response.headers.get('set-cookie')
      expect(setCookieHeader).toContain('csrf-token=')
      expect(setCookieHeader).toContain('SameSite=Strict')
    })
  })

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      const session1 = 'session-1'
      const session2 = 'session-2'
      
      // Generate tokens for different sessions
      CSRFProtection.generateToken(session1)
      CSRFProtection.generateToken(session1)
      CSRFProtection.generateToken(session2)
      
      const stats = CSRFProtection.getStats()
      
      expect(stats.totalTokens).toBe(3)
      expect(stats.tokensPerSession[session1]).toBe(2)
      expect(stats.tokensPerSession[session2]).toBe(1)
      expect(stats.oldestToken).toBeDefined()
      expect(stats.newestToken).toBeDefined()
    })

    it('should count expired tokens', () => {
      const sessionId = 'test-session'
      CSRFProtection.generateToken(sessionId)
      
      // Expire the token
      const tokenEntries = Array.from(CSRFProtection['tokens'].entries())
      const [, tokenData] = tokenEntries[0]
      tokenData.expires = Date.now() - 1000
      
      const stats = CSRFProtection.getStats()
      expect(stats.expiredTokens).toBe(1)
    })
  })

  describe('convenience functions', () => {
    it('should export convenience functions', () => {
      expect(generateCSRFToken).toBeDefined()
      expect(validateCSRFToken).toBeDefined()
      expect(csrfMiddleware).toBeDefined()
    })

    it('should work as expected', () => {
      const sessionId = 'test-session'
      const token = generateCSRFToken(sessionId)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      
      validateCSRFToken(token, sessionId).then(result => {
        expect(result.valid).toBe(true)
      })
    })
  })
})