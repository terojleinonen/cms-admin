/**
 * Jest test setup file for Node.js environment
 * Configures the test environment for API and utility tests
 */

import { shouldUseRealDatabase, getTestDatabase } from './setup-integration'

// Initialize NextAuth mocks
import './setup-nextauth'

// Mock Next.js APIs for Node.js environment
// Use try-catch to handle different Next.js versions
try {
  const { Request, Response, Headers } = require('next/dist/compiled/@edge-runtime/primitives/fetch')
  global.Request = Request
  global.Response = Response  
  global.Headers = Headers
} catch (error) {
  // Fallback to standard implementations if Next.js internals are not available
  global.Request = global.Request || class MockRequest {
    constructor(input: any, init?: any) {
      this.url = typeof input === 'string' ? input : input.url
      this.method = init?.method || 'GET'
      this.headers = new Headers(init?.headers)
      this.body = init?.body
    }
    url: string
    method: string
    headers: Headers
    body: any
    
    async json() { return this.body ? JSON.parse(this.body) : {} }
    async text() { return this.body || '' }
    async formData() { return new FormData() }
  }

  global.Response = global.Response || class MockResponse {
    constructor(body?: any, init?: any) {
      this.body = body
      this.status = init?.status || 200
      this.statusText = init?.statusText || 'OK'
      this.headers = new Headers(init?.headers)
    }
    body: any
    status: number
    statusText: string
    headers: Headers
    
    async json() { return typeof this.body === 'string' ? JSON.parse(this.body) : this.body }
    async text() { return typeof this.body === 'string' ? this.body : JSON.stringify(this.body) }
  }

  global.Headers = global.Headers || class MockHeaders {
    private headers: Map<string, string> = new Map()
    
    constructor(init?: any) {
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.headers.set(key.toLowerCase(), value))
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => this.headers.set(key.toLowerCase(), String(value)))
        }
      }
    }
    
    get(name: string) { return this.headers.get(name.toLowerCase()) || null }
    set(name: string, value: string) { this.headers.set(name.toLowerCase(), value) }
    has(name: string) { return this.headers.has(name.toLowerCase()) }
    delete(name: string) { return this.headers.delete(name.toLowerCase()) }
    forEach(callback: (value: string, key: string) => void) {
      this.headers.forEach((value, key) => callback(value, key))
    }
  }
}

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

// Export database utilities that work for both unit and integration tests
export const initTestDatabase = async () => {
  if (shouldUseRealDatabase()) {
    const { initIntegrationDatabase } = require('./setup-integration')
    return initIntegrationDatabase()
  } else {
    // For unit tests, just return the mock
    return getTestDatabase()
  }
}

export const cleanupTestDatabase = async () => {
  if (shouldUseRealDatabase()) {
    const { cleanupIntegrationDatabase } = require('./setup-integration')
    return cleanupIntegrationDatabase()
  } else {
    // For unit tests, reset mocks
    const { resetPrismaMocks } = require('../__mocks__/@/lib/db')
    resetPrismaMocks()
  }
}

// Export test database getter
export const getTestPrisma = () => getTestDatabase()