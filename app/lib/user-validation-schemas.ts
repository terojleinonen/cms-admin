/**
 * User Management Validation Schemas
 * Comprehensive Zod schemas for all user-related data structures
 * including profile management, preferences, security settings, and admin operations
 */

import { z } from 'zod'
import { UserRole, Theme } from '@prisma/client'

/**
 * Base validation patterns and constants
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/
const NAME_REGEX = /^[a-zA-Z\s'-]+$/
const TIMEZONE_REGEX = /^[A-Za-z_]+\/[A-Za-z_]+$/

/**
 * User Profile Validation Schemas
 */

// Basic user profile update
export const userProfileUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must be less than 100 characters')
    .regex(NAME_REGEX, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .trim(),
  email: z
    .string()
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  profilePicture: z
    .string()
    .url('Profile picture must be a valid URL')
    .max(500, 'Profile picture URL must be less than 500 characters')
    .optional()
    .nullable(),
})

export type UserProfileUpdateData = z.infer<typeof userProfileUpdateSchema>

// Complete user profile with read-only fields
export const userProfileSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
  name: z.string(),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean(),
  profilePicture: z.string().nullable(),
  emailVerified: z.date().nullable(),
  twoFactorEnabled: z.boolean(),
  lastLoginAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type UserProfileData = z.infer<typeof userProfileSchema>

/**
 * User Preferences Validation Schemas
 */

// Notification settings
export const notificationSettingsSchema = z.object({
  email: z.boolean().default(true),
  push: z.boolean().default(true),
  security: z.boolean().default(true),
  marketing: z.boolean().default(false),
})

export type NotificationSettingsData = z.infer<typeof notificationSettingsSchema>

// Dashboard settings
export const dashboardSettingsSchema = z.object({
  layout: z.enum(['default', 'compact', 'expanded']).default('default'),
  widgets: z.array(z.string()).default([]),
  defaultView: z.enum(['dashboard', 'products', 'orders', 'analytics']).default('dashboard'),
})

export type DashboardSettingsData = z.infer<typeof dashboardSettingsSchema>

// Complete user preferences
export const userPreferencesSchema = z.object({
  theme: z.nativeEnum(Theme).default(Theme.SYSTEM),
  timezone: z
    .string()
    .regex(TIMEZONE_REGEX, 'Invalid timezone format')
    .default('UTC'),
  language: z
    .string()
    .min(2, 'Language code must be at least 2 characters')
    .max(10, 'Language code must be less than 10 characters')
    .default('en'),
  notifications: notificationSettingsSchema.default({
    email: false,
    push: false,
    security: true,
    marketing: false
  }),
  dashboard: dashboardSettingsSchema.default({
    layout: 'default' as const,
    widgets: [],
    defaultView: 'dashboard' as const
  }),
})

export type UserPreferencesData = z.infer<typeof userPreferencesSchema>

// User preferences update (partial)
export const userPreferencesUpdateSchema = z.object({
  theme: z.nativeEnum(Theme).optional(),
  timezone: z.string().regex(TIMEZONE_REGEX, 'Invalid timezone format').optional(),
  language: z.string().min(2).max(10).optional(),
  notifications: notificationSettingsSchema.partial().optional(),
  dashboard: dashboardSettingsSchema.partial().optional(),
})

export type UserPreferencesUpdateData = z.infer<typeof userPreferencesUpdateSchema>

/**
 * Security and Authentication Schemas
 */

// Password change
export const passwordChangeSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be less than 128 characters')
    .regex(PASSWORD_REGEX, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  confirmNewPassword: z
    .string()
    .min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'New passwords do not match',
  path: ['confirmNewPassword'],
})

export type PasswordChangeData = z.infer<typeof passwordChangeSchema>

// Two-factor authentication setup
export const twoFactorSetupSchema = z.object({
  secret: z
    .string()
    .min(1, 'Two-factor secret is required')
    .max(255, 'Two-factor secret is too long'),
  token: z
    .string()
    .length(6, 'Two-factor token must be 6 digits')
    .regex(/^\d{6}$/, 'Two-factor token must contain only digits'),
})

export type TwoFactorSetupData = z.infer<typeof twoFactorSetupSchema>

// Two-factor authentication verification
export const twoFactorVerificationSchema = z.object({
  token: z
    .string()
    .length(6, 'Two-factor token must be 6 digits')
    .regex(/^\d{6}$/, 'Two-factor token must contain only digits'),
})

export type TwoFactorVerificationData = z.infer<typeof twoFactorVerificationSchema>

// Security settings update
export const securitySettingsUpdateSchema = z.object({
  twoFactorEnabled: z.boolean().optional(),
  currentPassword: z.string().optional(),
}).refine((data) => {
  // If enabling 2FA, current password is required
  if (data.twoFactorEnabled === true && !data.currentPassword) {
    return false
  }
  return true
}, {
  message: 'Current password is required to enable two-factor authentication',
  path: ['currentPassword'],
})

export type SecuritySettingsUpdateData = z.infer<typeof securitySettingsUpdateSchema>

/**
 * Session Management Schemas
 */

// Session data
export const sessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  token: z.string(),
  expiresAt: z.date(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
})

export type SessionData = z.infer<typeof sessionSchema>

// Session termination
export const sessionTerminationSchema = z.object({
  sessionIds: z.array(z.string().uuid()).min(1, 'At least one session ID is required'),
  terminateAll: z.boolean().default(false),
})

export type SessionTerminationData = z.infer<typeof sessionTerminationSchema>

