import { NotificationType } from '@prisma/client'
import { notificationService } from './notification-service'

export interface NotificationContext {
  userId: string
  ipAddress?: string
  userAgent?: string
  timestamp?: Date
}

export class NotificationHelpers {
  static async sendSecurityAlert(
    context: NotificationContext,
    alertType: string,
    details: string
  ) {
    await notificationService.sendNotification({
      userId: context.userId,
      type: NotificationType.SECURITY_ALERT,
      title: 'Security Alert',
      message: `Security alert: ${alertType}`,
      data: {
        alertType,
        details,
        timestamp: context.timestamp || new Date(),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      },
      sendEmail: true
    })
  }

  static async sendPasswordChanged(context: NotificationContext) {
    await notificationService.sendNotification({
      userId: context.userId,
      type: NotificationType.PASSWORD_CHANGED,
      title: 'Password Changed',
      message: 'Your password has been successfully changed.',
      data: {
        timestamp: context.timestamp || new Date(),
        ipAddress: context.ipAddress
      },
      sendEmail: true
    })
  }

  static async sendEmailChanged(
    context: NotificationContext,
    oldEmail: string,
    newEmail: string
  ) {
    await notificationService.sendNotification({
      userId: context.userId,
      type: NotificationType.EMAIL_CHANGED,
      title: 'Email Address Changed',
      message: `Your email address has been changed to ${newEmail}.`,
      data: {
        oldEmail,
        newEmail,
        timestamp: context.timestamp || new Date(),
        ipAddress: context.ipAddress
      },
      sendEmail: true
    })
  }

  static async sendTwoFactorEnabled(context: NotificationContext) {
    await notificationService.sendNotification({
      userId: context.userId,
      type: NotificationType.TWO_FACTOR_ENABLED,
      title: 'Two-Factor Authentication Enabled',
      message: 'Two-factor authentication has been enabled on your account.',
      data: {
        timestamp: context.timestamp || new Date(),
        ipAddress: context.ipAddress
      },
      sendEmail: true
    })
  }

  static async sendTwoFactorDisabled(context: NotificationContext) {
    await notificationService.sendNotification({
      userId: context.userId,
      type: NotificationType.TWO_FACTOR_DISABLED,
      title: 'Two-Factor Authentication Disabled',
      message: 'Two-factor authentication has been disabled on your account.',
      data: {
        timestamp: context.timestamp || new Date(),
        ipAddress: context.ipAddress
      },
      sendEmail: true
    })
  }

  static async sendAccountLocked(
    context: NotificationContext,
    reason: string
  ) {
    await notificationService.sendNotification({
      userId: context.userId,
      type: NotificationType.ACCOUNT_LOCKED,
      title: 'Account Locked',
      message: `Your account has been locked due to ${reason}.`,
      data: {
        reason,
        timestamp: context.timestamp || new Date(),
        ipAddress: context.ipAddress
      },
      sendEmail: true
    })
  }

  static async sendAccountUnlocked(context: NotificationContext) {
    await notificationService.sendNotification({
      userId: context.userId,
      type: NotificationType.ACCOUNT_UNLOCKED,
      title: 'Account Unlocked',
      message: 'Your account has been unlocked and is now accessible.',
      data: {
        timestamp: context.timestamp || new Date()
      },
      sendEmail: true
    })
  }

  static async sendNewDeviceLogin(
    context: NotificationContext,
    device: string,
    location?: string
  ) {
    await notificationService.sendNotification({
      userId: context.userId,
      type: NotificationType.LOGIN_FROM_NEW_DEVICE,
      title: 'New Device Login',
      message: `Login detected from new device: ${device}${location ? ` in ${location}` : ''}.`,
      data: {
        device,
        location: location || 'Unknown',
        timestamp: context.timestamp || new Date(),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      },
      sendEmail: true
    })
  }

  static async sendProfileUpdated(
    context: NotificationContext,
    changes: string[]
  ) {
    await notificationService.sendNotification({
      userId: context.userId,
      type: NotificationType.PROFILE_UPDATED,
      title: 'Profile Updated',
      message: 'Your profile information has been updated.',
      data: {
        changes: changes.join(', '),
        timestamp: context.timestamp || new Date()
      },
      sendEmail: false // Usually not critical enough for email
    })
  }

  static async sendPreferencesUpdated(context: NotificationContext) {
    await notificationService.sendNotification({
      userId: context.userId,
      type: NotificationType.PREFERENCES_UPDATED,
      title: 'Preferences Updated',
      message: 'Your account preferences have been updated.',
      data: {
        timestamp: context.timestamp || new Date()
      },
      sendEmail: false
    })
  }

  static async sendAccountDeactivated(context: NotificationContext) {
    await notificationService.sendNotification({
      userId: context.userId,
      type: NotificationType.ACCOUNT_DEACTIVATED,
      title: 'Account Deactivated',
      message: 'Your account has been deactivated.',
      data: {
        timestamp: context.timestamp || new Date()
      },
      sendEmail: true
    })
  }

  static async sendAccountReactivated(context: NotificationContext) {
    await notificationService.sendNotification({
      userId: context.userId,
      type: NotificationType.ACCOUNT_REACTIVATED,
      title: 'Account Reactivated',
      message: 'Your account has been reactivated. Welcome back!',
      data: {
        timestamp: context.timestamp || new Date()
      },
      sendEmail: true
    })
  }

  static async sendRoleChanged(
    context: NotificationContext,
    oldRole: string,
    newRole: string,
    changedBy: string
  ) {
    await notificationService.sendNotification({
      userId: context.userId,
      type: NotificationType.ROLE_CHANGED,
      title: 'Role Changed',
      message: `Your role has been changed from ${oldRole} to ${newRole}.`,
      data: {
        oldRole,
        newRole,
        changedBy,
        timestamp: context.timestamp || new Date()
      },
      sendEmail: true
    })
  }

  static async sendAdminMessage(
    context: NotificationContext,
    message: string,
    adminName: string
  ) {
    await notificationService.sendNotification({
      userId: context.userId,
      type: NotificationType.ADMIN_MESSAGE,
      title: 'Message from Administrator',
      message,
      data: {
        message,
        adminName,
        timestamp: context.timestamp || new Date()
      },
      sendEmail: true
    })
  }
}

// Utility function to get request context
export function getNotificationContext(
  userId: string,
  request?: Request
): NotificationContext {
  return {
    userId,
    ipAddress: request?.headers.get('x-forwarded-for') || 
               request?.headers.get('x-real-ip') || 
               'unknown',
    userAgent: request?.headers.get('user-agent') || 'unknown',
    timestamp: new Date()
  }
}