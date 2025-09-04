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

// Enhanced mock state management
let currentMockSession = mockSession
let mockSessionHistory = []
let mockCallCount = {
  getServerSession: 0,
  getSession: 0,
  signIn: 0,
  signOut: 0
}

// Mock NextAuth functions with enhanced state management
const getServerSession = jest.fn()
const getSession = jest.fn()
const signIn = jest.fn()
const signOut = jest.fn()

// Mock NextAuth providers with enhanced configuration
const CredentialsProvider = jest.fn().mockImplementation((config) => {
  const provider = {
    id: 'credentials',
    name: 'Credentials',
    type: 'credentials',
    credentials: config.credentials || {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    authorize: config.authorize || jest.fn().mockImplementation(async (credentials) => {
      // Simulate realistic authorization logic
      if (!credentials?.email || !credentials?.password) {
        return null
      }
      
      // Simulate user lookup
      const user = Object.values(mockSessions).find(session => 
        session.user.email === credentials.email
      )?.user
      
      if (user && credentials.password === 'correct-password') {
        return user
      }
      
      return null
    })
  }
  
  // Add validation
  if (!config.credentials) {
    console.warn('CredentialsProvider: No credentials configuration provided')
  }
  
  return provider
})

// Enhanced Mock NextAuth adapter with realistic implementations
const PrismaAdapter = jest.fn().mockImplementation(() => {
  const adapter = {
    createUser: jest.fn().mockImplementation(async (user) => {
      const newUser = {
        id: `user-${Date.now()}`,
        ...user,
        emailVerified: null,
        image: null
      }
      return newUser
    }),
    getUser: jest.fn().mockImplementation(async (id) => {
      const session = Object.values(mockSessions).find(s => s.user.id === id)
      return session?.user || null
    }),
    getUserByEmail: jest.fn().mockImplementation(async (email) => {
      const session = Object.values(mockSessions).find(s => s.user.email === email)
      return session?.user || null
    }),
    getUserByAccount: jest.fn().mockImplementation(async () => {
      // Simulate account lookup
      return mockUser
    }),
    updateUser: jest.fn().mockImplementation(async (user) => {
      return { ...mockUser, ...user }
    }),
    deleteUser: jest.fn().mockImplementation(async () => {
      return mockUser
    }),
    linkAccount: jest.fn().mockImplementation(async (account) => {
      return account
    }),
    unlinkAccount: jest.fn().mockImplementation(async () => {
      return undefined
    }),
    createSession: jest.fn().mockImplementation(async ({ sessionToken, userId, expires }) => {
      return {
        sessionToken,
        userId,
        expires,
        id: `session-${Date.now()}`
      }
    }),
    getSessionAndUser: jest.fn().mockImplementation(async (sessionToken) => {
      if (currentMockSession) {
        return {
          session: {
            sessionToken,
            userId: currentMockSession.user.id,
            expires: currentMockSession.expires,
            id: `session-${Date.now()}`
          },
          user: currentMockSession.user
        }
      }
      return null
    }),
    updateSession: jest.fn().mockImplementation(async (session) => {
      return session
    }),
    deleteSession: jest.fn().mockImplementation(async () => {
      return undefined
    }),
    createVerificationToken: jest.fn().mockImplementation(async ({ identifier, expires, token }) => {
      return { identifier, expires, token }
    }),
    useVerificationToken: jest.fn().mockImplementation(async ({ identifier, token }) => {
      return { identifier, token, expires: new Date() }
    }),
  }
  
  return adapter
})

// Enhanced default implementations with state tracking
getServerSession.mockImplementation(async (...args) => {
  mockCallCount.getServerSession++
  mockSessionHistory.push({ type: 'getServerSession', timestamp: Date.now(), args })
  return currentMockSession
})

getSession.mockImplementation(async (...args) => {
  mockCallCount.getSession++
  mockSessionHistory.push({ type: 'getSession', timestamp: Date.now(), args })
  return currentMockSession
})

signIn.mockImplementation(async (provider, options = {}) => {
  mockCallCount.signIn++
  mockSessionHistory.push({ type: 'signIn', timestamp: Date.now(), provider, options })
  
  // Simulate sign in logic
  if (options.email && options.password) {
    const userSession = Object.values(mockSessions).find(session => 
      session.user.email === options.email
    )
    
    if (userSession && options.password === 'correct-password') {
      currentMockSession = userSession
      return { ok: true, error: null, status: 200, url: options.callbackUrl || '/' }
    } else {
      return { ok: false, error: 'CredentialsSignin', status: 401, url: null }
    }
  }
  
  return { ok: true, error: null, status: 200, url: options.callbackUrl || '/' }
})

signOut.mockImplementation(async (options = {}) => {
  mockCallCount.signOut++
  mockSessionHistory.push({ type: 'signOut', timestamp: Date.now(), options })
  
  currentMockSession = null
  return { ok: true, url: options.callbackUrl || '/' }
})

// Enhanced authentication test helpers with better state management
const authHelpers = {
  // Create mock session for specific role with validation
  createMockSession: (role = UserRole.ADMIN, customData = {}) => {
    if (!Object.values(UserRole).includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be one of: ${Object.values(UserRole).join(', ')}`)
    }
    
    const baseSession = mockSessions[role.toLowerCase()] || mockSessions.admin
    const session = {
      ...baseSession,
      user: {
        ...baseSession.user,
        ...customData
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
    
    // Validate session structure
    if (!session.user.id || !session.user.email || !session.user.role) {
      throw new Error('Invalid session structure: missing required user fields')
    }
    
    return session
  },

  // Create mock user for specific role with validation
  createMockUser: (role = UserRole.ADMIN, customData = {}) => {
    if (!Object.values(UserRole).includes(role)) {
      throw new Error(`Invalid role: ${role}`)
    }
    
    const user = {
      id: `${role.toLowerCase()}-user-${Date.now()}`,
      email: `${role.toLowerCase()}-${Date.now()}@example.com`,
      name: `${role} User`,
      role: role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...customData
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(user.email)) {
      throw new Error('Invalid email format')
    }
    
    return user
  },

  // Create mock JWT token with realistic structure
  createMockToken: (role = UserRole.ADMIN, customPayload = {}) => {
    const payload = {
      sub: `${role.toLowerCase()}-user-id`,
      email: `${role.toLowerCase()}@example.com`,
      role: role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      ...customPayload
    }
    
    // Create a more realistic JWT structure (header.payload.signature)
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payloadStr = btoa(JSON.stringify(payload))
    const signature = btoa(`mock-signature-${role}-${Date.now()}`)
    
    return `${header}.${payloadStr}.${signature}`
  },

  // Set mock session with state tracking
  setMockSession: (session) => {
    currentMockSession = session
    mockSessionHistory.push({ type: 'setMockSession', timestamp: Date.now(), session })
    
    // Update mock implementations
    getServerSession.mockResolvedValue(session)
    getSession.mockResolvedValue(session)
  },

  // Set mock session by role with enhanced options
  setMockSessionByRole: (role = UserRole.ADMIN, customData = {}, options = {}) => {
    const session = authHelpers.createMockSession(role, customData)
    
    if (options.expired) {
      session.expires = new Date(Date.now() - 1000).toISOString() // Expired 1 second ago
    }
    
    authHelpers.setMockSession(session)
    return session
  },

  // Set mock user with session creation
  setMockUser: (user) => {
    const session = { 
      user,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
    authHelpers.setMockSession(session)
    return session
  },

  // Clear mock session (unauthenticated) with state tracking
  clearMockSession: () => {
    currentMockSession = null
    mockSessionHistory.push({ type: 'clearMockSession', timestamp: Date.now() })
    
    getServerSession.mockResolvedValue(null)
    getSession.mockResolvedValue(null)
  },

  // Enhanced reset with complete state cleanup
  resetMocks: () => {
    // Clear all mock calls
    getServerSession.mockClear()
    getSession.mockClear()
    signIn.mockClear()
    signOut.mockClear()
    
    // Reset state
    currentMockSession = mockSession
    mockSessionHistory = []
    mockCallCount = {
      getServerSession: 0,
      getSession: 0,
      signIn: 0,
      signOut: 0
    }
    
    // Reset to default implementations
    getServerSession.mockImplementation(async () => {
      mockCallCount.getServerSession++
      return currentMockSession
    })
    getSession.mockImplementation(async () => {
      mockCallCount.getSession++
      return currentMockSession
    })
    signIn.mockResolvedValue({ ok: true, error: null, status: 200 })
    signOut.mockResolvedValue({ ok: true })
  },

  // Enhanced mock authenticated request
  mockAuthenticatedRequest: (session, options = {}) => {
    const token = authHelpers.createMockToken(session.user.role)
    const mockRequest = {
      headers: new Headers({
        'authorization': `Bearer ${token}`,
        'content-type': 'application/json',
        'user-agent': 'Test-Agent/1.0',
        ...options.headers
      }),
      cookies: {
        get: jest.fn().mockImplementation((name) => {
          if (name === 'next-auth.session-token') {
            return { value: `session-${session.user.id}` }
          }
          return null
        })
      },
      method: options.method || 'GET',
      url: options.url || 'http://localhost:3000/api/test'
    }
    
    authHelpers.setMockSession(session)
    return mockRequest
  },

  // Enhanced mock unauthenticated request
  mockUnauthenticatedRequest: (options = {}) => {
    const mockRequest = {
      headers: new Headers({
        'content-type': 'application/json',
        'user-agent': 'Test-Agent/1.0',
        ...options.headers
      }),
      cookies: {
        get: jest.fn().mockReturnValue(null)
      },
      method: options.method || 'GET',
      url: options.url || 'http://localhost:3000/api/test'
    }
    
    authHelpers.clearMockSession()
    return mockRequest
  },

  // Get mock state for debugging
  getMockState: () => ({
    currentSession: currentMockSession,
    sessionHistory: [...mockSessionHistory],
    callCount: { ...mockCallCount }
  }),

  // Simulate session expiry
  expireSession: () => {
    if (currentMockSession) {
      currentMockSession.expires = new Date(Date.now() - 1000).toISOString()
      mockSessionHistory.push({ type: 'expireSession', timestamp: Date.now() })
    }
  },

  // Simulate network errors for auth operations
  simulateAuthError: (operation, error) => {
    const operations = { getServerSession, getSession, signIn, signOut }
    if (operations[operation]) {
      operations[operation].mockRejectedValueOnce(error)
    }
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