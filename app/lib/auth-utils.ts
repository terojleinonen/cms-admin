/**
 * Authentication utilities for CMS
 * Provides helper functions for user authentication and authorization
 */

import { getServerSession } from 'next-auth'
import { authOptions } from './auth-config'
import { UserRole } from '@prisma/client'
import { hashPassword as hashPasswordUtil, verifyPassword as verifyPasswordUtil, validatePassword as validatePasswordUtil } from './password-utils'
import { prisma } from './db'

/**
 * Get the current user session on the server side
 * @returns Promise<Session | null>
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions)
    return session?.user || null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Check if the current user has the required role
 * @param requiredRole - The minimum role required
 * @returns Promise<boolean>
 */
export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    if (!user || !user.role) {
      return false
    }

    // Role hierarchy: ADMIN > EDITOR > VIEWER
    const roleHierarchy = {
      [UserRole.VIEWER]: 1,
      [UserRole.EDITOR]: 2,
      [UserRole.ADMIN]: 3,
    }

    const userRoleLevel = roleHierarchy[user.role as UserRole]
    const requiredRoleLevel = roleHierarchy[requiredRole]

    return userRoleLevel >= requiredRoleLevel
  } catch (error) {
    console.error('Error checking user role:', error)
    return false
  }
}

/**
 * Check if the current user is an admin
 * @returns Promise<boolean>
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole(UserRole.ADMIN)
}

/**
 * Check if the current user is an editor or higher
 * @returns Promise<boolean>
 */
export async function isEditor(): Promise<boolean> {
  return hasRole(UserRole.EDITOR)
}

/**
 * Require authentication for API routes
 * @returns Promise<User | Response> - Returns user if authenticated, error response if not
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  return user
}

/**
 * Require specific role for API routes
 * @param requiredRole - The minimum role required
 * @returns Promise<User | Response> - Returns user if authorized, error response if not
 */
export async function requireRole(requiredRole: UserRole) {
  const user = await getCurrentUser()
  
  if (!user) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const hasRequiredRole = await hasRole(requiredRole)
  
  if (!hasRequiredRole) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'FORBIDDEN',
          message: `${requiredRole} role required`,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  return user
}

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Promise<string> - Hashed password
 */
export const hashPassword = hashPasswordUtil

/**
 * Verify a password against a hash
 * @param password - Plain text password
 * @param hash - Hashed password
 * @returns Promise<boolean> - True if password matches
 */
export const verifyPassword = verifyPasswordUtil

/**
 * Create a new user with hashed password
 * @param userData - User data including plain text password
 * @returns Promise<User> - Created user (without password hash)
 */
export async function createUser(userData: {
  email: string
  password: string
  name: string
  role?: UserRole
}) {
  const { password, ...userFields } = userData
  
  // Hash the password
  const passwordHash = await hashPassword(password)
  
  // Create user in database
  const user = await prisma.user.create({
    data: {
      ...userFields,
      email: userFields.email.toLowerCase(),
      passwordHash,
      role: userFields.role || UserRole.EDITOR,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return user
}

/**
 * Update user password
 * @param userId - User ID
 * @param newPassword - New plain text password
 * @returns Promise<boolean> - True if password was updated
 */
export async function updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
  try {
    const passwordHash = await hashPassword(newPassword)
    
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })

    return true
  } catch (error) {
    console.error('Error updating user password:', error)
    return false
  }
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns { isValid: boolean, errors: string[] }
 */
export const validatePassword = validatePasswordUtil