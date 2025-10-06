export const useSession = jest.fn(() => ({
  data: null,
  status: 'unauthenticated',
  update: jest.fn(),
}))

export const SessionProvider = ({ children }) => children

export const signIn = jest.fn()
export const signOut = jest.fn()
export const getSession = jest.fn()

export const createMockSession = (overrides = {}) => ({
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'ADMIN',
    ...overrides
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
})