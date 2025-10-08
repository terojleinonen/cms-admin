/**
 * User Activity Dashboard Tests
 * Tests for the enhanced user activity monitoring dashboard
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import UserActivityDashboard from '../../../app/components/admin/UserActivityDashboard'

// Mock fetch globally
global.fetch = jest.fn()

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}))

describe('UserActivityDashboard', () => {
  beforeEach(() => {
    // Reset fetch mock
    ;(global.fetch as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders dashboard with loading state initially', () => {
    // Mock fetch to never resolve to test loading state
    ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

    render(<UserActivityDashboard />)
    
    expect(screen.getByRole('generic')).toBeInTheDocument()
  })

  it('renders dashboard header and controls', async () => {
    // Mock successful API responses
    const mockMetrics = {
      success: true,
      data: {
        totalUsers: 100,
        activeUsers: 50,
        onlineUsers: 10,
        totalSessions: 200,
        averageSessionDuration: 1800,
        totalActions: 1000,
        actionsPerMinute: 5.5,
        failedActions: 10,
        securityAlerts: 2,
        permissionDenials: 5,
        topResources: [],
        topActions: [],
        riskDistribution: { low: 40, medium: 8, high: 2, critical: 0 },
        geographicDistribution: [],
        deviceDistribution: [],
        hourlyActivity: Array.from({ length: 24 }, (_, i) => ({ hour: i, actionCount: 10, userCount: 5 })),
      },
    }

    const mockAlerts = { success: true, data: [] }
    const mockPermissions = {
      success: true,
      data: {
        totalPermissionChecks: 500,
        permissionCheckRate: 2.5,
        cacheHitRate: 0.85,
        averageCheckLatency: 8.5,
        topPermissions: [],
        roleUsage: [],
        resourceAccess: [],
      },
    }
    const mockBehavior = { success: true, data: [] }

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlerts,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPermissions,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockBehavior,
      })

    render(<UserActivityDashboard />)

    await waitFor(() => {
      expect(screen.getByText('User Activity Dashboard')).toBeInTheDocument()
    })

    expect(screen.getByText('Real-time monitoring and analytics for user behavior and permissions')).toBeInTheDocument()
    expect(screen.getByDisplayValue('24h')).toBeInTheDocument()
    expect(screen.getByText('Auto-refresh')).toBeInTheDocument()
    expect(screen.getByText('Refresh')).toBeInTheDocument()
  })

  it('displays overview metrics correctly', async () => {
    const mockMetrics = {
      success: true,
      data: {
        totalUsers: 100,
        activeUsers: 50,
        onlineUsers: 10,
        totalSessions: 200,
        averageSessionDuration: 1800,
        totalActions: 1000,
        actionsPerMinute: 5.5,
        failedActions: 10,
        securityAlerts: 2,
        permissionDenials: 5,
        topResources: [
          { resource: 'products', accessCount: 500, uniqueUsers: 25 },
          { resource: 'users', accessCount: 300, uniqueUsers: 15 },
        ],
        topActions: [],
        riskDistribution: { low: 40, medium: 8, high: 2, critical: 0 },
        geographicDistribution: [],
        deviceDistribution: [],
        hourlyActivity: Array.from({ length: 24 }, (_, i) => ({ hour: i, actionCount: 10, userCount: 5 })),
      },
    }

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockMetrics })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: {} }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [] }) })

    render(<UserActivityDashboard />)

    await waitFor(() => {
      expect(screen.getByText('50 / 100')).toBeInTheDocument()
    })

    expect(screen.getByText('10 online now')).toBeInTheDocument()
    expect(screen.getByText('5.5')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('30m')).toBeInTheDocument()
  })

  it('switches between different view tabs', async () => {
    const mockResponses = {
      metrics: { success: true, data: { totalUsers: 100, activeUsers: 50, onlineUsers: 10, totalSessions: 200, averageSessionDuration: 1800, totalActions: 1000, actionsPerMinute: 5.5, failedActions: 10, securityAlerts: 2, permissionDenials: 5, topResources: [], topActions: [], riskDistribution: { low: 40, medium: 8, high: 2, critical: 0 }, geographicDistribution: [], deviceDistribution: [], hourlyActivity: [] } },
      alerts: { success: true, data: [] },
      permissions: { success: true, data: { totalPermissionChecks: 500, permissionCheckRate: 2.5, cacheHitRate: 0.85, averageCheckLatency: 8.5, topPermissions: [], roleUsage: [], resourceAccess: [] } },
      behavior: { success: true, data: [] },
    }

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses.metrics })
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses.alerts })
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses.permissions })
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses.behavior })

    render(<UserActivityDashboard />)

    await waitFor(() => {
      expect(screen.getByText('User Activity Dashboard')).toBeInTheDocument()
    })

    // Test tab switching
    const permissionsTab = screen.getByText('Permissions')
    fireEvent.click(permissionsTab)

    await waitFor(() => {
      expect(screen.getByText('Permission Checks')).toBeInTheDocument()
    })

    const behaviorTab = screen.getByText('Behavior Analysis')
    fireEvent.click(behaviorTab)

    await waitFor(() => {
      expect(screen.getByText('User Behavior Patterns')).toBeInTheDocument()
    })

    const alertsTab = screen.getByText('Security Alerts')
    fireEvent.click(alertsTab)

    await waitFor(() => {
      expect(screen.getByText('Security Alerts')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

    render(<UserActivityDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch dashboard data')).toBeInTheDocument()
    })
  })

  it('allows time range selection', async () => {
    const mockResponses = {
      metrics: { success: true, data: { totalUsers: 100, activeUsers: 50, onlineUsers: 10, totalSessions: 200, averageSessionDuration: 1800, totalActions: 1000, actionsPerMinute: 5.5, failedActions: 10, securityAlerts: 2, permissionDenials: 5, topResources: [], topActions: [], riskDistribution: { low: 40, medium: 8, high: 2, critical: 0 }, geographicDistribution: [], deviceDistribution: [], hourlyActivity: [] } },
      alerts: { success: true, data: [] },
      permissions: { success: true, data: { totalPermissionChecks: 500, permissionCheckRate: 2.5, cacheHitRate: 0.85, averageCheckLatency: 8.5, topPermissions: [], roleUsage: [], resourceAccess: [] } },
      behavior: { success: true, data: [] },
    }

    ;(global.fetch as jest.Mock)
      .mockResolvedValue({ ok: true, json: async () => mockResponses.metrics })
      .mockResolvedValue({ ok: true, json: async () => mockResponses.alerts })
      .mockResolvedValue({ ok: true, json: async () => mockResponses.permissions })
      .mockResolvedValue({ ok: true, json: async () => mockResponses.behavior })

    render(<UserActivityDashboard />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('24h')).toBeInTheDocument()
    })

    const timeRangeSelect = screen.getByDisplayValue('24h')
    fireEvent.change(timeRangeSelect, { target: { value: '7d' } })

    expect(timeRangeSelect).toHaveValue('7d')
  })

  it('toggles auto-refresh functionality', async () => {
    const mockResponses = {
      metrics: { success: true, data: { totalUsers: 100, activeUsers: 50, onlineUsers: 10, totalSessions: 200, averageSessionDuration: 1800, totalActions: 1000, actionsPerMinute: 5.5, failedActions: 10, securityAlerts: 2, permissionDenials: 5, topResources: [], topActions: [], riskDistribution: { low: 40, medium: 8, high: 2, critical: 0 }, geographicDistribution: [], deviceDistribution: [], hourlyActivity: [] } },
      alerts: { success: true, data: [] },
      permissions: { success: true, data: { totalPermissionChecks: 500, permissionCheckRate: 2.5, cacheHitRate: 0.85, averageCheckLatency: 8.5, topPermissions: [], roleUsage: [], resourceAccess: [] } },
      behavior: { success: true, data: [] },
    }

    ;(global.fetch as jest.Mock)
      .mockResolvedValue({ ok: true, json: async () => mockResponses.metrics })
      .mockResolvedValue({ ok: true, json: async () => mockResponses.alerts })
      .mockResolvedValue({ ok: true, json: async () => mockResponses.permissions })
      .mockResolvedValue({ ok: true, json: async () => mockResponses.behavior })

    render(<UserActivityDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Auto-refresh')).toBeInTheDocument()
    })

    const autoRefreshCheckbox = screen.getByRole('checkbox')
    expect(autoRefreshCheckbox).toBeChecked()

    fireEvent.click(autoRefreshCheckbox)
    expect(autoRefreshCheckbox).not.toBeChecked()
  })
})