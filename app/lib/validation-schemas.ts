/**
 * Comprehensive validation schemas for all API endpoints
 * Provides type-safe validation with security considerations
 */

import { z } from 'zod'
import { UserRole, ProductStatus } from '@prisma/client'
import { commonSchemas } from './api-security'
import { secureValidationSchemas } from './input-validation'

// User validation schemas with enhanced security
export const userSchemas = {
  create: z.object({
    name: secureValidationSchemas.secureString(100),
    email: secureValidationSchemas.secureEmail,
    password: commonSchemas.password,
    role: z.nativeEnum(UserRole).default('EDITOR'),
    isActive: secureValidationSchemas.secureBoolean.default(true),
  }),

  update: z.object({
    name: secureValidationSchemas.secureString(100).optional(),
    email: secureValidationSchemas.secureEmail.optional(),
    role: z.nativeEnum(UserRole).optional(),
    isActive: secureValidationSchemas.secureBoolean.optional(),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: commonSchemas.password,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),

  query: z.object({
    page: z.string().transform(Number).pipe(secureValidationSchemas.secureInteger.positive()).default(1),
    limit: z.string().transform(Number).pipe(secureValidationSchemas.secureInteger.positive().max(100)).default(10),
    search: secureValidationSchemas.secureString(255).optional(),
    role: z.nativeEnum(UserRole).optional(),
    isActive: z.string().transform(val => val === 'true').pipe(secureValidationSchemas.secureBoolean).optional(),
    sortBy: z.enum(['name', 'email', 'role', 'createdAt', 'updatedAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
}

// Product validation schemas
export const productSchemas = {
  create: z.object({
    name: commonSchemas.name,
    slug: commonSchemas.slug,
    description: commonSchemas.richText.optional(),
    shortDescription: commonSchemas.text.optional(),
    price: commonSchemas.positiveNumber,
    comparePrice: commonSchemas.positiveNumber.optional(),
    sku: z.string().max(100).regex(/^[A-Z0-9\-_]+$/i, 'Invalid SKU format').optional(),
    inventoryQuantity: commonSchemas.integer.min(0).default(0),
    weight: commonSchemas.positiveNumber.optional(),
    dimensions: z.object({
      length: commonSchemas.positiveNumber,
      width: commonSchemas.positiveNumber,
      height: commonSchemas.positiveNumber,
      unit: z.enum(['cm', 'in']).default('cm'),
    }).optional(),
    status: z.nativeEnum(ProductStatus).default('DRAFT'),
    featured: commonSchemas.boolean.default(false),
    seoTitle: z.string().max(255).optional(),
    seoDescription: commonSchemas.text.optional(),
    categoryIds: z.array(commonSchemas.id).max(10).default([]),
    tags: z.array(z.string().max(50)).max(20).default([]),
  }),

  update: z.object({
    name: commonSchemas.name.optional(),
    slug: commonSchemas.slug.optional(),
    description: commonSchemas.richText.optional(),
    shortDescription: commonSchemas.text.optional(),
    price: commonSchemas.positiveNumber.optional(),
    comparePrice: commonSchemas.positiveNumber.optional(),
    sku: z.string().max(100).regex(/^[A-Z0-9\-_]+$/i, 'Invalid SKU format').optional(),
    inventoryQuantity: commonSchemas.integer.min(0).optional(),
    weight: commonSchemas.positiveNumber.optional(),
    dimensions: z.object({
      length: commonSchemas.positiveNumber,
      width: commonSchemas.positiveNumber,
      height: commonSchemas.positiveNumber,
      unit: z.enum(['cm', 'in']).default('cm'),
    }).optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    featured: commonSchemas.boolean.optional(),
    seoTitle: z.string().max(255).optional(),
    seoDescription: commonSchemas.text.optional(),
    categoryIds: z.array(commonSchemas.id).max(10).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
  }),

  query: z.object({
    page: z.string().transform(Number).pipe(z.number().int().positive()).default(1),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default(10),
    search: z.string().max(255).optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    categoryId: commonSchemas.id.optional(),
    featured: z.string().transform(val => val === 'true').pipe(commonSchemas.boolean).optional(),
    minPrice: z.string().transform(Number).pipe(commonSchemas.positiveNumber).optional(),
    maxPrice: z.string().transform(Number).pipe(commonSchemas.positiveNumber).optional(),
    sortBy: z.enum(['name', 'price', 'createdAt', 'updatedAt', 'inventoryQuantity']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    tags: z.string().transform(val => val.split(',')).pipe(z.array(z.string())).optional(),
  }),
}

// Category validation schemas
export const categorySchemas = {
  create: z.object({
    name: commonSchemas.name,
    slug: commonSchemas.slug,
    description: commonSchemas.text.optional(),
    parentId: commonSchemas.id.optional(),
    sortOrder: commonSchemas.integer.min(0).default(0),
    isActive: commonSchemas.boolean.default(true),
    seoTitle: z.string().max(255).optional(),
    seoDescription: commonSchemas.text.optional(),
  }),

  update: z.object({
    name: commonSchemas.name.optional(),
    slug: commonSchemas.slug.optional(),
    description: commonSchemas.text.optional(),
    parentId: commonSchemas.id.optional(),
    sortOrder: commonSchemas.integer.min(0).optional(),
    isActive: commonSchemas.boolean.optional(),
    seoTitle: z.string().max(255).optional(),
    seoDescription: commonSchemas.text.optional(),
  }),

  reorder: z.object({
    categories: z.array(z.object({
      id: commonSchemas.id,
      sortOrder: commonSchemas.integer.min(0),
    })).min(1).max(100),
  }),

  query: z.object({
    page: z.string().transform(Number).pipe(z.number().int().positive()).default(1),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default(10),
    search: z.string().max(255).optional(),
    parentId: commonSchemas.id.optional(),
    isActive: z.string().transform(val => val === 'true').pipe(commonSchemas.boolean).optional(),
    sortBy: z.enum(['name', 'sortOrder', 'createdAt', 'updatedAt']).default('sortOrder'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
}

// Page validation schemas
export const pageSchemas = {
  create: z.object({
    title: commonSchemas.name,
    slug: commonSchemas.slug,
    content: commonSchemas.richText,
    excerpt: commonSchemas.text.optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
    template: z.string().max(100).optional(),
    seoTitle: z.string().max(255).optional(),
    seoDescription: commonSchemas.text.optional(),
    publishedAt: commonSchemas.date.optional(),
  }),

  update: z.object({
    title: commonSchemas.name.optional(),
    slug: commonSchemas.slug.optional(),
    content: commonSchemas.richText.optional(),
    excerpt: commonSchemas.text.optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    template: z.string().max(100).optional(),
    seoTitle: z.string().max(255).optional(),
    seoDescription: commonSchemas.text.optional(),
    publishedAt: commonSchemas.date.optional(),
  }),

  query: z.object({
    page: z.string().transform(Number).pipe(z.number().int().positive()).default(1),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default(10),
    search: z.string().max(255).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    template: z.string().max(100).optional(),
    sortBy: z.enum(['title', 'status', 'createdAt', 'updatedAt', 'publishedAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
}

// Media validation schemas
export const mediaSchemas = {
  create: z.object({
    fileName: z.string().min(1).max(255),
    originalName: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(100),
    size: commonSchemas.positiveNumber,
    width: commonSchemas.integer.positive().optional(),
    height: commonSchemas.integer.positive().optional(),
    alt: z.string().max(255).optional(),
    caption: commonSchemas.text.optional(),
    folder: z.string().max(255).optional(),
  }),

  update: z.object({
    alt: z.string().max(255).optional(),
    caption: commonSchemas.text.optional(),
    folder: z.string().max(255).optional(),
  }),

  query: z.object({
    page: z.string().transform(Number).pipe(z.number().int().positive()).default(1),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default(10),
    search: z.string().max(255).optional(),
    mimeType: z.string().max(100).optional(),
    folder: z.string().max(255).optional(),
    sortBy: z.enum(['fileName', 'originalName', 'size', 'createdAt', 'updatedAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
}

// Order validation schemas
export const orderSchemas = {
  create: z.object({
    customerEmail: commonSchemas.email,
    customerName: commonSchemas.name,
    customerPhone: commonSchemas.phone,
    shippingAddress: z.object({
      street: z.string().min(1).max(255),
      city: z.string().min(1).max(100),
      state: z.string().min(1).max(100),
      postalCode: z.string().min(1).max(20),
      country: z.string().min(1).max(100),
    }),
    billingAddress: z.object({
      street: z.string().min(1).max(255),
      city: z.string().min(1).max(100),
      state: z.string().min(1).max(100),
      postalCode: z.string().min(1).max(20),
      country: z.string().min(1).max(100),
    }).optional(),
    items: z.array(z.object({
      productId: commonSchemas.id,
      quantity: commonSchemas.integer.positive(),
      price: commonSchemas.positiveNumber,
    })).min(1).max(50),
    notes: commonSchemas.text.optional(),
  }),

  update: z.object({
    status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
    trackingNumber: z.string().max(100).optional(),
    notes: commonSchemas.text.optional(),
  }),

  query: z.object({
    page: z.string().transform(Number).pipe(z.number().int().positive()).default(1),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default(10),
    search: z.string().max(255).optional(),
    status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
    customerEmail: commonSchemas.email.optional(),
    dateFrom: commonSchemas.date.optional(),
    dateTo: commonSchemas.date.optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'total', 'status']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
}

// Authentication validation schemas
export const authSchemas = {
  login: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required'),
    rememberMe: commonSchemas.boolean.default(false),
  }),

  register: z.object({
    name: commonSchemas.name,
    email: commonSchemas.email,
    password: commonSchemas.password,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms and conditions' }) }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),

  passwordReset: z.object({
    email: commonSchemas.email,
  }),

  passwordResetConfirm: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: commonSchemas.password,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),

  twoFactorSetup: z.object({
    secret: z.string().min(1, 'Secret is required'),
    token: z.string().length(6, 'Token must be 6 digits').regex(/^\d+$/, 'Token must be numeric'),
  }),

  twoFactorVerify: z.object({
    token: z.string().length(6, 'Token must be 6 digits').regex(/^\d+$/, 'Token must be numeric'),
  }),
}

// Admin validation schemas
export const adminSchemas = {
  userBulkAction: z.object({
    userIds: z.array(commonSchemas.id).min(1).max(100),
    action: z.enum(['activate', 'deactivate', 'delete', 'changeRole']),
    role: z.nativeEnum(UserRole).optional(),
  }),

  systemSettings: z.object({
    siteName: z.string().min(1).max(255),
    siteDescription: commonSchemas.text,
    contactEmail: commonSchemas.email,
    maintenanceMode: commonSchemas.boolean,
    registrationEnabled: commonSchemas.boolean,
    maxFileSize: commonSchemas.integer.positive(),
    allowedFileTypes: z.array(z.string()).min(1),
  }),

  backupCreate: z.object({
    includeMedia: commonSchemas.boolean.default(true),
    includeDatabase: commonSchemas.boolean.default(true),
    compression: z.enum(['none', 'gzip', 'bzip2']).default('gzip'),
  }),

  auditLogQuery: z.object({
    page: z.string().transform(Number).pipe(z.number().int().positive()).default(1),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default(10),
    userId: commonSchemas.id.optional(),
    action: z.string().max(100).optional(),
    resource: z.string().max(100).optional(),
    dateFrom: commonSchemas.date.optional(),
    dateTo: commonSchemas.date.optional(),
    sortBy: z.enum(['timestamp', 'action', 'resource', 'userId']).default('timestamp'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
}

// API Key validation schemas
export const apiKeySchemas = {
  create: z.object({
    name: commonSchemas.name,
    description: commonSchemas.text.optional(),
    permissions: z.array(z.string()).min(1).max(50),
    expiresAt: commonSchemas.date.optional(),
    rateLimitPerHour: commonSchemas.integer.positive().max(10000).default(1000),
  }),

  update: z.object({
    name: commonSchemas.name.optional(),
    description: commonSchemas.text.optional(),
    permissions: z.array(z.string()).min(1).max(50).optional(),
    expiresAt: commonSchemas.date.optional(),
    rateLimitPerHour: commonSchemas.integer.positive().max(10000).optional(),
    isActive: commonSchemas.boolean.optional(),
  }),

  query: z.object({
    page: z.string().transform(Number).pipe(z.number().int().positive()).default(1),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default(10),
    search: z.string().max(255).optional(),
    isActive: z.string().transform(val => val === 'true').pipe(commonSchemas.boolean).optional(),
    sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'lastUsedAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
}

// Notification validation schemas
export const notificationSchemas = {
  create: z.object({
    title: z.string().min(1).max(255),
    message: commonSchemas.text,
    type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
    userId: commonSchemas.id.optional(),
    actionUrl: commonSchemas.url.optional(),
    expiresAt: commonSchemas.date.optional(),
  }),

  update: z.object({
    read: commonSchemas.boolean.optional(),
    archived: commonSchemas.boolean.optional(),
  }),

  query: z.object({
    page: z.string().transform(Number).pipe(z.number().int().positive()).default(1),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default(10),
    type: z.enum(['info', 'success', 'warning', 'error']).optional(),
    read: z.string().transform(val => val === 'true').pipe(commonSchemas.boolean).optional(),
    archived: z.string().transform(val => val === 'true').pipe(commonSchemas.boolean).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'type']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
}

// Search validation schemas
export const searchSchemas = {
  query: z.object({
    q: z.string().min(1).max(255),
    type: z.enum(['products', 'pages', 'users', 'all']).default('all'),
    page: z.string().transform(Number).pipe(z.number().int().positive()).default(1),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default(10),
    filters: z.record(z.string()).optional(),
  }),

  analytics: z.object({
    dateFrom: commonSchemas.date.optional(),
    dateTo: commonSchemas.date.optional(),
    groupBy: z.enum(['day', 'week', 'month']).default('day'),
  }),
}

// Export all schemas
export const validationSchemas = {
  user: userSchemas,
  product: productSchemas,
  category: categorySchemas,
  page: pageSchemas,
  media: mediaSchemas,
  order: orderSchemas,
  auth: authSchemas,
  admin: adminSchemas,
  apiKey: apiKeySchemas,
  notification: notificationSchemas,
  search: searchSchemas,
}

// Type exports for TypeScript
export type UserCreateInput = z.infer<typeof userSchemas.create>
export type UserUpdateInput = z.infer<typeof userSchemas.update>
export type UserQueryInput = z.infer<typeof userSchemas.query>

export type ProductCreateInput = z.infer<typeof productSchemas.create>
export type ProductUpdateInput = z.infer<typeof productSchemas.update>
export type ProductQueryInput = z.infer<typeof productSchemas.query>

export type CategoryCreateInput = z.infer<typeof categorySchemas.create>
export type CategoryUpdateInput = z.infer<typeof categorySchemas.update>
export type CategoryQueryInput = z.infer<typeof categorySchemas.query>

export type PageCreateInput = z.infer<typeof pageSchemas.create>
export type PageUpdateInput = z.infer<typeof pageSchemas.update>
export type PageQueryInput = z.infer<typeof pageSchemas.query>

export type MediaCreateInput = z.infer<typeof mediaSchemas.create>
export type MediaUpdateInput = z.infer<typeof mediaSchemas.update>
export type MediaQueryInput = z.infer<typeof mediaSchemas.query>

export type OrderCreateInput = z.infer<typeof orderSchemas.create>
export type OrderUpdateInput = z.infer<typeof orderSchemas.update>
export type OrderQueryInput = z.infer<typeof orderSchemas.query>

export type AuthLoginInput = z.infer<typeof authSchemas.login>
export type AuthRegisterInput = z.infer<typeof authSchemas.register>

export type AdminUserBulkActionInput = z.infer<typeof adminSchemas.userBulkAction>
export type AdminSystemSettingsInput = z.infer<typeof adminSchemas.systemSettings>

export type ApiKeyCreateInput = z.infer<typeof apiKeySchemas.create>
export type ApiKeyUpdateInput = z.infer<typeof apiKeySchemas.update>
export type ApiKeyQueryInput = z.infer<typeof apiKeySchemas.query>

export type NotificationCreateInput = z.infer<typeof notificationSchemas.create>
export type NotificationUpdateInput = z.infer<typeof notificationSchemas.update>
export type NotificationQueryInput = z.infer<typeof notificationSchemas.query>

export type SearchQueryInput = z.infer<typeof searchSchemas.query>
export type SearchAnalyticsInput = z.infer<typeof searchSchemas.analytics>