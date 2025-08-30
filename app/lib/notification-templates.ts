import { NotificationType } from '@prisma/client'
import { prisma } from './prisma'

export interface NotificationTemplateData {
  type: NotificationType
  language: string
  subject: string
  emailBody?: string
  inAppTitle: string
  inAppBody: string
  variables: string[]
}

export const defaultNotificationTemplates: NotificationTemplateData[] = [
  {
    type: NotificationType.SECURITY_ALERT,
    language: 'en',
    subject: 'Security Alert - {{alertType}}',
    emailBody: `
      <h2>Security Alert</h2>
      <p>We detected suspicious activity on your account:</p>
      <p><strong>{{alertType}}</strong></p>
      <p>Details: {{details}}</p>
      <p>Time: {{timestamp}}</p>
      <p>If this was not you, please change your password immediately and contact support.</p>
    `,
    inAppTitle: 'Security Alert',
    inAppBody: 'Suspicious activity detected: {{alertType}}. Please review your account security.',
    variables: ['alertType', 'details', 'timestamp']
  },
  {
    type: NotificationType.PASSWORD_CHANGED,
    language: 'en',
    subject: 'Password Changed Successfully',
    emailBody: `
      <h2>Password Changed</h2>
      <p>Your password has been successfully changed.</p>
      <p>Time: {{timestamp}}</p>
      <p>If you did not make this change, please contact support immediately.</p>
    `,
    inAppTitle: 'Password Changed',
    inAppBody: 'Your password has been successfully updated.',
    variables: ['timestamp']
  },
  {
    type: NotificationType.EMAIL_CHANGED,
    language: 'en',
    subject: 'Email Address Changed',
    emailBody: `
      <h2>Email Address Changed</h2>
      <p>Your email address has been changed from {{oldEmail}} to {{newEmail}}.</p>
      <p>Time: {{timestamp}}</p>
      <p>If you did not make this change, please contact support immediately.</p>
    `,
    inAppTitle: 'Email Address Updated',
    inAppBody: 'Your email address has been changed to {{newEmail}}.',
    variables: ['oldEmail', 'newEmail', 'timestamp']
  },
  {
    type: NotificationType.TWO_FACTOR_ENABLED,
    language: 'en',
    subject: 'Two-Factor Authentication Enabled',
    emailBody: `
      <h2>Two-Factor Authentication Enabled</h2>
      <p>Two-factor authentication has been successfully enabled on your account.</p>
      <p>Time: {{timestamp}}</p>
      <p>Your account is now more secure. Keep your backup codes in a safe place.</p>
    `,
    inAppTitle: '2FA Enabled',
    inAppBody: 'Two-factor authentication has been enabled on your account.',
    variables: ['timestamp']
  },
  {
    type: NotificationType.TWO_FACTOR_DISABLED,
    language: 'en',
    subject: 'Two-Factor Authentication Disabled',
    emailBody: `
      <h2>Two-Factor Authentication Disabled</h2>
      <p>Two-factor authentication has been disabled on your account.</p>
      <p>Time: {{timestamp}}</p>
      <p>If you did not make this change, please enable 2FA again and contact support.</p>
    `,
    inAppTitle: '2FA Disabled',
    inAppBody: 'Two-factor authentication has been disabled on your account.',
    variables: ['timestamp']
  },
  {
    type: NotificationType.ACCOUNT_LOCKED,
    language: 'en',
    subject: 'Account Locked - Security Measure',
    emailBody: `
      <h2>Account Locked</h2>
      <p>Your account has been temporarily locked due to suspicious activity.</p>
      <p>Reason: {{reason}}</p>
      <p>Time: {{timestamp}}</p>
      <p>Please contact support to unlock your account.</p>
    `,
    inAppTitle: 'Account Locked',
    inAppBody: 'Your account has been locked due to {{reason}}. Contact support to unlock.',
    variables: ['reason', 'timestamp']
  },
  {
    type: NotificationType.ACCOUNT_UNLOCKED,
    language: 'en',
    subject: 'Account Unlocked',
    emailBody: `
      <h2>Account Unlocked</h2>
      <p>Your account has been unlocked and is now accessible.</p>
      <p>Time: {{timestamp}}</p>
      <p>Please ensure your account is secure by reviewing your security settings.</p>
    `,
    inAppTitle: 'Account Unlocked',
    inAppBody: 'Your account has been unlocked and is now accessible.',
    variables: ['timestamp']
  },
  {
    type: NotificationType.LOGIN_FROM_NEW_DEVICE,
    language: 'en',
    subject: 'New Device Login Detected',
    emailBody: `
      <h2>New Device Login</h2>
      <p>We detected a login from a new device:</p>
      <p>Device: {{device}}</p>
      <p>Location: {{location}}</p>
      <p>Time: {{timestamp}}</p>
      <p>If this was not you, please change your password immediately.</p>
    `,
    inAppTitle: 'New Device Login',
    inAppBody: 'Login detected from new device: {{device}} at {{location}}.',
    variables: ['device', 'location', 'timestamp']
  },
  {
    type: NotificationType.PROFILE_UPDATED,
    language: 'en',
    subject: 'Profile Updated',
    emailBody: `
      <h2>Profile Updated</h2>
      <p>Your profile information has been updated.</p>
      <p>Changes: {{changes}}</p>
      <p>Time: {{timestamp}}</p>
    `,
    inAppTitle: 'Profile Updated',
    inAppBody: 'Your profile has been updated successfully.',
    variables: ['changes', 'timestamp']
  },
  {
    type: NotificationType.PREFERENCES_UPDATED,
    language: 'en',
    subject: 'Preferences Updated',
    emailBody: `
      <h2>Preferences Updated</h2>
      <p>Your account preferences have been updated.</p>
      <p>Time: {{timestamp}}</p>
    `,
    inAppTitle: 'Preferences Updated',
    inAppBody: 'Your account preferences have been updated.',
    variables: ['timestamp']
  },
  {
    type: NotificationType.ACCOUNT_DEACTIVATED,
    language: 'en',
    subject: 'Account Deactivated',
    emailBody: `
      <h2>Account Deactivated</h2>
      <p>Your account has been deactivated.</p>
      <p>Time: {{timestamp}}</p>
      <p>You can reactivate your account by contacting support.</p>
    `,
    inAppTitle: 'Account Deactivated',
    inAppBody: 'Your account has been deactivated.',
    variables: ['timestamp']
  },
  {
    type: NotificationType.ACCOUNT_REACTIVATED,
    language: 'en',
    subject: 'Account Reactivated',
    emailBody: `
      <h2>Account Reactivated</h2>
      <p>Your account has been reactivated and is now accessible.</p>
      <p>Time: {{timestamp}}</p>
      <p>Welcome back!</p>
    `,
    inAppTitle: 'Account Reactivated',
    inAppBody: 'Your account has been reactivated. Welcome back!',
    variables: ['timestamp']
  },
  {
    type: NotificationType.ROLE_CHANGED,
    language: 'en',
    subject: 'Account Role Changed',
    emailBody: `
      <h2>Role Changed</h2>
      <p>Your account role has been changed from {{oldRole}} to {{newRole}}.</p>
      <p>Changed by: {{changedBy}}</p>
      <p>Time: {{timestamp}}</p>
    `,
    inAppTitle: 'Role Changed',
    inAppBody: 'Your role has been changed to {{newRole}}.',
    variables: ['oldRole', 'newRole', 'changedBy', 'timestamp']
  },
  {
    type: NotificationType.ADMIN_MESSAGE,
    language: 'en',
    subject: 'Message from Administrator',
    emailBody: `
      <h2>Administrator Message</h2>
      <p>{{message}}</p>
      <p>From: {{adminName}}</p>
      <p>Time: {{timestamp}}</p>
    `,
    inAppTitle: 'Admin Message',
    inAppBody: '{{message}}',
    variables: ['message', 'adminName', 'timestamp']
  }
]

export async function seedNotificationTemplates(): Promise<void> {
  console.log('Seeding notification templates...')
  
  for (const template of defaultNotificationTemplates) {
    await prisma.notificationTemplate.upsert({
      where: {
        type_language: {
          type: template.type,
          language: template.language
        }
      },
      update: {
        subject: template.subject,
        emailBody: template.emailBody,
        inAppTitle: template.inAppTitle,
        inAppBody: template.inAppBody,
        variables: template.variables
      },
      create: template
    })
  }
  
  console.log('Notification templates seeded successfully')
}