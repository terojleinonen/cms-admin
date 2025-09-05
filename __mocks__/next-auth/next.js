/**
 * NextAuth Next.js Mock
 * Mock for next-auth/next imports
 */

import * as nextAuthMock from '../next-auth.js'

export const getServerSession = nextAuthMock.getServerSession
export const getSession = nextAuthMock.getSession
export const signIn = nextAuthMock.signIn
export const signOut = nextAuthMock.signOut

const nextAuth = {
  getServerSession,
  getSession,
  signIn,
  signOut,
  ...nextAuthMock,
}

export default nextAuth