/**
 * Type Guards and Type Utilities
 * 
 * Provides safe type checking and validation utilities to replace unsafe type assertions
 */

import { UserRole } from '@prisma/client'

/**
 * Type guard for checking if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Type guard for checking if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * Type guard for checking if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Type guard for checking if a value is an object (not null, not array)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Type guard for checking if a value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
 * Type guard for checking if a value is a valid UserRole
 */
export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && Object.values(UserRole).includes(value as UserRole)
}

/**
 * Type guard for checking if a value is a valid ProductStatus
 */
export function isProductStatus(value: unknown): value is 'DRAFT' | 'PUBLISHED' {
  return typeof value === 'string' && ['DRAFT', 'PUBLISHED'].includes(value)
}

/**
 * Type guard for session user object
 */
export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
}

export function isSessionUser(value: unknown): value is SessionUser {
  if (!isObject(value)) return false
  
  return (
    isString(value.id) &&
    isString(value.email) &&
    isString(value.name) &&
    isUserRole(value.role)
  )
}

/**
 * Type guard for session object with user
 */
export interface SessionWithUser {
  user: SessionUser
  sessionToken?: string
}

export function isSessionWithUser(value: unknown): value is SessionWithUser {
  if (!isObject(value)) return false
  
  return isSessionUser(value.user)
}

/**
 * Type guard for audit log details
 */
export interface AuditLogDetails {
  success?: boolean
  resource?: string
  action?: string
  latency?: number
  severity?: string
  resolved?: boolean
  targetUserId?: string
  oldRole?: string
  newRole?: string
  changedBy?: string
  reason?: string
  [key: string]: unknown
}

export function isAuditLogDetails(value: unknown): value is AuditLogDetails {
  return isObject(value)
}

/**
 * Type guard for product category relation
 */
export interface ProductCategoryRelation {
  category: {
    id: string
    name: string
    slug: string
    parent?: {
      id: string
      name: string
      slug: string
    }
  }
  categoryId: string
}

export function isProductCategoryRelation(value: unknown): value is ProductCategoryRelation {
  if (!isObject(value)) return false
  
  return (
    isObject(value.category) &&
    isString(value.category.id) &&
    isString(value.category.name) &&
    isString(value.category.slug) &&
    isString(value.categoryId)
  )
}

/**
 * Type guard for product media relation
 */
export interface ProductMediaRelation {
  media: {
    id: string
    filename: string
    url: string
    mimeType: string
    size: number
  }
}

export function isProductMediaRelation(value: unknown): value is ProductMediaRelation {
  if (!isObject(value)) return false
  
  return (
    isObject(value.media) &&
    isString(value.media.id) &&
    isString(value.media.filename) &&
    isString(value.media.url) &&
    isString(value.media.mimeType) &&
    isNumber(value.media.size)
  )
}

/**
 * Type guard for notification data
 */
export interface NotificationData {
  title: string
  message: string
  data?: Record<string, unknown>
}

export function isNotificationData(value: unknown): value is NotificationData {
  if (!isObject(value)) return false
  
  return (
    isString(value.title) &&
    isString(value.message)
  )
}

/**
 * Safe type assertion with validation
 */
export function assertType<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  errorMessage?: string
): T {
  if (guard(value)) {
    return value
  }
  throw new TypeError(errorMessage || 'Type assertion failed')
}

/**
 * Safe type conversion with fallback
 */
export function safeConvert<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  fallback: T
): T {
  return guard(value) ? value : fallback
}

/**
 * Extract property safely with type checking
 */
export function safeExtract<T>(
  obj: unknown,
  key: string,
  guard: (value: unknown) => value is T,
  fallback?: T
): T | undefined {
  if (!isObject(obj) || !(key in obj)) {
    return fallback
  }
  
  const value = obj[key]
  return guard(value) ? value : fallback
}

/**
 * Validate and extract multiple properties from an object
 */
export function extractProperties<T extends Record<string, unknown>>(
  obj: unknown,
  schema: {
    [K in keyof T]: {
      guard: (value: unknown) => value is T[K]
      required?: boolean
      fallback?: T[K]
    }
  }
): Partial<T> {
  if (!isObject(obj)) {
    return {}
  }
  
  const result: Partial<T> = {}
  
  for (const [key, config] of Object.entries(schema)) {
    const value = obj[key]
    
    if (config.guard(value)) {
      result[key as keyof T] = value
    } else if (config.required && config.fallback !== undefined) {
      result[key as keyof T] = config.fallback
    } else if (!config.required && config.fallback !== undefined) {
      result[key as keyof T] = config.fallback
    }
  }
  
  return result
}

/**
 * Type-safe JSON parsing
 */
export function safeJsonParse<T>(
  json: string,
  guard: (value: unknown) => value is T
): T | null {
  try {
    const parsed = JSON.parse(json)
    return guard(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Type-safe array mapping with filtering
 */
export function safeMap<T, U>(
  array: unknown,
  guard: (value: unknown) => value is T,
  mapper: (value: T) => U
): U[] {
  if (!isArray(array)) {
    return []
  }
  
  return array
    .filter(guard)
    .map(mapper)
}