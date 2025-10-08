/**
 * Security Dashboard API Tests
 * Tests for the security monitoring dashboard API endpoints
 */

import { NextRequest } from 'next/server';

// Mock the auth module before importing the route
jest.mock('../../../../app/api/auth/[...nextauth]/route', () => ({
  authOptions: {}
}));

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}));

// Mock dependencies
jest.mock('../../../../app/lib/db', () => ({
  prisma: {}
}));

jest.mock('../../../../app/lib/audit-service', () => ({
  AuditService: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../../../../app/lib/security-monitoring', () => ({
  getSecurityMonitoringService: jest.fn().mockReturnValue({
    getDashboardData: jest.fn().mockResolvedValue({
      summary: {
        totalEvents: 150,
        criticalEvents: 5,
        unresolvedEvents: 12,
        blockedIPs: 8
      },
      eventsByType: [
        { type: 'UNAUTHORIZED_ACCESS', count: 45 },
        { type: 'BRUTE_FORCE_ATTACK', count: 32 }
      ],
      eventsBySeverity: [
        { severity: 'CRITICAL', count: 5 },
        { severity: 'HIGH', count: 15 }
      ],
      recentEvents: [],
      topThreats: [
        { type: 'BRUTE_FORCE_ATTACK', count: 32 }
      ],
      timeline: []
    })
  })
}));

jest.mock('../../../../app/lib/security-alerts', () => ({
  getSecurityAlertManager: jest.fn().mockReturnValue({
    getActiveAlerts: jest.fn().mockReturnValue([])
  })
}));

const { getServerSession } = require('next-auth');

// Import after mocking
const { GET } = require('../../../../app/api/admin/security/dashboard/route');

describe('/api/admin/security/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns dashboard data for admin users', async () => {
    // Mock authenticated admin user
    getServerSession.mockResolvedValue({
      user: {
        id: 'admin-1',
        email: 'admin@test.com',
        role: 'ADMIN'
      }
    });

    const request = new NextRequest('http://localhost:3000/api/admin/security/dashboard?days=7');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary).toBeDefined();
    expect(data.summary.totalEvents).toBe(150);
    expect(data.summary.criticalEvents).toBe(5);
    expect(data.eventsByType).toHaveLength(2);
    expect(data.eventsBySeverity).toHaveLength(2);
  });

  it('returns 401 for unauthenticated users', async () => {
    getServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/admin/security/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 for non-admin users', async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'user@test.com',
        role: 'EDITOR'
      }
    });

    const request = new NextRequest('http://localhost:3000/api/admin/security/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('handles query parameters correctly', async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: 'admin-1',
        email: 'admin@test.com',
        role: 'ADMIN'
      }
    });

    const request = new NextRequest('http://localhost:3000/api/admin/security/dashboard?days=30&severity=HIGH');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.summary).toBeDefined();
  });

  it('includes enhanced data in response', async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: 'admin-1',
        email: 'admin@test.com',
        role: 'ADMIN'
      }
    });

    const request = new NextRequest('http://localhost:3000/api/admin/security/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary.systemHealth).toBeDefined();
    expect(data.summary.activeThreats).toBeDefined();
    expect(data.alerts).toBeDefined();
    expect(data.incidents).toBeDefined();
    expect(data.threatIntelligence).toBeDefined();
    expect(data.threatIntelligence.riskScore).toBeDefined();
    expect(data.threatIntelligence.threatLevel).toBeDefined();
  });
});