/**
 * Two-Factor Authentication Verification API
 * Handles 2FA token verification during login
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateTwoFactorForLogin } from '@/lib/two-factor-auth'
import { auditLog } from '@/lib/audit-service'

interface VerifyParams {
  params: { id: string }
}

/**
 * POST /api/users/[id]/two-factor/verify
 * Verify 2FA token during login process
 */
export async function POST(
  request: NextRequest,
  { params }: VerifyParams
) {
  try {
    const userId = params.id
    const body = await request.json()
    const { token } = body
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
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
        isActive: true
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'User account is deactivated' },
        { status: 403 }
      )
    }
    
    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled for this user' },
        { status: 400 }
      )
    }
    
    // Validate the 2FA token
    // Re-evaluating this file
    const validation = await validateTwoFactorForLogin(userId, token)
    
    if (!validation.success) {
      // Log failed verification attempt
      await auditLog({
        userId: userId,
        action: '2FA_VERIFICATION_FAILED',
        resource: 'USER_SECURITY',
        details: {
          userEmail: user.email,
          tokenType: 'unknown'
        },
        request
      })
      
      return NextResponse.json(
        { error: 'Invalid 2FA token' },
        { status: 400 }
      )
    }
    
    // Log successful verification
    await auditLog({
      userId: userId,
      action: '2FA_VERIFICATION_SUCCESS',
      resource: 'USER_SECURITY',
      details: {
        userEmail: user.email,
        tokenType: validation.isBackupCode ? 'backup_code' : 'totp',
        isBackupCode: validation.isBackupCode
      },
      request
    })
    
    // Update last login time
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    })
    
    return NextResponse.json({
      success: true,
      isBackupCode: validation.isBackupCode,
      message: validation.isBackupCode 
        ? 'Login successful using backup code' 
        : 'Login successful'
    })
    
  } catch (error) {
    console.error('2FA verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}