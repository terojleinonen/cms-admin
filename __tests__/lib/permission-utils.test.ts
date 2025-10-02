/**
 * Permission Utilities Test Suite
 * Comprehensive tests for permission utility functions
 */

import { UserRole } from '@prisma/client'
import { User, Product, Category, Page, Media } from '../../app/lib/types'
import {
  canPerformAnyAction,
  canPerformAllActions,
  getAvailableActions,
  hasElevatedPermissions,
  hasAdminPermissions,
  canAccessAdminFeatures,
  canManageUsers,
  canViewAnalytics,
  canAccessSecurity,
  canAccessOwnedResource,
  filterProductsByPermissions,
  filterCategoriesByPermissions,
  filterPagesByPermissions,
  filterMediaByPermissions,
  filterUsersByPermissions,
  filterArrayByPermissions,
  filterNavigationByPermissions,
  isFieldDisabled,
  isFieldHidden,
  getFieldPermissions,
  getButtonPermissions,
  filterSelectOptions,
  getPermissionClasses,
  canPerformBulkOperations,
  getAvailableBulkActions,
  ProductPermissionUtils,
  UserPermissionUtils,
  AnalyticsPermissionUtils,
  NavigationItem,
} from '../../app/lib/permission-utils'

// Mock the permission service
jest.mock('../../app/lib/permissions', () => ({
  permissionService: {
    hasResourceAccess: jest.fn(),
    hasPermission: jest.fn(),
  },
}))

import { permissionService } from '../../app/lib/permissions'

const mockPermissionService = permissionService as jest.Mocked<typeof permissionService>

