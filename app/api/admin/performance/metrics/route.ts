/**
 * API endpoint for permission performance metrics
 * Requirements: 6.1, 6.2
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { permissionPerformanceService } from '../../../../lib/permission-performance-service'
import { hasPermission } from '../../../../lib/permissions'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin permissions
    const canViewMetrics = await hasPermission(session.user, {
      resource: 'analytics',
      action: 'read'
    })

    if (!canViewMetrics) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get performance metrics
    const metrics = permissionPerformanceService.getPerformanceMetrics()

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Failed to get performance metrics:', error)
    return NextResponse.json(
      { error: 'Failed to get performance metrics' },
      { status: 500 }
    )
  }
}