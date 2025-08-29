// Global type definitions for the CMS Admin

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      NEXTAUTH_SECRET: string;
      NEXTAUTH_URL: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

// NextAuth module augmentation
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: import('@prisma/client').UserRole;
      profilePicture?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: import('@prisma/client').UserRole;
    profilePicture?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: import('@prisma/client').UserRole;
  }
}

export {};
