/**
 * Password Utilities Unit Tests
 * Tests for password hashing and verification functions
 */

import { hashPassword, verifyPassword, validatePassword } from '../../app/lib/password-utils'
import bcrypt from 'bcryptjs'

// Mock bcryptjs
jest.mock('bcryptjs')
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>

describe('Password Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('hashPassword', () => {
    it('should hash a password with default salt rounds', async () => {
      const password = 'testPassword123!'
      const hashedPassword = 'hashed_password_result'

      mockBcrypt.hash.mockResolvedValue(hashedPassword)

      const result = await hashPassword(password)

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12)
      expect(result).toBe(hashedPassword)
    })

    it('should handle empty password', async () => {
      const password = ''
      const hashedPassword = 'hashed_empty_password'

      mockBcrypt.hash.mockResolvedValue(hashedPassword)

      const result = await hashPassword(password)

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12)
      expect(result).toBe(hashedPassword)
    })

    it('should handle bcrypt errors', async () => {
      const password = 'testPassword123!'
      const error = new Error('Bcrypt hashing failed')

      mockBcrypt.hash.mockRejectedValue(error)

      await expect(hashPassword(password)).rejects.toThrow('Bcrypt hashing failed')
    })

    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000)
      const hashedPassword = 'hashed_long_password'

      mockBcrypt.hash.mockResolvedValue(hashedPassword)

      const result = await hashPassword(longPassword)

      expect(mockBcrypt.hash).toHaveBeenCalledWith(longPassword, 12)
      expect(result).toBe(hashedPassword)
    })

    it('should handle special characters in password', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const hashedPassword = 'hashed_special_password'

      mockBcrypt.hash.mockResolvedValue(hashedPassword)

      const result = await hashPassword(specialPassword)

      expect(mockBcrypt.hash).toHaveBeenCalledWith(specialPassword, 12)
      expect(result).toBe(hashedPassword)
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testPassword123!'
      const hashedPassword = 'hashed_password_result'

      mockBcrypt.compare.mockResolvedValue(true)

      const result = await verifyPassword(password, hashedPassword)

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword)
      expect(result).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'wrongPassword'
      const hashedPassword = 'hashed_password_result'

      mockBcrypt.compare.mockResolvedValue(false)

      const result = await verifyPassword(password, hashedPassword)

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword)
      expect(result).toBe(false)
    })

    it('should handle empty password', async () => {
      const password = ''
      const hashedPassword = 'hashed_password_result'

      mockBcrypt.compare.mockResolvedValue(false)

      const result = await verifyPassword(password, hashedPassword)

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword)
      expect(result).toBe(false)
    })

    it('should handle empty hash', async () => {
      const password = 'testPassword123!'
      const hashedPassword = ''

      mockBcrypt.compare.mockResolvedValue(false)

      const result = await verifyPassword(password, hashedPassword)

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword)
      expect(result).toBe(false)
    })

    it('should handle bcrypt comparison errors', async () => {
      const password = 'testPassword123!'
      const hashedPassword = 'hashed_password_result'
      const error = new Error('Bcrypt comparison failed')

      mockBcrypt.compare.mockRejectedValue(error)

      await expect(verifyPassword(password, hashedPassword)).rejects.toThrow('Bcrypt comparison failed')
    })

    it('should handle malformed hash', async () => {
      const password = 'testPassword123!'
      const malformedHash = 'not_a_valid_bcrypt_hash'

      mockBcrypt.compare.mockRejectedValue(new Error('Invalid hash format'))

      await expect(verifyPassword(password, malformedHash)).rejects.toThrow('Invalid hash format')
    })
  })

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const strongPassword = 'StrongPassword123!'
      const result = validatePassword(strongPassword)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject password that is too short', () => {
      const shortPassword = 'Short1!'
      const result = validatePassword(shortPassword)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('should reject password without uppercase letter', () => {
      const password = 'lowercase123!'
      const result = validatePassword(password)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('should reject password without lowercase letter', () => {
      const password = 'UPPERCASE123!'
      const result = validatePassword(password)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('should reject password without number', () => {
      const password = 'NoNumbers!'
      const result = validatePassword(password)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should reject password without special character', () => {
      const password = 'NoSpecialChars123'
      const result = validatePassword(password)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character')
    })

    it('should return multiple errors for weak password', () => {
      const weakPassword = 'weak'
      const result = validatePassword(weakPassword)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
      expect(result.errors).toContain('Password must be at least 8 characters long')
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
      expect(result.errors).toContain('Password must contain at least one number')
      expect(result.errors).toContain('Password must contain at least one special character')
    })

    it('should handle empty password', () => {
      const emptyPassword = ''
      const result = validatePassword(emptyPassword)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('should validate password with various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', ';', ':', '"', '|', ',', '.', '<', '>', '/', '?']
      
      specialChars.forEach(char => {
        const password = `Password123${char}`
        const result = validatePassword(password)
        expect(result.isValid).toBe(true)
      })
    })
  })

  describe('Integration Tests', () => {
    beforeEach(() => {
      // Use real bcrypt for integration tests
      jest.unmock('bcryptjs')
    })

    afterEach(() => {
      // Re-mock bcrypt after integration tests
      jest.mock('bcryptjs')
    })

    it('should hash and verify password correctly', async () => {
      // This test uses real bcrypt implementation
      const bcryptReal = jest.requireActual('bcryptjs')
      
      const password = 'integrationTestPassword123!'
      
      // Hash the password
      const hashedPassword = await bcryptReal.hash(password, 12)
      
      // Verify correct password
      const isValidCorrect = await bcryptReal.compare(password, hashedPassword)
      expect(isValidCorrect).toBe(true)
      
      // Verify incorrect password
      const isValidIncorrect = await bcryptReal.compare('wrongPassword', hashedPassword)
      expect(isValidIncorrect).toBe(false)
    })

    it('should validate and hash strong password', async () => {
      const bcryptReal = jest.requireActual('bcryptjs')
      
      const strongPassword = 'IntegrationTestPassword123!'
      
      // First validate the password
      const validation = validatePassword(strongPassword)
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      
      // Then hash the password
      const hashedPassword = await bcryptReal.hash(strongPassword, 12)
      
      // Verify the password can be verified against the hash
      const isValid = await bcryptReal.compare(strongPassword, hashedPassword)
      expect(isValid).toBe(true)
      
      // Verify hash is different from original password
      expect(hashedPassword).not.toBe(strongPassword)
      expect(hashedPassword.length).toBeGreaterThan(strongPassword.length)
    })
  })
})