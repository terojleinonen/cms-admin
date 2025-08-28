/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import UserActivityMonitor from '../../../app/components/admin/UserActivityMonitor'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch as any

// Mock data
const mockAuditLogs = [
  {
    id: '1',
    userId: 'user1',
    action: 'auth.login',
    resource: 'user',
    details: { severity: 'low' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    user: {
      id: 'user1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'ADMIN' as const,
    },
  },
  {
    id: '2',
    userId: 'user2',
    action: 'user.updated',
    resource: 'user',
    details: { severity: 'medium' },
    ipAddress: '192.168.1.2',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2024-01-01T11:00:00Z'),
    user: {
      id: 'user2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'EDITOR' as const,
    },
  },
]

const mockStats = {
  totalLogs: 100,
  actionBreakdown: {
    'auth.login': 50,
    'user.updated': 30,
    'user.created': 20,
  },
  resourceBreakdown: {
    user: 80,
    system: 20,
  },
  severityBreakdown: {
    low: 60,
    medium: 30,
    high: 8,
    critical: 2,
  },
  recentActivity: mockAuditLogs,
  securityAlerts: [
    {
      type: 'failed_logins',
      severity: 'high' as const,
      message: '5 users with multiple failed login attempts',
      count: 15,
      users: ['user1', 'user2'],
      lastOccurrence: new Date('2024-01-01T12:00:00Z'),
    },
  ],
}

describe('UserActivityMonitor', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<UserActivityMonitor />)

    expect(screen.getByText('User Activity Monitor')).toBeInTheDocument()
    expect(screen.getByText('Track and monitor user actions and security events')).toBeInTheDocument()
  })

  it('fetches and displays audit logs', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            logs: mockAuditLogs,
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStats,
        }),
      })

    render(<UserActivityMonitor />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
      expect(screen.getByText('Auth → Login')).toBeInTheDocument()
      expect(screen.getByText('User → Updated')).toBeInTheDocument()
    })

    // Check statistics are displayed
    expect(screen.getByText('100')).toBeInTheDocument() // Total logs
    expect(screen.getByText('2')).toBeInTheDocument() // Recent activity count
  })

  it('displays security alerts', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            logs: mockAuditLogs,
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStats,
        }),
      })

    render(<UserActivityMonitor />)

    await waitFor(() => {
      expect(screen.getByText('Security Alerts')).toBeInTheDocument()
      expect(screen.getByText('5 users with multiple failed login attempts')).toBeInTheDocument()
    })
  })

  it('handles search functionality', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            logs: mockAuditLogs,
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStats,
        }),
      })

    render(<UserActivityMonitor />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Open filters
    fireEvent.click(screen.getByText('Filters'))

    // Search for a user
    const searchInput = screen.getByPlaceholderText('Search logs...')
    fireEvent.change(searchInput, { target: { value: 'john' } })

    expect(searchInput).toHaveValue('john')
  })

  it('handles filter changes', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            logs: mockAuditLogs,
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStats,
        }),
      })

    render(<UserActivityMonitor />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Open filters
    fireEvent.click(screen.getByText('Filters'))

    // Change action filter
    const actionSelect = screen.getByDisplayValue('All Actions')
    fireEvent.change(actionSelect, { target: { value: 'auth.login' } })

    expect(actionSelect).toHaveValue('auth.login')

    // Change severity filter
    const severitySelect = screen.getByDisplayValue('All Severities')
    fireEvent.change(severitySelect, { target: { value: 'high' } })

    expect(severitySelect).toHaveValue('high')
  })

  it('handles refresh functionality', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            logs: mockAuditLogs,
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStats,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            logs: mockAuditLogs,
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1,
            },
          },
        }),
      })

    render(<UserActivityMonitor />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Click refresh button
    fireEvent.click(screen.getByText('Refresh'))

    // Verify fetch was called again
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3) // Initial logs + stats + refresh
    })
  })

  it('handles export functionality', async () => {
    // Mock blob and URL.createObjectURL
    const mockBlob = new Blob(['test data'], { type: 'text/csv' })
    const mockUrl = 'blob:test-url'
    
    global.URL.createObjectURL = jest.fn(() => mockUrl)
    global.URL.revokeObjectURL = jest.fn()

    // Mock document.createElement and appendChild
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn(),
    }
    const originalCreateElement = document.createElement
    document.createElement = jest.fn((tagName) => {
      if (tagName === 'a') {
        return mockAnchor as any
      }
      return originalCreateElement.call(document, tagName)
    })
    
    const originalAppendChild = document.body.appendChild
    const originalRemoveChild = document.body.removeChild
    document.body.appendChild = jest.fn()
    document.body.removeChild = jest.fn()

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            logs: mockAuditLogs,
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStats,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      })

    render(<UserActivityMonitor />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Click export button
    fireEvent.click(screen.getByText('Export'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'csv',
          userId: undefined,
          action: undefined,
          resource: undefined,
          startDate: undefined,
          endDate: undefined,
        }),
      })
    })

    // Restore original functions
    document.createElement = originalCreateElement
    document.body.appendChild = originalAppendChild
    document.body.removeChild = originalRemoveChild
  })

  it('handles pagination', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            logs: mockAuditLogs,
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStats,
        }),
      })

    render(<UserActivityMonitor />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Check pagination controls
    expect(screen.getByText('Page 1')).toBeInTheDocument()
    expect(screen.getByText('Previous')).toBeDisabled()
    expect(screen.getByText('Next')).toBeDisabled() // Only 2 logs, less than limit
  })

  it('displays severity badges correctly', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            logs: mockAuditLogs,
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStats,
        }),
      })

    render(<UserActivityMonitor />)

    await waitFor(() => {
      expect(screen.getByText('Low')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()
    })
  })

  it('handles error states', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStats,
        }),
      })

    render(<UserActivityMonitor />)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('handles empty state', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            logs: [],
            pagination: {
              page: 1,
              limit: 20,
              total: 0,
              totalPages: 0,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStats,
        }),
      })

    render(<UserActivityMonitor />)

    await waitFor(() => {
      expect(screen.getByText('No activity logs found')).toBeInTheDocument()
    })
  })

  it('formats action names correctly', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            logs: mockAuditLogs,
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStats,
        }),
      })

    render(<UserActivityMonitor />)

    await waitFor(() => {
      expect(screen.getByText('Auth → Login')).toBeInTheDocument()
      expect(screen.getByText('User → Updated')).toBeInTheDocument()
    })
  })

  it('accepts userId prop for filtering', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            logs: [mockAuditLogs[0]], // Only first log
            pagination: {
              page: 1,
              limit: 20,
              total: 1,
              totalPages: 1,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStats,
        }),
      })

    render(<UserActivityMonitor userId="user1" />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })

    // Verify the API was called with the userId filter
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('userId=user1')
    )
  })

  it('accepts timeRange prop for filtering', async () => {
    const startDate = new Date('2024-01-01T00:00:00Z')
    const endDate = new Date('2024-01-02T00:00:00Z')

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            logs: mockAuditLogs,
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStats,
        }),
      })

    render(<UserActivityMonitor timeRange={{ startDate, endDate }} />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Verify the API was called with the time range filters
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('startDate=2024-01-01T00%3A00%3A00.000Z')
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('endDate=2024-01-02T00%3A00%3A00.000Z')
    )
  })
})