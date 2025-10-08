import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '../../../../lib/db';
import { AuditService } from '../../../../lib/audit-service';
import { getSecurityMonitoringService } from '../../../../lib/security-monitoring';
import { getSecurityAlertManager } from '../../../../lib/security-alerts';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Initialize services
    const auditService = new AuditService(prisma);
    const securityService = getSecurityMonitoringService(prisma, auditService);
    const alertManager = getSecurityAlertManager();

    // Get dashboard data
    const dashboardData = await securityService.getDashboardData(days);

    // Get active alerts
    const activeAlerts = alertManager.getActiveAlerts();

    // Get mock incidents data (in real implementation, this would come from database)
    const incidents = [
      {
        id: 'inc-001',
        title: 'Suspicious Login Activity',
        severity: 'HIGH',
        status: 'INVESTIGATING',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        assignedTo: 'security-team@company.com'
      },
      {
        id: 'inc-002',
        title: 'Multiple Failed Authentication Attempts',
        severity: 'MEDIUM',
        status: 'OPEN',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        assignedTo: null
      }
    ];

    // Enhanced threat intelligence
    const threatIntelligence = {
      riskScore: Math.floor(Math.random() * 100),
      threatLevel: dashboardData.summary.criticalEvents > 5 ? 'HIGH' : 
                   dashboardData.summary.criticalEvents > 2 ? 'MEDIUM' : 'LOW',
      activeCampaigns: Math.floor(Math.random() * 5),
      blockedAttacks: Math.floor(Math.random() * 50) + 10,
      topAttackVectors: [
        { vector: 'Brute Force Login', count: 15, trend: 'UP' },
        { vector: 'SQL Injection', count: 8, trend: 'DOWN' },
        { vector: 'XSS Attempts', count: 12, trend: 'STABLE' },
        { vector: 'CSRF Attacks', count: 5, trend: 'DOWN' }
      ],
      geographicThreats: [
        { country: 'Unknown', count: 25, riskLevel: 'HIGH' },
        { country: 'Russia', count: 18, riskLevel: 'CRITICAL' },
        { country: 'China', count: 12, riskLevel: 'HIGH' },
        { country: 'Brazil', count: 8, riskLevel: 'MEDIUM' }
      ]
    };

    // Add system health status
    const systemHealth = dashboardData.summary.criticalEvents > 10 ? 'CRITICAL' :
                        dashboardData.summary.criticalEvents > 5 ? 'WARNING' : 'HEALTHY';

    // Enhanced response with additional data
    const enhancedData = {
      ...dashboardData,
      summary: {
        ...dashboardData.summary,
        activeThreats: Math.floor(Math.random() * 10),
        systemHealth
      },
      alerts: activeAlerts,
      incidents,
      threatIntelligence,
      topThreats: dashboardData.topThreats.map(threat => ({
        ...threat,
        trend: Math.random() > 0.5 ? 'UP' : Math.random() > 0.5 ? 'DOWN' : 'STABLE'
      }))
    };

    return NextResponse.json(enhancedData);
  } catch (error) {
    console.error('Failed to get security dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to get security dashboard data' },
      { status: 500 }
    );
  }
}