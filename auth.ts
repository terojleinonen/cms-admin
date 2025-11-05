import NextAuth, { NextAuthOptions, SessionStrategy } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { UserRole } from "@prisma/client"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from 'bcryptjs'
import { db } from './app/lib/db'
import { JWT } from "next-auth/jwt"
import { NextRequest } from "next/server"

// Use the centralized database client
const prisma = db

// Ensure environment variables are available
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is not set')
}

console.log('🔧 NextAuth v4 config - NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET)
console.log('🔧 NextAuth v4 config - NEXTAUTH_URL:', process.env.NEXTAUTH_URL)

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // Temporarily disabled
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('🔐 AUTHORIZE FUNCTION CALLED! This means NextAuth is working!')
        console.log('🔐 Credentials received:', { 
          email: credentials?.email, 
          hasPassword: !!credentials?.password 
        })

        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials')
          return null
        }

        try {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: {
              email: (credentials.email as string).toLowerCase(),
            },
          })

          console.log('👤 User lookup result:', { 
            found: !!user, 
            email: user?.email, 
            isActive: user?.isActive 
          })

          if (!user) {
            console.log('❌ User not found')
            return null
          }

          // Check if user is active
          if (!user.isActive) {
            console.log('❌ User is inactive')
            return null
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          )

          console.log('🔑 Password validation:', { isValid: isPasswordValid })

          if (!isPasswordValid) {
            console.log('❌ Invalid password')
            return null
          }

          console.log('✅ Authentication successful')
          // Return user object (without password hash)
          const userObj = {
            id: user.id,
            email: user.email,
            name: user.name || user.email, // Ensure name is not null
            role: user.role,
          }
          console.log('🔄 Returning user object:', userObj)
          return userObj
        } catch (error) {
          console.error('❌ Authentication error:', error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt' as SessionStrategy,
  },
  callbacks: {
    async jwt({ token, user }): Promise<JWT> {
      console.log('🔄 JWT callback called:', { hasUser: !!user, tokenSub: token.sub })
      // Include user role in JWT token
      if (user) {
        token.role = user.role as UserRole
        token.id = user.id
        console.log('🔄 Updated token with user data:', { id: user.id, role: user.role })
      }
      return token
    },
    async session({ session, token }) {
      console.log('🔄 Session callback called:', { hasToken: !!token, hasUser: !!session.user })
      // Include user role and id in session
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        console.log('🔄 Updated session with token data:', { id: token.id, role: token.role })
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export default handler

// Export auth function for server components
export const auth = async () => {
  const { getServerSession } = await import('next-auth')
  return await getServerSession(authOptions)
}

// Helper function for middleware (NextAuth v4 compatible)
export async function getServerSession(req: Request | NextRequest) {
  const { getToken } = await import('next-auth/jwt')
  return await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
}
