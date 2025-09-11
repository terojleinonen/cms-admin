/**
 * Resolve Security Event API
 * POST /api/admin/security/events/[id]/resolve - Resolve a security event
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { SecurityService } from '@/lib/security'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin role
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // Get security service instance
    const securityService = SecurityService.getInstance(prisma)
    
    // Resolve the security event
    const resolved = await securityService.resolveSecurityEvent(id, session.user.id)

    if (!resolved) {
      return NextResponse.json(
        { error: 'Security event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Resolve security event API error:', error)
    return NextResponse.json(
      { error: 'Failed to resolve security event' },
      { status: 500 }
    )
  }
}