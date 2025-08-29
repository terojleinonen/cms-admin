/**
 * Jest setup file
 * Configures global mocks and test environment
 */

// Mock the database module before any imports
jest.mock('@/lib/db', () => require('../__mocks__/@/lib/db'))
jest.mock('../lib/db', () => require('../__mocks__/@/lib/db'))
jest.mock('../../lib/db', () => require('../__mocks__/@/lib/db'))
jest.mock('../../../lib/db', () => require('../__mocks__/@/lib/db'))
jest.mock('app/lib/db', () => require('../__mocks__/@/lib/db'))

// Mock NextAuth
jest.mock('next-auth/next')
jest.mock('next-auth')
jest.mock('@auth/prisma-adapter')

// Mock password utils
jest.mock('@/lib/password-utils', () => ({
  hashPassword: jest.fn().mockResolvedValue('mock-hashed-password'),
  verifyPassword: jest.fn().mockResolvedValue(true),
}))

// Mock auth utils
jest.mock('@/lib/auth-utils', () => ({
  hashPassword: jest.fn().mockResolvedValue('mock-hashed-password'),
  verifyPassword: jest.fn().mockResolvedValue(true),
  generateToken: jest.fn().mockReturnValue('mock-token'),
  verifyToken: jest.fn().mockReturnValue({ userId: 'test-user-1' }),
}))

// Set test environment
Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true })
Object.defineProperty(process.env, 'DATABASE_URL', { value: 'postgresql://test:test@localhost:5432/test', writable: true })
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3001'

// Global test setup
beforeAll(() => {
  // Suppress console warnings in tests
  const originalWarn = console.warn
  console.warn = (...args: any[]) => {
    if (args[0]?.includes?.('Warning: ReactDOM.render is deprecated')) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

// Reset test data counter before each test
beforeEach(() => {
  // Reset test data factory counter
  const { resetTestDataCounter } = require('./helpers/test-data-factory')
  resetTestDataCounter()
})