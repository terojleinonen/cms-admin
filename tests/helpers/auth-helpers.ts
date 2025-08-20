/**
 * Auth test helpers
 * Utilities for creating mock users and sessions in tests
 */

import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/password-utils'

export interface MockUserData {
  email?: string
  name?: string
  role?: UserRole
  isActive?: boolean
}

export async function createMockUser(data: MockUserData = {}) {
  const userData = {
    email: data.email || `test-${Date.now()}@example.com`,
    name: data.name || 'Test User',
    role: data.role || UserRole.EDITOR,
    isActive: data.isActive ?? true,
    passwordHash: await hashPassword('password123'),
  }

  return await prisma.user.create({
    data: userData,
  })
}

export function createMockSession(user: any) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  }
}