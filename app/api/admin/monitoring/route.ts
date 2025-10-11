import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { performanceMonitor } from '@/lib/performance'
import { SecurityService } from '@/lib/security'
const securityMonitor = SecurityService.getInstance()
const logger = {
  info: (...args: any[]) => console.log(...args),
  error: (...args: any[]) => console.error(...args),
}

/**
 * Monitoring dashboard endpoint for administrators
 * GET /api/admin/monitoring
 */
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    // Check authentication and authorization
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours

    // Get performance metrics
    const requestDurationStats = performanceMonitor.getStats('request_duration');
    const dbQueryStats = performanceMonitor.getStats('db_query_duration');
    const healthCheckStats = performanceMonitor.getStats('health_check_duration');

    const performanceMetrics = {
      requestDuration: {
        average: requestDurationStats.avgDuration,
        metrics: requestDurationStats.recentMetrics,
      },
      databaseQueries: {
        average: dbQueryStats.avgDuration,
        metrics: dbQueryStats.recentMetrics,
      },
      healthChecks: {
        average: healthCheckStats.avgDuration,
        metrics: healthCheckStats.recentMetrics,
      }
    }

    // Get security events
    const loginAttempts = await securityMonitor.getSecurityEvents(1000, undefined, 'login_attempt');
    const loginSuccesses = await securityMonitor.getSecurityEvents(1000, undefined, 'login_success');
    const loginFailures = await securityMonitor.getSecurityEvents(1000, undefined, 'login_failed');
    const unauthorizedAccess = await securityMonitor.getSecurityEvents(1000, undefined, 'permission_denied');
    const suspiciousActivity = await securityMonitor.getSecurityEvents(1000, undefined, 'suspicious_activity');
    const recentEvents = await securityMonitor.getSecurityEvents(50);

    const securityEvents = {
      loginAttempts: loginAttempts.filter(e => e.timestamp >= sinceDate).length,
      loginSuccesses: loginSuccesses.filter(e => e.timestamp >= sinceDate).length,
      loginFailures: loginFailures.filter(e => e.timestamp >= sinceDate).length,
      unauthorizedAccess: unauthorizedAccess.filter(e => e.timestamp >= sinceDate).length,
      suspiciousActivity: suspiciousActivity.filter(e => e.timestamp >= sinceDate).length,
      recentEvents: recentEvents,
    }

    // Calculate system statistics
    const systemStats = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV
    }

    const response = {
      timestamp: new Date().toISOString(),
      period: {
        since: sinceDate.toISOString(),
        duration: Date.now() - sinceDate.getTime()
      },
      performance: performanceMetrics,
      security: securityEvents,
      system: systemStats
    }

    logger.info('Monitoring data requested', {
      userId: session.user.id,
      since: sinceDate.toISOString()
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Failed to fetch monitoring data', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)