describe('Permission Utilities', () => {
  // Test users
  const adminUser: User = {
    id: 'admin-1',
    email: 'admin@test.com',
    name: 'Admin User',
    role: UserRole.ADMIN,
    isActive: true,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const editorUser: User = {
    id: 'editor-1',
    email: 'editor@test.com',
    name: 'Editor User',
    role: UserRole.EDITOR,
    isActive: true,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const viewerUser: User = {
    id: 'viewer-1',
    email: 'viewer@test.com',
    name: 'Viewer User',
    role: UserRole.VIEWER,
    isActive: true,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Common Permission Pattern Utilities', () => {
    describe('canPerformAnyAction', () => {
      it('should return true if user can perform any of the specified actions', () => {
        mockPermissionService.hasResourceAccess
          .mockReturnValueOnce(false) // create
          .mockReturnValueOnce(true)  // read

        const result = canPerformAnyAction(adminUser, 'products', ['create', 'read'])
        
        expect(result).toBe(true)
        expect(mockPermissionService.hasResourceAccess).toHaveBeenCalledTimes(2)
      })

      it('should return false if user cannot perform any actions', () => {
        mockPermissionService.hasResourceAccess.mockReturnValue(false)

        const result = canPerformAnyAction(viewerUser, 'products', ['create', 'update'])
        
        expect(result).toBe(false)
      })

      it('should return false for null user', () => {
        const result = canPerformAnyAction(null, 'products', ['create', 'read'])
        
        expect(result).toBe(false)
        expect(mockPermissionService.hasResourceAccess).not.toHaveBeenCalled()
      })
    })

    describe('canPerformAllActions', () => {
      it('should return true if user can perform all specified actions', () => {
        mockPermissionService.hasResourceAccess.mockReturnValue(true)

        const result = canPerformAllActions(adminUser, 'products', ['create', 'read'])
        
        expect(result).toBe(true)
        expect(mockPermissionService.hasResourceAccess).toHaveBeenCalledTimes(2)
      })

      it('should return false if user cannot perform all actions', () => {
        mockPermissionService.hasResourceAccess
          .mockReturnValueOnce(true)  // create
          .mockReturnValueOnce(false) // read

        const result = canPerformAllActions(editorUser, 'products', ['create', 'read'])
        
        expect(result).toBe(false)
      })
    })

    describe('getAvailableActions', () => {
      it('should return list of actions user can perform', () => {
        mockPermissionService.hasResourceAccess
          .mockReturnValueOnce(false) // create
          .mockReturnValueOnce(true)  // read
          .mockReturnValueOnce(true)  // update
          .mockReturnValueOnce(false) // delete

        const result = getAvailableActions(editorUser, 'products')
        
        expect(result).toEqual(['read', 'update'])
      })

      it('should return empty array for null user', () => {
        const result = getAvailableActions(null, 'products')
        
        expect(result).toEqual([])
      })
    })

    describe('hasElevatedPermissions', () => {
      it('should return true for admin user', () => {
        expect(hasElevatedPermissions(adminUser)).toBe(true)
      })

      it('should return true for editor user', () => {
        expect(hasElevatedPermissions(editorUser)).toBe(true)
      })

      it('should return false for viewer user', () => {
        expect(hasElevatedPermissions(viewerUser)).toBe(false)
      })

      it('should return false for null user', () => {
        expect(hasElevatedPermissions(null)).toBe(false)
      })
    })

    describe('hasAdminPermissions', () => {
      it('should return true for admin user', () => {
        expect(hasAdminPermissions(adminUser)).toBe(true)
      })

      it('should return false for non-admin users', () => {
        expect(hasAdminPermissions(editorUser)).toBe(false)
        expect(hasAdminPermissions(viewerUser)).toBe(false)
      })
    })

    describe('canAccessOwnedResource', () => {
      it('should return true if user has global permission', () => {
        mockPermissionService.hasResourceAccess.mockReturnValue(true)

        const result = canAccessOwnedResource(adminUser, 'other-user-id', 'products', 'update')
        
        expect(result).toBe(true)
        expect(mockPermissionService.hasResourceAccess).toHaveBeenCalledWith(
          adminUser, 'products', 'update', 'all'
        )
      })

      it('should return true if user owns resource and has own scope permission', () => {
        mockPermissionService.hasResourceAccess
          .mockReturnValueOnce(false) // global permission
          .mockReturnValueOnce(true)  // own permission

        const result = canAccessOwnedResource(editorUser, editorUser.id, 'products', 'update')
        
        expect(result).toBe(true)
      })

      it('should return false if user does not own resource and has no global permission', () => {
        mockPermissionService.hasResourceAccess.mockReturnValue(false)

        const result = canAccessOwnedResource(viewerUser, 'other-user-id', 'products', 'update')
        
        expect(result).toBe(false)
      })
    })
  })

  describe('Array Filtering Utilities', () => {
    const sampleProducts: Product[] = [
      {
        id: 'product-1',
        name: 'Product 1',
        slug: 'product-1',
        description: 'Test product 1',
        shortDescription: null,
        price: 100,
        comparePrice: null,
        sku: 'SKU-1',
        inventoryQuantity: 10,
        weight: null,
        status: 'ACTIVE' as any,
        featured: false,
        seoTitle: null,
        seoDescription: null,
        createdBy: editorUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        categories: null,
        media: null,
      },
      {
        id: 'product-2',
        name: 'Product 2',
        slug: 'product-2',
        description: 'Test product 2',
        shortDescription: null,
        price: 200,
        comparePrice: null,
        sku: 'SKU-2',
        inventoryQuantity: 5,
        weight: null,
        status: 'ACTIVE' as any,
        featured: false,
        seoTitle: null,
        seoDescription: null,
        createdBy: 'other-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        categories: null,
        media: null,
      },
    ]

    describe('filterProductsByPermissions', () => {
      it('should return all products if user has global permission', () => {
        mockPermissionService.hasResourceAccess.mockReturnValue(true)

        const result = filterProductsByPermissions(adminUser, sampleProducts)
        
        expect(result).toHaveLength(2)
      })

      it('should return only owned products if user has own scope permission', () => {
        mockPermissionService.hasResourceAccess
          .mockReturnValueOnce(false) // global for product 1
          .mockReturnValueOnce(true)  // own for product 1
          .mockReturnValueOnce(false) // global for product 2
          .mockReturnValueOnce(false) // own for product 2

        const result = filterProductsByPermissions(editorUser, sampleProducts)
        
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe('product-1')
      })

      it('should return empty array for null user', () => {
        const result = filterProductsByPermissions(null, sampleProducts)
        
        expect(result).toEqual([])
      })
    })

    describe('filterArrayByPermissions', () => {
      it('should filter array using custom getOwnerId function', () => {
        // Mock implementation to return different values based on scope
        mockPermissionService.hasResourceAccess.mockImplementation((user, resource, action, scope) => {
          if (scope === 'all') return false // No global permissions
          if (scope === 'own') return true  // Has own permissions
          return false // Default case
        })

        const items = [
          { id: '1', ownerId: editorUser.id },
          { id: '2', ownerId: 'other-user' },
        ]

        const result = filterArrayByPermissions(
          editorUser,
          items,
          'custom-resource',
          'read',
          (item) => item.ownerId
        )
        
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe('1')
      })
    })

    describe('filterNavigationByPermissions', () => {
      const sampleNavigation: NavigationItem[] = [
        {
          id: 'products',
          label: 'Products',
          href: '/products',
          requiredPermissions: [{ resource: 'products', action: 'read' }],
        },
        {
          id: 'admin',
          label: 'Admin',
          href: '/admin',
          requiredRole: UserRole.ADMIN,
        },
        {
          id: 'settings',
          label: 'Settings',
          href: '/settings',
          children: [
            {
              id: 'user-settings',
              label: 'User Settings',
              href: '/settings/users',
              requiredRole: UserRole.ADMIN,
            },
          ],
        },
      ]

      it('should filter navigation items based on permissions and roles', () => {
        mockPermissionService.hasPermission.mockReturnValue(true)

        const result = filterNavigationByPermissions(adminUser, sampleNavigation)
        
        expect(result).toHaveLength(3)
      })

      it('should filter out items user cannot access', () => {
        mockPermissionService.hasPermission.mockReturnValue(false)

        const result = filterNavigationByPermissions(viewerUser, sampleNavigation)
        
        expect(result).toHaveLength(1) // Only settings without children
        expect(result[0].children).toHaveLength(0)
      })
    })
  })

  describe('Form Field Permission Helpers', () => {
    describe('isFieldDisabled', () => {
      it('should return false if user can update resource', () => {
        // Mock implementation to simulate canAccessOwnedResource behavior
        mockPermissionService.hasResourceAccess.mockImplementation((user, resource, action, scope) => {
          if (scope === 'all') return false // No global permissions
          if (scope === 'own') return true  // Has own permissions
          return false
        })

        const result = isFieldDisabled(editorUser, 'products', 'update', editorUser.id)
        
        expect(result).toBe(false)
      })

      it('should return true if user cannot update resource', () => {
        mockPermissionService.hasResourceAccess.mockReturnValue(false)

        const result = isFieldDisabled(viewerUser, 'products', 'update', 'other-user')
        
        expect(result).toBe(true)
      })

      it('should return true for null user', () => {
        const result = isFieldDisabled(null, 'products')
        
        expect(result).toBe(true)
      })
    })

    describe('getFieldPermissions', () => {
      it('should return correct permissions for user with access', () => {
        mockPermissionService.hasResourceAccess.mockReturnValue(true)

        const result = getFieldPermissions(adminUser, 'products', adminUser.id)
        
        expect(result).toEqual({
          canRead: true,
          canUpdate: true,
          isDisabled: false,
          isHidden: false,
        })
      })

      it('should return restricted permissions for user without access', () => {
        mockPermissionService.hasResourceAccess.mockReturnValue(false)

        const result = getFieldPermissions(viewerUser, 'products', 'other-user')
        
        expect(result).toEqual({
          canRead: false,
          canUpdate: false,
          isDisabled: true,
          isHidden: true,
        })
      })

      it('should respect role requirements', () => {
        const result = getFieldPermissions(viewerUser, 'products', viewerUser.id, UserRole.ADMIN)
        
        expect(result).toEqual({
          canRead: false,
          canUpdate: false,
          isDisabled: true,
          isHidden: true,
        })
      })
    })

    describe('getButtonPermissions', () => {
      it('should return correct button permissions', () => {
        mockPermissionService.hasResourceAccess
          .mockReturnValueOnce(true)  // create
          .mockReturnValueOnce(false) // update global
          .mockReturnValueOnce(true)  // update own
          .mockReturnValueOnce(false) // delete global
          .mockReturnValueOnce(false) // delete own
          .mockReturnValueOnce(true)  // manage

        const result = getButtonPermissions(editorUser, 'products', editorUser.id)
        
        expect(result).toEqual({
          canCreate: true,
          canUpdate: true,
          canDelete: false,
          canManage: true,
        })
      })
    })

    describe('getPermissionClasses', () => {
      it('should return allowed classes when user has permission', () => {
        mockPermissionService.hasPermission.mockReturnValue(true)

        const result = getPermissionClasses(
          adminUser,
          { resource: 'products', action: 'read' },
          { allowed: 'text-green-500', denied: 'text-red-500' }
        )
        
        expect(result).toBe('text-green-500')
      })

      it('should return denied classes when user lacks permission', () => {
        mockPermissionService.hasPermission.mockReturnValue(false)

        const result = getPermissionClasses(
          viewerUser,
          { resource: 'products', action: 'create' },
          { allowed: 'text-green-500', denied: 'text-red-500' }
        )
        
        expect(result).toBe('text-red-500')
      })

      it('should return hidden class for null user', () => {
        const result = getPermissionClasses(
          null,
          { resource: 'products', action: 'read' }
        )
        
        expect(result).toBe('hidden')
      })
    })
  })

  describe('Resource-Specific Utilities', () => {
    describe('ProductPermissionUtils', () => {
      it('should check product publishing permissions', () => {
        mockPermissionService.hasResourceAccess
          .mockReturnValueOnce(false) // global
          .mockReturnValueOnce(true)  // own

        const result = ProductPermissionUtils.canPublish(editorUser, editorUser.id)
        
        expect(result).toBe(true)
      })

      it('should check inventory management permissions', () => {
        mockPermissionService.hasResourceAccess.mockReturnValue(true)

        const result = ProductPermissionUtils.canManageInventory(editorUser)
        
        expect(result).toBe(true)
        expect(mockPermissionService.hasResourceAccess).toHaveBeenCalledWith(
          editorUser, 'products', 'update'
        )
      })
    })

    describe('UserPermissionUtils', () => {
      it('should prevent users from changing their own role', () => {
        const result = UserPermissionUtils.canChangeRole(adminUser, adminUser.id)
        
        expect(result).toBe(false)
      })

      it('should allow admins to change other users roles', () => {
        mockPermissionService.hasResourceAccess.mockReturnValue(true)

        const result = UserPermissionUtils.canChangeRole(adminUser, 'other-user-id')
        
        expect(result).toBe(true)
      })

      it('should allow users to reset their own password', () => {
        const result = UserPermissionUtils.canResetPassword(editorUser, editorUser.id)
        
        expect(result).toBe(true)
      })
    })

    describe('AnalyticsPermissionUtils', () => {
      it('should check analytics access permissions', () => {
        mockPermissionService.hasResourceAccess.mockReturnValue(true)

        const result = AnalyticsPermissionUtils.canViewSalesData(adminUser)
        
        expect(result).toBe(true)
        expect(mockPermissionService.hasResourceAccess).toHaveBeenCalledWith(
          adminUser, 'analytics', 'read'
        )
      })

      it('should restrict financial reports to admins only', () => {
        expect(AnalyticsPermissionUtils.canViewFinancialReports(adminUser)).toBe(true)
        expect(AnalyticsPermissionUtils.canViewFinancialReports(editorUser)).toBe(false)
        expect(AnalyticsPermissionUtils.canViewFinancialReports(viewerUser)).toBe(false)
      })
    })
  })

  describe('Bulk Operations', () => {
    describe('canPerformBulkOperations', () => {
      it('should require global permissions for bulk operations', () => {
        mockPermissionService.hasResourceAccess.mockReturnValue(true)

        const result = canPerformBulkOperations(adminUser, 'products', 'update')
        
        expect(result).toBe(true)
        expect(mockPermissionService.hasResourceAccess).toHaveBeenCalledWith(
          adminUser, 'products', 'update', 'all'
        )
      })
    })

    describe('getAvailableBulkActions', () => {
      it('should return available bulk actions', () => {
        mockPermissionService.hasResourceAccess
          .mockReturnValueOnce(true)  // update
          .mockReturnValueOnce(false) // delete
          .mockReturnValueOnce(true)  // archive
          .mockReturnValueOnce(true)  // publish

        const result = getAvailableBulkActions(adminUser, 'products')
        
        expect(result).toEqual(['update', 'archive', 'publish'])
      })
    })
  })
})