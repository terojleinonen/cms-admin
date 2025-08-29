/**
 * Data Retention Preview API
 * Provides preview of what would be cleaned up with given retention policy
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth-config'
import { prisma } from '../../../../lib/db'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { DataRetentionService } from '../../../../lib/data-retention'

const retentionPolicySchema = z.object({
  auditLogRetentionDays: z.number().min(1).max(3650),
  inactiveSessionRetentionDays: z.number().min(1).max(365),
  deactivatedUserRetentionDays: z.number().min(1).max(3650),
  mediaFileRetentionDays: z.number().min(1).max(3650),
  backupRetentionDays: z.number().min(1).max(3650),
})

// Check if user has admin permissions
async function requireAdminAccess() {
  const session = await getServerSession(authOptions)
  
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

// POST /api/admin/data-retention/preview - Get cleanup preview
export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdminAccess()
    if (authError) return authError

    const body = await request.json()
    const policy = retentionPolicySchema.parse(body)

    // Create data retention service with the provided policy
    const retentionService = new DataRetentionService(prisma, policy)

    // Get cleanup preview (dry run)
    const preview = await retentionService.getCleanupPreview(policy)

    return NextResponse.json({
      success: true,
      preview,
      policy,
    })

  } catch (error) {
    console.error('Error getting cleanup preview:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid retention policy',
            details: error.issues
          } 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get cleanup preview' } },
      { status: 500 }
    )
  }
}