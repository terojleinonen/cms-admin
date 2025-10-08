/**
 * API endpoint for permission performance status
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
    const canViewStatus = await hasPermission(session.user, {
      resource: 'analytics',
      action: 'read'
    })

    if (!canViewStatus) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get performance status
    const status = await permissionPerformanceService.getPerformanceStatus()

    return NextResponse.json(status)
  } catch (error) {
    console.error('Failed to get performance status:', error)
    return NextResponse.json(
      { error: 'Failed to get performance status' },
      { status: 500 }
    )
  }
}