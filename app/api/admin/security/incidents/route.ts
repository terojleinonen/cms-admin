import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

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

    // Mock incidents data (in real implementation, this would come from database)
    const incidents = [
      {
        id: 'inc-001',
        title: 'Suspicious Login Activity from Multiple IPs',
        description: 'User account showing login attempts from geographically diverse locations',
        severity: 'HIGH',
        status: 'INVESTIGATING',
        priority: 'HIGH',
        category: 'UNAUTHORIZED_ACCESS',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        assignedTo: 'security-team@company.com',
        createdBy: 'system',
        affectedUsers: ['user@example.com'],
        affectedSystems: ['Authentication Service'],
        timeline: [
          {
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            action: 'Incident Created',
            user: 'system',
            details: 'Automated detection of suspicious login pattern'
          },
          {
            timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
            action: 'Investigation Started',
            user: 'security-team@company.com',
            details: 'Security team assigned to investigate'
          }
        ]
      },
      {
        id: 'inc-002',
        title: 'Multiple Failed Authentication Attempts',
        description: 'Brute force attack detected against admin accounts',
        severity: 'MEDIUM',
        status: 'OPEN',
        priority: 'MEDIUM',
        category: 'BRUTE_FORCE_ATTACK',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        assignedTo: null,
        createdBy: 'system',
        affectedUsers: ['admin@example.com'],
        affectedSystems: ['Admin Portal'],
        timeline: [
          {
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            action: 'Incident Created',
            user: 'system',
            details: 'Automated detection of brute force attack'
          }
        ]
      },
      {
        id: 'inc-003',
        title: 'Privilege Escalation Attempt Detected',
        description: 'Non-admin user attempting to access admin-only resources',
        severity: 'CRITICAL',
        status: 'RESOLVED',
        priority: 'CRITICAL',
        category: 'PRIVILEGE_ESCALATION',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        resolvedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        assignedTo: 'security-lead@company.com',
        createdBy: 'system',
        affectedUsers: ['editor@example.com'],
        affectedSystems: ['Admin API'],
        timeline: [
          {
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            action: 'Incident Created',
            user: 'system',
            details: 'Automated detection of privilege escalation attempt'
          },
          {
            timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
            action: 'Investigation Started',
            user: 'security-lead@company.com',
            details: 'Security lead assigned to investigate'
          },
          {
            timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            action: 'Incident Resolved',
            user: 'security-lead@company.com',
            details: 'User permissions reviewed and corrected. No malicious intent found.'
          }
        ]
      }
    ];

    return NextResponse.json(incidents);
  } catch (error) {
    console.error('Failed to get security incidents:', error);
    return NextResponse.json(
      { error: 'Failed to get security incidents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { eventId, title, description, severity, priority, category, assignedTo } = body;

    // Mock incident creation (in real implementation, this would save to database)
    const newIncident = {
      id: `inc-${Date.now()}`,
      title: title || 'New Security Incident',
      description: description || 'Security incident created from event',
      severity: severity || 'MEDIUM',
      status: 'OPEN',
      priority: priority || 'MEDIUM',
      category: category || 'SECURITY_BREACH',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: assignedTo || null,
      createdBy: session.user.email,
      affectedUsers: [],
      affectedSystems: [],
      sourceEventId: eventId,
      timeline: [
        {
          timestamp: new Date().toISOString(),
          action: 'Incident Created',
          user: session.user.email,
          details: eventId ? `Created from security event ${eventId}` : 'Manually created incident'
        }
      ]
    };

    console.log('Created security incident:', newIncident);

    return NextResponse.json(newIncident, { status: 201 });
  } catch (error) {
    console.error('Failed to create security incident:', error);
    return NextResponse.json(
      { error: 'Failed to create security incident' },
      { status: 500 }
    );
  }
}