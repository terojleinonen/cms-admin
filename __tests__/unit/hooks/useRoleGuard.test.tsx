/**
 * Tests for useRoleGuard hook
 */

import { renderHook, act } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { useRoleGuard, useAdminGuard, useEditorGuard } from '../../../app/lib/hooks/useRoleGuard'
import { usePermissions } from '../../../app/lib/hooks/usePermissions'
import { User } from '../../../app/lib/types'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockPush = jest.fn()

// Mock usePermissions
jest.mock('../../../app/lib/hooks/usePermissions', () => ({
  usePermissions: jest.fn(),
}))
const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>

describe('useRoleGuard', () => {
  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.EDITOR,
    isActive: true,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockPermissions = {
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    isAdmin: jest.fn(() => false),
    isEditor: jest.fn(() => true),
    isViewer: jest.fn(() => true),
    hasRole: jest.fn((role: UserRole) => role === UserRole.EDITOR),
    hasMinimumRole: jest.fn((role: UserRole) => role === UserRole.EDITOR || role === UserRole.VIEWER),
    canAccess: jest.fn(() => true),
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    } as any)
    mockUsePermissions.mockReturnValue(mockPermissions)
  })

  describe('basic role requirements', () => {
    it('should authorize user with correct role', () => {
      const { result } = renderHook(() => 
        useRoleGuard({ requiredRole: UserRole.EDITOR })
      )

      expect(result.current.isAuthorized).toBe(true)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.reason).toBeUndefined()
    })

    it('should deny user with insufficient role', () => {
      const { result } = renderHook(() => 
        useRoleGuard({ requiredRole: UserRole.ADMIN })
      )

      expect(result.current.isAuthorized).toBe(false)
      expect(result.current.reason).toContain('Required role: ADMIN')
    })

    it('should authorize user with minimum role', () => {
      const { result } = renderHook(() => 
        useRoleGuard({ minimumRole: UserRole.VIEWER })
      )

      expect(result.current.isAuthorized).toBe(true)
    })

    it('should deny user below minimum role', () => {
      mockPermissions.hasMinimumRole.mockReturnValue(false)

      const { result } = renderHook(() => 
        useRoleGuard({ minimumRole: UserRole.ADMIN })
      )

      expect(result.current.isAuthorized).toBe(false)
      expect(result.current.reason).toContain('Minimum role required: ADMIN')
    })

    it('should authorize user in allowed roles list', () => {
      const { result } = renderHook(() => 
        useRoleGuard({ allowedRoles: [UserRole.EDITOR, UserRole.ADMIN] })
      )

      expect(result.current.isAuthorized).toBe(true)
    })

    it('should deny user not in allowed roles list', () => {
      const { result } = renderHook(() => 
        useRoleGuard({ allowedRoles: [UserRole.ADMIN] })
      )

      expect(result.current.isAuthorized).toBe(false)
      expect(result.current.reason).toContain('Allowed roles: ADMIN')
    })
  })

  describe('permission requirements', () => {
    it('should authorize user with all required permissions (AND logic)', () => {
      const { result } = renderHook(() => 
        useRoleGuard({
          requiredPermissions: [
            { resource: 'products', action: 'read' },
            { resource: 'products', action: 'create' },
          ],
          requireAllPermissions: true,
        })
      )

      expect(result.current.isAuthorized).toBe(true)
    })

    it('should deny user missing any required permission (AND logic)', () => {
      // Mock to return false for 'create' action specifically
      mockPermissions.canAccess.mockImplementation((resource: string, action: string) => {
        return action !== 'create' // Return false only for 'create' action
      })

      const { result } = renderHook(() => 
        useRoleGuard({
          requiredPermissions: [
            { resource: 'products', action: 'read' },
            { resource: 'products', action: 'create' },
          ],
          requireAllPermissions: true,
        })
      )

      expect(result.current.isAuthorized).toBe(false)
      expect(result.current.reason).toContain('Missing required permission: products.create')
    })

    it('should authorize user with any required permission (OR logic)', () => {
      // Mock to return true for 'create' action, false for 'read'
      mockPermissions.canAccess.mockImplementation((resource: string, action: string) => {
        return action === 'create' // Return true only for 'create' action
      })

      const { result } = renderHook(() => 
        useRoleGuard({
          requiredPermissions: [
            { resource: 'products', action: 'read' },
            { resource: 'products', action: 'create' },
          ],
          requireAllPermissions: false,
        })
      )

      expect(result.current.isAuthorized).toBe(true)
    })

    it('should deny user with no required permissions (OR logic)', () => {
      mockPermissions.canAccess.mockReturnValue(false)

      const { result } = renderHook(() => 
        useRoleGuard({
          requiredPermissions: [
            { resource: 'products', action: 'read' },
            { resource: 'products', action: 'create' },
          ],
          requireAllPermissions: false,
        })
      )

      expect(result.current.isAuthorized).toBe(false)
      expect(result.current.reason).toContain('Missing any of required permissions')
    })
  })

  describe('custom validation', () => {
    it('should authorize when custom validator returns true', () => {
      const customValidator = jest.fn(() => true)

      const { result } = renderHook(() => 
        useRoleGuard({ customValidator })
      )

      expect(result.current.isAuthorized).toBe(true)
      expect(customValidator).toHaveBeenCalledWith(mockPermissions)
    })

    it('should deny when custom validator returns false', () => {
      const customValidator = jest.fn(() => false)

      const { result } = renderHook(() => 
        useRoleGuard({ customValidator })
      )

      expect(result.current.isAuthorized).toBe(false)
      expect(result.current.reason).toBe('Custom validation failed')
    })

    it('should handle custom validator errors', () => {
      const customValidator = jest.fn(() => {
        throw new Error('Validation error')
      })

      const { result } = renderHook(() => 
        useRoleGuard({ customValidator })
      )

      expect(result.current.isAuthorized).toBe(false)
      expect(result.current.reason).toBe('Custom validation error')
    })
  })

  describe('unauthenticated users', () => {
    beforeEach(() => {
      mockUsePermissions.mockReturnValue({
        ...mockPermissions,
        user: null,
        isAuthenticated: false,
      })
    })

    it('should deny unauthenticated users', () => {
      const { result } = renderHook(() => useRoleGuard())

      expect(result.current.isAuthorized).toBe(false)
      expect(result.current.reason).toBe('Not authenticated')
    })
  })

  describe('loading states', () => {
    beforeEach(() => {
      mockUsePermissions.mockReturnValue({
        ...mockPermissions,
        isLoading: true,
      })
    })

    it('should show loading state when permissions are loading', () => {
      const { result } = renderHook(() => 
        useRoleGuard({ showLoadingState: true })
      )

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthorized).toBe(false)
    })

    it('should not show loading state when disabled', () => {
      const { result } = renderHook(() => 
        useRoleGuard({ showLoadingState: false })
      )

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('callbacks', () => {
    it('should call onAuthorized when user is authorized', () => {
      const onAuthorized = jest.fn()

      renderHook(() => 
        useRoleGuard({ 
          requiredRole: UserRole.EDITOR,
          onAuthorized 
        })
      )

      expect(onAuthorized).toHaveBeenCalled()
    })

    it('should call onUnauthorized when user is not authorized', () => {
      const onUnauthorized = jest.fn()

      renderHook(() => 
        useRoleGuard({ 
          requiredRole: UserRole.ADMIN,
          onUnauthorized 
        })
      )

      expect(onUnauthorized).toHaveBeenCalledWith(expect.stringContaining('Required role: ADMIN'))
    })
  })

  describe('redirect functionality', () => {
    it('should redirect when redirectOnUnauthorized is true', () => {
      renderHook(() => 
        useRoleGuard({ 
          requiredRole: UserRole.ADMIN,
          redirectOnUnauthorized: true,
          redirectTo: '/unauthorized'
        })
      )

      expect(mockPush).toHaveBeenCalledWith('/unauthorized')
    })

    it('should not redirect when redirectOnUnauthorized is false', () => {
      renderHook(() => 
        useRoleGuard({ 
          requiredRole: UserRole.ADMIN,
          redirectOnUnauthorized: false
        })
      )

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should provide manual redirect function', () => {
      const { result } = renderHook(() => 
        useRoleGuard({ redirectTo: '/custom-redirect' })
      )

      act(() => {
        result.current.redirect()
      })

      expect(mockPush).toHaveBeenCalledWith('/custom-redirect')
    })
  })

  describe('convenience hooks', () => {
    it('useAdminGuard should require admin role', () => {
      mockPermissions.hasRole.mockImplementation((role: UserRole) => role === UserRole.ADMIN)
      mockPermissions.isAdmin.mockReturnValue(true)

      const { result } = renderHook(() => useAdminGuard())

      expect(result.current.isAuthorized).toBe(true)
    })

    it('useEditorGuard should require minimum editor role', () => {
      // Ensure the mock returns true for editor minimum role
      mockPermissions.hasMinimumRole.mockReturnValue(true)
      
      const { result } = renderHook(() => useEditorGuard())

      expect(result.current.isAuthorized).toBe(true)
    })

    it('useEditorGuard should deny viewer role', () => {
      mockPermissions.hasMinimumRole.mockImplementation((role: UserRole) => role === UserRole.VIEWER)

      const { result } = renderHook(() => useEditorGuard())

      expect(result.current.isAuthorized).toBe(false)
    })
  })
})