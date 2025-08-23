import { NextResponse } from 'next/server'
import { performHealthChecks, logger, performanceMonitor } from '@/lib/monitoring'

/**
 * Health check endpoint for monitoring system status
 * GET /api/health
 */
export async function GET() {
  try {
    const startTime = Date.now()
    
    // Perform health checks
    const checks = await performHealthChecks()
    
    // Calculate overall status
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy')
    const hasDegraded = checks.some(check => check.status === 'degraded')
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (hasUnhealthy) {
      overallStatus = 'unhealthy'
    } else if (hasDegraded) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'healthy'
    }

    const responseTime = Date.now() - startTime

    // Record performance metric
    performanceMonitor.recordMetric('health_check_duration', responseTime, 'ms')

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime,
      checks,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }

    // Log health check
    logger.info('Health check performed', {
      status: overallStatus,
      responseTime,
      checksCount: checks.length
    })

    // Return appropriate HTTP status
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503

    return NextResponse.json(response, { status: httpStatus })

  } catch (error) {
    logger.error('Health check failed', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: []
    }, { status: 503 })
  }
}