/**
 * NextAuth Next.js Mock
 * Mock for next-auth/next imports
 */

// Import the main NextAuth mock
const nextAuthMock = require('../next-auth.js')

// Re-export all functions from the main mock
module.exports = {
  getServerSession: nextAuthMock.getServerSession,
  getSession: nextAuthMock.getSession,
  signIn: nextAuthMock.signIn,
  signOut: nextAuthMock.signOut,
  
  // Export helpers for compatibility
  ...nextAuthMock
}

// ES module compatibility
module.exports.default = module.exports