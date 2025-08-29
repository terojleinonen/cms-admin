/**
 * Test suite for admin audit log statistics API
 * Tests statistics and security alerts functionality
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { GET } from '../../../app/api/admin/audit-logs/stats/route'

// Mock dependencies
jest.mock('next-auth')
jest.mock('../../../app/lib/db')
jest.mock('../../../app/lib/audit-service')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

const mockAuditService = {
  getStats: jest.fn(),
  getSecurityAlerts: jest.fn(),
}

// Mock the audit service
jest.mock('../../../app/lib/audit-service', () => ({
  getAuditService: jest.fn(() => mockAuditService),
}))

describe('/api/admin/audit-logs/stats', () => {
  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'ADMIN',
  }

  const mockEditorUser = {
    id: 'editor-123',
    email: 'editor@example.com',
    role: 'EDITOR',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/admin/audit-logs/stats', () => {
    it('should return comprehensive audit statistics for admin users', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      
      const mockStats = {
        totalLogs: 1500,
        actionBreakdown: {
          'auth.login': 800,
          'auth.logout': 750,
          'user.updated': 200,
          'user.created': 50,
        },
        resourceBreakdown: {
          'user': 1200,
          'product': 200,
          'category': 100,
        },
        severityBreakdown: {
          'low': 1000,
          'medium': 400,
          'high': 80,
          'critical': 20,
        },
        recentActivity: [
          {
            id: 'audit-1',
            userId: 'user-1',
            action: 'auth.login',
            createdAt: new Date(),
            user: { id: 'user-1', name: 'John Doe', email: 'john@example.com', role: 'EDITOR' },
          },
        ],
      }

      const mockSecurityAlerts = [
        {
          type: 'failed_logins',
          severity: 'high' as const,
          message: '3 users with multiple failed login attempts',
          count: 15,
          users: ['user-1', 'user-2', 'user-3'],
          lastOccurrence: new Date(),
        },
        {
          type: 'suspicious_activity',
          severity: 'critical' as const,
          message: '2 suspicious activity events detected',
          count: 2,
          users: ['user-4', 'user-5'],
          lastOccurrence: new Date(),
        },
      ]

      mockAuditService.getStats.mockResolvedValue(mockStats)
      mockAuditService.getSecurityAlerts.mockResolvedValue(mockSecurityAlerts)

      const request = new NextRequest('http://localhost/api/admin/audit-logs/stats?days=30')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({
        ...mockStats,
        securityAlerts: mockSecurityAlerts,
      })

      expect(mockAuditService.getStats).toHaveBeenCalledWith(30)
      expect(mockAuditService.getSecurityAlerts).toHaveBeenCalledWith(7)
    })

    it('should use default time period when not specified', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      
      mockAuditService.getStats.mockResolvedValue({
        totalLogs: 0,
        actionBreakdown: {},
        resourceBreakdown: {},
        severityBreakdown: {},
        recentActivity: [],
      })
      mockAuditService.getSecurityAlerts.mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/admin/audit-logs/stats')
      await GET(request)

      expect(mockAuditService.getStats).toHaveBeenCalledWith(30) // Default 30 days
    })

    it('should validate time period parameters', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      
      mockAuditService.getStats.mockResolvedValue({
        totalLogs: 0,
        actionBreakdown: {},
        resourceBreakdown: {},
        severityBreakdown: {},
        recentActivity: [],
      })
      mockAuditService.getSecurityAlerts.mockResolvedValue([])

      // Test maximum limit
      const request = new NextRequest('http://localhost/api/admin/audit-logs/stats?days=365')
      await GET(request)

      expect(mockAuditService.getStats).toHaveBeenCalledWith(365)
    })

    it('should reject invalid time period parameters', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })

      const request = new NextRequest('http://localhost/api/admin/audit-logs/stats?days=500')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid parameters')
      expect(data.details).toBeDefined()
    })

    it('should reject non-admin users', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockEditorUser })

      const request = new NextRequest('http://localhost/api/admin/audit-logs/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should reject unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/admin/audit-logs/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should handle service errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      mockAuditService.getStats.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost/api/admin/audit-logs/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to get audit log statistics')
    })

    it('should handle security alerts service errors', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      
      mockAuditService.getStats.mockResolvedValue({
        totalLogs: 100,
        actionBreakdown: {},
        resourceBreakdown: {},
        severityBreakdown: {},
        recentActivity: [],
      })
      mockAuditService.getSecurityAlerts.mockRejectedValue(new Error('Security service error'))

      const request = new NextRequest('http://localhost/api/admin/audit-logs/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to get audit log statistics')
    })

    it('should return empty statistics when no data exists', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      
      const emptyStats = {
        totalLogs: 0,
        actionBreakdown: {},
        resourceBreakdown: {},
        severityBreakdown: {},
        recentActivity: [],
      }

      mockAuditService.getStats.mockResolvedValue(emptyStats)
      mockAuditService.getSecurityAlerts.mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/admin/audit-logs/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({
        ...emptyStats,
        securityAlerts: [],
      })
    })

    it('should handle different time periods correctly', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      
      mockAuditService.getStats.mockResolvedValue({
        totalLogs: 50,
        actionBreakdown: { 'auth.login': 30, 'auth.logout': 20 },
        resourceBreakdown: { 'user': 50 },
        severityBreakdown: { 'low': 40, 'medium': 10 },
        recentActivity: [],
      })
      mockAuditService.getSecurityAlerts.mockResolvedValue([])

      // Test 7 days
      const request7Days = new NextRequest('http://localhost/api/admin/audit-logs/stats?days=7')
      await GET(request7Days)
      expect(mockAuditService.getStats).toHaveBeenCalledWith(7)

      // Test 90 days
      const request90Days = new NextRequest('http://localhost/api/admin/audit-logs/stats?days=90')
      await GET(request90Days)
      expect(mockAuditService.getStats).toHaveBeenCalledWith(90)
    })

    it('should include security alerts with proper structure', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      
      const mockAlert = {
        type: 'failed_logins',
        severity: 'high' as const,
        message: 'Multiple failed login attempts detected',
        count: 10,
        users: ['user-1', 'user-2'],
        lastOccurrence: new Date('2024-01-15T10:30:00Z'),
      }

      mockAuditService.getStats.mockResolvedValue({
        totalLogs: 100,
        actionBreakdown: {},
        resourceBreakdown: {},
        severityBreakdown: {},
        recentActivity: [],
      })
      mockAuditService.getSecurityAlerts.mockResolvedValue([mockAlert])

      const request = new NextRequest('http://localhost/api/admin/audit-logs/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(data.data.securityAlerts).toHaveLength(1)
      expect(data.data.securityAlerts[0]).toMatchObject({
        type: 'failed_logins',
        severity: 'high',
        message: 'Multiple failed login attempts detected',
        count: 10,
        users: ['user-1', 'user-2'],
        lastOccurrence: '2024-01-15T10:30:00.000Z',
      })
    })
  })
})