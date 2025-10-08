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

    // Mock threat intelligence data (in real implementation, this would come from threat feeds)
    const threatIntelligence = {
      riskScore: 67,
      threatLevel: 'MEDIUM',
      activeCampaigns: 3,
      blockedAttacks: 142,
      topAttackVectors: [
        { vector: 'Brute Force Login', count: 45, trend: 'UP' },
        { vector: 'SQL Injection Attempts', count: 28, trend: 'DOWN' },
        { vector: 'Cross-Site Scripting (XSS)', count: 19, trend: 'STABLE' },
        { vector: 'CSRF Token Bypass', count: 15, trend: 'DOWN' },
        { vector: 'Directory Traversal', count: 12, trend: 'UP' },
        { vector: 'Command Injection', count: 8, trend: 'STABLE' }
      ],
      geographicThreats: [
        { country: 'Unknown/Tor', count: 52, riskLevel: 'HIGH' },
        { country: 'Russia', count: 34, riskLevel: 'CRITICAL' },
        { country: 'China', count: 28, riskLevel: 'HIGH' },
        { country: 'North Korea', count: 15, riskLevel: 'CRITICAL' },
        { country: 'Iran', count: 12, riskLevel: 'HIGH' },
        { country: 'Brazil', count: 8, riskLevel: 'MEDIUM' }
      ],
      threatCategories: [
        { category: 'Web Application Attacks', count: 89, percentage: 42 },
        { category: 'Brute Force Attacks', count: 67, percentage: 32 },
        { category: 'Reconnaissance', count: 34, percentage: 16 },
        { category: 'Malware/Phishing', count: 21, percentage: 10 }
      ],
      recentIndicators: [
        {
          type: 'IP Address',
          value: '203.0.113.50',
          threatType: 'Botnet C&C',
          confidence: 95,
          firstSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          type: 'Domain',
          value: 'malicious-site.example',
          threatType: 'Phishing',
          confidence: 88,
          firstSeen: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
          type: 'User Agent',
          value: 'BadBot/1.0',
          threatType: 'Automated Scanner',
          confidence: 92,
          firstSeen: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        }
      ]
    };

    return NextResponse.json(threatIntelligence);
  } catch (error) {
    console.error('Failed to get threat intelligence:', error);
    return NextResponse.json(
      { error: 'Failed to get threat intelligence' },
      { status: 500 }
    );
  }
}