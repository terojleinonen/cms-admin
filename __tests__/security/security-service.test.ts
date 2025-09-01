/**
 * Security Service Tests
 * Tests for the enhanced security monitoring and threat detection service
 */

import { SecurityService } from '@/lib/security'
import { PrismaClient } from '@prisma/client'

// Mock Prisma
const mockPrisma = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn()
  }
} as unknown as PrismaClient

describe('SecurityService', () => {
  let securityService: SecurityService

  beforeEach(() => {
    jest.clearAllMocks()
    securityService = new SecurityService(mockPrisma)
  })

  describe('Event Logging', () => {
    it('should log security events', async () => {
      mockPrisma.auditLog.create = jest.fn().mockResolvedValue({})

      const event = await securityService.logSecurityEvent(
        'login_failed',
        'medium',
        'Failed login attempt',
        '192.168.1.1',
        { attempts: 1 },
        'user123',
        'Mozilla/5.0'
      )

      expect(event).toBeDefined()
      expect(event.type).toBe('login_failed')
      expect(event.severity).toBe('medium')
      expect(event.message).toBe('Failed login attempt')
      expect(event.ipAddress).toBe('192.168.1.1')
      expect(event.userId).toBe('user123')
      expect(mockPrisma.auditLog.create).toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.auditLog.create = jest.fn().mockRejectedValue(new Error('DB Error'))

      const event = await securityService.logSecurityEvent(
        'login_failed',
        'medium',
        'Failed login attempt',
        '192.168.1.1'
      )

      expect(event).toBeDefined()
      expect(event.type).toBe('login_failed')
    })
  })

  describe('IP Blocking', () => {
    it('should block IP addresses', () => {
      const ip = '192.168.1.100'
      securityService.blockIP(ip, 'Test block')

      expect(securityService.isIPBlocked(ip)).toBe(true)
    })

    it('should unblock IP addresses', () => {
      const ip = '192.168.1.101'
      securityService.blockIP(ip, 'Test block')
      securityService.unblockIP(ip)

      expect(securityService.isIPBlocked(ip)).toBe(false)
    })
  })

  describe('Threat Detection', () => {
    it('should track failed login attempts', async () => {
      const ip = '192.168.1.200'
      
      // Simulate multiple failed login attempts
      for (let i = 0; i < 3; i++) {
        await securityService.logSecurityEvent(
          'login_failed',
          'medium',
          'Failed login attempt',
          ip,
          { attempt: i + 1 }
        )
      }

      // IP should not be blocked yet (threshold is 10)
      expect(securityService.isIPBlocked(ip)).toBe(false)
    })

    it('should auto-block IPs after threshold', async () => {
      const ip = '192.168.1.201'
      
      // Simulate many failed login attempts
      for (let i = 0; i < 11; i++) {
        await securityService.logSecurityEvent(
          'login_failed',
          'medium',
          'Failed login attempt',
          ip,
          { attempt: i + 1 }
        )
      }

      // IP should be blocked after exceeding threshold
      expect(securityService.isIPBlocked(ip)).toBe(true)
    })

    it('should reset failed attempts on successful login', async () => {
      const userId = 'user123'
      const ip = '192.168.1.202'
      
      // Failed attempts
      for (let i = 0; i < 3; i++) {
        await securityService.logSecurityEvent(
          'login_failed',
          'medium',
          'Failed login attempt',
          ip,
          { attempt: i + 1 },
          userId
        )
      }

      // Successful login should reset counter
      await securityService.logSecurityEvent(
        'login_success',
        'low',
        'Successful login',
        ip,
        {},
        userId
      )

      // Additional failed attempts should start from 0
      await securityService.logSecurityEvent(
        'login_failed',
        'medium',
        'Failed login attempt',
        ip,
        { attempt: 1 },
        userId
      )

      expect(securityService.isIPBlocked(ip)).toBe(false)
    })
  })

  describe('CSRF Token Management', () => {
    it('should generate CSRF tokens', () => {
      const sessionId = 'test-session'
      const token = securityService.generateCSRFToken(sessionId)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3) // token.timestamp.signature
    })

    it('should validate valid CSRF tokens', () => {
      const sessionId = 'test-session'
      const token = securityService.generateCSRFToken(sessionId)

      const isValid = securityService.validateCSRFToken(sessionId, token)
      expect(isValid).toBe(true)
    })

    it('should reject invalid CSRF tokens', () => {
      const sessionId = 'test-session'
      const invalidToken = 'invalid.token.signature'

      const isValid = securityService.validateCSRFToken(sessionId, invalidToken)
      expect(isValid).toBe(false)
    })

    it('should reject expired CSRF tokens', () => {
      const sessionId = 'test-session'
      
      // Create a token with expired timestamp
      const expiredToken = 'token.1000000000000.signature' // Very old timestamp
      
      const isValid = securityService.validateCSRFToken(sessionId, expiredToken)
      expect(isValid).toBe(false)
    })

    it('should reject tokens for different sessions', () => {
      const sessionId1 = 'session-1'
      const sessionId2 = 'session-2'
      
      const token = securityService.generateCSRFToken(sessionId1)
      const isValid = securityService.validateCSRFToken(sessionId2, token)
      
      expect(isValid).toBe(false)
    })
  })

  describe('Security Statistics', () => {
    it('should generate security statistics', async () => {
      // Add some test events
      await securityService.logSecurityEvent('login_failed', 'medium', 'Test', '192.168.1.1')
      await securityService.logSecurityEvent('login_success', 'low', 'Test', '192.168.1.1')
      await securityService.logSecurityEvent('suspicious_activity', 'high', 'Test', '192.168.1.2')

      const stats = await securityService.getSecurityStats()

      expect(stats).toBeDefined()
      expect(stats.totalEvents).toBeGreaterThan(0)
      expect(stats.threatLevel).toBeDefined()
      expect(Array.isArray(stats.topThreats)).toBe(true)
      expect(Array.isArray(stats.ipBlacklist)).toBe(true)
      expect(Array.isArray(stats.recentAlerts)).toBe(true)
    })

    it('should calculate threat level correctly', async () => {
      // Add critical event
      await securityService.logSecurityEvent('intrusion_detected', 'critical', 'Critical threat', '192.168.1.1')

      const stats = await securityService.getSecurityStats()
      expect(stats.threatLevel).toBe('critical')
    })
  })

  describe('Event Filtering', () => {
    it('should filter events by severity', async () => {
      await securityService.logSecurityEvent('login_failed', 'low', 'Test low', '192.168.1.1')
      await securityService.logSecurityEvent('login_failed', 'high', 'Test high', '192.168.1.1')
      await securityService.logSecurityEvent('login_failed', 'critical', 'Test critical', '192.168.1.1')

      const highEvents = await securityService.getSecurityEvents(50, 'high')
      const criticalEvents = await securityService.getSecurityEvents(50, 'critical')

      expect(highEvents.length).toBe(1)
      expect(highEvents[0].severity).toBe('high')
      expect(criticalEvents.length).toBe(1)
      expect(criticalEvents[0].severity).toBe('critical')
    })

    it('should filter events by type', async () => {
      await securityService.logSecurityEvent('login_failed', 'medium', 'Test', '192.168.1.1')
      await securityService.logSecurityEvent('login_success', 'low', 'Test', '192.168.1.1')
      await securityService.logSecurityEvent('permission_denied', 'high', 'Test', '192.168.1.1')

      const loginFailedEvents = await securityService.getSecurityEvents(50, undefined, 'login_failed')
      const permissionDeniedEvents = await securityService.getSecurityEvents(50, undefined, 'permission_denied')

      expect(loginFailedEvents.length).toBe(1)
      expect(loginFailedEvents[0].type).toBe('login_failed')
      expect(permissionDeniedEvents.length).toBe(1)
      expect(permissionDeniedEvents[0].type).toBe('permission_denied')
    })
  })

  describe('Event Resolution', () => {
    it('should resolve security events', async () => {
      const event = await securityService.logSecurityEvent(
        'suspicious_activity',
        'high',
        'Test event',
        '192.168.1.1'
      )

      const resolved = await securityService.resolveSecurityEvent(event.id, 'admin123')
      expect(resolved).toBe(true)
    })

    it('should return false for non-existent events', async () => {
      const resolved = await securityService.resolveSecurityEvent('non-existent-id', 'admin123')
      expect(resolved).toBe(false)
    })
  })
})