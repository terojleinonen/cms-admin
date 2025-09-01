/**
 * Security Middleware Tests
 * Comprehensive tests for security middleware functionality
 */

import { NextRequest } from 'next/server'
import { withSecurity, generateCSRFToken, blockIP, unblockIP } from '@/lib/security-middleware'
import { z } from 'zod'

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

const mockGetServerSession = require('next-auth').getServerSession

describe('Security Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const securityMiddleware = withSecurity({
        rateLimit: { windowMs: 60000, maxRequests: 5 }
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })

      const response = await securityMiddleware(request, mockHandler)
      
      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalled()
    })

    it('should block requests exceeding rate limit', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const securityMiddleware = withSecurity({
        rateLimit: { windowMs: 60000, maxRequests: 1 }
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: { 'x-forwarded-for': '192.168.1.2' }
      })

      // First request should pass
      await securityMiddleware(request, mockHandler)
      
      // Second request should be blocked
      const response = await securityMiddleware(request, mockHandler)
      
      expect(response.status).toBe(429)
      const data = await response.json()
      expect(data.error).toBe('Rate limit exceeded')
    })
  })

  describe('Authentication', () => {
    it('should allow requests when authentication not required', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const securityMiddleware = withSecurity({})

      const request = new NextRequest('http://localhost:3000/api/test')

      const response = await securityMiddleware(request, mockHandler)
      
      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalled()
    })

    it('should block unauthenticated requests when authentication required', async () => {
      mockGetServerSession.mockResolvedValue(null)
      
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const securityMiddleware = withSecurity({
        requireAuth: true
      })

      const request = new NextRequest('http://localhost:3000/api/test')

      const response = await securityMiddleware(request, mockHandler)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should allow authenticated requests with correct role', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'ADMIN' }
      })
      
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const securityMiddleware = withSecurity({
        requireAuth: true,
        allowedRoles: ['ADMIN']
      })

      const request = new NextRequest('http://localhost:3000/api/test')

      const response = await securityMiddleware(request, mockHandler)
      
      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalled()
    })

    it('should block authenticated requests with incorrect role', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'EDITOR' }
      })
      
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const securityMiddleware = withSecurity({
        requireAuth: true,
        allowedRoles: ['ADMIN']
      })

      const request = new NextRequest('http://localhost:3000/api/test')

      const response = await securityMiddleware(request, mockHandler)
      
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Insufficient permissions')
      expect(mockHandler).not.toHaveBeenCalled()
    })
  })

  describe('Input Validation', () => {
    it('should validate input with Zod schema', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email()
      })
      
      const securityMiddleware = withSecurity({
        inputValidation: schema
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com'
        })
      })

      const response = await securityMiddleware(request, mockHandler)
      
      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalled()
    })

    it('should reject invalid input', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email()
      })
      
      const securityMiddleware = withSecurity({
        inputValidation: schema
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: '',
          email: 'invalid-email'
        })
      })

      const response = await securityMiddleware(request, mockHandler)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Input validation failed')
      expect(mockHandler).not.toHaveBeenCalled()
    })
  })

  describe('CSRF Protection', () => {
    it('should generate valid CSRF token', () => {
      const sessionId = 'test-session-id'
      const token = generateCSRFToken(sessionId)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('should validate CSRF token for POST requests', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'test-session-id' }
      })

      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const securityMiddleware = withSecurity({
        csrfProtection: true
      })

      const token = generateCSRFToken('test-session-id')
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 
          'content-type': 'application/json',
          'x-csrf-token': token
        },
        body: JSON.stringify({ data: 'test' })
      })

      const response = await securityMiddleware(request, mockHandler)
      
      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalled()
    })

    it('should reject POST requests without CSRF token', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'test-session-id' }
      })

      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const securityMiddleware = withSecurity({
        csrfProtection: true
      })
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: 'test' })
      })

      const response = await securityMiddleware(request, mockHandler)
      
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('CSRF token validation failed')
      expect(mockHandler).not.toHaveBeenCalled()
    })
  })

  describe('IP Blocking', () => {
    it('should block requests from blocked IPs', async () => {
      const blockedIP = '192.168.1.100'
      blockIP(blockedIP)

      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const securityMiddleware = withSecurity({})

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': blockedIP }
      })

      const response = await securityMiddleware(request, mockHandler)
      
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should allow requests after IP is unblocked', async () => {
      const testIP = '192.168.1.101'
      blockIP(testIP)
      unblockIP(testIP)

      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const securityMiddleware = withSecurity({})

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': testIP }
      })

      const response = await securityMiddleware(request, mockHandler)
      
      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalled()
    })
  })

  describe('Security Headers', () => {
    it('should add security headers to response', async () => {
      const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))
      const securityMiddleware = withSecurity({})

      const request = new NextRequest('http://localhost:3000/api/test')

      const response = await securityMiddleware(request, mockHandler)
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000')
      expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'")
    })
  })

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error('Handler error'))
      const securityMiddleware = withSecurity({
        logSecurity: true
      })

      const request = new NextRequest('http://localhost:3000/api/test')

      const response = await securityMiddleware(request, mockHandler)
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Security validation failed')
    })
  })
})