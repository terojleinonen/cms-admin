import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getDatabaseHealth, DatabaseConnectionManager } from '@/lib/db'

/**
 * Database health monitoring endpoint for admin users
 * GET /api/admin/database/health
 */
export async function GET(_request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connectionManager = DatabaseConnectionManager.getInstance()
    
    // Get comprehensive database health information
    const [
      healthStatus,
      connectionStats,
      performanceMetrics
    ] = await Promise.all([
      getDatabaseHealth(),
      connectionManager.getConnectionStats(),
      connectionManager.getPerformanceMetrics()
    ])

    const response = {
      timestamp: new Date().toISOString(),
      status: healthStatus.connected ? 'healthy' : 'unhealthy',
      health: healthStatus,
      connections: connectionStats,
      performance: performanceMetrics,
      recommendations: generateRecommendations(connectionStats, performanceMetrics)
    }

    return NextResponse.json(response, { 
      status: healthStatus.connected ? 200 : 503 
    })

  } catch (error) {
    console.error('Database health check failed:', error)
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Generate performance recommendations based on metrics
 */
function generateRecommendations(
  connectionStats: Awaited<ReturnType<DatabaseConnectionManager['getConnectionStats']>>,
  performanceMetrics: Awaited<ReturnType<DatabaseConnectionManager['getPerformanceMetrics']>>
): string[] {
  const recommendations: string[] = []

  // Connection pool recommendations
  if (connectionStats.health === 'critical') {
    recommendations.push('Connection pool is at critical capacity. Consider increasing max_connections or optimizing queries.')
  } else if (connectionStats.health === 'warning') {
    recommendations.push('Connection pool utilization is high. Monitor for potential bottlenecks.')
  }

  // Cache hit ratio recommendations
  if (performanceMetrics.cacheHitRatio < 90) {
    recommendations.push('Cache hit ratio is below optimal (90%). Consider increasing shared_buffers or optimizing queries.')
  }

  // Slow query recommendations
  if (performanceMetrics.slowQueries > 10) {
    recommendations.push('High number of slow queries detected. Review and optimize query performance.')
  }

  if (recommendations.length === 0) {
    recommendations.push('Database performance is optimal.')
  }

  return recommendations
}