/**
 * User Security Settings API endpoints
 * Handles GET, PUT operations for security settings and 2FA
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { 
  passwordChangeSchema,
  twoFactorVerificationSchema,
  sessionTerminationSchema,
  formatValidationErrors
} from '@/lib/user-validation-schemas'
import { hashPassword, verifyPassword } from '@/lib/password-utils'
import { getAuditService } from '@/lib/audit-service'
import { z } from 'zod'
import crypto from 'crypto'

// Check if user has access to security settings
async function requireSecurityAccess(userId: string) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  const isOwnProfile = session.user.id === userId
  const isAdmin = session.user.role === UserRole.ADMIN

  if (!isAdmin && !isOwnProfile) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Access denied' } },
      { status: 403 }
    )
  }

  return null
}

// Generate TOTP secret
function generateTOTPSecret(): string {
  return crypto.randomBytes(20).toString('hex')
}

// Verify TOTP token (simplified - in production use a proper TOTP library)
function verifyTOTPToken(secret: string, token: string): boolean {
  // This is a simplified implementation
  // In production, use a proper TOTP library like 'otplib'
  // TODO: Use a proper library that supports base32, or implement base32 decoding.
  const timeStep = Math.floor(Date.now() / 30000)
  const expectedToken = crypto
    .createHmac('sha1', Buffer.from(secret, 'base64'))
    .update(Buffer.from(timeStep.toString()))
    .digest('hex')
    .slice(-6)
  
  return expectedToken === token
}

// GET /api/users/[id]/security - Get security information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const authError = await requireSecurityAccess(resolvedParams.id)
    if (authError) return authError

    // Get user security information
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        updatedAt: true,
        sessions: {
          where: { isActive: true },
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            expiresAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    // Get recent security-related audit logs
    const auditService = getAuditService(prisma)
    const recentActivity = await auditService.getUserActivity(resolvedParams.id, 30, 20)
    
    // Filter for security-related activities
    const securityActivity = recentActivity.filter(log => 
      log.action.startsWith('auth.') || 
      log.action.startsWith('security.') ||
      log.action === 'user.password_changed'
    )

    const securityInfo = {
      twoFactorEnabled: user.twoFactorEnabled,
      lastPasswordChange: user.updatedAt, // Approximation - in production track this separately
      lastLoginAt: user.lastLoginAt,
      activeSessions: user.sessions,
      recentActivity: securityActivity.slice(0, 10),
      securityScore: calculateSecurityScore(user),
    }

    return NextResponse.json({ security: securityInfo })
  } catch (error) {
    console.error('Error fetching security information:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch security information' } },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id]/security - Update security settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const authError = await requireSecurityAccess(resolvedParams.id)
    if (authError) return authError

    const session = await auth()
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'change_password':
        return await handlePasswordChange(resolvedParams.id, data, request, session)
      
      case 'setup_2fa':
        return await handleTwoFactorSetup(resolvedParams.id, data, request, session)
      
      case 'verify_2fa':
        return await handleTwoFactorVerification(resolvedParams.id, data, request, session)
      
      case 'disable_2fa':
        return await handleTwoFactorDisable(resolvedParams.id, data, request, session)
      
      case 'terminate_sessions':
        return await handleSessionTermination(resolvedParams.id, data, request, session)
      
      default:
        return NextResponse.json(
          { error: { code: 'INVALID_ACTION', message: 'Invalid security action' } },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error updating security settings:', error)
    
    if (error instanceof z.ZodError) {
      const validationErrors = formatValidationErrors(error)
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: validationErrors.message,
            details: validationErrors.errors
          } 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update security settings' } },
      { status: 500 }
    )
  }
}

// Handle password change
async function handlePasswordChange(
  userId: string,
  data: unknown,
  request: NextRequest,
  session: unknown
) {
  const validatedData = passwordChangeSchema.parse(data)
  
  // Get current user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true }
  })

  if (!user) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'User not found' } },
      { status: 404 }
    )
  }

  // Verify current password
  const isCurrentPasswordValid = await verifyPassword(
    validatedData.currentPassword,
    user.passwordHash
  )

  if (!isCurrentPasswordValid) {
    return NextResponse.json(
      { error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } },
      { status: 400 }
    )
  }

  // Hash new password
  const newPasswordHash = await hashPassword(validatedData.newPassword)

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash }
  })

  // Log password change
  const auditService = getAuditService(prisma)
  await auditService.logAuth(
    userId,
    'PASSWORD_CHANGED',
    { changedBy: (session as any)?.user?.id },
    request.headers.get('x-forwarded-for') || '',
    request.headers.get('user-agent') || undefined
  )

  return NextResponse.json({ message: 'Password changed successfully' })
}

// Handle 2FA setup
async function handleTwoFactorSetup(
  userId: string,
  data: unknown,
  request: NextRequest,
  session: unknown
) {
  // Generate new TOTP secret
  const secret = generateTOTPSecret()
  
  // Store temporary secret (in production, use a more secure temporary storage)
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret }
  })

  // Return setup information
  return NextResponse.json({
    secret,
    qrCodeUrl: `otpauth://totp/CMS%20Admin:${(session as any)?.user?.email}?secret=${secret}&issuer=CMS%20Admin`,
    backupCodes: generateBackupCodes(), // Generate backup codes
  })
}

// Handle 2FA verification
async function handleTwoFactorVerification(
  userId: string,
  data: unknown,
  request: NextRequest,
  session: unknown
) {
  const validatedData = twoFactorVerificationSchema.parse(data)
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, twoFactorSecret: true }
  })

  if (!user?.twoFactorSecret) {
    return NextResponse.json(
      { error: { code: 'NO_2FA_SETUP', message: '2FA setup not found' } },
      { status: 400 }
    )
  }

  // Verify TOTP token
  const isValidToken = verifyTOTPToken(user.twoFactorSecret, validatedData.token)

  if (!isValidToken) {
    return NextResponse.json(
      { error: { code: 'INVALID_TOKEN', message: 'Invalid 2FA token' } },
      { status: 400 }
    )
  }

  // Enable 2FA
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true }
  })

  // Log 2FA enablement
  const auditService = getAuditService(prisma)
  await auditService.logAuth(
    userId,
    'TWO_FACTOR_ENABLED',
    { enabledBy: (session as any)?.user?.id },
    request.headers.get('x-forwarded-for') || '',
    request.headers.get('user-agent') || undefined
  )

  return NextResponse.json({ message: '2FA enabled successfully' })
}

// Handle 2FA disable
async function handleTwoFactorDisable(
  userId: string,
  data: unknown,
  request: NextRequest,
  session: unknown
) {
  const { currentPassword } = data as any

  if (!currentPassword) {
    return NextResponse.json(
      { error: { code: 'PASSWORD_REQUIRED', message: 'Current password is required to disable 2FA' } },
      { status: 400 }
    )
  }

  // Get current user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true, twoFactorEnabled: true }
  })

  if (!user) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'User not found' } },
      { status: 404 }
    )
  }

  if (!user.twoFactorEnabled) {
    return NextResponse.json(
      { error: { code: '2FA_NOT_ENABLED', message: '2FA is not enabled' } },
      { status: 400 }
    )
  }

  // Verify current password
  const isPasswordValid = await verifyPassword(currentPassword, user.passwordHash)

  if (!isPasswordValid) {
    return NextResponse.json(
      { error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } },
      { status: 400 }
    )
  }

  // Disable 2FA
  await prisma.user.update({
    where: { id: userId },
    data: { 
      twoFactorEnabled: false,
      twoFactorSecret: null
    }
  })

  // Log 2FA disablement
  const auditService = getAuditService(prisma)
  await auditService.logAuth(
    userId,
    'TWO_FACTOR_DISABLED',
    { disabledBy: (session as any)?.user?.id },
    request.headers.get('x-forwarded-for') || '',
    request.headers.get('user-agent') || undefined
  )

  return NextResponse.json({ message: '2FA disabled successfully' })
}

// Handle session termination
async function handleSessionTermination(
  userId: string,
  data: unknown,
  request: NextRequest,
  session: unknown
) {
  const validatedData = sessionTerminationSchema.parse(data)

  if (validatedData.terminateAll) {
    // Terminate all sessions except current one
    await prisma.session.updateMany({
      where: {
        userId,
        isActive: true,
        token: { not: (session as any)?.sessionToken || '' }
      },
      data: { isActive: false }
    })
  } else {
    // Terminate specific sessions
    await prisma.session.updateMany({
      where: {
        id: { in: validatedData.sessionIds },
        userId,
        isActive: true
      },
      data: { isActive: false }
    })
  }

  // Log session termination
  const auditService = getAuditService(prisma)
  await auditService.logAuth(
    userId,
    'SESSION_TERMINATED',
    { 
      terminatedBy: (session as any)?.user?.id,
      terminateAll: validatedData.terminateAll,
      sessionCount: validatedData.terminateAll ? 'all' : validatedData.sessionIds.length
    },
    request.headers.get('x-forwarded-for') || '',
    request.headers.get('user-agent') || undefined
  )

  return NextResponse.json({ message: 'Sessions terminated successfully' })
}

interface SessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
}

interface SecurityUser {
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  sessions: SessionInfo[];
}

// Calculate security score
function calculateSecurityScore(user: SecurityUser): number {
  let score = 0
  
  // Base score
  score += 20
  
  // 2FA enabled
  if (user.twoFactorEnabled) score += 30
  
  // Recent login (within 30 days)
  if (user.lastLoginAt && (Date.now() - user.lastLoginAt.getTime()) < 30 * 24 * 60 * 60 * 1000) {
    score += 20
  }
  
  // Active sessions (reasonable number)
  const sessionCount = user.sessions?.length || 0
  if (sessionCount > 0 && sessionCount <= 3) score += 15
  else if (sessionCount > 3) score += 5
  
  // Account age (older accounts are more established)
  // This is simplified - in production you'd have account creation date
  score += 15
  
  return Math.min(score, 100)
}

// Generate backup codes
function generateBackupCodes(): string[] {
  const codes = []
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
  }
  return codes
}