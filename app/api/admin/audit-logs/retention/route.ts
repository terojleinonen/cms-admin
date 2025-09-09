/**
 * Audit Log Retention Management API
 * Endpoints for managing log retention, archival, and cleanup
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from "@/auth"
import { prisma } from '@/lib/db'
import { createRetentionManager } from '@/lib/audit-retention'
import { z } from 'zod'

const retentionActionSchema = z.object({
  action: z.enum(['archive', 'cleanup', 'full_cycle']),
  policy: z.string().default('audit'),
})

const restoreSchema = z.object({
  archiveFilePath: z.string().min(1),
})

/**
 * GET /api/admin/audit-logs/retention
 * Get retention statistics and policies
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const retentionManager = createRetentionManager(prisma, { autoSchedule: false })
    const stats = await retentionManager.getRetentionStats()

    return NextResponse.json({
      success: true,
      data: {
        stats,
        policies: {
          security: {
            name: 'Security Logs',
            retentionDays: 2555,
            archiveAfterDays: 365,
          },
          audit: {
            name: 'General Audit Logs',
            retentionDays: 1095,
            archiveAfterDays: 180,
          },
          system: {
            name: 'System Logs',
            retentionDays: 365,
            archiveAfterDays: 90,
          },
          debug: {
            name: 'Debug Logs',
            retentionDays: 30,
            archiveAfterDays: 7,
          },
        },
      },
    })
  } catch (error) {
    console.error('Failed to get retention statistics:', error)
    return NextResponse.json(
      { error: 'Failed to get retention statistics' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/audit-logs/retention
 * Execute retention actions (archive, cleanup, full cycle)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, policy } = retentionActionSchema.parse(body)

    const retentionManager = createRetentionManager(prisma, { autoSchedule: false })
    let result: unknown

    switch (action) {
      case 'archive':
        result = await retentionManager.archiveLogs(policy)
        break
      
      case 'cleanup':
        result = await retentionManager.cleanupLogs(policy)
        break
      
      case 'full_cycle':
        result = await retentionManager.runRetentionCycle(policy)
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Log the retention action
    const auditService = await import('@/lib/audit-service')
    await auditService.getAuditService(prisma).logSystem(
      session.user.id,
      'SETTINGS_CHANGED',
      {
        action: 'retention_action',
        retentionAction: action,
        policy,
        result,
        executedBy: session.user.id,
      },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    )

    return NextResponse.json({
      success: true,
      data: result,
      message: `Retention ${action} completed successfully`,
    })
  } catch (error) {
    console.error('Failed to execute retention action:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters',
          details: error.issues 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to execute retention action' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/audit-logs/retention/restore
 * Restore logs from archive
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { archiveFilePath } = restoreSchema.parse(body)

    const retentionManager = createRetentionManager(prisma, { autoSchedule: false })
    const result = await retentionManager.restoreFromArchive(archiveFilePath)

    // Log the restore action
    const auditService = await import('@/lib/audit-service')
    await auditService.getAuditService(prisma).logSystem(
      session.user.id,
      'BACKUP_RESTORED',
      {
        action: 'archive_restore',
        archiveFilePath,
        restoredCount: result.restoredCount,
        archiveMetadata: result.archiveMetadata,
        restoredBy: session.user.id,
      },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    )

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully restored ${result.restoredCount} logs from archive`,
    })
  } catch (error) {
    console.error('Failed to restore from archive:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters',
          details: error.issues 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to restore from archive' },
      { status: 500 }
    )
  }
}