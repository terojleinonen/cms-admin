/**
 * Test Setup and Configuration
 * Global test setup, mocks, and environment configuration
 */

import { jest } from '@jest/globals'
import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'
import crypto from 'crypto'

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

// Mock crypto for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => crypto.randomUUID(),
    getRandomValues: (arr: any) => crypto.getRandomValues(arr),
    subtle: crypto.webcrypto?.subtle,
  },
})

// Mock NextAuth
jest.mock('next-auth', () => {
  const mockNextAuth = jest.fn().mockImplementation((options) => ({
    handlers: { GET: jest.fn(), POST: jest.fn() },
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn()
  }))
  return {
    __esModule: true,
    default: mockNextAuth,
    NextAuth: mockNextAuth
  }
})

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}))

// Mock Next.js server components
jest.mock('next/server', () => {
  // Create a mock NextResponse class that can be used with instanceof
  class MockNextResponse {
    status: number
    headers: Map<string, string>
    cookies: any
    
    constructor(body?: any, init?: any) {
      this.status = init?.status || 200
      this.headers = new Map(Object.entries(init?.headers || {}))
      this.cookies = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      }
    }

    json() {
      return Promise.resolve({})
    }

    static json(data: any, options?: any) {
      const response = new MockNextResponse(data, options)
      response.json = () => Promise.resolve(data)
      return response
    }

    static redirect(url: string, status?: number) {
      const response = new MockNextResponse(null, { status: status || 307 })
      response.headers.set('Location', typeof url === 'string' ? url : url.toString())
      return response
    }

    static next() {
      return new MockNextResponse(null, { status: 200 })
    }
  }

  // Create a mock NextRequest class
  class MockNextRequest {
    url: string
    method: string
    headers: Map<string, string>
    nextUrl: any
    cookies: any
    geo: any
    ip: string

    constructor(url: string | URL, options?: any) {
      const urlObj = typeof url === 'string' ? new URL(url) : url
      this.url = urlObj.toString()
      this.method = options?.method || 'GET'
      this.headers = new Map(Object.entries(options?.headers || {}))
      this.nextUrl = {
        pathname: urlObj.pathname,
        search: urlObj.search,
        searchParams: urlObj.searchParams,
        href: urlObj.href,
        origin: urlObj.origin,
      }
      this.cookies = {
        get: jest.fn(),
        set: jest.fn(),
      }
      this.geo = {}
      this.ip = options?.ip || '127.0.0.1'
    }

    json() {
      return Promise.resolve({})
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  }
})

// Mock Prisma client
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

// Mock Prisma
const mockPrismaClient = {
  product: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  category: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
}

jest.mock('@/lib/db', () => ({
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}))

// Mock password utilities
jest.mock('@/lib/password-utils', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  verifyPassword: jest.fn().mockResolvedValue(true),
}))

// Mock auth utilities
jest.mock('@/lib/auth-utils', () => ({
  verifyPassword: jest.fn().mockResolvedValue(true),
}))

// Mock database error handler
jest.mock('@/lib/db-errors', () => ({
  handleDatabaseError: jest.fn().mockReturnValue({
    code: 'DATABASE_ERROR',
    message: 'Database error occurred',
  }),
}))

// Mock preferences middleware
jest.mock('@/lib/preferences-middleware', () => ({
  applyUserPreferences: jest.fn((req, res) => res),
  getUserPreferences: jest.fn().mockReturnValue({
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    itemsPerPage: 25
  }),
  setUserPreferences: jest.fn((res, prefs) => res)
}))

// Mock has-permission
jest.mock('@/lib/has-permission', () => ({
  hasPermission: jest.fn().mockReturnValue(true),
  hasAnyPermission: jest.fn().mockReturnValue(true),
  hasAllPermissions: jest.fn().mockReturnValue(true),
  hasRole: jest.fn().mockReturnValue(true),
  hasAnyRole: jest.fn().mockReturnValue(true),
  getUserPermissions: jest.fn().mockReturnValue([])
}))

