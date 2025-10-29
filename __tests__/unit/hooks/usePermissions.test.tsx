/**
 * Tests for usePermissions hook
 */

import { renderHook } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'
import { usePermissions } from '../../../app/lib/hooks/usePermissions'
import { User } from '../../../app/lib/types'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock permission service
jest.mock('../../../app/lib/permissions', () => ({
  permissionService: {
    hasPermission: jest.fn(),
    canUserAccessRoute: jest.fn(),
    filterByPermissions: jest.fn(),
  },
}))

const mockPermissionService = require('../../../app/lib/permissions').permissionService

describe('usePermissions', () => {
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

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      })
    })

    it('should return null user and false for all permissions', () => {
      const { result } = renderHook(() => usePermissions())

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isAdmin()).toBe(false)
      expect(result.current.isEditor()).toBe(false)
      expect(result.current.isViewer()).toBe(false)
      expect(result.current.canCreateProduct()).toBe(false)
    })
  })

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: jest.fn(),
      })
    })

    it('should return user and authentication status', () => {
      const { result } = renderHook(() => usePermissions())

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })

    describe('role checks', () => {
      it('should correctly identify admin role', () => {
        mockUseSession.mockReturnValue({
          data: { user: { ...mockUser, role: UserRole.ADMIN } },
          status: 'authenticated',
          update: jest.fn(),
        })

        const { result } = renderHook(() => usePermissions())

        expect(result.current.isAdmin()).toBe(true)
        expect(result.current.isEditor()).toBe(true)
        expect(result.current.isViewer()).toBe(true)
        expect(result.current.hasRole(UserRole.ADMIN)).toBe(true)
        expect(result.current.hasMinimumRole(UserRole.EDITOR)).toBe(true)
      })

      it('should correctly identify editor role', () => {
        const { result } = renderHook(() => usePermissions())

        expect(result.current.isAdmin()).toBe(false)
        expect(result.current.isEditor()).toBe(true)
        expect(result.current.isViewer()).toBe(true)
        expect(result.current.hasRole(UserRole.EDITOR)).toBe(true)
        expect(result.current.hasMinimumRole(UserRole.VIEWER)).toBe(true)
      })

      it('should correctly identify viewer role', () => {
        mockUseSession.mockReturnValue({
          data: { user: { ...mockUser, role: UserRole.VIEWER } },
          status: 'authenticated',
          update: jest.fn(),
        })

        const { result } = renderHook(() => usePermissions())

        expect(result.current.isAdmin()).toBe(false)
        expect(result.current.isEditor()).toBe(false)
        expect(result.current.isViewer()).toBe(true)
        expect(result.current.hasRole(UserRole.VIEWER)).toBe(true)
        expect(result.current.hasMinimumRole(UserRole.EDITOR)).toBe(false)
      })
    })

    describe('permission checks', () => {
      beforeEach(() => {
        mockPermissionService.hasPermission.mockReturnValue(true)
      })

      it('should call permission service for basic permission checks', () => {
        const { result } = renderHook(() => usePermissions())

        result.current.canAccess('products', 'create')

        expect(mockPermissionService.hasPermission).toHaveBeenCalledWith(
          mockUser,
          { resource: 'products', action: 'create' }
        )
      })

      it('should call permission service for resource-specific checks', () => {
        const { result } = renderHook(() => usePermissions())

        result.current.canCreateProduct()

        expect(mockPermissionService.hasPermission).toHaveBeenCalledWith(
          mockUser,
          { resource: 'products', action: 'create' }
        )
      })

      it('should handle ownership checks for products', () => {
        mockPermissionService.hasPermission
          .mockReturnValueOnce(false) // products.read.all
          .mockReturnValueOnce(true)  // products.read.own

        const { result } = renderHook(() => usePermissions())

        const canRead = result.current.canReadProduct('user-1')

        expect(canRead).toBe(true)
        expect(mockPermissionService.hasPermission).toHaveBeenCalledWith(
          mockUser,
          { resource: 'products', action: 'read', scope: 'all' }
        )
        expect(mockPermissionService.hasPermission).toHaveBeenCalledWith(
          mockUser,
          { resource: 'products', action: 'read', scope: 'own' }
        )
      })

      it('should handle user deletion restrictions', () => {
        mockUseSession.mockReturnValue({
          data: { user: { ...mockUser, role: UserRole.ADMIN } },
          status: 'authenticated',
          update: jest.fn(),
        })

        const { result } = renderHook(() => usePermissions())

        // Can't delete self
        expect(result.current.canDeleteUser('user-1')).toBe(false)
        
        // Can delete other users
        expect(result.current.canDeleteUser('user-2')).toBe(true)
      })
    })

    describe('route access checks', () => {
      beforeEach(() => {
        mockPermissionService.canUserAccessRoute.mockReturnValue(true)
      })

      it('should call permission service for route checks', () => {
        const { result } = renderHook(() => usePermissions())

        result.current.canAccessRoute('/admin/products')

        expect(mockPermissionService.canUserAccessRoute).toHaveBeenCalledWith(
          mockUser,
          '/admin/products'
        )
      })
    })

    describe('filtering helpers', () => {
      beforeEach(() => {
        mockPermissionService.filterByPermissions.mockReturnValue([])
      })

      it('should call permission service for filtering', () => {
        const { result } = renderHook(() => usePermissions())
        const items = [{ id: '1' }, { id: '2' }]
        const getResource = (item: any) => 'products'

        result.current.filterByPermissions(items, getResource, 'read')

        expect(mockPermissionService.filterByPermissions).toHaveBeenCalledWith(
          mockUser,
          items,
          getResource,
          'read'
        )
      })
    })
  })

  describe('when session is loading', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      })
    })

    it('should return loading state', () => {
      const { result } = renderHook(() => usePermissions())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
    })
  })
})