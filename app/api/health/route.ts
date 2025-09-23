import { NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { getDatabaseHealth, DatabaseConnectionManager } from '@/lib/db'

/**
 * Health check endpoint for monitoring system status
 * GET /api/health
 */
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    const startTime = Date.now()
    
    // Comprehensive database health check
    const dbHealth = await getDatabaseHealth()
    const connectionManager = DatabaseConnectionManager.getInstance()
    const connectionStats = await connectionManager.getConnectionStats()
    const performanceMetrics = await connectionManager.getPerformanceMetrics()
    
    const responseTime = Date.now() - startTime

    if (!dbHealth.connected) {
      return NextResponse.json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime,
        error: dbHealth.error,
        checks: [
          {
            name: 'database',
            status: 'unhealthy',
            error: dbHealth.error,
            details: dbHealth
          }
        ]
      }, { status: 503 })
    }

    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime,
      checks: [
        {
          name: 'database',
          status: 'healthy',
          responseTime: dbHealth.latency,
          details: {
            ...dbHealth,
            connectionStats,
            performanceMetrics
          }
        }
      ],
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: [
        {
          name: 'database',
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      ]
    }, { status: 503 })
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)