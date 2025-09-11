/**
 * User Sessions API
 * Handles session management operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { 
  getUserSessions, 
  invalidateSession, 
  logoutFromAllDevices,
  getSessionStatistics,
  detectSuspiciousActivity
} from '@/lib/session-management'
import { auditLog } from '@/lib/audit-service'
import { z } from 'zod'

const sessionActionSchema = z.object({
  action: z.enum(['logout_all', 'invalidate_session']),
  sessionId: z.string().uuid().optional(),
  currentSessionToken: z.string().optional()
})

/**
 * GET /api/users/[id]/sessions
 * Get user's active sessions and statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = params.id
    const currentUserId = session.user.id
    const userRole = session.user.role

    // Users can only view their own sessions, admins can view any user's sessions
    if (userId !== currentUserId && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get sessions and statistics
    const [sessions, statistics, suspiciousActivity] = await Promise.all([
      getUserSessions(userId),
      getSessionStatistics(userId),
      detectSuspiciousActivity(userId)
    ])

    // Mark current session if viewing own sessions
    const sessionsWithCurrent = sessions.map(s => ({
      ...s,
      isCurrent: userId === currentUserId && (session as any).sessionToken && s.token === (session as any).sessionToken
    }))

    return NextResponse.json({
      sessions: sessionsWithCurrent,
      statistics,
      suspiciousActivity,
      hasSecurityConcerns: suspiciousActivity.length > 0
    })
  } catch (error) {
    console.error('Error fetching user sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users/[id]/sessions
 * Perform session management actions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = params.id
    const currentUserId = session.user.id
    const userRole = session.user.role

    // Users can only manage their own sessions, admins can manage any user's sessions
    if (userId !== currentUserId && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = sessionActionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { action, sessionId, currentSessionToken } = validation.data
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '' || null
    const userAgent = request.headers.get('user-agent') || null

    switch (action) {
      case 'logout_all': {
        const invalidatedCount = await logoutFromAllDevices(userId, currentSessionToken)
        
        await auditLog({
          userId,
          action: 'LOGOUT_ALL_DEVICES',
          resource: 'USER_SESSION',
          details: { 
            invalidatedSessions: invalidatedCount,
            initiatedBy: currentUserId
          },
          request
        })

        return NextResponse.json({
          success: true,
          message: `Logged out from ${invalidatedCount} devices`,
          invalidatedSessions: invalidatedCount
        })
      }

      case 'invalidate_session': {
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Session ID is required for this action' },
            { status: 400 }
          )
        }

        const success = await invalidateSession(sessionId)
        
        if (success) {
          await auditLog({
            userId,
            action: 'SESSION_INVALIDATED',
            resource: 'USER_SESSION',
            details: { 
              sessionId,
              initiatedBy: currentUserId
            },
            request
          })

          return NextResponse.json({
            success: true,
            message: 'Session invalidated successfully'
          })
        } else {
          return NextResponse.json(
            { error: 'Failed to invalidate session' },
            { status: 500 }
          )
        }
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error managing user sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}