/**
 * Permission Utility Functions
 * Helper functions for common permission patterns, data filtering, and form field permissions
 */

import { UserRole } from '@prisma/client'
import { User, Product, Category, Page, Media } from './types'
import { Permission } from './types'
import { permissionService } from './permissions'

// ============================================================================
// Common Permission Pattern Utilities
// ============================================================================

/**
 * Check if user can perform any of the specified actions on a resource
 */
export function canPerformAnyAction(
  user: User | null,
  resource: string,
  actions: string[],
  scope?: string
): boolean {
  if (!user) return false
  
  return actions.some(action => 
    permissionService.hasResourceAccess(user, resource, action, scope)
  )
}

/**
 * Check if user can perform all of the specified actions on a resource
 */
export function canPerformAllActions(
  user: User | null,
  resource: string,
  actions: string[],
  scope?: string
): boolean {
  if (!user) return false
  
  return actions.every(action => 
    permissionService.hasResourceAccess(user, resource, action, scope)
  )
}

/**
 * Get list of actions user can perform on a resource
 */
export function getAvailableActions(
  user: User | null,
  resource: string,
  possibleActions: string[] = ['create', 'read', 'update', 'delete'],
  scope?: string
): string[] {
  if (!user) return []
  
  return possibleActions.filter(action =>
    permissionService.hasResourceAccess(user, resource, action, scope)
  )
}

/**
 * Check if user has elevated permissions (editor or admin)
 */
export function hasElevatedPermissions(user: User | null): boolean {
  if (!user) return false
  return user.role === UserRole.ADMIN || user.role === UserRole.EDITOR
}

/**
 * Check if user has administrative permissions
 */
export function hasAdminPermissions(user: User | null): boolean {
  if (!user) return false
  return user.role === UserRole.ADMIN
}

/**
 * Check if user can access admin-only features
 */
export function canAccessAdminFeatures(user: User | null): boolean {
  return hasAdminPermissions(user)
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(user: User | null): boolean {
  return permissionService.hasResourceAccess(user, 'users', 'manage', 'all')
}

/**
 * Check if user can view system analytics
 */
export function canViewAnalytics(user: User | null): boolean {
  return permissionService.hasResourceAccess(user, 'analytics', 'read')
}

/**
 * Check if user can access security features
 */
export function canAccessSecurity(user: User | null): boolean {
  return permissionService.hasResourceAccess(user, 'security', 'read')
}

/**
 * Check if user owns a resource or has admin permissions
 */
export function canAccessOwnedResource(
  user: User | null,
  resourceOwnerId: string,
  resource: string,
  action: string
): boolean {
  if (!user) return false
  
  // Check if user has global permission
  if (permissionService.hasResourceAccess(user, resource, action, 'all')) {
    return true
  }
  
  // Check if user owns the resource and has 'own' scope permission
  if (user.id === resourceOwnerId) {
    return permissionService.hasResourceAccess(user, resource, action, 'own')
  }
  
  return false
}

// ============================================================================
// Array Filtering Utilities for Permission-Based Data
// ============================================================================

/**
 * Filter products based on user permissions
 */
export function filterProductsByPermissions(
  user: User | null,
  products: Product[],
  action: string = 'read'
): Product[] {
  if (!user) return []
  
  return products.filter(product => {
    // Check global permission first
    if (permissionService.hasResourceAccess(user, 'products', action, 'all')) {
      return true
    }
    
    // Check ownership-based permission
    if (product.createdBy === user.id) {
      return permissionService.hasResourceAccess(user, 'products', action, 'own')
    }
    
    return false
  })
}

/**
 * Filter categories based on user permissions
 */
export function filterCategoriesByPermissions(
  user: User | null,
  categories: Category[],
  action: string = 'read'
): Category[] {
  if (!user) return []
  
  return categories.filter(() => 
    permissionService.hasResourceAccess(user, 'categories', action)
  )
}

/**
 * Filter pages based on user permissions
 */
export function filterPagesByPermissions(
  user: User | null,
  pages: Page[],
  action: string = 'read'
): Page[] {
  if (!user) return []
  
  return pages.filter(page => {
    // Check global permission first
    if (permissionService.hasResourceAccess(user, 'pages', action, 'all')) {
      return true
    }
    
    // Check ownership-based permission
    if (page.createdBy === user.id) {
      return permissionService.hasResourceAccess(user, 'pages', action, 'own')
    }
    
    return false
  })
}

/**
 * Filter media files based on user permissions
 */
export function filterMediaByPermissions(
  user: User | null,
  media: Media[],
  action: string = 'read'
): Media[] {
  if (!user) return []
  
  return media.filter(mediaItem => {
    // Check global permission first
    if (permissionService.hasResourceAccess(user, 'media', action, 'all')) {
      return true
    }
    
    // Check ownership-based permission
    if (mediaItem.createdBy === user.id) {
      return permissionService.hasResourceAccess(user, 'media', action, 'own')
    }
    
    return false
  })
}

/**
 * Filter users based on user permissions
 */
export function filterUsersByPermissions(
  user: User | null,
  users: User[],
  action: string = 'read'
): User[] {
  if (!user) return []
  
  return users.filter(targetUser => {
    // Check global permission first
    if (permissionService.hasResourceAccess(user, 'users', action, 'all')) {
      return true
    }
    
    // Users can always view their own profile
    if (targetUser.id === user.id && action === 'read') {
      return true
    }
    
    return false
  })
}

/**
 * Generic array filter function for any resource type
 */
export function filterArrayByPermissions<T>(
  user: User | null,
  items: T[],
  resource: string,
  action: string,
  getOwnerId?: (item: T) => string
): T[] {
  if (!user) return []
  
  return items.filter(item => {
    // Check global permission first
    if (permissionService.hasResourceAccess(user, resource, action, 'all')) {
      return true
    }
    
    // Check ownership-based permission if getOwnerId is provided
    if (getOwnerId) {
      const ownerId = getOwnerId(item)
      if (ownerId === user.id) {
        return permissionService.hasResourceAccess(user, resource, action, 'own')
      }
      // If user doesn't own the item and doesn't have global permission, deny access
      return false
    }
    
    // If no ownership check is needed, use basic permission check
    return permissionService.hasResourceAccess(user, resource, action)
  })
}

/**
 * Filter navigation items based on user permissions
 */
export interface NavigationItem {
  id: string
  label: string
  href: string
  requiredPermissions?: Permission[]
  requiredRole?: UserRole
  children?: NavigationItem[]
}

export function filterNavigationByPermissions(
  user: User | null,
  navigation: NavigationItem[]
): NavigationItem[] {
  if (!user) return []
  
  return navigation.filter(item => {
    // Check role requirement
    if (item.requiredRole && user.role !== item.requiredRole) {
      // Check if user has higher role
      const roleHierarchy = {
        [UserRole.VIEWER]: 1,
        [UserRole.EDITOR]: 2,
        [UserRole.ADMIN]: 3,
      }
      
      if (roleHierarchy[user.role] < roleHierarchy[item.requiredRole]) {
        return false
      }
    }
    
    // Check permission requirements
    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      const hasPermission = item.requiredPermissions.some(permission =>
        permissionService.hasPermission(user, permission)
      )
      if (!hasPermission) {
        return false
      }
    }
    
    // Recursively filter children
    if (item.children) {
      item.children = filterNavigationByPermissions(user, item.children)
    }
    
    return true
  })
}

