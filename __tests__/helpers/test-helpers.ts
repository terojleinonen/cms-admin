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
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

// Mock next-auth/jwt
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}))

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    method: options?.method || 'GET',
    headers: new Map(Object.entries(options?.headers || {})),
    json: jest.fn().mockResolvedValue(options?.body ? JSON.parse(options.body) : {}),
    cookies: {
      get: jest.fn(),
      set: jest.fn(),
    },
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      headers: new Map(),
      json: () => Promise.resolve(data),
    })),
    redirect: jest.fn(),
    next: jest.fn(),
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
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $disconnect: jest.fn(),
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

// Mock API permission middleware
jest.mock('@/lib/api-permission-middleware', () => ({
  withApiPermissions: jest.fn().mockImplementation((handler) => handler),
  createApiSuccessResponse: jest.fn().mockImplementation((data, status = 200) => ({
    status,
    json: () => Promise.resolve({ success: true, data }),
  })),
}))

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
