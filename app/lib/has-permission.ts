/**
 * Permission Checking Utility
 * Provides permission checking functionality for users
 */

import { UserRole } from '@prisma/client'

export interface User {
  id: string
  role: UserRole
  isActive: boolean
}

export interface Permission {
  resource: string
  action: string
}

// Permission matrix defining what each role can do
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: ['*'], // Admin has all permissions
  [UserRole.EDITOR]: [
    'products:read',
    'products:write',
    'products:delete',
    'categories:read',
    'categories:write',
    'categories:delete',
    'media:read',
    'media:write',
    'media:delete',
    'pages:read',
    'pages:write',
    'pages:delete',
    'orders:read',
    'orders:write'
  ],
  [UserRole.VIEWER]: [
    'products:read',
    'categories:read',
    'media:read',
    'pages:read',
    'orders:read'
  ]
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: User | null | undefined, permission: string): boolean {
  if (!user || !user.isActive) {
    return false
  }

  const userPermissions = ROLE_PERMISSIONS[user.role] || []

  // Admin has all permissions
  if (userPermissions.includes('*')) {
    return true
  }

  // Check for exact permission match
  if (userPermissions.includes(permission)) {
    return true
  }

  // Check for wildcard permission (e.g., 'products:*' matches 'products:read')
  const [resource] = permission.split(':')
  if (userPermissions.includes(`${resource}:*`)) {
    return true
  }

  return false
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: User | null | undefined, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(user, permission))
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(user: User | null | undefined, permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(user, permission))
}

/**
 * Check if a user has a specific role
 */
export function hasRole(user: User | null | undefined, role: UserRole): boolean {
  return user?.isActive === true && user?.role === role
}

/**
 * Check if a user has any of the specified roles
 */
export function hasAnyRole(user: User | null | undefined, roles: UserRole[]): boolean {
  return user?.isActive === true && roles.includes(user.role)
}

/**
 * Get all permissions for a user's role
 */
export function getUserPermissions(user: User | null | undefined): string[] {
  if (!user || !user.isActive) {
    return []
  }

  return ROLE_PERMISSIONS[user.role] || []
}