// ============================================================================
// Form Field Permission Helpers
// ============================================================================

/**
 * Check if a form field should be disabled based on permissions
 */
export function isFieldDisabled(
  user: User | null,
  resource: string,
  action: string = 'update',
  ownerId?: string
): boolean {
  if (!user) return true
  
  // Use the provided ownerId or default to the current user's ID
  const resourceOwnerId = ownerId || user.id
  return !canAccessOwnedResource(user, resourceOwnerId, resource, action)
}

/**
 * Check if a form field should be hidden based on permissions
 */
export function isFieldHidden(
  user: User | null,
  requiredPermission: Permission
): boolean {
  if (!user) return true
  
  return !permissionService.hasPermission(user, requiredPermission)
}

/**
 * Get form field permissions for a resource
 */
export interface FieldPermissions {
  canRead: boolean
  canUpdate: boolean
  isDisabled: boolean
  isHidden: boolean
}

export function getFieldPermissions(
  user: User | null,
  resource: string,
  ownerId?: string,
  requiredRole?: UserRole
): FieldPermissions {
  if (!user) {
    return {
      canRead: false,
      canUpdate: false,
      isDisabled: true,
      isHidden: true,
    }
  }
  
  // Check role requirement
  if (requiredRole) {
    const roleHierarchy = {
      [UserRole.VIEWER]: 1,
      [UserRole.EDITOR]: 2,
      [UserRole.ADMIN]: 3,
    }
    
    if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
      return {
        canRead: false,
        canUpdate: false,
        isDisabled: true,
        isHidden: true,
      }
    }
  }
  
  const canRead = canAccessOwnedResource(user, ownerId || user.id, resource, 'read')
  const canUpdate = canAccessOwnedResource(user, ownerId || user.id, resource, 'update')
  
  return {
    canRead,
    canUpdate,
    isDisabled: !canUpdate,
    isHidden: !canRead,
  }
}

/**
 * Get button permissions for actions
 */
