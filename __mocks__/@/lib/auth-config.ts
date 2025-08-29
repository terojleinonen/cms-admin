export const authConfig = {
  providers: [],
  callbacks: {
    jwt: jest.fn(),
    session: jest.fn(),
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt' as const,
  },
};