/**
 * Authentication Schemas Unit Tests
 * Tests for all Zod validation schemas used for authentication
 */

import {
  loginSchema,
  registerSchema,
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  updateProfileSchema,
  passwordResetRequestSchema,
  passwordResetSchema
} from '../../app/lib/auth-schemas'

describe('Authentication Schemas', () => {
  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'user@example.com',
        password: 'password123'
      }

      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe(validData.email)
        expect(result.data.password).toBe(validData.password)
      }
    })

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123'
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email')
      }
    })

    it('should reject short passwords', () => {
      const invalidData = {
        email: 'user@example.com',
        password: '123' // Too short
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('password')
      }
    })

    it('should require both email and password', () => {
      const incompleteData = {
        email: 'user@example.com'
        // Missing password
      }

      const result = loginSchema.safeParse(incompleteData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const missingFields = result.error.issues.map(issue => issue.path[0])
        expect(missingFields).toContain('password')
      }
    })

    it('should convert email to lowercase', () => {
      const validData = {
        email: 'USER@EXAMPLE.COM',
        password: 'password123'
      }

      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
      }
    })
  })

  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!'
      }

      const result = registerSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe(validData.name)
        expect(result.data.email).toBe(validData.email)
      }
    })

    it('should reject mismatched passwords', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'DifferentPassword123!'
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Passwords do not match')
      }
    })

    it('should require strong password', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weakpass', // No uppercase, numbers, or special chars
        confirmPassword: 'weakpass'
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const passwordErrors = result.error.issues.filter(issue => 
          issue.path.includes('password')
        )
        expect(passwordErrors.length).toBeGreaterThan(0)
      }
    })

    it('should validate name format', () => {
      const invalidData = {
        name: 'John123', // Contains numbers
        email: 'john@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!'
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name')
      }
    })

    it('should require all fields', () => {
      const incompleteData = {
        name: 'John Doe'
        // Missing other fields
      }

      const result = registerSchema.safeParse(incompleteData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const missingFields = result.error.issues.map(issue => issue.path[0])
        expect(missingFields).toContain('email')
        expect(missingFields).toContain('password')
        expect(missingFields).toContain('confirmPassword')
      }
    })
  })

  describe('createUserSchema', () => {
    it('should validate valid user creation data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePassword123!',
        role: 'EDITOR',
        isActive: true
      }

      const result = createUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe(validData.name)
        expect(result.data.email).toBe(validData.email)
        expect(result.data.role).toBe(validData.role)
        expect(result.data.isActive).toBe(validData.isActive)
      }
    })

    it('should default isActive to true', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePassword123!',
        role: 'EDITOR'
        // isActive not provided
      }

      const result = createUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isActive).toBe(true)
      }
    })

    it('should reject invalid roles', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePassword123!',
        role: 'INVALID_ROLE'
      }

      const result = createUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('role')
      }
    })
  })

  describe('updateUserSchema', () => {
    it('should validate valid user update data', () => {
      const validData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        role: 'ADMIN',
        isActive: false
      }

      const result = updateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe(validData.name)
        expect(result.data.email).toBe(validData.email)
        expect(result.data.role).toBe(validData.role)
        expect(result.data.isActive).toBe(validData.isActive)
      }
    })

    it('should require all fields for updates', () => {
      const incompleteData = {
        name: 'Updated Name'
        // Missing other required fields
      }

      const result = updateUserSchema.safeParse(incompleteData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const missingFields = result.error.issues.map(issue => issue.path[0])
        expect(missingFields).toContain('email')
        expect(missingFields).toContain('role')
        expect(missingFields).toContain('isActive')
      }
    })
  })

  describe('changePasswordSchema', () => {
    it('should validate valid password change data', () => {
      const validData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!'
      }

      const result = changePasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.currentPassword).toBe(validData.currentPassword)
        expect(result.data.newPassword).toBe(validData.newPassword)
      }
    })

    it('should reject mismatched new passwords', () => {
      const invalidData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'DifferentPassword123!'
      }

      const result = changePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('New passwords do not match')
      }
    })

    it('should require strong new password', () => {
      const invalidData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'weakpass',
        confirmNewPassword: 'weakpass'
      }

      const result = changePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const passwordErrors = result.error.issues.filter(issue => 
          issue.path.includes('newPassword')
        )
        expect(passwordErrors.length).toBeGreaterThan(0)
      }
    })
  })

  describe('updateProfileSchema', () => {
    it('should validate valid profile update data', () => {
      const validData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      }

      const result = updateProfileSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe(validData.name)
        expect(result.data.email).toBe(validData.email)
      }
    })

    it('should validate name format', () => {
      const invalidData = {
        name: 'Invalid@Name',
        email: 'valid@example.com'
      }

      const result = updateProfileSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name')
      }
    })

    it('should validate email format', () => {
      const invalidData = {
        name: 'Valid Name',
        email: 'invalid-email'
      }

      const result = updateProfileSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email')
      }
    })
  })

  describe('passwordResetRequestSchema', () => {
    it('should validate valid password reset request', () => {
      const validData = {
        email: 'user@example.com'
      }

      const result = passwordResetRequestSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe(validData.email)
      }
    })

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email'
      }

      const result = passwordResetRequestSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email')
      }
    })

    it('should convert email to lowercase', () => {
      const validData = {
        email: 'USER@EXAMPLE.COM'
      }

      const result = passwordResetRequestSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
      }
    })
  })

  describe('passwordResetSchema', () => {
    it('should validate valid password reset data', () => {
      const validData = {
        token: 'valid-reset-token-123',
        password: 'NewSecurePassword123!',
        confirmPassword: 'NewSecurePassword123!'
      }

      const result = passwordResetSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.token).toBe(validData.token)
        expect(result.data.password).toBe(validData.password)
      }
    })

    it('should reject mismatched passwords', () => {
      const invalidData = {
        token: 'valid-reset-token-123',
        password: 'NewSecurePassword123!',
        confirmPassword: 'DifferentPassword123!'
      }

      const result = passwordResetSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Passwords do not match')
      }
    })

    it('should require reset token', () => {
      const invalidData = {
        token: '',
        password: 'NewSecurePassword123!',
        confirmPassword: 'NewSecurePassword123!'
      }

      const result = passwordResetSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('token')
      }
    })

    it('should require strong password', () => {
      const invalidData = {
        token: 'valid-reset-token-123',
        password: 'weakpass',
        confirmPassword: 'weakpass'
      }

      const result = passwordResetSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const passwordErrors = result.error.issues.filter(issue => 
          issue.path.includes('password')
        )
        expect(passwordErrors.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Edge Cases and Security', () => {
    it('should handle extremely long inputs', () => {
      const longString = 'a'.repeat(1000)
      const invalidData = {
        name: longString,
        email: 'user@example.com',
        password: 'SecurePassword123!',
        role: 'EDITOR'
      }

      const result = createUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name')
      }
    })

    it('should handle special characters in names correctly', () => {
      const validNames = [
        "Mary O'Connor",
        "Jean-Pierre Dupont"
      ]

      validNames.forEach(name => {
        const data = {
          name,
          email: 'user@example.com'
        }

        const result = updateProfileSchema.safeParse(data)
        expect(result.success).toBe(true)
      })

      // Test names that should fail due to regex restrictions
      const invalidNames = [
        "María García", // Contains accented characters
        "John Smith Jr." // Contains period
      ]

      invalidNames.forEach(name => {
        const data = {
          name,
          email: 'user@example.com'
        }

        const result = updateProfileSchema.safeParse(data)
        expect(result.success).toBe(false)
      })
    })

    it('should reject malicious input attempts', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'DROP TABLE users;',
        '../../etc/passwd',
        'javascript:alert(1)'
      ]

      maliciousInputs.forEach(maliciousInput => {
        const data = {
          name: maliciousInput,
          email: 'user@example.com'
        }

        const result = updateProfileSchema.safeParse(data)
        expect(result.success).toBe(false)
      })
    })

    it('should handle unicode characters appropriately', () => {
      // Test that unicode characters in names are rejected by the current regex
      const unicodeData = {
        name: 'José María',
        email: 'josé@example.com'
      }

      const result = updateProfileSchema.safeParse(unicodeData)
      expect(result.success).toBe(false) // Current regex doesn't allow accented characters
      
      // Test that regular ASCII email is handled correctly (should be lowercased)
      const emailOnlyData = {
        name: 'John Doe',
        email: 'USER@EXAMPLE.COM'
      }

      const emailResult = updateProfileSchema.safeParse(emailOnlyData)
      expect(emailResult.success).toBe(true)
      if (emailResult.success) {
        expect(emailResult.data.email).toBe('user@example.com')
      }
    })
  })
})