/**
 * Bulk User Operations API
 * Handles bulk operations on multiple users
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

// Validation schemas
const bulkOperationSchema = z.object({
  operation: z.enum(['activate', 'deactivate', 'change_role', 'reset_password', 'send_invitation']),
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
  data: z.object({
    role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional(),
  }).optional(),
})

// Check if user has admin permissions
async function requireAdminAccess() {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 }
    )
  }

  return null
}

// POST /api/admin/users/bulk - Perform bulk operations on users
export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdminAccess()
    if (authError) return authError

    const session = await auth()
    const body = await request.json()
    const { operation, userIds, data } = bulkOperationSchema.parse(body)

    let updated = 0
    const errors: string[] = []

    // Validate that users exist
    const existingUsers = await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      }
    })

    if (existingUsers.length !== userIds.length) {
      const foundIds = existingUsers.map(u => u.id)
      const missingIds = userIds.filter(id => !foundIds.includes(id))
      errors.push(`Users not found: ${missingIds.join(', ')}`)
    }

    // Prevent admin from deactivating themselves
    if ((operation === 'deactivate' || (operation === 'change_role' && data?.role !== 'ADMIN')) && 
        session?.user?.id && userIds.includes(session.user.id)) {
      errors.push('Cannot deactivate or demote your own account')
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Operation validation failed', details: errors } },
        { status: 400 }
      )
    }

    // Perform the bulk operation
    switch (operation) {
      case 'activate':
        const activateResult = await prisma.user.updateMany({
          where: {
            id: { in: userIds },
            isActive: false, // Only update inactive users
          },
          data: {
            isActive: true,
            updatedAt: new Date(),
          }
        })
        updated = activateResult.count
        break

      case 'deactivate':
        const deactivateResult = await prisma.user.updateMany({
          where: {
            id: { in: userIds },
            isActive: true, // Only update active users
          },
          data: {
            isActive: false,
            updatedAt: new Date(),
          }
        })
        updated = deactivateResult.count

        // Also invalidate all sessions for deactivated users
        await prisma.session.updateMany({
          where: {
            userId: { in: userIds }
          },
          data: {
            isActive: false,
          }
        })
        break

      case 'change_role':
        if (!data?.role) {
          return NextResponse.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Role is required for role change operation' } },
            { status: 400 }
          )
        }

        const roleChangeResult = await prisma.user.updateMany({
          where: {
            id: { in: userIds },
          },
          data: {
            role: data.role as UserRole,
            updatedAt: new Date(),
          }
        })
        updated = roleChangeResult.count
        break

      case 'reset_password':
        // In a real implementation, this would send password reset emails
        // For now, we'll just log the action
        updated = existingUsers.length
        
        // Create audit logs for password reset requests
        const auditLogs = existingUsers.map(user => ({
          userId: user.id,
          action: 'PASSWORD_RESET_REQUESTED',
          resource: 'user',
          details: {
            requestedBy: session?.user?.id,
            requestedAt: new Date(),
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }))

        await prisma.auditLog.createMany({
          data: auditLogs
        })
        break

      case 'send_invitation':
        // Filter to only unverified users
        const unverifiedUsers = existingUsers.filter(u => !u.email)
        updated = unverifiedUsers.length

        // In a real implementation, this would send invitation emails
        // Create audit logs for invitations sent
        if (unverifiedUsers.length > 0) {
          const invitationLogs = unverifiedUsers.map(user => ({
            userId: user.id,
            action: 'INVITATION_SENT',
            resource: 'user',
            details: {
              sentBy: session?.user?.id,
              sentAt: new Date(),
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          }))

          await prisma.auditLog.createMany({
            data: invitationLogs
          })
        }
        break

      default:
        return NextResponse.json(
          { error: { code: 'INVALID_OPERATION', message: 'Unknown bulk operation' } },
          { status: 400 }
        )
    }

    // Create audit log for the bulk operation
    await prisma.auditLog.create({
      data: {
        userId: session?.user?.id || 'system',
        action: `BULK_${operation.toUpperCase()}`,
        resource: 'users',
        details: {
          operation,
          userIds,
          data,
          updated,
          performedAt: new Date(),
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    return NextResponse.json({
      success: true,
      operation,
      updated,
      message: `Successfully ${operation.replace('_', ' ')}d ${updated} user${updated !== 1 ? 's' : ''}`,
    })

  } catch (error) {
    console.error('Error performing bulk operation:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid operation data', details: error.issues } },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to perform bulk operation' } },
      { status: 500 }
    )
  }
}