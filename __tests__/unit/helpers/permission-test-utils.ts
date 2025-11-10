/**
 * Permission Testing Utilities
 * Utilities for testing permission hooks and utilities
 */

import { UserRole } from '@prisma/client'
import { jest } from '@jest/globals'

export interface MockUser {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
}

export function createMockUser(role: UserRole = UserRole.VIEWER, overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: `user-${role.toLowerCase()}-${Date.now()}`,
    email: `${role.toLowerCase()}@test.com`,
    name: `Test ${role}`,
    role,
    isActive: true,
    ...overrides
  }
}

export function createMockSession(user: MockUser) {
  return {
    user,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}

export class PermissionTestHelper {
  static mockPermissionCheck(hasPermission: boolean) {
    return jest.fn().mockResolvedValue(hasPermission)
  }

  static mockRoleCheck(allowedRoles: UserRole[]) {
    return jest.fn((user: MockUser) => allowedRoles.includes(user.role))
  }

  static createPermissionMatrix() {
    return {
      [UserRole.ADMIN]: ['read', 'write', 'delete', 'admin'],
      [UserRole.EDITOR]: ['read', 'write'],
      [UserRole.VIEWER]: ['read']
    }
  }
}
