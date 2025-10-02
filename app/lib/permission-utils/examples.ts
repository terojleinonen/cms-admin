/**
 * Permission Utilities Usage Examples
 * Demonstrates how to use the permission utility functions in real scenarios
 */

import { User, Product, Category } from '../types'
import { UserRole } from '@prisma/client'
import {
  canPerformAnyAction,
  canPerformAllActions,
  getAvailableActions,
  hasElevatedPermissions,
  canAccessOwnedResource,
  filterProductsByPermissions,
  filterNavigationByPermissions,
  getFieldPermissions,
  getButtonPermissions,
  ProductPermissionUtils,
  UserPermissionUtils,
  AnalyticsPermissionUtils,
  NavigationItem,
} from './index'

// Example users
const adminUser: User = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: UserRole.ADMIN,
  isActive: true,
  twoFactorEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const editorUser: User = {
  id: 'editor-1',
  email: 'editor@example.com',
  name: 'Editor User',
  role: UserRole.EDITOR,
  isActive: true,
  twoFactorEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// ============================================================================
// Example 1: Basic Permission Checking
// ============================================================================

export function exampleBasicPermissionChecking() {
  console.log('=== Basic Permission Checking ===')
  
  // Check if user can perform any content management action
  const canManageContent = canPerformAnyAction(
    editorUser,
    'products',
    ['create', 'update', 'delete']
  )
  console.log('Editor can manage content:', canManageContent)
  
  // Check if user can perform all admin actions
  const canPerformAllAdmin = canPerformAllActions(
    adminUser,
    'users',
    ['create', 'read', 'update', 'delete']
  )
  console.log('Admin can perform all user actions:', canPerformAllAdmin)
  
  // Get available actions for a user
  const availableActions = getAvailableActions(editorUser, 'products')
  console.log('Available actions for editor:', availableActions)
  
  // Check role-based permissions
  console.log('Editor has elevated permissions:', hasElevatedPermissions(editorUser))
  console.log('Editor is admin:', hasElevatedPermissions(adminUser))
}

// ============================================================================
// Example 2: Resource Ownership Checking
// ============================================================================

export function exampleResourceOwnership() {
  console.log('=== Resource Ownership Checking ===')
  
  const productOwnerId = editorUser.id
  const otherUserId = 'other-user-123'
  
  // Check if user can edit their own product
  const canEditOwnProduct = canAccessOwnedResource(
    editorUser,
    productOwnerId,
    'products',
    'update'
  )
  console.log('Editor can edit own product:', canEditOwnProduct)
  
  // Check if user can edit someone else's product
  const canEditOtherProduct = canAccessOwnedResource(
    editorUser,
    otherUserId,
    'products',
    'update'
  )
  console.log('Editor can edit other product:', canEditOtherProduct)
  
  // Admin can edit any product
  const adminCanEditAny = canAccessOwnedResource(
    adminUser,
    otherUserId,
    'products',
    'update'
  )
  console.log('Admin can edit any product:', adminCanEditAny)
}

// ============================================================================
// Example 3: Array Filtering
// ============================================================================

export function exampleArrayFiltering() {
  console.log('=== Array Filtering ===')
  
  const products: Product[] = [
    {
      id: 'product-1',
      name: 'Product 1',
      slug: 'product-1',
      description: 'Editor product',
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
      description: 'Other user product',
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
      createdBy: 'other-user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      categories: null,
      media: null,
    },
  ]
  
  // Filter products the editor can read
  const readableProducts = filterProductsByPermissions(editorUser, products, 'read')
  console.log('Products editor can read:', readableProducts.length)
  
  // Filter products the editor can update
  const updatableProducts = filterProductsByPermissions(editorUser, products, 'update')
  console.log('Products editor can update:', updatableProducts.length)
  
  // Admin can see all products
  const adminProducts = filterProductsByPermissions(adminUser, products, 'read')
  console.log('Products admin can read:', adminProducts.length)
}

// ============================================================================
// Example 4: Navigation Filtering
// ============================================================================

export function exampleNavigationFiltering() {
  console.log('=== Navigation Filtering ===')
  
  const navigation: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
    },
    {
      id: 'products',
      label: 'Products',
      href: '/products',
      requiredPermissions: [{ resource: 'products', action: 'read' }],
    },
    {
      id: 'users',
      label: 'Users',
      href: '/users',
      requiredRole: UserRole.ADMIN,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      href: '/analytics',
      requiredPermissions: [{ resource: 'analytics', action: 'read' }],
      children: [
        {
          id: 'sales',
          label: 'Sales Reports',
          href: '/analytics/sales',
          requiredRole: UserRole.ADMIN,
        },
        {
          id: 'traffic',
          label: 'Traffic Reports',
          href: '/analytics/traffic',
          requiredPermissions: [{ resource: 'analytics', action: 'read' }],
        },
      ],
    },
  ]
  
  // Filter navigation for editor
  const editorNav = filterNavigationByPermissions(editorUser, navigation)
  console.log('Editor navigation items:', editorNav.length)
  
  // Filter navigation for admin
  const adminNav = filterNavigationByPermissions(adminUser, navigation)
  console.log('Admin navigation items:', adminNav.length)
}

