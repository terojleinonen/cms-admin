/**
 * Security Events API
 * GET /api/admin/security/events - Get security events
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SecurityService } from '@/lib/security'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const severity = searchParams.get('severity') || undefined
    const type = searchParams.get('type') || undefined

    // Get security service instance
    const securityService = SecurityService.getInstance(prisma)
    
    // Get security events
    const events = await securityService.getSecurityEvents(limit, severity, type as any)

    return NextResponse.json({ events })

  } catch (error) {
    console.error('Security events API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security events' },
      { status: 500 }
    )
  }
}