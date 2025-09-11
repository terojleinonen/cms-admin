/**
 * Two-Factor Authentication Status API
 * Handles checking 2FA status and requirements
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { 
  getRemainingBackupCodes,
  isTwoFactorRequired 
} from '@/lib/two-factor-auth'

interface StatusParams {
  params: { id: string }
}

/**
 * GET /api/users/[id]/two-factor/status
 * Get 2FA status and requirements for a user
 */
export async function GET(
  request: NextRequest,
  { params }: StatusParams
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const userId = params.id
    
    // Check if user can access this resource
    if (session.user.id !== userId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    let remainingBackupCodes = 0
    
    // Get backup codes count if 2FA is enabled
    if (user.twoFactorEnabled) {
      remainingBackupCodes = await getRemainingBackupCodes(userId)
    }
    
    const isRequired = await isTwoFactorRequired(user.role)
    
    return NextResponse.json({
      enabled: user.twoFactorEnabled,
      required: isRequired,
      canDisable: !isRequired || session.user.role === 'ADMIN',
      remainingBackupCodes,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
    
  } catch (error) {
    console.error('2FA status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}