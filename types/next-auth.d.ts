import { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: UserRole
      profilePicture?: string
      sessionToken?: string
    }
  }

  interface User {
    id: string
    name: string
    email: string
    role: UserRole
    profilePicture?: string
    sessionToken?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    sessionToken?: string
  }
}