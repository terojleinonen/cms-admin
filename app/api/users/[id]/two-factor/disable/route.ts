/**
 * Two-Factor Authentication Disable API
 * Handles disabling 2FA for users
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { 
  disableTwoFactorAuth, 
  verifyTwoFactorToken,
  isTwoFactorRequired 
} from '@/lib/two-factor-auth'
import { auditLog } from '@/lib/audit-service'
import { verifyPassword } from '@/lib/password-utils'

interface DisableParams {
  params: { id: string }
}

/**
 * POST /api/users/[id]/two-factor/disable
 * Disable 2FA for a user (requires password and current 2FA token)
 */
export const POST = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    ,
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
    if (await isTwoFactorRequired(user.role) && session.user.role !== 'ADMIN') {
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
    if (!user.twoFactorSecret || !await verifyTwoFactorToken(userId, token)) {
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
    await disableTwoFactorAuth(userId)
    
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
    
    return createApiSuccessResponse(
      success: true,
      message: '2FA has been successfully disabled'
    )
    
  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)