/**
 * Two-Factor Authentication Disable API
 * Handles disabling 2FA for users
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth-config'
import { prisma } from '@/app/lib/db'
import { 
  disableTwoFactorAuth, 
  verifyTwoFactorToken,
  isTwoFactorRequired 
} from '@/app/lib/two-factor-auth'
import { auditLog } from '@/app/lib/audit-service'
import { verifyPassword } from '@/app/lib/password-utils'

interface DisableParams {
  params: { id: string }
}

/**
 * POST /api/users/[id]/two-factor/disable
 * Disable 2FA for a user (requires password and current 2FA token)
 */
export async function POST(
  request: NextRequest,
  { params }: DisableParams
) {
  try {
    const session = await getServerSession(authOptions)
    
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
    
    const body = await request.json()
    const { password, token } = body
    
    if (!password || !token) {
      return NextResponse.json(
        { error: 'Password and 2FA token are required' },
        { status: 400 }
      )
    }
    
    // Get user details including password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        twoFactorEnabled: true,
        twoFactorSecret: true
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled for this user' },
        { status: 400 }
      )
    }
    
    // Check if 2FA is required for this user role
    if (isTwoFactorRequired(user.role) && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '2FA is required for this user role and cannot be disabled' },
        { status: 403 }
      )
    }
    
    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash)
    if (!isPasswordValid) {
      await auditLog({
        userId: session.user.id,
        action: '2FA_DISABLE_FAILED',
        resource: 'USER_SECURITY',
        details: {
          targetUserId: userId,
          userEmail: user.email,
          reason: 'Invalid password'
        },
        request
      })
      
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 400 }
      )
    }
    
    // Verify 2FA token
    if (!user.twoFactorSecret || !verifyTwoFactorToken(token, user.twoFactorSecret)) {
      await auditLog({
        userId: session.user.id,
        action: '2FA_DISABLE_FAILED',
        resource: 'USER_SECURITY',
        details: {
          targetUserId: userId,
          userEmail: user.email,
          reason: 'Invalid 2FA token'
        },
        request
      })
      
      return NextResponse.json(
        { error: 'Invalid 2FA token' },
        { status: 400 }
      )
    }
    
    // Disable 2FA
    const success = await disableTwoFactorAuth(userId)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to disable 2FA' },
        { status: 500 }
      )
    }
    
    // Log successful 2FA disable
    await auditLog({
      userId: session.user.id,
      action: '2FA_DISABLED',
      resource: 'USER_SECURITY',
      details: {
        targetUserId: userId,
        userEmail: user.email,
        disabledBy: session.user.id === userId ? 'self' : 'admin'
      },
      request
    })
    
    return NextResponse.json({
      success: true,
      message: '2FA has been successfully disabled'
    })
    
  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}