// Mock permissions
jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: {
    PRODUCTS_READ: 'products:read',
    PRODUCTS_WRITE: 'products:write',
    PRODUCTS_DELETE: 'products:delete'
  },
  ROLE_PERMISSIONS: {},
  roleHasPermission: jest.fn().mockReturnValue(true),
  getRolePermissions: jest.fn().mockReturnValue([]),
  PermissionService: jest.fn().mockImplementation(() => ({
    hasPermission: jest.fn().mockReturnValue(true),
    hasResourceAccess: jest.fn().mockReturnValue(true),
    checkPermissions: jest.fn().mockResolvedValue(true),
    clearCache: jest.fn(),
    getCacheSize: jest.fn().mockReturnValue(0)
  })),
  EnhancedPermissionService: jest.fn().mockImplementation(() => ({
    hasPermission: jest.fn().mockReturnValue(true),
    hasPermissionWithCache: jest.fn().mockReturnValue(true),
    clearCache: jest.fn(),
    invalidateUserCache: jest.fn()
  })),
  EnhancedPermissionCache: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    get: jest.fn().mockReturnValue(null),
    delete: jest.fn(),
    clear: jest.fn(),
    size: jest.fn().mockReturnValue(0)
  })),
  ResourcePermissionValidator: jest.fn().mockImplementation(() => ({
    canAccessResource: jest.fn().mockReturnValue(true),
    getAccessibleResources: jest.fn().mockReturnValue([])
  })),
  RoleHierarchyValidator: jest.fn().mockImplementation(() => ({
    isHigherRole: jest.fn().mockReturnValue(false),
    isEqualOrHigherRole: jest.fn().mockReturnValue(true),
    getRoleLevel: jest.fn().mockReturnValue(1)
  })),
  PermissionCacheWarmer: jest.fn().mockImplementation(() => ({
    warmCache: jest.fn().mockResolvedValue(undefined),
    getCache: jest.fn()
  })),
  CacheInvalidationService: jest.fn().mockImplementation(() => ({
    invalidateUser: jest.fn(),
    invalidateRole: jest.fn(),
    invalidateAll: jest.fn(),
    invalidatePattern: jest.fn()
  })),
  permissionService: {
    hasPermission: jest.fn().mockReturnValue(true),
    clearCache: jest.fn(),
    getCacheStats: jest.fn().mockReturnValue({ size: 0, hits: 0, misses: 0 }),
    canUserAccessRoute: jest.fn().mockReturnValue(true),
    filterByPermissions: jest.fn((items) => items),
    warmCache: jest.fn(),
    ownsResource: jest.fn().mockReturnValue(false),
    isAdmin: jest.fn().mockReturnValue(false),
    isEditor: jest.fn().mockReturnValue(false),
    isViewer: jest.fn().mockReturnValue(false),
    invalidateUserCache: jest.fn()
  },
  resourceValidator: {
    canAccessResource: jest.fn().mockReturnValue(true),
    canCreateProduct: jest.fn().mockReturnValue(true),
    canReadProduct: jest.fn().mockReturnValue(true),
    canUpdateProduct: jest.fn().mockReturnValue(true),
    canDeleteProduct: jest.fn().mockReturnValue(true),
    canCreateUser: jest.fn().mockReturnValue(true),
    canUpdateUser: jest.fn().mockReturnValue(true),
    canDeleteUser: jest.fn().mockReturnValue(true)
  },
  roleHierarchy: {
    isHigherRole: jest.fn().mockReturnValue(false),
    isEqualOrHigherRole: jest.fn().mockReturnValue(true),
    getRoleLevel: jest.fn().mockReturnValue(1)
  }
}))

// Mock API permission middleware
jest.mock('@/lib/api-permission-middleware', () => {
  const mockValidatePermissions = jest.fn().mockResolvedValue({
    allowed: true,
    user: null,
    error: null
  })

  return {
    ApiPermissionMiddleware: jest.fn().mockImplementation(() => ({
      validatePermissions: mockValidatePermissions,
      checkPermission: jest.fn().mockResolvedValue(true),
      getUser: jest.fn().mockResolvedValue(null)
    })),
    withApiPermissions: jest.fn().mockImplementation((handler) => handler),
    createApiSuccessResponse: jest.fn().mockImplementation((data, status = 200) => ({
      status,
      json: () => Promise.resolve({ success: true, data }),
    })),
    createApiErrorResponse: jest.fn().mockImplementation((error, status = 400) => ({
      status,
      json: () => Promise.resolve({ success: false, error }),
    })),
  }
})

// Mock environment variables
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

// Mock ResizeObserver for HeadlessUI components
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock setInterval to prevent open handles in tests
const originalSetInterval = global.setInterval
global.setInterval = jest.fn().mockImplementation((callback, delay) => {
  // Return a mock timer ID
  return 12345
})

// Mock clearInterval
global.clearInterval = jest.fn()

// Suppress performance alerts during testing
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  // Only suppress permission performance alerts
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Permission Performance Alert')) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  // Only suppress permission performance alerts
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Permission Performance Alert')) {
    return;
  }
  originalConsoleWarn(...args);
};

// Global test setup
beforeEach(() => {
  jest.clearAllMocks()
  
  // Reset mock implementations
  Object.values(mockPrismaClient).forEach(model => {
    if (typeof model === 'object') {
      Object.values(model).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockReset()
        }
      })
    }
  })
})

// Global test teardown
afterAll(async () => {
  // Clean up any resources
  await mockPrismaClient.$disconnect()
  
  // Restore original setInterval
  global.setInterval = originalSetInterval
})

// Test helper functions
export function createMockUser(overrides: any = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'VIEWER',
    isActive: true,
    emailVerified: new Date(),
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

export function createMockSession(user: any) {
  const randomSuffix = Math.random().toString(36).substring(2, 15)
  return {
    user,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    accessToken: `${user.role.toLowerCase()}-token-${randomSuffix}`
  }
}
