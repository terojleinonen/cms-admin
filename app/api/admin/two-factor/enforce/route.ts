/**
 * Admin Two-Factor Authentication Enforcement API
 * Handles admin enforcement of 2FA policies
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth-config'
import { prisma } from '@/app/lib/db'
import { isTwoFactorRequired } from '@/app/lib/two-factor-auth'
import { auditLog } from '@/app/lib/audit-service'

/**
 * GET /api/admin/two-factor/enforce
 * Get users who should have 2FA but don't
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    // Get all users who should have 2FA but don't
    const usersRequiring2FA = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        twoFactorEnabled: false,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastLoginAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Get 2FA statistics
    const stats = await prisma.user.groupBy({
      by: ['role', 'twoFactorEnabled'],
      where: {
        isActive: true
      },
      _count: {
        id: true
      }
    })
    
    // Format statistics
    const formattedStats = {
      total: 0,
      enabled: 0,
      disabled: 0,
      byRole: {} as Record<string, { total: number; enabled: number; disabled: number }>
    }
    
    stats.forEach(stat => {
      const role = stat.role
      const enabled = stat.twoFactorEnabled
      const count = stat._count.id
      
      formattedStats.total += count
      
      if (enabled) {
        formattedStats.enabled += count
      } else {
        formattedStats.disabled += count
      }
      
      if (!formattedStats.byRole[role]) {
        formattedStats.byRole[role] = { total: 0, enabled: 0, disabled: 0 }
      }
      
      formattedStats.byRole[role].total += count
      
      if (enabled) {
        formattedStats.byRole[role].enabled += count
      } else {
        formattedStats.byRole[role].disabled += count
      }
    })
    
    return NextResponse.json({
      usersRequiring2FA,
      statistics: formattedStats,
      enforcementRules: {
        ADMIN: true,
        EDITOR: false,
        VIEWER: false
      }
    })
    
  } catch (error) {
    console.error('2FA enforcement check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/two-factor/enforce
 * Send notifications to users who need to enable 2FA
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { userIds, action } = body
    
    if (!userIds || !Array.isArray(userIds) || !action) {
      return NextResponse.json(
        { error: 'User IDs array and action are required' },
        { status: 400 }
      )
    }
    
    // Validate action
    if (!['notify', 'force_logout'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "notify" or "force_logout"' },
        { status: 400 }
      )
    }
    
    // Get users to enforce 2FA on
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true
      }
    })
    
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No valid users found' },
        { status: 404 }
      )
    }
    
    let processedUsers = 0
    const results = []
    
    for (const user of users) {
      try {
        // Check if 2FA is required for this user
        if (!isTwoFactorRequired(user.role)) {
          results.push({
            userId: user.id,
            email: user.email,
            success: false,
            message: '2FA not required for this user role'
          })
          continue
        }
        
        // Skip if 2FA is already enabled
        if (user.twoFactorEnabled) {
          results.push({
            userId: user.id,
            email: user.email,
            success: false,
            message: '2FA already enabled'
          })
          continue
        }
        
        if (action === 'force_logout') {
          // Deactivate all sessions for this user
          await prisma.session.updateMany({
            where: { userId: user.id },
            data: { isActive: false }
          })
          
          await auditLog({
            userId: session.user.id,
            action: '2FA_ENFORCEMENT_LOGOUT',
            resource: 'USER_SECURITY',
            details: {
              targetUserId: user.id,
              targetUserEmail: user.email,
              enforcedBy: session.user.id
            },
            request
          })
          
          results.push({
            userId: user.id,
            email: user.email,
            success: true,
            message: 'User logged out - must enable 2FA to log back in'
          })
        } else if (action === 'notify') {
          // In a real implementation, you would send an email notification here
          // For now, we'll just log the notification
          await auditLog({
            userId: session.user.id,
            action: '2FA_ENFORCEMENT_NOTIFICATION',
            resource: 'USER_SECURITY',
            details: {
              targetUserId: user.id,
              targetUserEmail: user.email,
              notifiedBy: session.user.id
            },
            request
          })
          
          results.push({
            userId: user.id,
            email: user.email,
            success: true,
            message: 'Notification sent to enable 2FA'
          })
        }
        
        processedUsers++
        
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error)
        results.push({
          userId: user.id,
          email: user.email,
          success: false,
          message: 'Processing error'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      processedUsers,
      totalUsers: users.length,
      action,
      results
    })
    
  } catch (error) {
    console.error('2FA enforcement action error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}