/**
 * NextAuth Mock for Jest Tests
 * Provides comprehensive mocking for NextAuth functionality with ES module compatibility
 */

// Mock user roles enum
const UserRole = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER'
}

// Default mock sessions for different roles
const mockSessions = {
  admin: {
    user: {
      id: 'admin-user-id',
      email: 'admin@example.com',
      name: 'Admin User',
      role: UserRole.ADMIN
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  editor: {
    user: {
      id: 'editor-user-id',
      email: 'editor@example.com',
      name: 'Editor User',
      role: UserRole.EDITOR
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  viewer: {
    user: {
      id: 'viewer-user-id',
      email: 'viewer@example.com',
      name: 'Viewer User',
      role: UserRole.VIEWER
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}

// Default mock session (admin)
const mockSession = mockSessions.admin

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: UserRole.ADMIN
}

// Mock JWT tokens
const mockTokens = {
  admin: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi11c2VyLWlkIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTUxNjIzOTAyMn0.mock-admin-token',
  editor: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlZGl0b3ItdXNlci1pZCIsImVtYWlsIjoiZWRpdG9yQGV4YW1wbGUuY29tIiwicm9sZSI6IkVESVRPUiIsImlhdCI6MTUxNjIzOTAyMn0.mock-editor-token',
  viewer: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ2aWV3ZXItdXNlci1pZCIsImVtYWlsIjoidmlld2VyQGV4YW1wbGUuY29tIiwicm9sZSI6IlZJRVdFUiIsImlhdCI6MTUxNjIzOTAyMn0.mock-viewer-token'
}

// Mock NextAuth functions
const getServerSession = jest.fn()
const getSession = jest.fn()
const signIn = jest.fn()
const signOut = jest.fn()

// Mock NextAuth providers
const CredentialsProvider = jest.fn().mockImplementation((config) => ({
  id: 'credentials',
  name: 'Credentials',
  type: 'credentials',
  credentials: config.credentials || {},
  authorize: config.authorize || jest.fn().mockResolvedValue(mockUser)
}))

// Mock NextAuth adapter
const PrismaAdapter = jest.fn().mockImplementation(() => ({
  createUser: jest.fn(),
  getUser: jest.fn(),
  getUserByEmail: jest.fn(),
  getUserByAccount: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  linkAccount: jest.fn(),
  unlinkAccount: jest.fn(),
  createSession: jest.fn(),
  getSessionAndUser: jest.fn(),
  updateSession: jest.fn(),
  deleteSession: jest.fn(),
  createVerificationToken: jest.fn(),
  useVerificationToken: jest.fn(),
}))

// Default implementations
getServerSession.mockResolvedValue(mockSession)
getSession.mockResolvedValue(mockSession)
signIn.mockResolvedValue({ ok: true, error: null })
signOut.mockResolvedValue({ ok: true })

// Authentication test helpers
const authHelpers = {
  // Create mock session for specific role
  createMockSession: (role = UserRole.ADMIN, customData = {}) => {
    const baseSession = mockSessions[role.toLowerCase()] || mockSessions.admin
    return {
      ...baseSession,
      user: {
        ...baseSession.user,
        ...customData
      }
    }
  },

  // Create mock user for specific role
  createMockUser: (role = UserRole.ADMIN, customData = {}) => {
    return {
      id: `${role.toLowerCase()}-user-id`,
      email: `${role.toLowerCase()}@example.com`,
      name: `${role} User`,
      role: role,
      ...customData
    }
  },

  // Create mock JWT token
  createMockToken: (role = UserRole.ADMIN, customPayload = {}) => {
    const baseToken = mockTokens[role.toLowerCase()] || mockTokens.admin
    // In a real implementation, you'd encode the custom payload
    // For testing, we just return a mock token string
    return baseToken
  },

  // Set mock session for tests
  setMockSession: (session) => {
    getServerSession.mockResolvedValue(session)
    getSession.mockResolvedValue(session)
  },

  // Set mock session by role
  setMockSessionByRole: (role = UserRole.ADMIN, customData = {}) => {
    const session = authHelpers.createMockSession(role, customData)
    authHelpers.setMockSession(session)
    return session
  },

  // Set mock user
  setMockUser: (user) => {
    const session = { ...mockSession, user }
    getServerSession.mockResolvedValue(session)
    getSession.mockResolvedValue(session)
  },

  // Clear mock session (unauthenticated)
  clearMockSession: () => {
    getServerSession.mockResolvedValue(null)
    getSession.mockResolvedValue(null)
  },

  // Reset all mocks to default state
  resetMocks: () => {
    getServerSession.mockClear()
    getSession.mockClear()
    signIn.mockClear()
    signOut.mockClear()
    
    // Reset to default values
    getServerSession.mockResolvedValue(mockSession)
    getSession.mockResolvedValue(mockSession)
    signIn.mockResolvedValue({ ok: true, error: null })
    signOut.mockResolvedValue({ ok: true })
  },

  // Mock authenticated request with session
  mockAuthenticatedRequest: (session) => {
    const mockRequest = {
      headers: new Headers({
        'authorization': `Bearer ${authHelpers.createMockToken(session.user.role)}`,
        'content-type': 'application/json'
      }),
      cookies: {
        get: jest.fn().mockReturnValue({
          value: 'mock-session-token'
        })
      }
    }
    authHelpers.setMockSession(session)
    return mockRequest
  },

  // Mock unauthenticated request
  mockUnauthenticatedRequest: () => {
    const mockRequest = {
      headers: new Headers({
        'content-type': 'application/json'
      }),
      cookies: {
        get: jest.fn().mockReturnValue(null)
      }
    }
    authHelpers.clearMockSession()
    return mockRequest
  }
}

// Export mocked functions and helpers
const nextAuthMock = {
  getServerSession,
  getSession,
  signIn,
  signOut,
  
  // Mock providers and adapters
  providers: {
    CredentialsProvider
  },
  
  // Mock sessions and users for different roles
  mockSession,
  mockSessions,
  mockUser,
  mockTokens,
  UserRole,
  
  // Authentication test helpers
  ...authHelpers
}

// CommonJS export
module.exports = nextAuthMock

// ES module compatibility - export as default and named exports
module.exports.default = nextAuthMock
module.exports.getServerSession = getServerSession
module.exports.getSession = getSession
module.exports.signIn = signIn
module.exports.signOut = signOut