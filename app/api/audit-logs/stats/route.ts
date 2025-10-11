/**
 * Audit Log Statistics API Endpoint
 * Provides audit log statistics and metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { AuditService } from '@/lib/audit-service'
import { prisma as db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'

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

    // Check permissions for viewing audit statistics
    if (!await hasPermission(session.user, 'system', 'read')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view audit statistics' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const stats = await auditService.getStats(days)

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Failed to fetch audit statistics:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}