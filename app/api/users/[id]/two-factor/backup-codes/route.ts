/**
 * Two-Factor Authentication Backup Codes API
 * Handles backup codes management
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { 
  getRemainingBackupCodes, 
  regenerateBackupCodes,
  verifyTwoFactorToken 
} from '@/lib/two-factor-auth'
import { auditLog } from '@/lib/audit-service'

interface BackupCodesParams {
  params: { id: string }
}

/**
 * GET /api/users/[id]/two-factor/backup-codes
 * Get remaining backup codes count
 */
export async function GET(
  request: NextRequest,
  { params }: BackupCodesParams
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
        twoFactorEnabled: true
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
    
    // Get remaining backup codes count
    const remainingCodes = await getRemainingBackupCodes(userId)
    
    return NextResponse.json({
      remainingCodes,
      totalCodes: 10 // Standard number of backup codes
    })
    
  } catch (error) {
    console.error('Backup codes get error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users/[id]/two-factor/backup-codes
 * Regenerate backup codes (requires 2FA token)
 */
export async function POST(
  request: NextRequest,
  { params }: BackupCodesParams
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
    
    const body = await request.json()
    const { token } = body
    
    if (!token) {
      return NextResponse.json(
        { error: '2FA token is required' },
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
    
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA is not enabled for this user' },
        { status: 400 }
      )
    }
    
    // Verify 2FA token
    if (!verifyTwoFactorToken(token, user.twoFactorSecret)) {
      await auditLog({
        userId: session.user.id,
        action: 'BACKUP_CODES_REGENERATE_FAILED',
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
    
    // Regenerate backup codes
    const newBackupCodes = await regenerateBackupCodes(userId)
    
    // Log backup codes regeneration
    await auditLog({
      userId: session.user.id,
      action: 'BACKUP_CODES_REGENERATED',
      resource: 'USER_SECURITY',
      details: {
        targetUserId: userId,
        userEmail: user.email,
        codesCount: newBackupCodes.length
      },
      request
    })
    
    return NextResponse.json({
      success: true,
      backupCodes: newBackupCodes,
      message: 'Backup codes have been regenerated'
    })
    
  } catch (error) {
    console.error('Backup codes regenerate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}