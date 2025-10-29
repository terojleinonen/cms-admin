/**
 * Two-Factor Authentication Setup API
 * Handles 2FA setup initiation and completion
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { 
  generateTwoFactorSetup, 
  enableTwoFactorAuth,
  isTwoFactorRequired 
} from '@/lib/two-factor-auth'
import { auditLog } from '@/lib/audit-service'

interface SetupParams {
  params: { id: string }
}

/**
 * GET /api/users/[id]/two-factor/setup
 * Generate 2FA setup data (secret, QR code, backup codes)
 */
export const GET = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    
  try {
    if (!user) {
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
        twoFactorEnabled: true
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled for this user' },
        { status: 400 }
      )
    }
    
    // Generate 2FA setup data
    const setupData = await generateTwoFactorSetup(user.id, user.email)
    
    // Log the setup initiation
    await auditLog({
      userId: session.user.id,
      action: '2FA_SETUP_INITIATED',
      resource: 'USER_SECURITY',
      details: {
        targetUserId: userId,
        userEmail: user.email
      },
      request
    })
    
    return createApiSuccessResponse({
      secret: setupData.secret,
      otpauth: setupData.otpauth,
      backupCodes: setupData.backupCodes,
      setupInstructions: setupData.setupInstructions,
      isRequired: await isTwoFactorRequired(user.role)
    })
    
  } catch (error) {
    console.error('2FA setup error:', error)
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

/**
 * POST /api/users/[id]/two-factor/setup
 * Complete 2FA setup by verifying token
 */
export const POST = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    
  try {
    if (!user) {
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
    const { token, secret, backupCodes } = body
    
    if (!token || !secret || !backupCodes) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
        twoFactorEnabled: true
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled for this user' },
        { status: 400 }
      )
    }
    
    // Enable 2FA
    await enableTwoFactorAuth(userId, token)
    
    // Log successful 2FA setup
    await auditLog({
      userId: session.user.id,
      action: '2FA_ENABLED',
      resource: 'USER_SECURITY',
      details: {
        targetUserId: userId,
        userEmail: user.email
      },
      request
    })
    
    return createApiSuccessResponse({
      success: true,
      message: '2FA has been successfully enabled'
    })
    
  } catch (error) {
    console.error('2FA setup completion error:', error)
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