/**
 * NextAuth Test Helpers
 * Comprehensive utilities for testing NextAuth authentication flows
 */

import { UserRole } from '@prisma/client'
import { NextRequest } from 'next/server'

// Import the mock to get access to helper functions
const nextAuthMock = require('../../__mocks__/next-auth.js')

export interface MockSession {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
  }
  expires: string
}

export interface MockUser {
  id: string
  email: string
  name: string
  role: UserRole
}

export interface AuthTestHelpers {
  // Session management
  createMockSession(role?: UserRole, customData?: Partial<MockUser>): MockSession
  createMockUser(role?: UserRole, customData?: Partial<MockUser>): MockUser
  setMockSession(session: MockSession | null): void
  setMockSessionByRole(role?: UserRole, customData?: Partial<MockUser>): MockSession
  clearMockSession(): void
  resetMocks(): void

  // JWT token helpers
  createMockToken(role?: UserRole, customPayload?: Record<string, any>): string
  
  // Request helpers
  mockAuthenticatedRequest(session: MockSession): Partial<NextRequest>
  mockUnauthenticatedRequest(): Partial<NextRequest>
  
  // Role-specific helpers
  mockAdminSession(customData?: Partial<MockUser>): MockSession
  mockEditorSession(customData?: Partial<MockUser>): MockSession
  mockViewerSession(customData?: Partial<MockUser>): MockSession
}

/**
 * Authentication test helpers for NextAuth mocking
 */
export const authHelpers: AuthTestHelpers = {
  /**
   * Create a mock session for a specific role
   */
  createMockSession: (role = UserRole.ADMIN, customData = {}) => {
    return nextAuthMock.createMockSession(role, customData)
  },

  /**
   * Create a mock user for a specific role
   */
  createMockUser: (role = UserRole.ADMIN, customData = {}) => {
    return nextAuthMock.createMockUser(role, customData)
  },

  /**
   * Set the mock session for tests
   */
  setMockSession: (session) => {
    nextAuthMock.setMockSession(session)
  },

  /**
   * Set mock session by role with optional custom data
   */
  setMockSessionByRole: (role = UserRole.ADMIN, customData = {}) => {
    return nextAuthMock.setMockSessionByRole(role, customData)
  },

  /**
   * Clear mock session (simulate unauthenticated state)
   */
  clearMockSession: () => {
    nextAuthMock.clearMockSession()
  },

  /**
   * Reset all mocks to default state
   */
  resetMocks: () => {
    nextAuthMock.resetMocks()
  },

  /**
   * Create a mock JWT token for a specific role
   */
  createMockToken: (role = UserRole.ADMIN, customPayload = {}) => {
    return nextAuthMock.createMockToken(role, customPayload)
  },

  /**
   * Create a mock authenticated request with session
   */
  mockAuthenticatedRequest: (session) => {
    return nextAuthMock.mockAuthenticatedRequest(session)
  },

  /**
   * Create a mock unauthenticated request
   */
  mockUnauthenticatedRequest: () => {
    return nextAuthMock.mockUnauthenticatedRequest()
  },

  /**
   * Create and set admin session
   */
  mockAdminSession: (customData = {}) => {
    const session = authHelpers.createMockSession(UserRole.ADMIN, customData)
    authHelpers.setMockSession(session)
    return session
  },

  /**
   * Create and set editor session
   */
  mockEditorSession: (customData = {}) => {
    const session = authHelpers.createMockSession(UserRole.EDITOR, customData)
    authHelpers.setMockSession(session)
    return session
  },

  /**
   * Create and set viewer session
   */
  mockViewerSession: (customData = {}) => {
    const session = authHelpers.createMockSession(UserRole.VIEWER, customData)
    authHelpers.setMockSession(session)
    return session
  }
}

/**
 * Test utilities for common authentication scenarios
 */
export const authScenarios = {
  /**
   * Test with admin user
   */
  withAdmin: (testFn: (session: MockSession) => Promise<void> | void) => {
    return async () => {
      const session = authHelpers.mockAdminSession()
      await testFn(session)
    }
  },

  /**
   * Test with editor user
   */
  withEditor: (testFn: (session: MockSession) => Promise<void> | void) => {
    return async () => {
      const session = authHelpers.mockEditorSession()
      await testFn(session)
    }
  },

  /**
   * Test with viewer user
   */
  withViewer: (testFn: (session: MockSession) => Promise<void> | void) => {
    return async () => {
      const session = authHelpers.mockViewerSession()
      await testFn(session)
    }
  },

  /**
   * Test without authentication
   */
  withoutAuth: (testFn: () => Promise<void> | void) => {
    return async () => {
      authHelpers.clearMockSession()
      await testFn()
    }
  },

  /**
   * Test with custom session
   */
  withCustomSession: (session: MockSession, testFn: (session: MockSession) => Promise<void> | void) => {
    return async () => {
      authHelpers.setMockSession(session)
      await testFn(session)
    }
  }
}

/**
 * Mock NextAuth configuration for tests
 */
export const mockAuthConfig = {
  providers: [
    {
      id: 'credentials',
      name: 'Credentials',
      type: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      authorize: jest.fn().mockResolvedValue(authHelpers.createMockUser())
    }
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 24 * 60 * 60 // 24 hours
  },
  callbacks: {
    jwt: jest.fn().mockImplementation(({ token, user }) => {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    }),
    session: jest.fn().mockImplementation(({ session, token }) => {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    })
  }
}

// Export commonly used mock data
export const mockUsers = {
  admin: authHelpers.createMockUser(UserRole.ADMIN),
  editor: authHelpers.createMockUser(UserRole.EDITOR),
  viewer: authHelpers.createMockUser(UserRole.VIEWER)
}

export const mockSessions = {
  admin: authHelpers.createMockSession(UserRole.ADMIN),
  editor: authHelpers.createMockSession(UserRole.EDITOR),
  viewer: authHelpers.createMockSession(UserRole.VIEWER)
}

export const mockTokens = {
  admin: authHelpers.createMockToken(UserRole.ADMIN),
  editor: authHelpers.createMockToken(UserRole.EDITOR),
  viewer: authHelpers.createMockToken(UserRole.VIEWER)
}

// Default exports for convenience
export default authHelpers