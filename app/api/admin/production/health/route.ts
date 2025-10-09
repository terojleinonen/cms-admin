/**
 * Production Health Monitoring API
 * Provides health status and monitoring capabilities for production RBAC system
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { productionHealthMonitor } from '@/app/lib/production-health-monitor'
import { hasPermission } from '@/app/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check admin permissions
    if (!hasPermission(session.user, 'system', 'read')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const health = await productionHealthMonitor.getSystemHealth()
    
    return NextResponse.json({
      success: true,
      data: health
    })

  } catch (error) {
    console.error('Health check API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get system health',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check admin permissions
    if (!hasPermission(session.user, 'system', 'manage')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { action } = await request.json()

    if (action === 'start_monitoring') {
      await productionHealthMonitor.startContinuousMonitoring()
      
      return NextResponse.json({
        success: true,
        message: 'Continuous health monitoring started'
      })
    }

    if (action === 'log_metrics') {
      await productionHealthMonitor.logHealthMetrics()
      
      return NextResponse.json({
        success: true,
        message: 'Health metrics logged successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Health monitoring API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to perform health monitoring action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}