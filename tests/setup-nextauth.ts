/**
 * NextAuth Test Setup
 * Initializes NextAuth mocks for testing
 */

// Import and initialize NextAuth mock
const nextAuthMock = require('../__mocks__/next-auth.js')

// Set up global NextAuth mock state
beforeEach(() => {
  // Reset mocks to default state before each test
  nextAuthMock.resetMocks()
})

afterEach(() => {
  // Clear any custom mock state after each test
  nextAuthMock.clearMockSession()
})

// Make NextAuth helpers available globally for tests
global.nextAuthHelpers = nextAuthMock