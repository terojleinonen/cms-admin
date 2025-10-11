/**
 * User Activity API Endpoint
 * Provides user-specific audit log activity
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { AuditService } from '@/lib/audit-service'
import { prisma as db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'

const auditService = new AuditService(db)

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId } = params

    // Check permissions - users can view their own activity, admins can view any
    const canViewOwnActivity = session.user.id === userId
    const canViewAllActivity = await hasPermission(session.user, 'system', 'read')

    if (!canViewOwnActivity && !canViewAllActivity) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view user activity' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const limit = parseInt(searchParams.get('limit') || '50')

    const activity = await auditService.getUserActivity(userId, days, limit)

    return NextResponse.json({
      success: true,
      data: {
        userId,
        activity,
        totalRecords: activity.length,
      },
    })
  } catch (error) {
    console.error('Failed to fetch user activity:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}