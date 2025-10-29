/**
 * Security Monitoring Dashboard Tests
 * Tests for the comprehensive security monitoring dashboard
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SecurityMonitoringDashboard } from '../../../app/components/admin/SecurityMonitoringDashboard';

// Mock fetch
global.fetch = jest.fn();

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'admin-1',
        email: 'admin@test.com',
        role: 'ADMIN'
      }
    }
  })
}));

describe('SecurityMonitoringDashboard', () => {
  const mockDashboardData = {
    summary: {
      totalEvents: 150,
      criticalEvents: 5,
      unresolvedEvents: 12,
      blockedIPs: 8,
      activeThreats: 3,
      systemHealth: 'HEALTHY' as const
    },
    eventsByType: [
      { type: 'UNAUTHORIZED_ACCESS', count: 45 },
      { type: 'BRUTE_FORCE_ATTACK', count: 32 }
    ],
    eventsBySeverity: [
      { severity: 'CRITICAL', count: 5 },
      { severity: 'HIGH', count: 15 }
    ],
    recentEvents: [
      {
        id: 'event-1',
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'HIGH',
        userId: 'user-1',
        ipAddress: '192.168.1.100',
        createdAt: new Date().toISOString(),
        resolved: false,
        acknowledged: false,
        user: {
          name: 'Test User',
          email: 'test@example.com'
        }
      }
    ],
    topThreats: [
      { type: 'BRUTE_FORCE_ATTACK', count: 32, trend: 'UP' as const }
    ],
    timeline: [
      { date: '2024-01-01', count: 10 }
    ],
    alerts: [
      {
        id: 'alert-1',
        type: 'SECURITY_BREACH',
        severity: 'HIGH',
        message: 'Multiple failed login attempts detected',
        triggeredAt: new Date().toISOString(),
        acknowledged: false
      }
    ],
    incidents: [
      {
        id: 'inc-1',
        title: 'Security Incident',
        severity: 'HIGH',
        status: 'OPEN' as const,
        createdAt: new Date().toISOString(),
        assignedTo: 'security@test.com'
      }
    ],
    threatIntelligence: {
      riskScore: 67,
      threatLevel: 'MEDIUM' as const,
      activeCampaigns: 3,
      blockedAttacks: 142
    }
  };

  beforeEach(() => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockDashboardData
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders security monitoring dashboard', async () => {
    render(<SecurityMonitoringDashboard />);
    
    expect(screen.getByText('Security Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Real-time security event monitoring and threat detection')).toBeInTheDocument();
  });

  it('displays summary cards with correct data', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total Events
      expect(screen.getByText('5')).toBeInTheDocument(); // Critical Events
      expect(screen.getByText('12')).toBeInTheDocument(); // Unresolved
      expect(screen.getByText('8')).toBeInTheDocument(); // Blocked IPs
    });
  });

  it('switches between tabs correctly', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    // Click on Security Events tab
    fireEvent.click(screen.getByText('Security Events'));
    
    // Should show events table with filters
    expect(screen.getByPlaceholderText('Search events...')).toBeInTheDocument();
  });

  it('displays system health status', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('HEALTHY')).toBeInTheDocument();
    });
  });

  it('handles real-time toggle', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      const pauseButton = screen.getByText('Pause Live');
      expect(pauseButton).toBeInTheDocument();
      
      fireEvent.click(pauseButton);
      expect(screen.getByText('Resume Live')).toBeInTheDocument();
    });
  });

  it('displays recent security events', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Unauthorized Access')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    });
  });

  it('handles event acknowledgment', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      const acknowledgeButton = screen.getByText('Acknowledge');
      fireEvent.click(acknowledgeButton);
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/security/events/event-1/acknowledge',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });

  it('handles event resolution', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      const resolveButton = screen.getByText('Resolve');
      fireEvent.click(resolveButton);
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/security/events/event-1/resolve',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });

  it('handles IP blocking', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      const blockButton = screen.getByText('Block');
      fireEvent.click(blockButton);
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/security/block-ip',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ipAddress: '192.168.1.100' })
      })
    );
  });

  it('displays threat intelligence data', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('67')).toBeInTheDocument(); // Risk Score
      expect(screen.getByText('MEDIUM')).toBeInTheDocument(); // Threat Level
      expect(screen.getByText('142')).toBeInTheDocument(); // Blocked Attacks
    });
  });

  it('handles refresh functionality', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
    });

    // Should make another API call
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('handles time range selection', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      const timeRangeSelect = screen.getByDisplayValue('Last 7 days');
      fireEvent.change(timeRangeSelect, { target: { value: '30' } });
    });

    // Should make API call with new time range
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('days=30'),
      expect.any(Object)
    );
  });

  it('displays active alerts count', async () => {
    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // Active Alerts count
    });
  });

  it('shows no events state when no events exist', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockDashboardData,
        recentEvents: []
      })
    });

    render(<SecurityMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('No security events')).toBeInTheDocument();
    });
  });
});