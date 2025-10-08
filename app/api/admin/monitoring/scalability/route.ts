/**
 * Scalability Monitoring API Endpoints
 * Provides access to concurrent user, database, and system resource metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth-utils';
import { hasPermission } from '@/app/lib/has-permission';
import { getScalabilityMonitor } from '@/app/lib/scalability-monitor';
import { prisma } from '@/app/lib/db';

/**
 * GET /api/admin/monitoring/scalability
 * Get comprehensive scalability metrics and report
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

    // Check monitoring permissions
    if (!hasPermission(session.user, { resource: 'monitoring', action: 'read', scope: 'all' })) {
      return NextResponse.json(
        { error: { code: 'PERMISSION_DENIED', message: 'Insufficient permissions for monitoring access' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeWindow = parseInt(searchParams.get('timeWindow') || '3600000'); // Default 1 hour
    const format = searchParams.get('format') || 'json';
    const includeReport = searchParams.get('includeReport') === 'true';

    const scalabilityMonitor = getScalabilityMonitor(prisma);

    if (format === 'csv') {
      const csvData = scalabilityMonitor.exportMetrics('csv');
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="scalability-metrics.csv"'
        }
      });
    }

    const response: any = {
      success: true,
      data: {
        concurrentUserMetrics: scalabilityMonitor.getConcurrentUserMetrics(timeWindow),
        databaseMetrics: scalabilityMonitor.getDatabaseMetrics(timeWindow),
        systemMetrics: scalabilityMonitor.getSystemMetrics(timeWindow),
        alerts: scalabilityMonitor.getAlerts(undefined, false), // Unresolved alerts
        timestamp: Date.now()
      }
    };

    if (includeReport) {
      response.data.report = scalabilityMonitor.getScalabilityReport(timeWindow);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching scalability metrics:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch scalability metrics',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/monitoring/scalability
 * Update scalability monitoring configuration
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

    // Check monitoring management permissions
    if (!hasPermission(session.user, { resource: 'monitoring', action: 'manage', scope: 'all' })) {
      return NextResponse.json(
        { error: { code: 'PERMISSION_DENIED', message: 'Insufficient permissions for monitoring management' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, thresholds, interval } = body;

    const scalabilityMonitor = getScalabilityMonitor(prisma);

    switch (action) {
      case 'updateThresholds':
        if (thresholds) {
          scalabilityMonitor.updateThresholds(thresholds);
          return NextResponse.json({
            success: true,
            message: 'Scalability monitoring thresholds updated',
            data: { thresholds }
          });
        }
        break;

      case 'startMonitoring':
        scalabilityMonitor.startMonitoring(interval || 30000);
        return NextResponse.json({
          success: true,
          message: 'Scalability monitoring started',
          data: { interval: interval || 30000 }
        });

      case 'stopMonitoring':
        scalabilityMonitor.stopMonitoring();
        return NextResponse.json({
          success: true,
          message: 'Scalability monitoring stopped'
        });

      default:
        return NextResponse.json(
          { error: { code: 'INVALID_ACTION', message: 'Invalid action specified' } },
          { status: 400 }
        );
    }

    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Invalid request parameters' } },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error updating scalability monitoring:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to update scalability monitoring',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}