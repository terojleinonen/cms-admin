/**
 * Unblock IP API
 * POST /api/admin/security/unblock-ip - Unblock an IP address
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SecurityService } from '@/lib/security'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const unblockIPSchema = z.object({
  ip: z.string().ip('Invalid IP address')
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate request body
    const body = await request.json()
    const { ip } = unblockIPSchema.parse(body)

    // Get security service instance
    const securityService = SecurityService.getInstance(prisma)
    
    // Unblock the IP address
    securityService.unblockIP(ip)

    // Log the admin action
    await securityService.logSecurityEvent(
      'admin_action',
      'medium',
      `IP address ${ip} unblocked by admin`,
      request.headers.get('x-forwarded-for') || request.ip || 'unknown',
      { 
        action: 'unblock_ip',
        targetIP: ip,
        adminId: session.user.id
      },
      session.user.id,
      request.headers.get('user-agent') || undefined
    )

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Unblock IP API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to unblock IP address' },
      { status: 500 }
    )
  }
}