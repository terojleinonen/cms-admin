/**
 * Type definitions for the CMS application
 * Based on Prisma schema and application requirements
 */

import { UserRole, Theme, ProductStatus, PageStatus } from '@prisma/client'

export { UserRole, Theme, ProductStatus, PageStatus }

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
  profilePicture?: string
  emailVerified?: Date
  twoFactorSecret?: string
  twoFactorEnabled: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
  preferences?: UserPreferences
  sessions?: Session[]
  auditLogs?: AuditLog[]
}

export interface UserPreferences {
  id: string
  userId: string
  theme: Theme
  timezone: string
  language: string
  notifications: NotificationSettings
  dashboard: DashboardSettings
  createdAt: Date
  updatedAt: Date
  user?: User
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  security: boolean
  marketing: boolean
}

export interface DashboardSettings {
  layout: string
  widgets: string[]
  defaultView: string
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  resource: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  user?: User
}

export interface Session {
  id: string
  userId: string
  token: string
  expiresAt: Date
  ipAddress?: string
  userAgent?: string
  isActive: boolean
  createdAt: Date
  user?: User
}

// User management types
export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  profilePicture?: string
  emailVerified?: Date
  twoFactorEnabled: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
  preferences?: UserPreferences
}

export interface UserWithCount extends UserProfile {
  _count: {
    createdProducts: number
    createdPages: number
  }
}

export interface UserUpdateData {
  name?: string
  email?: string
  role?: UserRole
  isActive?: boolean
  profilePicture?: string
  emailVerified?: Date
  twoFactorEnabled?: boolean
}

export interface SecurityInfo {
  twoFactorEnabled: boolean
  lastPasswordChange?: Date
  activeSessions: Session[]
  recentActivity: AuditLog[]
}

export interface SecurityUpdate {
  currentPassword?: string
  newPassword?: string
  twoFactorEnabled?: boolean
  twoFactorSecret?: string
}

export interface PreferencesUpdate {
  theme?: Theme
  timezone?: string
  language?: string
  notifications?: Partial<NotificationSettings>
  dashboard?: Partial<DashboardSettings>
}

// Product types

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  shortDescription: string | null
  price: number
  comparePrice: number | null
  sku: string | null
  inventoryQuantity: number
  weight: number | null
  dimensions?: { length?: number; width?: number; height?: number }
  status: ProductStatus
  featured: boolean
  seoTitle: string | null
  seoDescription: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
  categories: ProductCategory[] | null
  media: ProductMedia[] | null
  creator?: User
}

export interface ProductFormData {
  name: string
  slug: string
  description: string
  shortDescription: string
  price: number
  comparePrice?: number
  sku: string
  inventoryQuantity: number
  weight?: number
  dimensions?: { length?: number; width?: number; height?: number }
  status: ProductStatus
  featured: boolean
  seoTitle: string
  seoDescription: string
  categoryIds: string[]
}

export interface ProductFilters {
  search?: string
  status?: ProductStatus
  categoryId?: string
  featured?: boolean
  minPrice?: number
  maxPrice?: number
  page?: number
  limit?: number
}

// Category types
export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  parent: Category | null
  children: Category[] | null
  products: ProductCategory[] | null
}

export interface CategoryWithCount extends Category {
  _count?: {
    products: number
  }
}

export interface ProductCategory {
  productId: string
  categoryId: string
  category?: Category
  product?: Product
}

// Media types
export type MediaType = 'image' | 'document' | 'video' | 'audio'

export interface Media {
  id: string
  filename: string
  originalName: string
  mimeType: string
  fileSize: number
  width?: number
  height?: number
  altText?: string
  folder: string
  createdBy: string
  createdAt: Date
  creator?: User
  products?: ProductMedia[]
  // Computed properties
  url?: string
  thumbnailUrl?: string
  type?: MediaType
}

export interface ProductMedia {
  productId: string
  mediaId: string
  sortOrder: number
  isPrimary: boolean
  media?: Media
  product?: Product
}

// Page types

export interface Page {
  id: string
  title: string
  slug: string
  content?: string
  excerpt?: string
  status: PageStatus
  template: string
  seoTitle?: string
  seoDescription?: string
  publishedAt?: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
  creator?: User
}

// Pagination types
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ListResponse<T> {
  items: T[]
  pagination: PaginationInfo
}

// Form types
export interface FormErrors {
  [key: string]: string | string[]
}

// Search types
export interface SearchResult {
  id: string
  title: string
  type: 'product' | 'page' | 'media'
  excerpt?: string
  url: string
  score: number
}

export interface SearchOptions {
  query: string
  types?: ('product' | 'page' | 'media')[]
  limit?: number
  offset?: number
}

// Workflow types
export type WorkflowStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED'
export type ContentType = 'product' | 'page' | 'category'

export interface WorkflowAction {
  contentType: ContentType
  contentId: string
  action: 'submit_for_review' | 'approve' | 'reject' | 'publish' | 'archive' | 'schedule'
  comment?: string
  userId?: string
  scheduledAt?: Date
}

// Component prop types
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface TableColumn<T = Record<string, unknown>> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (value: unknown, item: T) => React.ReactNode
}

export interface FilterOption {
  key: string
  label: string
  type: 'text' | 'select' | 'date' | 'boolean'
  options?: SelectOption[]
}

export type NotificationType =
  | 'SECURITY_ALERT'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_CHANGED'
  | 'TWO_FACTOR_ENABLED'
  | 'TWO_FACTOR_DISABLED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'LOGIN_FROM_NEW_DEVICE'
  | 'NEW_PRODUCT'
  | 'PRODUCT_UPDATE'
  | 'NEW_ORDER'
  | 'ORDER_SHIPPED'
  | 'REVIEW_REQUEST'
  | 'SYSTEM_MAINTENANCE'
  | 'CONTENT_APPROVED'
  | 'CONTENT_REJECTED';

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  readAt?: Date
  createdAt: Date
  data?: Record<string, unknown>
}

// Permission system types
export interface Permission {
  resource: string;    // 'products', 'users', 'analytics', etc.
  action: string;      // 'create', 'read', 'update', 'delete', 'manage'
  scope?: string;      // 'own', 'all', 'team'
}

export interface RolePermission {
  role: UserRole;
  permissions: Permission[];
}