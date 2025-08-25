/**
 * NextAuth Credentials Provider Mock
 */

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'ADMIN'
}

const CredentialsProvider = jest.fn().mockImplementation((config) => ({
  id: 'credentials',
  name: 'Credentials',
  type: 'credentials',
  credentials: config.credentials || {},
  authorize: config.authorize || jest.fn().mockResolvedValue(mockUser)
}))

module.exports = CredentialsProvider
module.exports.default = CredentialsProvider