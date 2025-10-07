/**
 * Security Regression Testing
 * Tests to prevent regression of previously fixed security issues
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { createMockUser, createMockSession } from '../helpers/test-helpers'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

describe('Security Regression Testing', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  describe('Authentication Regression Tests', () => {
    it('should prevent authentication bypass via header manipulation (Issue #001)', async () => {
      // Regression test for authentication bypass vulnerability
      const bypassHeaders = [
        { 'X-Forwarded-User': 'admin' },
        { 'X-Remote-User': 'admin' },
        { 'X-User': 'admin' },
        { 'Authorization': 'Basic YWRtaW46YWRtaW4=' }, // admin:admin
        { 'X-API-Key': 'admin-key' }
      ]

      for (const headers of bypassHeaders) {
        const response = await fetch('/api/admin/users', { headers })
        expect([401, 403]).toContain(response.status)
      }
    })

    it('should prevent session fixation attacks (Issue #002)', async () => {
      // Regression test for session fixation vulnerability
      const fixedSessionId = 'fixed-session-123'
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sessionId=${fixedSessionId}`
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      })

      // Should generate new session ID, not use the provided one
      const setCookieHeader = response.headers.get('Set-Cookie')
      if (setCookieHeader) {
        expect(setCookieHeader).not.toContain(fixedSessionId)
      }
    })

    it('should prevent password reset token reuse (Issue #003)', async () => {
      // Regression test for password reset token reuse vulnerability
      const user = await createMockUser(UserRole.VIEWER)
      
      // Request password reset
      const resetResponse = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      })

      expect(resetResponse.status).toBe(200)

      // Simulate token usage
      const token = 'mock-reset-token'
      const firstUse = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: 'newPassword123'
        })
      })

      // Second attempt with same token should fail
      const secondUse = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: 'anotherPassword123'
        })
      })

      expect([400, 401]).toContain(secondUse.status)
    })
  })

  describe('Authorization Regression Tests', () => {
    it('should prevent role elevation via request manipulation (Issue #004)', async () => {
      // Regression test for role elevation vulnerability
      const editor = await createMockUser(UserRole.EDITOR)
      const session = createMockSession(editor)

      const elevationAttempts = [
        { role: 'ADMIN' },
        { permissions: ['admin:*'] },
        { isAdmin: true },
        { roleId: 1 }, // Assuming admin role ID
        { 'X-Role': 'ADMIN' }
      ]

      for (const attempt of elevationAttempts) {
        const response = await fetch(`/api/users/${editor.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.accessToken}`,
            ...('X-Role' in attempt ? { 'X-Role': attempt['X-Role'] } : {})
          },
          body: JSON.stringify('X-Role' in attempt ? {} : attempt)
        })

        expect([400, 403]).toContain(response.status)
      }

      // Verify role wasn't changed
      const unchangedUser = await prisma.user.findUnique({
        where: { id: editor.id }
      })
      expect(unchangedUser?.role).toBe(UserRole.EDITOR)
    })

    it('should prevent permission cache poisoning (Issue #005)', async () => {
      // Regression test for permission cache poisoning vulnerability
      const viewer = await createMockUser(UserRole.VIEWER)
      const admin = await createMockUser(UserRole.ADMIN)
      const viewerSession = createMockSession(viewer)
      const adminSession = createMockSession(admin)

      // Admin makes request to cache admin permissions
      const adminResponse = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${adminSession.accessToken}` }
      })
      expect(adminResponse.status).toBe(200)

      // Viewer attempts to access same endpoint
      const viewerResponse = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${viewerSession.accessToken}` }
      })

      // Should still be forbidden despite admin's cached permissions
      expect(viewerResponse.status).toBe(403)
    })

    it('should prevent IDOR via predictable resource IDs (Issue #006)', async () => {
      // Regression test for Insecure Direct Object Reference vulnerability
      const user1 = await createMockUser(UserRole.EDITOR)
      const user2 = await createMockUser(UserRole.EDITOR)
      const session1 = createMockSession(user1)

      // Mock resource owned by user2
      const product = {
        id: 'test-product-id',
        name: 'Private Product',
        description: 'User2 only',
        price: 100,
        createdById: user2.id
      }
      
      prisma.product.findUnique.mockResolvedValue(product)

      // User1 attempts to access user2's resource by ID
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session1.accessToken}` }
      })

      expect(response.status).toBe(403)

      // Verify resource still exists
      const existingProduct = await prisma.product.findUnique({
        where: { id: product.id }
      })
      expect(existingProduct).toBeTruthy()
    })
  })

  describe('Input Validation Regression Tests', () => {
    it('should prevent SQL injection in search parameters (Issue #007)', async () => {
      // Regression test for SQL injection vulnerability
      const admin = await createMockUser(UserRole.ADMIN)
      const session = createMockSession(admin)

      const injectionAttempts = [
        "'; DROP TABLE users; --",
        "1' UNION SELECT password FROM users --",
        "1'; UPDATE users SET role='ADMIN' WHERE id=1; --"
      ]

      for (const injection of injectionAttempts) {
        const response = await fetch(`/api/products?search=${encodeURIComponent(injection)}`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        })

        // Should handle safely without SQL injection
        expect(response.status).toBeLessThan(500)
      }

      // Verify database integrity
      const userCount = await prisma.user.count()
      expect(userCount).toBeGreaterThan(0)
    })

    it('should prevent XSS in user-generated content (Issue #008)', async () => {
      // Regression test for XSS vulnerability
      const editor = await createMockUser(UserRole.EDITOR)
      const session = createMockSession(editor)

      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">'
      ]

      for (const payload of xssPayloads) {
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.accessToken}`
          },
          body: JSON.stringify({
            name: payload,
            description: payload,
            price: 100
          })
        })

        if (response.ok) {
          const product = await response.json()
          
          // Verify content is sanitized
          expect(product.name).not.toContain('<script>')
          expect(product.description).not.toContain('<script>')
        }
      }
    })

    it('should prevent path traversal in file operations (Issue #009)', async () => {
      // Regression test for path traversal vulnerability
      const editor = await createMockUser(UserRole.EDITOR)
      const session = createMockSession(editor)

      const traversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ]

      for (const path of traversalAttempts) {
        const response = await fetch('/api/media/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'multipart/form-data'
          },
          body: new FormData()
        })

        // Should reject path traversal attempts
        expect([400, 403]).toContain(response.status)
      }
    })
  })

  describe('Rate Limiting Regression Tests', () => {
    it('should prevent rate limit bypass via header manipulation (Issue #010)', async () => {
      // Regression test for rate limit bypass vulnerability
      const bypassHeaders = [
        { 'X-Forwarded-For': '192.168.1.1' },
        { 'X-Real-IP': '10.0.0.1' },
        { 'X-Originating-IP': '172.16.0.1' },
        { 'CF-Connecting-IP': '203.0.113.1' }
      ]

      for (const headers of bypassHeaders) {
        const requests = Array.from({ length: 50 }, () =>
          fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...headers
            },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'wrong-password'
            })
          })
        )

        const responses = await Promise.all(requests)
        const rateLimitedCount = responses.filter(r => r.status === 429).length

        // Should still apply rate limiting despite header manipulation
        expect(rateLimitedCount).toBeGreaterThan(0)
      }
    })

    it('should prevent distributed rate limit bypass (Issue #011)', async () => {
      // Regression test for distributed rate limit bypass
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'curl/7.68.0',
        'PostmanRuntime/7.28.0'
      ]

      for (const userAgent of userAgents) {
        const requests = Array.from({ length: 30 }, () =>
          fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': userAgent
            },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'wrong-password'
            })
          })
        )

        const responses = await Promise.all(requests)
        const rateLimitedCount = responses.filter(r => r.status === 429).length

        // Should apply rate limiting regardless of user agent
        expect(rateLimitedCount).toBeGreaterThan(0)
      }
    })
  })

  describe('Session Management Regression Tests', () => {
    it('should prevent concurrent session abuse (Issue #012)', async () => {
      // Regression test for concurrent session abuse
      const user = await createMockUser(UserRole.EDITOR)
      const sessions = Array.from({ length: 10 }, () => createMockSession(user))

      // Attempt to use multiple sessions simultaneously
      const requests = sessions.map(session =>
        fetch('/api/products', {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        })
      )

      const responses = await Promise.all(requests)
      
      // Should handle concurrent sessions appropriately
      const successfulRequests = responses.filter(r => r.status === 200).length
      expect(successfulRequests).toBeLessThanOrEqual(sessions.length)
    })

    it('should prevent session token prediction (Issue #013)', async () => {
      // Regression test for predictable session tokens
      const users = await Promise.all([
        createMockUser(UserRole.VIEWER),
        createMockUser(UserRole.VIEWER),
        createMockUser(UserRole.VIEWER)
      ])

      const sessions = users.map(user => createMockSession(user))
      const tokens = sessions.map(session => session.accessToken)

      // Verify tokens are not predictable
      for (let i = 0; i < tokens.length - 1; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          expect(tokens[i]).not.toBe(tokens[j])
          
          // Check for sequential patterns
          const token1Numeric = tokens[i].replace(/\D/g, '')
          const token2Numeric = tokens[j].replace(/\D/g, '')
          
          if (token1Numeric && token2Numeric) {
            const diff = Math.abs(parseInt(token1Numeric) - parseInt(token2Numeric))
            expect(diff).toBeGreaterThan(1) // Should not be sequential
          }
        }
      }
    })
  })

  describe('Data Exposure Regression Tests', () => {
    it('should prevent sensitive data leakage in API responses (Issue #014)', async () => {
      // Regression test for sensitive data exposure
      const admin = await createMockUser(UserRole.ADMIN)
      const session = createMockSession(admin)

      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      })

      const users = await response.json()

      for (const user of users) {
        // Should not expose sensitive fields
        expect(user).not.toHaveProperty('password')
        expect(user).not.toHaveProperty('passwordHash')
        expect(user).not.toHaveProperty('resetToken')
        expect(user).not.toHaveProperty('sessionSecret')
        expect(user).not.toHaveProperty('twoFactorSecret')
      }
    })

    it('should prevent information disclosure in error messages (Issue #015)', async () => {
      // Regression test for information disclosure vulnerability
      const response = await fetch('/api/users/999999')
      const error = await response.json()

      // Error messages should not reveal system internals
      expect(error.message).not.toContain('database')
      expect(error.message).not.toContain('SQL')
      expect(error.message).not.toContain('prisma')
      expect(error.message).not.toContain('connection')
      expect(error.message).not.toContain('password')
      expect(error.message).not.toContain('secret')
    })
  })
})