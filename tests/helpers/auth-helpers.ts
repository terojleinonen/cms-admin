/**
 * Auth test helpers
 * Utilities for creating mock users and sessions in tests
 */

import { UserRole } from '@prisma/client'

// Mock the database and password utils before importing
jest.mock('@/lib/db')
jest.mock('@/lib/password-utils', () => ({
  hashPassword: jest.fn().mockResolvedValue('mock-hashed-password'),
  verifyPassword: jest.fn().mockResolvedValue(true),
}))

import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/password-utils'

// Import NextAuth helpers
import { authHelpers } from '../../__tests__/helpers/nextauth-helpers'

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

// Re-export NextAuth helpers for convenience
export const {
  setMockSession,
  setMockSessionByRole,
  clearMockSession,
  resetMocks,
  mockAdminSession,
  mockEditorSession,
  mockViewerSession,
  createMockToken,
  mockAuthenticatedRequest,
  mockUnauthenticatedRequest
} = authHelpers