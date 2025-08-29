/**
 * Test suite for admin audit logs API endpoints
 * Tests audit log viewing, filtering, and export functionality
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { GET, POST } from '../../../app/api/admin/audit-logs/route'

// Mock dependencies
jest.mock('next-auth')
jest.mock('../../../app/lib/db')
jest.mock('../../../app/lib/audit-service')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

const mockAuditService = {
  getLogs: jest.fn(),
  exportLogs: jest.fn(),
  logSecurity: jest.fn(),
}

// Mock the audit service
jest.mock('../../../app/lib/audit-service', () => ({
  getAuditService: jest.fn(() => mockAuditService),
}))

describe('/api/admin/audit-logs', () => {
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

  describe('GET /api/admin/audit-logs', () => {
    it('should return audit logs for admin users', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      
      const mockLogs = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'auth.login',
          resource: 'user',
          createdAt: new Date(),
          user: { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'EDITOR' },
        },
      ]

      mockAuditService.getLogs.mockResolvedValue({
        logs: mockLogs,
        total: 1,
        page: 1,
        totalPages: 1,
      })

      const request = new NextRequest('http://localhost/api/admin/audit-logs?page=1&limit=20')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.logs).toEqual(mockLogs)
      expect(data.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      })

      expect(mockAuditService.getLogs).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      })
    })

    it('should filter logs by search term', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      
      const mockLogs = [
        {
          id: 'audit-1',
          action: 'auth.login',
          resource: 'user',
          user: { name: 'John Doe', email: 'john@example.com' },
          details: { success: true },
        },
        {
          id: 'audit-2',
          action: 'user.updated',
          resource: 'user',
          user: { name: 'Jane Smith', email: 'jane@example.com' },
          details: { field: 'email' },
        },
      ]

      mockAuditService.getLogs.mockResolvedValue({
        logs: mockLogs,
        total: 2,
        page: 1,
        totalPages: 1,
      })

      const request = new NextRequest('http://localhost/api/admin/audit-logs?search=login')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should filter to only the login action
      expect(data.data.logs).toHaveLength(1)
      expect(data.data.logs[0].action).toBe('auth.login')
    })

    it('should apply date range filters', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      
      mockAuditService.getLogs.mockResolvedValue({
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0,
      })

      const startDate = '2024-01-01T00:00:00Z'
      const endDate = '2024-01-31T23:59:59Z'
      
      const request = new NextRequest(`http://localhost/api/admin/audit-logs?startDate=${startDate}&endDate=${endDate}`)
      await GET(request)

      expect(mockAuditService.getLogs).toHaveBeenCalledWith({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        page: 1,
        limit: 20,
      })
    })

    it('should reject non-admin users', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockEditorUser })

      const request = new NextRequest('http://localhost/api/admin/audit-logs')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should reject unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/admin/audit-logs')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should handle invalid query parameters', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })

      const request = new NextRequest('http://localhost/api/admin/audit-logs?page=invalid&limit=999')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid parameters')
      expect(data.details).toBeDefined()
    })

    it('should handle service errors', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      mockAuditService.getLogs.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/admin/audit-logs')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to get audit logs')
    })
  })

  describe('POST /api/admin/audit-logs (Export)', () => {
    it('should export audit logs in JSON format', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      
      const mockExportData = JSON.stringify([
        { id: 'audit-1', action: 'login', user: 'test@example.com' },
      ])

      mockAuditService.exportLogs.mockResolvedValue(mockExportData)
      mockAuditService.logSecurity.mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/admin/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'test-browser',
        },
        body: JSON.stringify({
          format: 'json',
          userId: 'user-123',
          startDate: '2024-01-01T00:00:00Z',
        }),
      })

      const response = await POST(request)
      const data = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('Content-Disposition')).toContain('audit-logs-')
      expect(response.headers.get('Content-Disposition')).toContain('.json')
      expect(data).toBe(mockExportData)

      expect(mockAuditService.exportLogs).toHaveBeenCalledWith({
        userId: 'user-123',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: undefined,
        action: undefined,
        resource: undefined,
        limit: 10000,
      }, 'json')

      expect(mockAuditService.logSecurity).toHaveBeenCalledWith(
        'admin-123',
        'DATA_EXPORT',
        {
          exportType: 'audit_logs',
          format: 'json',
          filters: expect.any(Object),
        },
        '192.168.1.1',
        'test-browser'
      )
    })

    it('should export audit logs in CSV format', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      
      const mockCsvData = 'ID,Action,User\naudit-1,login,test@example.com'
      mockAuditService.exportLogs.mockResolvedValue(mockCsvData)
      mockAuditService.logSecurity.mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/admin/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'csv' }),
      })

      const response = await POST(request)
      const data = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/csv')
      expect(response.headers.get('Content-Disposition')).toContain('.csv')
      expect(data).toBe(mockCsvData)

      expect(mockAuditService.exportLogs).toHaveBeenCalledWith(
        expect.any(Object),
        'csv'
      )
    })

    it('should reject non-admin users for export', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockEditorUser })

      const request = new NextRequest('http://localhost/api/admin/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'json' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should handle invalid export parameters', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })

      const request = new NextRequest('http://localhost/api/admin/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'invalid' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid parameters')
    })

    it('should handle export service errors', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockAdminUser })
      mockAuditService.exportLogs.mockRejectedValue(new Error('Export failed'))

      const request = new NextRequest('http://localhost/api/admin/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'json' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to export audit logs')
    })
  })
})