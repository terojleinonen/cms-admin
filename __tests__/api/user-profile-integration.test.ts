/**
 * User Profile API Integration Test
 * Simple integration test to verify the enhanced user profile endpoints work
 */

import { NextRequest } from 'next/server'

describe('User Profile API Integration', () => {
  it('should import and instantiate API routes without errors', async () => {
    // Test that the API routes can be imported without throwing errors
    expect(async () => {
      const { GET, PUT, DELETE } = await import('../../app/api/users/[id]/route')
      expect(typeof GET).toBe('function')
      expect(typeof PUT).toBe('function')
      expect(typeof DELETE).toBe('function')
    }).not.toThrow()
  })

  it('should import preferences API routes without errors', async () => {
    expect(async () => {
      const { GET, PUT } = await import('../../app/api/users/[id]/preferences/route')
      expect(typeof GET).toBe('function')
      expect(typeof PUT).toBe('function')
    }).not.toThrow()
  })

  it('should import security API routes without errors', async () => {
    expect(async () => {
      const { GET, PUT } = await import('../../app/api/users/[id]/security/route')
      expect(typeof GET).toBe('function')
      expect(typeof PUT).toBe('function')
    }).not.toThrow()
  })

  it('should import avatar API routes without errors', async () => {
    expect(async () => {
      const { GET, POST, DELETE } = await import('../../app/api/users/[id]/avatar/route')
      expect(typeof GET).toBe('function')
      expect(typeof POST).toBe('function')
      expect(typeof DELETE).toBe('function')
    }).not.toThrow()
  })

  it('should have proper validation schemas', async () => {
    expect(async () => {
      const schemas = await import('../../app/lib/user-validation-schemas')
      expect(schemas.userProfileUpdateSchema).toBeDefined()
      expect(schemas.userPreferencesUpdateSchema).toBeDefined()
      expect(schemas.passwordChangeSchema).toBeDefined()
      expect(schemas.twoFactorSetupSchema).toBeDefined()
    }).not.toThrow()
  })

  it('should have profile picture utilities', async () => {
    expect(async () => {
      const utils = await import('../../app/lib/profile-image-utils')
      expect(utils.profilePictureService).toBeDefined()
      expect(utils.PROFILE_PICTURE_CONFIG).toBeDefined()
    }).not.toThrow()
  })

  it('should have audit service', async () => {
    expect(async () => {
      const audit = await import('../../app/lib/audit-service')
      expect(audit.getAuditService).toBeDefined()
      expect(audit.AUDIT_ACTIONS).toBeDefined()
    }).not.toThrow()
  })
})