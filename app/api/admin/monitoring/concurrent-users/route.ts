/**
 * Concurrent Users Monitoring API
 * Provides detailed concurrent user metrics and session tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth-utils';
import { hasPermission } from '@/app/lib/has-permission';
import { getScalabilityMonitor } from '@/app/lib/scalability-monitor';
import { prisma } from '@/app/lib/db';

/**
 * GET /api/admin/monitoring/concurrent-users
 * Get concurrent user metrics and active session information
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'NOT_AUTHENTICATED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user, { resource: 'monitoring', action: 'read', scope: 'all' })) {
      return NextResponse.json(
        { error: { code: 'PERMISSION_DENIED', message: 'Insufficient permissions for user monitoring' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeWindow = parseInt(searchParams.get('timeWindow') || '3600000'); // Default 1 hour
    const includeDetails = searchParams.get('includeDetails') === 'true';

    const scalabilityMonitor = getScalabilityMonitor(prisma);
    const userMetrics = scalabilityMonitor.getConcurrentUserMetrics(timeWindow);

    const response: any = {
      success: true,
      data: {
        metrics: userMetrics,
        summary: {
          currentActiveUsers: userMetrics.length > 0 ? userMetrics[userMetrics.length - 1].activeUsers : 0,
          peakUsers: Math.max(...userMetrics.map(m => m.activeUsers), 0),
          averageUsers: userMetrics.length > 0 
            ? userMetrics.reduce((sum, m) => sum + m.activeUsers, 0) / userMetrics.length 
            : 0,
          totalPermissionChecks: userMetrics.reduce((sum, m) => sum + m.concurrentPermissionChecks, 0),
          averagePermissionCheckRate: userMetrics.length > 0
            ? userMetrics.reduce((sum, m) => sum + m.permissionCheckRate, 0) / userMetrics.length
            : 0
        },
        timestamp: Date.now()
      }
    };

    if (includeDetails && userMetrics.length > 0) {
      const latestMetrics = userMetrics[userMetrics.length - 1];
      response.data.activeSessions = Array.from(latestMetrics.userSessions.values()).map(session => ({
        userId: session.userId,
        role: session.role,
        sessionDuration: Date.now() - session.sessionStart,
        lastActivity: Date.now() - session.lastActivity,
        permissionChecksCount: session.permissionChecksCount,
        ipAddress: session.ipAddress ? session.ipAddress.replace(/\.\d+$/, '.***') : undefined // Mask IP for privacy
      }));
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching concurrent user metrics:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch concurrent user metrics',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/monitoring/concurrent-users
 * Track user session events (login, logout, activity)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'NOT_AUTHENTICATED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, userId, role, ipAddress } = body;

    const scalabilityMonitor = getScalabilityMonitor(prisma);

    switch (action) {
      case 'sessionStart':
        if (userId && role) {
          scalabilityMonitor.trackUserSession(userId, role, ipAddress);
          return NextResponse.json({
            success: true,
            message: 'User session tracked',
            data: { userId, action }
          });
        }
        break;

      case 'sessionEnd':
        if (userId) {
          scalabilityMonitor.removeUserSession(userId);
          return NextResponse.json({
            success: true,
            message: 'User session ended',
            data: { userId, action }
          });
        }
        break;

      case 'activity':
        if (userId) {
          scalabilityMonitor.trackUserActivity(userId);
          return NextResponse.json({
            success: true,
            message: 'User activity tracked',
            data: { userId, action }
          });
        }
        break;

      case 'permissionCheck':
        if (userId) {
          scalabilityMonitor.trackPermissionCheck(userId);
          return NextResponse.json({
            success: true,
            message: 'Permission check tracked',
            data: { userId, action }
          });
        }
        break;

      default:
        return NextResponse.json(
          { error: { code: 'INVALID_ACTION', message: 'Invalid action specified' } },
          { status: 400 }
        );
    }

    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Missing required parameters' } },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error tracking user session:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to track user session',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}