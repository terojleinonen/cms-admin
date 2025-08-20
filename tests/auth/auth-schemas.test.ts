/**
 * Authentication schemas tests
 * Tests Zod validation schemas for authentication forms
 */

import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  updateProfileSchema,
  createUserSchema,
  updateUserSchema,
} from '../../app/lib/auth-schemas'
import { UserRole } from '@prisma/client'

describe('Authentication Schemas', () => {
  describe('Login Schema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      }

      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.password).toBe('TestPassword123!')
      }
    })

    it('should convert email to lowercase', () => {
      const data = {
        email: 'TEST@EXAMPLE.COM',
        password: 'TestPassword123!',
      }

      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
      }
    })

    it('should reject invalid email formats', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'TestPassword123!',
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid email')
      }
    })

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'TestPassword123!',
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required')
      }
    })

    it('should reject short passwords', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'short',
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('8 characters')
      }
    })
  })

  describe('Register Schema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
      }

      const result = registerSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.name).toBe('John Doe')
        expect(result.data.email).toBe('john@example.com')
      }
    })

    it('should reject mismatched passwords', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'StrongPassword123!',
        confirmPassword: 'DifferentPassword123!',
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('do not match')
      }
    })

    it('should reject weak passwords', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weakpassword',
        confirmPassword: 'weakpassword',
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const messages = result.error.issues.map(issue => issue.message)
        expect(messages.some(msg => msg.includes('uppercase'))).toBe(true)
      }
    })

    it('should reject invalid names', () => {
      const invalidData = {
        name: 'John123',
        email: 'john@example.com',
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('letters')
      }
    })

    it('should accept valid names with spaces and hyphens', () => {
      const validNames = [
        'John Doe',
        'Mary-Jane Smith',
        "O'Connor",
        'Jean-Pierre',
      ]

      validNames.forEach(name => {
        const data = {
          name,
          email: 'test@example.com',
          password: 'StrongPassword123!',
          confirmPassword: 'StrongPassword123!',
        }

        const result = registerSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('should accept optional role parameter', () => {
      const dataWithRole = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
        role: UserRole.ADMIN,
      }

      const result = registerSchema.safeParse(dataWithRole)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.role).toBe(UserRole.ADMIN)
      }
    })
  })

  describe('Change Password Schema', () => {
    it('should validate correct password change data', () => {
      const validData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!',
      }

      const result = changePasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject mismatched new passwords', () => {
      const invalidData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'DifferentPassword123!',
      }

      const result = changePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('do not match')
      }
    })

    it('should reject weak new passwords', () => {
      const invalidData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'weak',
        confirmNewPassword: 'weak',
      }

      const result = changePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('Create User Schema', () => {
    it('should validate admin user creation data', () => {
      const validData = {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'AdminPassword123!',
        role: UserRole.ADMIN,
        isActive: true,
      }

      const result = createUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.role).toBe(UserRole.ADMIN)
        expect(result.data.isActive).toBe(true)
      }
    })

    it('should default isActive to true', () => {
      const data = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123!',
        role: UserRole.EDITOR,
      }

      const result = createUserSchema.safeParse(data)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.isActive).toBe(true)
      }
    })

    it('should require role to be specified', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123!',
        // role is missing
      }

      const result = createUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('Update User Schema', () => {
    it('should validate user update data', () => {
      const validData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        role: UserRole.EDITOR,
        isActive: false,
      }

      const result = updateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.isActive).toBe(false)
      }
    })

    it('should require all fields for updates', () => {
      const invalidData = {
        name: 'Updated Name',
        // email, role, and isActive are missing
      }

      const result = updateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('Profile Update Schema', () => {
    it('should validate profile update data', () => {
      const validData = {
        name: 'Updated Name',
        email: 'updated@example.com',
      }

      const result = updateProfileSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should not include role or password fields', () => {
      const dataWithExtraFields = {
        name: 'Updated Name',
        email: 'updated@example.com',
        role: UserRole.ADMIN, // This should be ignored
        password: 'password', // This should be ignored
      }

      const result = updateProfileSchema.safeParse(dataWithExtraFields)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data).not.toHaveProperty('role')
        expect(result.data).not.toHaveProperty('password')
      }
    })
  })
})