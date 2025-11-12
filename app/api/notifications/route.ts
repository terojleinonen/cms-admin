import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { notificationService } from '@/lib/notification-service'
import { z } from 'zod'

const getNotificationsSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0)
})

export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const { limit, offset } = getNotificationsSchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset')
    })

    const [notifications, unreadCount] = await Promise.all([
      notificationService.getUserNotifications(user?.id || '', limit, offset),
      notificationService.getUnreadNotificationCount(user?.id || '')
    ])

    return createApiSuccessResponse({
      notifications,
      unreadCount,
      hasMore: notifications.length === limit
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'notifications', action: 'read', scope: 'own' }]
}
)

export const PUT = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const action = body.action

    if (action === 'markAllAsRead') {
      await notificationService.markAllNotificationsAsRead(user?.id || '')
      return createApiSuccessResponse({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'notifications', action: 'update', scope: 'own' }]
}
)