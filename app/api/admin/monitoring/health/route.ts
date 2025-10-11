import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { systemHealthMonitor } from '@/lib/system-health-monitor'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to view system health
    if (!hasPermission(session.user, 'monitoring', 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const hours = parseInt(searchParams.get('hours') || '24')

    switch (action) {
      case 'current':
        const currentMetrics = await systemHealthMonitor.collectMetrics()
        return NextResponse.json({
          success: true,
          data: currentMetrics
        })

      case 'historical':
        const historicalMetrics = systemHealthMonitor.getHistoricalMetrics(hours)
        return NextResponse.json({
          success: true,
          data: historicalMetrics
        })

      case 'alerts':
        const alerts = systemHealthMonitor.getAllAlerts()
        return NextResponse.json({
          success: true,
          data: alerts
        })

      case 'status':
        const status = systemHealthMonitor.getSystemStatus()
        return NextResponse.json({
          success: true,
          data: { status }
        })

      default:
        // Default to current metrics
        const metrics = await systemHealthMonitor.collectMetrics()
        return NextResponse.json({
          success: true,
          data: metrics
        })
    }
  } catch (error) {
    console.error('Health monitoring API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch health metrics' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage system health
    if (!hasPermission(session.user, 'monitoring', 'manage')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, alertId } = body

    switch (action) {
      case 'resolve_alert':
        if (!alertId) {
          return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 })
        }
        
        const resolved = systemHealthMonitor.resolveAlert(alertId)
        if (!resolved) {
          return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          message: 'Alert resolved successfully'
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Health monitoring API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process health monitoring request' 
      },
      { status: 500 }
    )
  }
}