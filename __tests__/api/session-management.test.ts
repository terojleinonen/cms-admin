/**
 * Session Management API Tests
 * Tests for session management endpoints and security monitoring
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/users/[id]/sessions/route'
import { getServerSession } from 'next-auth'
import { 
  getUserSessions, 
  invalidateSession, 
  logoutFromAllDevices,
  getSessionStatistics,
  detectSuspiciousActivity
} from '@/app/lib/session-management'
import { logAuditEvent } from '@/app/lib/audit-service'
import { jest } from '@jest/globals'

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

jest.mock('@/app/lib/session-management', () => ({
  getUserSessions: jest.fn(),
  invalidateSession: jest.fn(),
  logoutFromAllDevices: jest.fn(),
  getSessionStatistics: jest.fn(),
  detectSuspiciousActivity: jest.fn()
}))

jest.mock('@/app/lib/audit-service', () => ({
  logAuditEvent: jest.fn()
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockGetUserSessions = getUserSessions as jest.MockedFunction<typeof getUserSessions>
const mockInvalidateSession = invalidateSession as jest.MockedFunction<typeof invalidateSession>
const mockLogoutFromAllDevices = logoutFromAllDevices as jest.MockedFunction<typeof logoutFromAllDevices>
const mockGetSessionStatistics = getSessionStatistics as jest.MockedFunction<typeof getSessionStatistics>
const mockDetectSuspiciousActivity = detectSuspiciousActivity as jest.MockedFunction<typeof detectSuspiciousActivity>
const mockLogAuditEvent = logAuditEvent as jest.MockedFunction<typeof logAuditEvent>

describe('/api/users/[id]/sessions', () => {
  const mockUserId = 'user-123'
  const mockAdminId = 'admin-456'
  const mockSessionId = 'session-789'

  const mockUserSession = {
    user: {
      id: mockUserId,
      email: 'user@example.com',
      role: 'EDITOR'
    }
  }

  const mockAdminSession = {
    user: {
      id: mockAdminId,
      email: 'admin@example.com',
      role: 'ADMIN'
    }
  }

  const mockSessions = [
    {
      id: 'session-1',
      userId: mockUserId,
      token: 'token-1',
      expiresAt: '2024-12-31T23:59:59Z',
      ipAddress: '192.168.1.1',
      userAgent: 'Chrome',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      isCurrent: true
    },
    {
      id: 'session-2',
      userId: mockUserId,
      token: 'token-2',
      expiresAt: '2024-12-31T23:59:59Z',
      ipAddress: '192.168.1.2',
      userAgent: 'Firefox',
      isActive: true,
      createdAt: '2024-01-01T01:00:00Z',
      isCurrent: false
    }
  ]

  const mockStatistics = {
    activeSessions: 2,
    totalSessions: 10,
    recentLogins: 5,
    lastLogin: '2024-01-01T00:00:00Z'
  }

  const mockSuspiciousActivity = [
    {
      type: 'CONCURRENT_SESSIONS',
      severity: 'MEDIUM' as const,
      details: { sessionCount: 4, uniqueIPs: 3 },
      timestamp: '2024-01-01T00:00:00Z'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/users/[id]/sessions', () => {
    it('should return user sessions for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession)
      mockGetUserSessions.mockResolvedValue(mockSessions)
      mockGetSessionStatistics.mockResolvedValue(mockStatistics)
      mockDetectSuspiciousActivity.mockResolvedValue(mockSuspiciousActivity)

      const request = new NextRequest('http://localhost/api/users/user-123/sessions')
      const response = await GET(request, { params: { id: mockUserId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessions).toEqual(mockSessions)
      expect(data.statistics).toEqual(mockStatistics)
      expect(data.suspiciousActivity).toEqual(mockSuspiciousActivity)
      expect(data.hasSecurityConcerns).toBe(true)
    })

    it('should allow admin to view any user sessions', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession)
      mockGetUserSessions.mockResolvedValue(mockSessions)
      mockGetSessionStatistics.mockResolvedValue(mockStatistics)
      mockDetectSuspiciousActivity.mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/users/user-123/sessions')
      const response = await GET(request, { params: { id: mockUserId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessions).toEqual(mockSessions)
      expect(data.hasSecurityConcerns).toBe(false)
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/users/user-123/sessions')
      const response = await GET(request, { params: { id: mockUserId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 for unauthorized user access', async () => {
      const otherUserSession = {
        user: {
          id: 'other-user',
          email: 'other@example.com',
          role: 'EDITOR'
        }
      }
      mockGetServerSession.mockResolvedValue(otherUserSession)

      const request = new NextRequest('http://localhost/api/users/user-123/sessions')
      const response = await GET(request, { params: { id: mockUserId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should handle service errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession)
      mockGetUserSessions.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/users/user-123/sessions')
      const response = await GET(request, { params: { id: mockUserId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/users/[id]/sessions', () => {
    it('should logout from all devices', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession)
      mockLogoutFromAllDevices.mockResolvedValue(3)
      mockLogAuditEvent.mockResolvedValue()

      const requestBody = {
        action: 'logout_all',
        currentSessionToken: 'current-token'
      }

      const request = new NextRequest('http://localhost/api/users/user-123/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Chrome'
        }
      })

      const response = await POST(request, { params: { id: mockUserId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.invalidatedSessions).toBe(3)
      expect(mockLogoutFromAllDevices).toHaveBeenCalledWith(mockUserId, 'current-token')
      expect(mockLogAuditEvent).toHaveBeenCalledWith({
        userId: mockUserId,
        action: 'LOGOUT_ALL_DEVICES',
        resource: 'USER_SESSION',
        details: {
          invalidatedSessions: 3,
          initiatedBy: mockUserId
        },
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome'
      })
    })

    it('should invalidate specific session', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession)
      mockInvalidateSession.mockResolvedValue(true)
      mockLogAuditEvent.mockResolvedValue()

      const requestBody = {
        action: 'invalidate_session',
        sessionId: mockSessionId
      }

      const request = new NextRequest('http://localhost/api/users/user-123/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json'
        }
      })

      const response = await POST(request, { params: { id: mockUserId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockInvalidateSession).toHaveBeenCalledWith(mockSessionId)
      expect(mockLogAuditEvent).toHaveBeenCalledWith({
        userId: mockUserId,
        action: 'SESSION_INVALIDATED',
        resource: 'USER_SESSION',
        details: {
          sessionId: mockSessionId,
          initiatedBy: mockUserId
        },
        ipAddress: null,
        userAgent: null
      })
    })

    it('should return 400 for invalid request data', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession)

      const requestBody = {
        action: 'invalid_action'
      }

      const request = new NextRequest('http://localhost/api/users/user-123/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json'
        }
      })

      const response = await POST(request, { params: { id: mockUserId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should return 400 for missing session ID when invalidating session', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession)

      const requestBody = {
        action: 'invalidate_session'
        // Missing sessionId
      }

      const request = new NextRequest('http://localhost/api/users/user-123/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json'
        }
      })

      const response = await POST(request, { params: { id: mockUserId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Session ID is required for this action')
    })

    it('should return 500 when session invalidation fails', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession)
      mockInvalidateSession.mockResolvedValue(false)

      const requestBody = {
        action: 'invalidate_session',
        sessionId: mockSessionId
      }

      const request = new NextRequest('http://localhost/api/users/user-123/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json'
        }
      })

      const response = await POST(request, { params: { id: mockUserId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to invalidate session')
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const requestBody = {
        action: 'logout_all'
      }

      const request = new NextRequest('http://localhost/api/users/user-123/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json'
        }
      })

      const response = await POST(request, { params: { id: mockUserId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 for unauthorized user access', async () => {
      const otherUserSession = {
        user: {
          id: 'other-user',
          email: 'other@example.com',
          role: 'EDITOR'
        }
      }
      mockGetServerSession.mockResolvedValue(otherUserSession)

      const requestBody = {
        action: 'logout_all'
      }

      const request = new NextRequest('http://localhost/api/users/user-123/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json'
        }
      })

      const response = await POST(request, { params: { id: mockUserId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should handle service errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession)
      mockLogoutFromAllDevices.mockRejectedValue(new Error('Service error'))

      const requestBody = {
        action: 'logout_all'
      }

      const request = new NextRequest('http://localhost/api/users/user-123/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json'
        }
      })

      const response = await POST(request, { params: { id: mockUserId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})