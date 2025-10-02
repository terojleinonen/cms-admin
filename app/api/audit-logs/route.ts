/**
 * Audit Logs API Endpoint
 * Handles frontend audit log submissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { AuditService } from '@/app/lib/audit-service'
import { db } from '@/app/lib/db'

const auditService = new AuditService(db)

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, resource, resourceId, details, severity } = body

    if (!action || !resource) {
      return NextResponse.json(
        { error: 'Missing required fields: action, resource' },
        { status: 400 }
      )
    }

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Log the audit entry
    const auditLog = await auditService.log({
      userId: session.user.id,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
      severity,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: auditLog.id,
        timestamp: auditLog.createdAt,
      },
    })
  } catch (error) {
    console.error('Audit log API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}