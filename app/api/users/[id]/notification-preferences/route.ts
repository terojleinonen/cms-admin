import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const notificationPreferencesSchema = z.object({
  email: z.boolean(),
  security: z.boolean(),
  marketing: z.boolean(),
  accountUpdates: z.boolean(),
  adminMessages: z.boolean()
})

export const GET = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    
  try {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Users can only access their own preferences, admins can access any
    if (session.user.id !== params.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: params.id },
      select: { notifications: true }
    })

    if (!preferences) {
      return NextResponse.json({ error: 'Preferences not found' }, { status: 404 })
    }

    return createApiSuccessResponse({ preferences: preferences.notifications })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'profile', action: 'update', scope: 'own' }]
}
)

export const PUT = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    
  try {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Users can only update their own preferences, admins can update any
    if (session.user.id !== params.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = notificationPreferencesSchema.parse(body)

    const updatedPreferences = await prisma.userPreferences.update({
      where: { userId: params.id },
      data: {
        notifications: validatedData
      },
      select: { notifications: true }
    })

    return createApiSuccessResponse({ 
      preferences: updatedPreferences.notifications,
      message: 'Notification preferences updated successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'profile', action: 'update', scope: 'own' }]
}
)