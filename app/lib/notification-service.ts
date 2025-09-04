import { prisma } from './prisma'
import { NotificationType, EmailStatus } from '@prisma/client'
import nodemailer from 'nodemailer'

export interface NotificationData {
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  sendEmail?: boolean
}

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

export class NotificationService {
  private emailTransporter: nodemailer.Transporter | null = null

  constructor() {
    this.initializeEmailTransporter()
  }

  private initializeEmailTransporter() {
    try {
      const emailConfig: EmailConfig = {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      }

      if (emailConfig.auth.user && emailConfig.auth.pass) {
        this.emailTransporter = nodemailer.createTransporter(emailConfig)
      }
    } catch (error) {
      console.error('Failed to initialize email transporter:', error)
    }
  }

  async sendNotification(data: NotificationData): Promise<void> {
    try {
      // Get user preferences to check notification settings
      const userPreferences = await prisma.userPreferences.findUnique({
        where: { userId: data.userId },
        include: { user: true }
      })

      if (!userPreferences) {
        throw new Error('User preferences not found')
      }

      const notificationSettings = userPreferences.notifications as any
      
      // Create in-app notification
      await this.createInAppNotification(data)

      // Send email notification if enabled and requested
      if (data.sendEmail && notificationSettings?.email && this.shouldSendEmailForType(data.type, notificationSettings)) {
        await this.sendEmailNotification(data, userPreferences.user.email)
      }
    } catch (error) {
      console.error('Failed to send notification:', error)
      throw error
    }
  }

  private async createInAppNotification(data: NotificationData): Promise<void> {
    await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {}
      }
    })
  }

  private async sendEmailNotification(data: NotificationData, email: string): Promise<void> {
    if (!this.emailTransporter) {
      console.warn('Email transporter not configured, skipping email notification')
      return
    }

    try {
      // Get email template
      const template = await this.getEmailTemplate(data.type, 'en')
      
      if (!template) {
        console.warn(`No email template found for notification type: ${data.type}`)
        return
      }

      // Replace template variables
      const subject = this.replaceTemplateVariables(template.subject, data.data || {})
      const body = this.replaceTemplateVariables(template.emailBody || template.inAppBody, data.data || {})

      // Create email log entry
      const emailLog = await prisma.emailLog.create({
        data: {
          userId: data.userId,
          to: email,
          subject,
          body,
          type: data.type,
          status: EmailStatus.PENDING
        }
      })

      // Send email
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@example.com',
        to: email,
        subject,
        html: body
      })

      // Update email log status
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.SENT,
          sentAt: new Date()
        }
      })
    } catch (error) {
      console.error('Failed to send email notification:', error)
      
      // Update email log with error
      await prisma.emailLog.updateMany({
        where: {
          userId: data.userId,
          type: data.type,
          status: EmailStatus.PENDING
        },
        data: {
          status: EmailStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  private shouldSendEmailForType(type: NotificationType, settings: unknown): boolean {
    // Security notifications should always be sent if email is enabled
    const securityTypes = [
      NotificationType.SECURITY_ALERT,
      NotificationType.PASSWORD_CHANGED,
      NotificationType.EMAIL_CHANGED,
      NotificationType.TWO_FACTOR_ENABLED,
      NotificationType.TWO_FACTOR_DISABLED,
      NotificationType.ACCOUNT_LOCKED,
      NotificationType.LOGIN_FROM_NEW_DEVICE
    ]

    if (securityTypes.includes(type)) {
      return settings?.security !== false
    }

    // Other notifications depend on general email settings
    return settings?.email === true
  }

  private async getEmailTemplate(type: NotificationType, language: string = 'en') {
    return await prisma.notificationTemplate.findUnique({
      where: {
        type_language: {
          type,
          language
        }
      }
    })
  }

  private replaceTemplateVariables(template: string, variables: Record<string, any>): string {
    let result = template
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      result = result.replace(new RegExp(placeholder, 'g'), String(value))
    })

    return result
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        read: true,
        readAt: new Date()
      }
    })
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false
      },
      data: {
        read: true,
        readAt: new Date()
      }
    })
  }

  async getUserNotifications(userId: string, limit: number = 20, offset: number = 0) {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return await prisma.notification.count({
      where: {
        userId,
        read: false
      }
    })
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId
      }
    })
  }
}

export const notificationService = new NotificationService()