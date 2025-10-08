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

    // Mock threat patterns data (in real implementation, this would come from ML/AI analysis)
    const threatPatterns = [
      {
        id: 'pattern-001',
        type: 'Brute Force Attack Pattern',
        description: 'Multiple failed login attempts from same IP addresses within short time windows',
        severity: 'HIGH',
        confidence: 95,
        firstSeen: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        occurrences: 47,
        affectedIPs: ['192.168.1.100', '10.0.0.50', '172.16.0.25'],
        affectedUsers: ['user1@example.com', 'admin@example.com'],
        mitigationStatus: 'ACTIVE'
      },
      {
        id: 'pattern-002',
        type: 'Credential Stuffing Campaign',
        description: 'Automated login attempts using compromised credentials from data breaches',
        severity: 'CRITICAL',
        confidence: 88,
        firstSeen: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        lastSeen: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        occurrences: 156,
        affectedIPs: ['203.0.113.10', '198.51.100.20', '192.0.2.30'],
        affectedUsers: ['test@example.com', 'support@example.com', 'info@example.com'],
        mitigationStatus: 'MONITORING'
      },
      {
        id: 'pattern-003',
        type: 'Suspicious API Access Pattern',
        description: 'Unusual API endpoint access patterns suggesting reconnaissance activity',
        severity: 'MEDIUM',
        confidence: 72,
        firstSeen: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        occurrences: 23,
        affectedIPs: ['198.51.100.100'],
        affectedUsers: [],
        mitigationStatus: 'MITIGATED'
      },
      {
        id: 'pattern-004',
        type: 'Privilege Escalation Attempts',
        description: 'Multiple attempts to access admin-only resources by non-admin users',
        severity: 'HIGH',
        confidence: 91,
        firstSeen: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        lastSeen: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        occurrences: 12,
        affectedIPs: ['10.0.0.75'],
        affectedUsers: ['editor@example.com'],
        mitigationStatus: 'ACTIVE'
      }
    ];

    return NextResponse.json(threatPatterns);
  } catch (error) {
    console.error('Failed to get threat patterns:', error);
    return NextResponse.json(
      { error: 'Failed to get threat patterns' },
      { status: 500 }
    );
  }
}