/**
 * API endpoint for triggering performance optimization
 * Requirements: 6.1, 6.2
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { permissionPerformanceService } from '../../../../lib/permission-performance-service'
import { hasPermission } from '../../../../lib/permissions'
import { auditLogger } from '../../../../lib/audit-service'

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin permissions
    const canOptimize = await hasPermission(session.user, {
      resource: 'analytics',
      action: 'manage'
    })

    if (!canOptimize) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse request body for optimization options
    const body = await request.json().catch(() => ({}))
    const { cacheOnly = false, queriesOnly = false } = body

    // Log the optimization request
    await auditLogger.log({
      userId: session.user.id,
      action: 'PERFORMANCE_OPTIMIZATION_TRIGGERED',
      resource: 'system',
      details: {
        cacheOnly,
        queriesOnly,
        userAgent: request.headers.get('user-agent'),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    })

    // Trigger performance optimization
    const results = await permissionPerformanceService.optimizePerformance()

    // Log the completion
    await auditLogger.log({
      userId: session.user.id,
      action: 'PERFORMANCE_OPTIMIZATION_COMPLETED',
      resource: 'system',
      details: {
        results,
        duration: 'calculated_in_service' // Would be calculated in actual implementation
      }
    })

    return NextResponse.json({
      success: true,
      results,
      message: 'Performance optimization completed successfully'
    })
  } catch (error) {
    console.error('Performance optimization failed:', error)
    
    // Log the error
    const session = await getServerSession(authOptions)
    if (session?.user) {
      await auditLogger.log({
        userId: session.user.id,
        action: 'PERFORMANCE_OPTIMIZATION_FAILED',
        resource: 'system',
        details: {
          error: error.message,
          stack: error.stack
        }
      })
    }

    return NextResponse.json(
      { error: 'Performance optimization failed' },
      { status: 500 }
    )
  }
}