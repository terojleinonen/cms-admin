/**
 * Security Statistics API
 * GET /api/admin/security/stats - Get security statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { SecurityService } from '@/lib/security'
import { prisma } from '@/lib/db'

export async function GET(_request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get security service instance
    const securityService = SecurityService.getInstance(prisma)
    
    // Get security statistics
    const stats = await securityService.getSecurityStats()

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Security stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security statistics' },
      { status: 500 }
    )
  }
}