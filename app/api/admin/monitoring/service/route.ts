import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { hasPermission } from '@/app/lib/permissions'
import { healthMonitoringService } from '@/app/lib/health-monitoring-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to view monitoring service status
    if (!hasPermission(session.user, 'monitoring', 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const status = healthMonitoringService.getStatus()
    
    return NextResponse.json({
      success: true,
      data: status
    })
  } catch (error) {
    console.error('Monitoring service API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get monitoring service status' 
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

    // Check if user has permission to manage monitoring service
    if (!hasPermission(session.user, 'monitoring', 'manage')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, intervalMinutes } = body

    switch (action) {
      case 'start':
        healthMonitoringService.start()
        return NextResponse.json({
          success: true,
          message: 'Monitoring service started'
        })

      case 'stop':
        healthMonitoringService.stop()
        return NextResponse.json({
          success: true,
          message: 'Monitoring service stopped'
        })

      case 'restart':
        healthMonitoringService.stop()
        healthMonitoringService.start()
        return NextResponse.json({
          success: true,
          message: 'Monitoring service restarted'
        })

      case 'collect_now':
        await healthMonitoringService.collectNow()
        return NextResponse.json({
          success: true,
          message: 'Metrics collected successfully'
        })

      case 'set_interval':
        if (!intervalMinutes || intervalMinutes < 1) {
          return NextResponse.json({ error: 'Invalid interval. Must be at least 1 minute.' }, { status: 400 })
        }
        
        healthMonitoringService.setInterval(intervalMinutes)
        return NextResponse.json({
          success: true,
          message: `Monitoring interval set to ${intervalMinutes} minutes`
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Monitoring service API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process monitoring service request' 
      },
      { status: 500 }
    )
  }
}