// ============================================================================
// Example 5: Form Field Permissions
// ============================================================================

export function exampleFormFieldPermissions() {
  console.log('=== Form Field Permissions ===')
  
  // Get field permissions for product editing
  const productFieldPerms = getFieldPermissions(
    editorUser,
    'products',
    editorUser.id // User owns this product
  )
  console.log('Product field permissions:', productFieldPerms)
  
  // Get field permissions for user management (admin only)
  const userFieldPerms = getFieldPermissions(
    editorUser,
    'users',
    'other-user-id',
    UserRole.ADMIN
  )
  console.log('User field permissions for editor:', userFieldPerms)
  
  // Get button permissions for product actions
  const productButtonPerms = getButtonPermissions(
    editorUser,
    'products',
    editorUser.id
  )
  console.log('Product button permissions:', productButtonPerms)
}

// ============================================================================
// Example 6: Resource-Specific Utilities
// ============================================================================

export function exampleResourceSpecificUtils() {
  console.log('=== Resource-Specific Utilities ===')
  
  // Product utilities
  console.log('Editor can publish products:', ProductPermissionUtils.canPublish(editorUser))
  console.log('Editor can manage inventory:', ProductPermissionUtils.canManageInventory(editorUser))
  console.log('Editor can edit pricing:', ProductPermissionUtils.canEditPricing(editorUser))
  
  // User management utilities
  console.log('Admin can change roles:', UserPermissionUtils.canChangeRole(adminUser, editorUser.id))
  console.log('Editor can change roles:', UserPermissionUtils.canChangeRole(editorUser, adminUser.id))
  console.log('User can reset own password:', UserPermissionUtils.canResetPassword(editorUser, editorUser.id))
  
  // Analytics utilities
  console.log('Editor can view analytics:', AnalyticsPermissionUtils.canViewSalesData(editorUser))
  console.log('Editor can export data:', AnalyticsPermissionUtils.canExportData(editorUser))
  console.log('Admin can view financial reports:', AnalyticsPermissionUtils.canViewFinancialReports(adminUser))
  console.log('Editor can view financial reports:', AnalyticsPermissionUtils.canViewFinancialReports(editorUser))
}

// ============================================================================
// Example 7: Real-World Component Usage
// ============================================================================

export function exampleComponentUsage() {
  console.log('=== Component Usage Examples ===')
  
  // Example: Product list component
  const products: Product[] = [] // Your products array
  
  // Filter products based on user permissions
  const visibleProducts = filterProductsByPermissions(editorUser, products, 'read')
  
  // Get button permissions for each product
  visibleProducts.forEach(product => {
    const buttonPerms = getButtonPermissions(editorUser, 'products', product.createdBy)
    
    console.log(`Product ${product.id} permissions:`, {
      canEdit: buttonPerms.canUpdate,
      canDelete: buttonPerms.canDelete,
      canPublish: ProductPermissionUtils.canPublish(editorUser, product.createdBy),
    })
  })
  
  // Example: Form field rendering
  const fieldPerms = getFieldPermissions(editorUser, 'products', editorUser.id)
  
  console.log('Form field states:', {
    priceFieldDisabled: fieldPerms.isDisabled,
    inventoryFieldHidden: fieldPerms.isHidden,
    canSaveChanges: fieldPerms.canUpdate,
  })
}

// ============================================================================
// Run All Examples
// ============================================================================

export function runAllExamples() {
  exampleBasicPermissionChecking()
  exampleResourceOwnership()
  exampleArrayFiltering()
  exampleNavigationFiltering()
  exampleFormFieldPermissions()
  exampleResourceSpecificUtils()
  exampleComponentUsage()
}

// Uncomment to run examples
// runAllExamples()