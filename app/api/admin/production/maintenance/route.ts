/**
 * Production Maintenance API
 * Provides maintenance and update capabilities for production RBAC system
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { maintenanceProcedures } from '@/app/lib/maintenance-procedures'
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

    const status = maintenanceProcedures.getMaintenanceStatus()
    
    return NextResponse.json({
      success: true,
      data: status
    })

  } catch (error) {
    console.error('Maintenance status API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get maintenance status',
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

    const { action, taskId, reason, update } = await request.json()

    if (action === 'run_task') {
      if (!taskId) {
        return NextResponse.json(
          { error: 'Task ID required' },
          { status: 400 }
        )
      }

      const result = await maintenanceProcedures.runMaintenanceTask(taskId)
      
      return NextResponse.json({
        success: true,
        data: result,
        message: `Maintenance task ${taskId} completed successfully`
      })
    }

    if (action === 'daily_maintenance') {
      await maintenanceProcedures.runDailyMaintenance()
      
      return NextResponse.json({
        success: true,
        message: 'Daily maintenance completed successfully'
      })
    }

    if (action === 'weekly_maintenance') {
      await maintenanceProcedures.runWeeklyMaintenance()
      
      return NextResponse.json({
        success: true,
        message: 'Weekly maintenance completed successfully'
      })
    }

    if (action === 'enable_maintenance_mode') {
      if (!reason) {
        return NextResponse.json(
          { error: 'Reason required for maintenance mode' },
          { status: 400 }
        )
      }

      await maintenanceProcedures.enableMaintenanceMode(reason)
      
      return NextResponse.json({
        success: true,
        message: 'Maintenance mode enabled'
      })
    }

    if (action === 'disable_maintenance_mode') {
      await maintenanceProcedures.disableMaintenanceMode()
      
      return NextResponse.json({
        success: true,
        message: 'Maintenance mode disabled'
      })
    }

    if (action === 'system_update') {
      if (!update) {
        return NextResponse.json(
          { error: 'Update configuration required' },
          { status: 400 }
        )
      }

      await maintenanceProcedures.performSystemUpdate(update)
      
      return NextResponse.json({
        success: true,
        message: `System update ${update.version} completed successfully`
      })
    }

    if (action === 'schedule_maintenance') {
      await maintenanceProcedures.scheduleMaintenanceTasks()
      
      return NextResponse.json({
        success: true,
        message: 'Maintenance task scheduling started'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Maintenance API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to perform maintenance operation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}