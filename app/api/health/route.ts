import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

/**
 * Health check endpoint for monitoring system status
 * GET /api/health
 */
export async function GET() {
  try {
    const startTime = Date.now()
    
    // Simple database health check
    await prisma.$queryRaw`SELECT 1`
    
    const responseTime = Date.now() - startTime

    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime,
      checks: [
        {
          name: 'database',
          status: 'healthy',
          responseTime
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
}