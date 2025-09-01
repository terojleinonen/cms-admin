/**
 * Notification System Demo
 * 
 * This file demonstrates how to use the notification system
 * that was implemented for task 17.
 */

import { NotificationHelpers, getNotificationContext } from '../app/lib/notification-helpers'
import { notificationService } from '../app/lib/notification-service'
import { NotificationType } from '@prisma/client'

// Example 1: Send a security alert notification
async function sendSecurityAlert(userId: string) {
  const context = getNotificationContext(userId)
  
  await NotificationHelpers.sendSecurityAlert(
    context,
    'Multiple failed login attempts',
    'Someone tried to access your account with incorrect credentials 5 times in the last 10 minutes.'
  )
  
  console.log('Security alert notification sent!')
}

// Example 2: Send password changed notification
async function sendPasswordChangedNotification(userId: string) {
  const context = getNotificationContext(userId)
  
  await NotificationHelpers.sendPasswordChanged(context)
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Password changed notification sent!')
  }
}

// Example 3: Send email changed notification
async function sendEmailChangedNotification(userId: string) {
  const context = getNotificationContext(userId)
  
  await NotificationHelpers.sendEmailChanged(
    context,
    'old@example.com',
    'new@example.com'
  )
  
  console.log('Email changed notification sent!')
}

// Example 4: Send custom notification using the service directly
async function sendCustomNotification(userId: string) {
  await notificationService.sendNotification({
    userId,
    type: NotificationType.ADMIN_MESSAGE,
    title: 'Welcome to the System',
    message: 'Welcome to our platform! We hope you enjoy using our services.',
    data: {
      adminName: 'System Administrator',
      timestamp: new Date()
    },
    sendEmail: true
  })
  
  console.log('Custom admin message sent!')
}

// Example 5: Get user notifications
async function getUserNotifications(userId: string) {
  const notifications = await notificationService.getUserNotifications(userId, 10, 0)
  const unreadCount = await notificationService.getUnreadNotificationCount(userId)
  
  console.log(`User has ${unreadCount} unread notifications`)
  console.log('Recent notifications:', notifications)
  
  return { notifications, unreadCount }
}

// Example 6: Mark notification as read
async function markNotificationAsRead(notificationId: string, userId: string) {
  await notificationService.markNotificationAsRead(notificationId, userId)
  console.log('Notification marked as read!')
}

// Example usage in API routes:
/*
// In your API route (e.g., app/api/users/[id]/password/route.ts)
import { NotificationHelpers, getNotificationContext } from '@/app/lib/notification-helpers'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  // ... password change logic ...
  
  // Send notification after successful password change
  const context = getNotificationContext(params.id, request)
  await NotificationHelpers.sendPasswordChanged(context)
  
  return NextResponse.json({ success: true })
}
*/

// Example usage in components:
/*
// In your React component
import { NotificationBell } from '@/app/components/notifications/NotificationBell'
import { NotificationPreferences } from '@/app/components/notifications/NotificationPreferences'

function Header({ userId }: { userId: string }) {
  return (
    <div className="header">
      <NotificationBell userId={userId} />
    </div>
  )
}

function SettingsPage({ userId }: { userId: string }) {
  return (
    <div>
      <h1>Settings</h1>
      <NotificationPreferences userId={userId} />
    </div>
  )
}
*/

export {
  sendSecurityAlert,
  sendPasswordChangedNotification,
  sendEmailChangedNotification,
  sendCustomNotification,
  getUserNotifications,
  markNotificationAsRead
}