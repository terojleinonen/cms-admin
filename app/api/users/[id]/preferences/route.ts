/**
 * User Preferences API endpoints
 * Handles GET, PUT operations for user preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { 
  userPreferencesUpdateSchema, 
  formatValidationErrors,
  notificationSettingsSchema,
  dashboardSettingsSchema
} from '@/lib/user-validation-schemas'
import { getAuditService } from '@/lib/audit-service'
import { z } from 'zod'

// Check if user has access to preferences
async function requirePreferencesAccess(userId: string) {
  const session = await getServerSession(authOptions)
  
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

// GET /api/users/[id]/preferences - Get user preferences
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const authError = await requirePreferencesAccess(resolvedParams.id)
    if (authError) return authError

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    // Get or create user preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: resolvedParams.id }
    })

    if (!preferences) {
      // Create default preferences if they don't exist
      preferences = await prisma.userPreferences.create({
        data: {
          userId: resolvedParams.id,
          theme: 'SYSTEM',
          timezone: 'UTC',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            security: true,
            marketing: false,
          },
          dashboard: {
            layout: 'default',
            widgets: [],
            defaultView: 'dashboard',
          },
        }
      })
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch preferences' } },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id]/preferences - Update user preferences
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const authError = await requirePreferencesAccess(resolvedParams.id)
    if (authError) return authError

    const session = await getServerSession(authOptions)
    const body = await request.json()
    
    // Validate the request data
    const data = userPreferencesUpdateSchema.parse(body)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    // Get existing preferences
    const existingPreferences = await prisma.userPreferences.findUnique({
      where: { userId: resolvedParams.id }
    })

    // Prepare update data
    const updateData: Record<string, unknown> = {}
    
    if (data.theme !== undefined) updateData.theme = data.theme
    if (data.timezone !== undefined) updateData.timezone = data.timezone
    if (data.language !== undefined) updateData.language = data.language
    
    // Handle notifications update
    if (data.notifications !== undefined) {
      interface NotificationSettings {
        email: boolean;
        push: boolean;
        security: boolean;
        marketing: boolean;
      }
      const currentNotifications = (existingPreferences?.notifications as NotificationSettings) || {
        email: true,
        push: true,
        security: true,
        marketing: false,
      }
      
      updateData.notifications = {
        ...currentNotifications,
        ...data.notifications,
      }
    }
    
    // Handle dashboard settings update
    if (data.dashboard !== undefined) {
      interface DashboardSettings {
        layout: string;
        widgets: string[];
        defaultView: string;
      }
      const currentDashboard = (existingPreferences?.dashboard as DashboardSettings) || {
        layout: 'default',
        widgets: [],
        defaultView: 'dashboard',
      }
      
      updateData.dashboard = {
        ...currentDashboard,
        ...data.dashboard,
      }
    }

    // Update or create preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: resolvedParams.id },
      update: updateData,
      create: {
        userId: resolvedParams.id,
        theme: data.theme || 'SYSTEM',
        timezone: data.timezone || 'UTC',
        language: data.language || 'en',
        notifications: updateData.notifications || {
          email: true,
          push: true,
          security: true,
          marketing: false,
        },
        dashboard: updateData.dashboard || {
          layout: 'default',
          widgets: [],
          defaultView: 'dashboard',
        },
      }
    })

    // Log the preferences update
    const auditService = getAuditService(prisma)
    await auditService.logUser(
      session?.user?.id || resolvedParams.id,
      resolvedParams.id,
      'PREFERENCES_UPDATED',
      {
        updatedFields: Object.keys(updateData),
        isOwnProfile: session?.user?.id === resolvedParams.id,
      },
      request.headers.get('x-forwarded-for') || request.ip,
      request.headers.get('user-agent')
    )

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    
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
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update preferences' } },
      { status: 500 }
    )
  }
}