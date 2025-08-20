/**
 * Jest test setup file for Node.js environment
 * Configures the test environment for API and utility tests
 */

import { PrismaClient } from '@prisma/client'

// Mock Next.js APIs for Node.js environment
const { Request, Response, Headers } = require('next/dist/compiled/@edge-runtime/primitives/fetch')

global.Request = Request
global.Response = Response  
global.Headers = Headers

// Mock fetch for API tests
global.fetch = jest.fn()

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R
      toBeValidEmail(): R
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const pass = uuidRegex.test(received)
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      }
    }
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const pass = emailRegex.test(received)
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      }
    }
  },
})

// Global test timeout
jest.setTimeout(30000)

// Mock environment variables for tests
if (!process.env.NODE_ENV) {
  (process.env as any).NODE_ENV = 'test'
}
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://cms_user:secure_password@localhost:5432/kin_workspace_cms_test'

// Global test database instance
let testPrisma: PrismaClient | undefined

// Only initialize database connection for database tests
export const initTestDatabase = async () => {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    })
    await testPrisma.$connect()
  }
  return testPrisma
}

export const cleanupTestDatabase = async () => {
  if (testPrisma) {
    await testPrisma.$disconnect()
    testPrisma = undefined
  }
}

// Export test utilities
export { testPrisma }