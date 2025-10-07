/**
 * Security Alerts API Endpoint
 * Provides security alerts based on audit log analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { AuditService } from '@/app/lib/audit-service'
import { db } from '@/app/lib/db'
import { hasPermission } from '@/app/lib/has-permission'

const auditService = new AuditService(db)

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions for viewing security alerts
    if (!await hasPermission(session.user, 'system', 'read')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view security alerts' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    const [alerts, incidents] = await Promise.all([
      auditService.getSecurityAlerts(days),
      auditService.getSecurityIncidents(days),
    ])

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        incidents,
      },
    })
  } catch (error) {
    console.error('Failed to fetch security alerts:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}