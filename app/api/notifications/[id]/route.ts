import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { notificationService } from '@/lib/notification-service'

export const PUT = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    
  try {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const action = body.action

    if (action === 'markAsRead') {
      await notificationService.markNotificationAsRead(params.id, session.user.id)
      return createApiSuccessResponse({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'notifications', action: 'update', scope: 'own' }]
}
)

export const DELETE = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    
  try {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await notificationService.deleteNotification(params.id, user.id)
    return createApiSuccessResponse({ success: true })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'notifications', action: 'delete', scope: 'own' }]
}
)