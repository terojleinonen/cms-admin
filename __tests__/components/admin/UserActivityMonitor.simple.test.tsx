/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import UserActivityMonitor from '../../../app/components/admin/UserActivityMonitor'

// Mock fetch
global.fetch = jest.fn()

const mockStats = {
  totalLogs: 0,
  actionBreakdown: {},
  resourceBreakdown: {},
  severityBreakdown: {},
  recentActivity: [],
  securityAlerts: [],
}

describe('UserActivityMonitor - Simple Tests', () => {
  beforeEach(() => {
    // Mock fetch to return empty data for both logs and stats
    ;(global.fetch as jest.Mock)
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
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders the component title after loading', async () => {
    render(<UserActivityMonitor />)
    
    await waitFor(() => {
      expect(screen.getByText('User Activity Monitor')).toBeInTheDocument()
    })
  })

  it('renders the component description after loading', async () => {
    render(<UserActivityMonitor />)
    
    await waitFor(() => {
      expect(screen.getByText('Track and monitor user actions and security events')).toBeInTheDocument()
    })
  })

  it('renders control buttons after loading', async () => {
    render(<UserActivityMonitor />)
    
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument()
      expect(screen.getByText('Filters')).toBeInTheDocument()
      expect(screen.getByText('Export')).toBeInTheDocument()
    })
  })

  it('shows empty state when no logs are found', async () => {
    render(<UserActivityMonitor />)
    
    await waitFor(() => {
      expect(screen.getByText('No activity logs found')).toBeInTheDocument()
    })
  })
})