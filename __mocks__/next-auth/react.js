const useSession = jest.fn(() => ({
  data: null,
  status: 'unauthenticated',
  update: jest.fn(),
}))

const SessionProvider = ({ children }) => children

const signIn = jest.fn()
const signOut = jest.fn()
const getSession = jest.fn()

const createMockSession = (overrides = {}) => ({
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'ADMIN',
    ...overrides
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
})

module.exports = {
  useSession,
  SessionProvider,
  signIn,
  signOut,
  getSession,
  createMockSession,
}