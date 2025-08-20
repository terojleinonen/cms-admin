/**
 * Health check API endpoint
 * Provides system health status including database connectivity
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseHealth } from '@/app/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check database health
    const dbHealth = await getDatabaseHealth()
    
    // Determine overall system health
    const isHealthy = dbHealth.connected
    const status = isHealthy ? 'healthy' : 'unhealthy'
    const statusCode = isHealthy ? 200 : 503

    const healthData = {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: dbHealth.connected ? 'up' : 'down',
          latency: dbHealth.latency,
          error: dbHealth.error,
        },
        api: {
          status: 'up',
          port: process.env.PORT || 3001,
        },
      },
      uptime: process.uptime(),
    }

    return NextResponse.json(healthData, { status: statusCode })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}