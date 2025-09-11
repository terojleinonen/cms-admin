/**
 * Data Retention Cleanup API
 * Performs actual data cleanup based on retention policy
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from "@/auth"
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { AuditRetentionManager } from '@/lib/audit-retention'
import { getAuditService } from '@/lib/audit-service'

const retentionPolicySchema = z.object({
  auditLogRetentionDays: z.number().min(1).max(3650),
  inactiveSessionRetentionDays: z.number().min(1).max(365),
  deactivatedUserRetentionDays: z.number().min(1).max(3650),
  mediaFileRetentionDays: z.number().min(1).max(3650),
  backupRetentionDays: z.number().min(1).max(3650),
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

// POST /api/admin/data-retention/cleanup - Perform data cleanup
export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdminAccess()
    if (authError) return authError

    const session = await auth()
    const body = await request.json()
    const policy = retentionPolicySchema.parse(body)

    // Create data retention manager with a custom policy
    const retentionManager = new AuditRetentionManager(prisma, './data/archives', {
      custom: {
        name: 'Custom Policy',
        description: 'A custom policy from the API',
        retentionDays: policy.auditLogRetentionDays,
        archiveAfterDays: 365, // This is not in the original policy, so I'm using a default value.
        compressionEnabled: true,
        archiveLocation: 'local',
      }
    });

    // Perform the actual cleanup
    const result = await retentionManager.cleanupLogs('custom');

    // Log the cleanup operation
    const auditService = getAuditService(prisma)
    await auditService.logSystem(
      session?.user?.id || 'system',
      'DATA_CLEANUP_PERFORMED',
      {
        policy,
        result,
        performedAt: new Date(),
        performedBy: session?.user?.id,
      },
      request.headers.get('x-forwarded-for') || '',
      request.headers.get('user-agent') || ''
    )

    return NextResponse.json({
      success: true,
      result,
      policy,
      message: 'Data cleanup completed successfully',
    })

  } catch (error) {
    console.error('Error performing data cleanup:', error)
    
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
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to perform data cleanup' } },
      { status: 500 }
    )
  }
}