/**
 * Audit Log Schemas
 */

// Audit log entry
export const auditLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  action: z.string().min(1).max(100),
  resource: z.string().min(1).max(100),
  details: z.record(z.string(), z.any()).nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date(),
})

export type AuditLogData = z.infer<typeof auditLogSchema>

// Audit log creation
export const auditLogCreateSchema = z.object({
  userId: z.string().uuid(),
  action: z.string().min(1).max(100),
  resource: z.string().min(1).max(100),
  details: z.record(z.string(), z.any()).optional().nullable(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
})

export type AuditLogCreateData = z.infer<typeof auditLogCreateSchema>

// Audit log filters
export const auditLogFiltersSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
})

export type AuditLogFiltersData = z.infer<typeof auditLogFiltersSchema>

/**
 * Administrative User Management Schemas
 */

// User creation by admin
export const adminUserCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must be less than 100 characters')
    .regex(NAME_REGEX, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .trim(),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be less than 128 characters')
    .regex(PASSWORD_REGEX, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().default(true),
  sendWelcomeEmail: z.boolean().default(true),
})

export type AdminUserCreateData = z.infer<typeof adminUserCreateSchema>

// User update by admin
export const adminUserUpdateSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must be less than 100 characters')
    .regex(NAME_REGEX, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .trim()
    .optional(),
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim()
    .optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
})

export type AdminUserUpdateData = z.infer<typeof adminUserUpdateSchema>

// Bulk user operations
export const bulkUserOperationSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'At least one user ID is required'),
  operation: z.enum(['activate', 'deactivate', 'delete', 'change_role']),
  newRole: z.nativeEnum(UserRole).optional(),
}).refine((data) => {
  // If operation is change_role, newRole is required
  if (data.operation === 'change_role' && !data.newRole) {
    return false
  }
  return true
}, {
  message: 'New role is required for role change operation',
  path: ['newRole'],
})

export type BulkUserOperationData = z.infer<typeof bulkUserOperationSchema>

// User search and filtering
export const userSearchSchema = z.object({
  query: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  lastLoginAfter: z.date().optional(),
  lastLoginBefore: z.date().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'email', 'role', 'createdAt', 'lastLoginAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type UserSearchData = z.infer<typeof userSearchSchema>

/**
 * Account Management Schemas
 */

// Account deactivation
export const accountDeactivationSchema = z.object({
  reason: z.enum([
    'temporary_break',
    'privacy_concerns',
    'not_useful',
    'too_many_emails',
    'other'
  ]),
  feedback: z
    .string()
    .max(1000, 'Feedback must be less than 1000 characters')
    .optional(),
  deleteData: z.boolean().default(false),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
})

export type AccountDeactivationData = z.infer<typeof accountDeactivationSchema>

// Data export request
export const dataExportRequestSchema = z.object({
  includeProfile: z.boolean().default(true),
  includePreferences: z.boolean().default(true),
  includeAuditLogs: z.boolean().default(false),
  includeSessions: z.boolean().default(false),
  format: z.enum(['json', 'csv']).default('json'),
})

export type DataExportRequestData = z.infer<typeof dataExportRequestSchema>

/**
 * API Response Schemas
 */

// Standard API response
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
})

export type ApiResponseData = z.infer<typeof apiResponseSchema>

// Paginated response
export const paginatedResponseSchema = z.object({
  items: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
})

export type PaginatedResponseData = z.infer<typeof paginatedResponseSchema>

/**
 * Validation Utility Functions
 */

/**
 * Validate email uniqueness (to be used with database check)
 */
export const createEmailUniquenessValidator = (checkEmailExists: (email: string, excludeUserId?: string) => Promise<boolean>) => {
  return z.string().email().refine(
    async (email) => {
      const exists = await checkEmailExists(email)
      return !exists
    },
    {
      message: 'Email address is already in use',
    }
  )
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  score: number
  feedback: string[]
  isStrong: boolean
} {
  const feedback: string[] = []
  let score = 0

  // Length check
  if (password.length >= 8) score += 1
  else feedback.push('Password should be at least 8 characters long')

  if (password.length >= 12) score += 1

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1
  else feedback.push('Password should contain lowercase letters')

  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('Password should contain uppercase letters')

  if (/\d/.test(password)) score += 1
  else feedback.push('Password should contain numbers')

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1
  else feedback.push('Password should contain special characters')

  // Common patterns check
  if (!/(.)\1{2,}/.test(password)) score += 1
  else feedback.push('Password should not contain repeated characters')

  return {
    score,
    feedback,
    isStrong: score >= 5,
  }
}

/**
 * Sanitize user input for audit logs
 */
export function sanitizeAuditLogDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(details)) {
    // Remove sensitive fields
    if (['password', 'token', 'secret', 'hash'].some(sensitive => 
      key.toLowerCase().includes(sensitive)
    )) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'string' && value.length > 1000) {
      // Truncate long strings
      sanitized[key] = value.substring(0, 1000) + '...'
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

/**
 * Generate validation error response
 */
export function formatValidationErrors(error: z.ZodError): {
  message: string
  errors: Record<string, string[]>
} {
  const errors: Record<string, string[]> = {}
  
  if (error.issues) {
    error.issues.forEach((err) => {
      const path = err.path.join('.')
      if (!errors[path]) {
        errors[path] = []
      }
      errors[path].push(err.message)
    })
  }
  
  return {
    message: 'Validation failed',
    errors,
  }
}