export interface ButtonPermissions {
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canManage: boolean
}

export function getButtonPermissions(
  user: User | null,
  resource: string,
  ownerId?: string
): ButtonPermissions {
  if (!user) {
    return {
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canManage: false,
    }
  }
  
  return {
    canCreate: permissionService.hasResourceAccess(user, resource, 'create'),
    canUpdate: canAccessOwnedResource(user, ownerId || user.id, resource, 'update'),
    canDelete: canAccessOwnedResource(user, ownerId || user.id, resource, 'delete'),
    canManage: permissionService.hasResourceAccess(user, resource, 'manage'),
  }
}

/**
 * Filter form options based on permissions
 */
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export function filterSelectOptions(
  user: User | null,
  options: SelectOption[],
  requiredPermission: Permission
): SelectOption[] {
  if (!user) return []
  
  const hasPermission = permissionService.hasPermission(user, requiredPermission)
  
  if (!hasPermission) {
    return options.map(option => ({
      ...option,
      disabled: true,
    }))
  }
  
  return options
}

/**
 * Get conditional CSS classes based on permissions
 */
export function getPermissionClasses(
  user: User | null,
  permission: Permission,
  classes: {
    allowed?: string
    denied?: string
    hidden?: string
  } = {}
): string {
  if (!user) {
    return classes.hidden || 'hidden'
  }
  
  const hasPermission = permissionService.hasPermission(user, permission)
  
  if (hasPermission) {
    return classes.allowed || ''
  } else {
    return classes.denied || 'opacity-50 cursor-not-allowed'
  }
}

/**
 * Check if user can perform bulk operations
 */
export function canPerformBulkOperations(
  user: User | null,
  resource: string,
  action: string = 'update'
): boolean {
  // Bulk operations typically require global permissions
  return permissionService.hasResourceAccess(user, resource, action, 'all')
}

/**
 * Get available bulk actions for a resource
 */
export function getAvailableBulkActions(
  user: User | null,
  resource: string
): string[] {
  if (!user) return []
  
  const bulkActions = ['update', 'delete', 'archive', 'publish']
  
  return bulkActions.filter(action =>
    permissionService.hasResourceAccess(user, resource, action, 'all')
  )
}

// ============================================================================
// Resource-Specific Utility Functions
// ============================================================================

/**
 * Product-specific utilities
 */
export const ProductPermissionUtils = {
  canPublish: (user: User | null, productOwnerId?: string): boolean =>
    canAccessOwnedResource(user, productOwnerId || user?.id || '', 'products', 'update'),
  
  canArchive: (user: User | null, productOwnerId?: string): boolean =>
    canAccessOwnedResource(user, productOwnerId || user?.id || '', 'products', 'delete'),
  
  canManageInventory: (user: User | null): boolean =>
    permissionService.hasResourceAccess(user, 'products', 'update'),
  
  canViewPricing: (user: User | null): boolean =>
    permissionService.hasResourceAccess(user, 'products', 'read'),
  
  canEditPricing: (user: User | null, productOwnerId?: string): boolean =>
    canAccessOwnedResource(user, productOwnerId || user?.id || '', 'products', 'update'),
}

/**
 * User management utilities
 */
export const UserPermissionUtils = {
  canChangeRole: (user: User | null, targetUserId: string): boolean => {
    if (!user || user.id === targetUserId) return false // Can't change own role
    return permissionService.hasResourceAccess(user, 'users', 'update', 'all')
  },
  
  canDeactivateUser: (user: User | null, targetUserId: string): boolean => {
    if (!user || user.id === targetUserId) return false // Can't deactivate self
    return permissionService.hasResourceAccess(user, 'users', 'update', 'all')
  },
  
  canViewUserDetails: (user: User | null, targetUserId: string): boolean =>
    canAccessOwnedResource(user, targetUserId, 'users', 'read'),
  
  canResetPassword: (user: User | null, targetUserId: string): boolean => {
    if (!user) return false
    if (user.id === targetUserId) return true // Can reset own password
    return permissionService.hasResourceAccess(user, 'users', 'update', 'all')
  },
}

/**
 * Analytics utilities
 */
export const AnalyticsPermissionUtils = {
  canViewSalesData: (user: User | null): boolean =>
    permissionService.hasResourceAccess(user, 'analytics', 'read'),
  
  canViewUserAnalytics: (user: User | null): boolean =>
    permissionService.hasResourceAccess(user, 'analytics', 'read'),
  
  canExportData: (user: User | null): boolean =>
    permissionService.hasResourceAccess(user, 'analytics', 'read') && hasElevatedPermissions(user),
  
  canViewFinancialReports: (user: User | null): boolean =>
    hasAdminPermissions(user),
}