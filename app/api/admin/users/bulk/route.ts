/**
 * Admin Users Bulk Operations API endpoint
 * Handles bulk operations on multiple users
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { hashPassword } from '@/lib/password-utils'
import { auditService } from '@/lib/audit-service'

// Validation schema for bulk operations
const bulkOperationSchema = z.object({
  operation: z.enum(['activate', 'deactivate', 'change_role', 'reset_password', 'send_invitation']),
  userIds: z.array(z.string().uuid()),
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
    const adminUser = session!.user

    const body = await request.json()
    const validation = bulkOperationSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      )
    }

    const { operation, userIds, data } = validation.data

    // Validate that userIds exist and get user details
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    })

    if (users.length !== userIds.length) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Some users not found' } },
        { status: 404 }
      )
    }

    let updated = 0
    const results: Array<{ userId: string; success: boolean; error?: string }> = []

    // Perform the bulk operation
    switch (operation) {
      case 'activate':
        {
          const inactiveUsers = users.filter(u => !u.isActive)
          if (inactiveUsers.length > 0) {
            await prisma.user.updateMany({
              where: {
                id: { in: inactiveUsers.map(u => u.id) },
              },
              data: {
                isActive: true,
                updatedAt: new Date(),
              },
            })
            updated = inactiveUsers.length

            // Log audit events
            for (const user of inactiveUsers) {
              await auditService.log({
                userId: adminUser.id,
                action: 'USER_ACTIVATED',
                resource: 'users',
                resourceId: user.id,
                details: {
                  targetUser: { id: user.id, name: user.name, email: user.email },
                  bulkOperation: true,
                },
              })
              results.push({ userId: user.id, success: true })
            }
          }
        }
        break

      case 'deactivate':
        {
          const activeUsers = users.filter(u => u.isActive && u.id !== adminUser.id) // Can't deactivate self
          if (activeUsers.length > 0) {
            await prisma.user.updateMany({
              where: {
                id: { in: activeUsers.map(u => u.id) },
              },
              data: {
                isActive: false,
                updatedAt: new Date(),
              },
            })
            updated = activeUsers.length

            // Log audit events
            for (const user of activeUsers) {
              await auditService.log({
                userId: adminUser.id,
                action: 'USER_DEACTIVATED',
                resource: 'users',
                resourceId: user.id,
                details: {
                  targetUser: { id: user.id, name: user.name, email: user.email },
                  bulkOperation: true,
                },
              })
              results.push({ userId: user.id, success: true })
            }

            // Handle users that couldn't be deactivated (self)
            const skippedUsers = users.filter(u => u.id === adminUser.id)
            for (const user of skippedUsers) {
              results.push({ 
                userId: user.id, 
                success: false, 
                error: 'Cannot deactivate your own account' 
              })
            }
          }
        }
        break

      case 'change_role':
        {
          if (!data?.role) {
            return NextResponse.json(
              { error: { code: 'VALIDATION_ERROR', message: 'Role is required for change_role operation' } },
              { status: 400 }
            )
          }

          const eligibleUsers = users.filter(u => u.role !== data.role && u.id !== adminUser.id) // Can't change own role
          if (eligibleUsers.length > 0) {
            await prisma.user.updateMany({
              where: {
                id: { in: eligibleUsers.map(u => u.id) },
              },
              data: {
                role: data.role,
                updatedAt: new Date(),
              },
            })
            updated = eligibleUsers.length

            // Log audit events and role change history
            for (const user of eligibleUsers) {
              await auditService.log({
                userId: adminUser.id,
                action: 'USER_ROLE_CHANGED',
                resource: 'users',
                resourceId: user.id,
                details: {
                  targetUser: { id: user.id, name: user.name, email: user.email },
                  oldRole: user.role,
                  newRole: data.role,
                  bulkOperation: true,
                },
              })

              // Create role change history record
              await prisma.roleChangeHistory.create({
                data: {
                  userId: user.id,
                  oldRole: user.role,
                  newRole: data.role,
                  changedBy: adminUser.id,
                  reason: 'Bulk role change operation',
                },
              })

              results.push({ userId: user.id, success: true })
            }

            // Handle users that couldn't be changed (self or already has role)
            const skippedUsers = users.filter(u => u.role === data.role || u.id === adminUser.id)
            for (const user of skippedUsers) {
              const reason = u.id === adminUser.id 
                ? 'Cannot change your own role' 
                : `User already has ${data.role} role`
              results.push({ 
                userId: user.id, 
                success: false, 
                error: reason
              })
            }
          }
        }
        break

      case 'reset_password':
        {
          // For password reset, we'll generate password reset tokens
          // In a real implementation, this would send emails
          for (const user of users) {
            try {
              // Create password reset token (simplified - in real app would send email)
              const resetToken = crypto.randomUUID()
              const tokenHash = await hashPassword(resetToken) // Simple hash for demo
              
              await prisma.passwordResetToken.create({
                data: {
                  userId: user.id,
                  tokenHash,
                  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                },
              })

              await auditService.log({
                userId: adminUser.id,
                action: 'PASSWORD_RESET_INITIATED',
                resource: 'users',
                resourceId: user.id,
                details: {
                  targetUser: { id: user.id, name: user.name, email: user.email },
                  bulkOperation: true,
                },
              })

              results.push({ userId: user.id, success: true })
              updated++
            } catch (error) {
              results.push({ 
                userId: user.id, 
                success: false, 
                error: 'Failed to create reset token' 
              })
            }
          }
        }
        break

      case 'send_invitation':
        {
          const uninvitedUsers = users.filter(u => !u.emailVerified)
          // In a real implementation, this would send invitation emails
          for (const user of uninvitedUsers) {
            await auditService.log({
              userId: adminUser.id,
              action: 'INVITATION_SENT',
              resource: 'users',
              resourceId: user.id,
              details: {
                targetUser: { id: user.id, name: user.name, email: user.email },
                bulkOperation: true,
              },
            })
            results.push({ userId: user.id, success: true })
          }
          updated = uninvitedUsers.length

          // Handle users that don't need invitations
          const alreadyVerifiedUsers = users.filter(u => u.emailVerified)
          for (const user of alreadyVerifiedUsers) {
            results.push({ 
              userId: user.id, 
              success: false, 
              error: 'User email already verified' 
            })
          }
        }
        break

      default:
        return NextResponse.json(
          { error: { code: 'INVALID_OPERATION', message: 'Unknown operation' } },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      operation,
      updated,
      results,
      message: `Successfully performed ${operation} on ${updated} users`,
    })

  } catch (error) {
    console.error('Error performing bulk operation:', error)
    
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to perform bulk operation',
          timestamp: new Date().toISOString()
        },
        success: false
      },
      { status: 500 }
    )
  }
}