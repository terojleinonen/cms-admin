import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { performanceMonitor, securityMonitor, logger } from '@/lib/monitoring'

/**
 * Monitoring dashboard endpoint for administrators
 * GET /api/admin/monitoring
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours

    // Get performance metrics
    const performanceMetrics = {
      requestDuration: {
        average: performanceMonitor.getAverageMetric('request_duration', sinceDate),
        metrics: performanceMonitor.getMetrics('request_duration', sinceDate).slice(-100) // Last 100 metrics
      },
      databaseQueries: {
        average: performanceMonitor.getAverageMetric('db_query_duration', sinceDate),
        metrics: performanceMonitor.getMetrics('db_query_duration', sinceDate).slice(-100)
      },
      healthChecks: {
        average: performanceMonitor.getAverageMetric('health_check_duration', sinceDate),
        metrics: performanceMonitor.getMetrics('health_check_duration', sinceDate).slice(-50)
      }
    }

    // Get security events
    const securityEvents = {
      loginAttempts: securityMonitor.getSecurityEvents('login_attempt', sinceDate).length,
      loginSuccesses: securityMonitor.getSecurityEvents('login_success', sinceDate).length,
      loginFailures: securityMonitor.getSecurityEvents('login_failure', sinceDate).length,
      unauthorizedAccess: securityMonitor.getSecurityEvents('unauthorized_access', sinceDate).length,
      suspiciousActivity: securityMonitor.getSecurityEvents('suspicious_activity', sinceDate).length,
      recentEvents: securityMonitor.getSecurityEvents(undefined, sinceDate).slice(-50)
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
}