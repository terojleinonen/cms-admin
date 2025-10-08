/**
 * Database Performance Monitoring API
 * Provides database query performance, connection pool, and slow query metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth-utils';
import { hasPermission } from '@/app/lib/has-permission';
import { getScalabilityMonitor } from '@/app/lib/scalability-monitor';
import { prisma } from '@/app/lib/db';

/**
 * GET /api/admin/monitoring/database-performance
 * Get database performance metrics including query latency and connection pool status
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
        { error: { code: 'PERMISSION_DENIED', message: 'Insufficient permissions for database monitoring' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeWindow = parseInt(searchParams.get('timeWindow') || '3600000'); // Default 1 hour
    const includeSlowQueries = searchParams.get('includeSlowQueries') === 'true';

    const scalabilityMonitor = getScalabilityMonitor(prisma);
    const databaseMetrics = scalabilityMonitor.getDatabaseMetrics(timeWindow);

    if (databaseMetrics.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          metrics: [],
          summary: {
            averageQueryLatency: 0,
            peakQueryLatency: 0,
            totalQueries: 0,
            slowQueriesCount: 0,
            connectionPoolUtilization: 0
          },
          timestamp: Date.now()
        }
      });
    }

    // Calculate summary statistics
    const latestMetrics = databaseMetrics[databaseMetrics.length - 1];
    const averageQueryLatency = databaseMetrics.reduce((sum, m) => sum + m.queryLatency.avg, 0) / databaseMetrics.length;
    const peakQueryLatency = Math.max(...databaseMetrics.map(m => m.queryLatency.p99));
    const totalQueries = databaseMetrics.reduce((sum, m) => sum + m.queryThroughput, 0);
    const slowQueriesCount = databaseMetrics.reduce((sum, m) => sum + m.slowQueries.length, 0);
    const connectionPoolUtilization = latestMetrics.connectionPoolSize > 0 
      ? (latestMetrics.activeConnections / latestMetrics.connectionPoolSize) * 100 
      : 0;

    const response: any = {
      success: true,
      data: {
        metrics: databaseMetrics,
        summary: {
          averageQueryLatency,
          peakQueryLatency,
          totalQueries,
          slowQueriesCount,
          connectionPoolUtilization,
          currentConnections: {
            active: latestMetrics.activeConnections,
            idle: latestMetrics.idleConnections,
            waiting: latestMetrics.waitingConnections,
            total: latestMetrics.connectionPoolSize
          }
        },
        timestamp: Date.now()
      }
    };

    if (includeSlowQueries) {
      // Get all slow queries from the time window
      const allSlowQueries = databaseMetrics.flatMap(m => m.slowQueries)
        .sort((a, b) => b.duration - a.duration) // Sort by duration descending
        .slice(0, 50); // Limit to top 50 slowest queries

      response.data.slowQueries = allSlowQueries.map(query => ({
        query: query.query,
        duration: query.duration,
        timestamp: query.timestamp,
        parameters: query.parameters ? '[REDACTED]' : undefined // Don't expose actual parameters for security
      }));
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching database performance metrics:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch database performance metrics',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/monitoring/database-performance
 * Manually trigger database performance analysis or configuration updates
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

    if (!hasPermission(session.user, { resource: 'monitoring', action: 'manage', scope: 'all' })) {
      return NextResponse.json(
        { error: { code: 'PERMISSION_DENIED', message: 'Insufficient permissions for database monitoring management' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, parameters } = body;

    const scalabilityMonitor = getScalabilityMonitor(prisma);

    switch (action) {
      case 'analyzeSlowQueries':
        // Get recent slow queries for analysis
        const databaseMetrics = scalabilityMonitor.getDatabaseMetrics(24 * 60 * 60 * 1000); // Last 24 hours
        const slowQueries = databaseMetrics.flatMap(m => m.slowQueries);
        
        // Group by query pattern and analyze
        const queryAnalysis = new Map<string, { count: number; totalDuration: number; avgDuration: number; maxDuration: number }>();
        
        slowQueries.forEach(query => {
          const pattern = query.query.replace(/\d+/g, '?').replace(/'[^']*'/g, '?'); // Normalize query
          const existing = queryAnalysis.get(pattern) || { count: 0, totalDuration: 0, avgDuration: 0, maxDuration: 0 };
          
          existing.count++;
          existing.totalDuration += query.duration;
          existing.avgDuration = existing.totalDuration / existing.count;
          existing.maxDuration = Math.max(existing.maxDuration, query.duration);
          
          queryAnalysis.set(pattern, existing);
        });

        const topSlowQueries = Array.from(queryAnalysis.entries())
          .sort((a, b) => b[1].avgDuration - a[1].avgDuration)
          .slice(0, 10)
          .map(([pattern, stats]) => ({ pattern, ...stats }));

        return NextResponse.json({
          success: true,
          data: {
            analysis: {
              totalSlowQueries: slowQueries.length,
              uniqueQueryPatterns: queryAnalysis.size,
              topSlowQueries,
              timeWindow: '24 hours'
            }
          }
        });

      case 'testConnection':
        // Test database connection and get basic metrics
        try {
          const start = performance.now();
          await prisma.$queryRaw`SELECT 1`;
          const connectionTime = performance.now() - start;

          return NextResponse.json({
            success: true,
            data: {
              connectionTest: {
                success: true,
                responseTime: connectionTime,
                timestamp: Date.now()
              }
            }
          });
        } catch (dbError) {
          return NextResponse.json({
            success: false,
            data: {
              connectionTest: {
                success: false,
                error: dbError instanceof Error ? dbError.message : 'Unknown database error',
                timestamp: Date.now()
              }
            }
          });
        }

      case 'getConnectionPoolStatus':
        // Get current connection pool status
        try {
          // This would need to be implemented based on your specific database setup
          // For now, return simulated data
          return NextResponse.json({
            success: true,
            data: {
              connectionPool: {
                size: 10,
                active: Math.floor(Math.random() * 8),
                idle: Math.floor(Math.random() * 3),
                waiting: Math.floor(Math.random() * 2),
                timestamp: Date.now()
              }
            }
          });
        } catch (poolError) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'POOL_STATUS_ERROR',
              message: 'Failed to get connection pool status',
              details: poolError instanceof Error ? poolError.message : 'Unknown error'
            }
          });
        }

      default:
        return NextResponse.json(
          { error: { code: 'INVALID_ACTION', message: 'Invalid action specified' } },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in database performance monitoring:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to execute database monitoring action',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}