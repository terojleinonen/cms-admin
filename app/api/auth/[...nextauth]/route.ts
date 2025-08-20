/**
 * NextAuth.js API route handler
 * Handles all authentication requests for the CMS
 */

import NextAuth from 'next-auth'
import { authOptions } from '../../../lib/auth-config'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }