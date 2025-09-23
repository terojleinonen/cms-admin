/**
 * Account Deactivation API
 * Handles account deactivation and reactivation workflows
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { UserRole, Prisma } from '@prisma/client'
import { z } from 'zod'
import { getAuditService } from '@/lib/audit-service'
import bcrypt from 'bcryptjs'

const deactivationSchema = z.object({
  reason: z.string().min(1, 'Deactivation reason is required').max(500),
  confirmPassword: z.string().min(1, 'Password confirmation is required').optional(),
  dataRetention: z.boolean().default(true),
})

const reactivationSchema = z.object({
  notifyUser: z.boolean().default(true),
  reason: z.string().min(1, 'Reactivation reason is required').max(500),
})

// Check access permissions
async function requireUserAccess(userId: string, requireAdmin = false) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  const isOwnProfile = session.user.id === userId
  const isAdmin = session.user.role === UserRole.ADMIN

  if (requireAdmin && !isAdmin) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 }
    )
  }

  if (!isAdmin && !isOwnProfile) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Access denied' } },
      { status: 403 }
    )
  }

  return null
}

// POST /api/users/[id]/deactivate - Deactivate user account
export const POST = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    const resolvedParams = await params
    const isOwnProfile = session?.user?.id === resolvedParams.id
    const isAdmin = session?.user?.role === UserRole.ADMIN

    // Users can deactivate their own account, admins can deactivate any account
    const authError = await requireUserAccess(resolvedParams.id, false)
    if (authError) return authError

    const body = await request.json()
    const data = deactivationSchema.parse(body)

    // Check if user exists and is active
    const existingUser = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        passwordHash: true,
      }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    if (!existingUser.isActive) {
      return NextResponse.json(
        { error: { code: 'ALREADY_DEACTIVATED', message: 'Account is already deactivated' } },
        { status: 400 }
      )
    }

    // Prevent admin from deactivating themselves
    if (isOwnProfile && isAdmin) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Admin users cannot deactivate their own account' } },
        { status: 403 }
      )
    }

    // For self-deactivation, verify password
    if (isOwnProfile && data.confirmPassword) {
      const isValidPassword = await bcrypt.compare(data.confirmPassword, existingUser.passwordHash)
      
      if (!isValidPassword) {
        return NextResponse.json(
          { error: { code: 'INVALID_PASSWORD', message: 'Invalid password confirmation' } },
          { status: 400 }
        )
      }
    }

    // Perform deactivation in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Deactivate the user
      const deactivatedUser = await tx.user.update({
        where: { id: resolvedParams.id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        }
      })

      // Invalidate all active sessions
      await tx.session.updateMany({
        where: {
          userId: resolvedParams.id,
          isActive: true,
        },
        data: {
          isActive: false,
        }
      })

      // Create audit log
      const auditService = getAuditService(tx)
      await auditService.logUser(
        session?.user?.id || resolvedParams.id,
        resolvedParams.id,
        'DEACTIVATED',
        {
          reason: data.reason,
          deactivatedBy: isOwnProfile ? 'self' : 'admin',
          dataRetention: data.dataRetention,
          deactivatedAt: new Date(),
        },
        request.headers.get('x-forwarded-for') || '',
        request.headers.get('user-agent') || undefined
      )

      return deactivatedUser
    })

    return createApiSuccessResponse(
      success: true,
      message: 'Account deactivated successfully',
      user: result,
    )

  } catch (error) {
    console.error('Error deactivating account:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid deactivation data',
            details: error.issues
          } 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate account' } },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'users', action: 'create', scope: 'all' }]
}
)

// PUT /api/users/[id]/deactivate - Reactivate user account (admin only)
export const PUT = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    const resolvedParams = await params
    const authError = await requireUserAccess(resolvedParams.id, true) // Require admin
    if (authError) return authError

    const body = await request.json()
    const data = reactivationSchema.parse(body)

    // Check if user exists and is inactive
    const existingUser = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    if (existingUser.isActive) {
      return NextResponse.json(
        { error: { code: 'ALREADY_ACTIVE', message: 'Account is already active' } },
        { status: 400 }
      )
    }

    // Perform reactivation in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Reactivate the user
      const reactivatedUser = await tx.user.update({
        where: { id: resolvedParams.id },
        data: {
          isActive: true,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        }
      })

      // Create audit log
      const auditService = getAuditService(tx)
      await auditService.logUser(
        session?.user?.id || '',
        resolvedParams.id,
        'ACTIVATED',
        {
          reason: data.reason,
          reactivatedBy: session?.user?.id,
          notifyUser: data.notifyUser,
          reactivatedAt: new Date(),
        },
        request.headers.get('x-forwarded-for') || '',
        request.headers.get('user-agent') || undefined
      )

      return reactivatedUser
    })

    // TODO: Send notification email to user if notifyUser is true
    // This would be implemented with an email service

    return createApiSuccessResponse(
      success: true,
      message: 'Account reactivated successfully',
      user: result,
    )

  } catch (error) {
    console.error('Error reactivating account:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid reactivation data',
            details: error.issues
          } 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to reactivate account' } },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'users', action: 'update', scope: 'all' }]
}
)