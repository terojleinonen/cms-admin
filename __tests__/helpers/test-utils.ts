/**
 * Consolidated Test Utilities
 * Core testing utilities for the CMS application
 */

import { jest } from '@jest/globals'
import { UserRole } from '@prisma/client'
import { User } from '@/lib/types'

// Mock user factory
export interface MockUserOptions {
  id?: string
  email?: string
  name?: string
  role?: UserRole
  isActive?: boolean
  emailVerified?: Date
  twoFactorEnabled?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export function createMockUser(options: MockUserOptions = {}): User {
  return {
    id: options.id || 'test-user-id',
    email: options.email || 'test@example.com',
    name: options.name || 'Test User',
    role: options.role || UserRole.VIEWER,
    isActive: options.isActive ?? true,
    emailVerified: options.emailVerified || new Date(),
    twoFactorEnabled: options.twoFactorEnabled || false,
    createdAt: options.createdAt || new Date(),
    updatedAt: options.updatedAt || new Date(),
  }
}

// Mock session factory
export interface MockSessionOptions {
  user?: User
  expires?: string
}

export function createMockSession(userOptions: MockUserOptions = {}) {
  return {
    user: createMockUser(userOptions),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

// Mock API request factory
export function createMockRequest(options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: any
} = {}) {
  return {
    method: options.method || 'GET',
    url: options.url || 'http://localhost:3001/api/test',
    headers: new Map(Object.entries(options.headers || {})),
    json: jest.fn().mockResolvedValue(options.body || {}),
    cookies: {
      get: jest.fn(),
      set: jest.fn(),
    },
  }
}

// Mock API response factory
export function createMockResponse(data: any, status = 200) {
  return {
    status,
    headers: new Map(),
    json: () => Promise.resolve(data),
  }
}

// Database test utilities
export function createTestData() {
  return {
    users: [
      createMockUser({ role: UserRole.ADMIN, email: 'admin@test.com' }),
      createMockUser({ role: UserRole.EDITOR, email: 'editor@test.com' }),
      createMockUser({ role: UserRole.VIEWER, email: 'viewer@test.com' }),
    ],
  }
}

// Common test assertions
export function expectUnauthorized(response: any) {
  expect(response.status).toBe(401)
}

export function expectForbidden(response: any) {
  expect(response.status).toBe(403)
}

export function expectSuccess(response: any) {
  expect(response.status).toBe(200)
}