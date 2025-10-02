/**
 * Role Guard Components Usage Examples
 * Demonstrates how to use the comprehensive role guard components
 */

import React from 'react'
import { UserRole } from '@prisma/client'
import {
  RoleGuard,
  AdminOnly,
  EditorOrHigher,
  ProductGuard,
  OwnershipGuard,
  FeatureFlagGuard,
} from './RoleGuard'
import {
  PermissionGate,
  ResourceGate,
  AnyPermissionGate,
  OwnerOrAdminGate,
  UserManagementGate,
} from './PermissionGate'
import {
  ConditionalRender,
  AndConditions,
  OrConditions,
  RoleConditions,
  PermissionConditions,
  OwnershipConditions,
  BusinessRule,
  FeatureToggle,
} from './ConditionalRender'

/**
 * Example 1: Basic Role-Based Access Control
 */
export function BasicRoleExample() {
  return (
    <div>
      {/* Admin-only content */}
      <AdminOnly fallback={<div>Admin access required</div>}>
        <button>Delete All Users</button>
      </AdminOnly>

      {/* Editor or higher access */}
      <EditorOrHigher>
        <button>Create Product</button>
      </EditorOrHigher>

      {/* Multiple roles allowed */}
      <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.EDITOR]}>
        <button>Manage Content</button>
      </RoleGuard>
    </div>
  )
}

/**
 * Example 2: Resource-Specific Permissions
 */
export function ResourcePermissionExample() {
  return (
    <div>
      {/* Product management */}
      <ProductGuard action="create">
        <button>Add New Product</button>
      </ProductGuard>

      <ProductGuard action="update" scope="own">
        <button>Edit My Products</button>
      </ProductGuard>

      {/* Generic resource access */}
      <ResourceGate resource="analytics" action="read">
        <div>Analytics Dashboard</div>
      </ResourceGate>
    </div>
  )
}

/**
 * Example 3: Ownership-Based Access
 */
export function OwnershipExample({ productOwnerId }: { productOwnerId: string }) {
  return (
    <div>
      {/* Owner or admin can edit */}
      <OwnerOrAdminGate resourceOwnerId={productOwnerId}>
        <button>Edit Product</button>
      </OwnerOrAdminGate>

      {/* Complex ownership logic */}
      <OwnershipGuard
        resourceOwnerId={productOwnerId}
        allowOwnerAccess={true}
        requiredPermissions={[{ resource: 'products', action: 'update' }]}
        fallback={<div>You can only edit your own products</div>}
      >
        <button>Advanced Edit</button>
      </OwnershipGuard>
    </div>
  )
}

/**
 * Example 4: Multiple Permission Logic
 */
export function MultiplePermissionExample() {
  return (
    <div>
      {/* User needs ANY of these permissions */}
      <AnyPermissionGate
        permissions={[
          { resource: 'products', action: 'create' },
          { resource: 'categories', action: 'create' },
        ]}
      >
        <button>Create Content</button>
      </AnyPermissionGate>

      {/* User needs ALL of these permissions */}
      <PermissionGate
        permissions={[
          { resource: 'users', action: 'read' },
          { resource: 'security', action: 'read' },
        ]}
        requireAllPermissions={true}
      >
        <div>User Security Dashboard</div>
      </PermissionGate>
    </div>
  )
}

/**
 * Example 5: Complex Conditional Logic
 */
export function ComplexConditionalExample({ userId }: { userId: string }) {
  return (
    <div>
      {/* AND logic - user must be admin AND authenticated */}
      <AndConditions
        conditions={[
          RoleConditions.isAdmin,
          (permissions) => permissions.isAuthenticated,
        ]}
      >
        <button>System Settings</button>
      </AndConditions>

      {/* OR logic - admin OR owner can access */}
      <OrConditions
        conditions={[
          RoleConditions.isAdmin,
          OwnershipConditions.isOwner(userId),
        ]}
      >
        <button>Manage Profile</button>
      </OrConditions>

      {/* Custom business logic */}
      <ConditionalRender
        condition={(permissions) => {
          // Custom logic: Editor during business hours OR Admin anytime
          const isBusinessHours = new Date().getHours() >= 9 && new Date().getHours() < 17
          return permissions.isAdmin() || (permissions.isEditor() && isBusinessHours)
        }}
        fallback={<div>Access restricted outside business hours</div>}
      >
        <button>Process Orders</button>
      </ConditionalRender>
    </div>
  )
}

/**
 * Example 6: Feature Flags and Business Rules
 */
export function FeatureFlagExample() {
  const enabledFeatures = ['new-dashboard', 'beta-analytics']

  return (
    <div>
      {/* Feature flag control */}
      <FeatureFlagGuard
        feature="new-dashboard"
        enabledFeatures={enabledFeatures}
        fallback={<div>Feature not available</div>}
      >
        <div>New Dashboard UI</div>
      </FeatureFlagGuard>

      {/* Feature toggle with conditional render */}
      <FeatureToggle
        feature="beta-analytics"
        enabledFeatures={enabledFeatures}
      >
        <div>Beta Analytics Features</div>
      </FeatureToggle>

      {/* Business rule enforcement */}
      <BusinessRule
        rule="business_hours"
        fallback={<div>Available during business hours only</div>}
      >
        <button>Live Support Chat</button>
      </BusinessRule>
    </div>
  )
}

/**
 * Example 7: User Management Scenarios
 */
export function UserManagementExample({ targetUserId }: { targetUserId: string }) {
  return (
    <div>
      {/* User can manage their own profile or admin can manage any */}
      <UserManagementGate targetUserId={targetUserId}>
        <button>Edit Profile</button>
      </UserManagementGate>

      {/* Complex user permission checking */}
      <ConditionalRender
        condition={(permissions) => {
          // Admin can delete any user except themselves
          if (permissions.isAdmin() && permissions.user?.id !== targetUserId) {
            return true
          }
          return false
        }}
        fallback={<div>Cannot delete this user</div>}
      >
        <button className="text-red-600">Delete User</button>
      </ConditionalRender>
    </div>
  )
}

/**
 * Example 8: Error Handling and Loading States
 */
export function ErrorHandlingExample() {
  return (
    <div>
      {/* Show error message when access denied */}
      <RoleGuard
        requiredRole={UserRole.ADMIN}
        showError={true}
        errorMessage="Administrator access required for this feature"
        loadingComponent={<div className="animate-pulse">Checking permissions...</div>}
      >
        <button>Admin Panel</button>
      </RoleGuard>

      {/* Custom fallback with helpful message */}
      <PermissionGate
        resource="products"
        action="create"
        fallback={
          <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
            <p>You need product creation permissions to access this feature.</p>
            <p>Contact your administrator to request access.</p>
          </div>
        }
      >
        <button>Create Product</button>
      </PermissionGate>
    </div>
  )
}

/**
 * Example 9: Nested Permission Checks
 */
export function NestedPermissionExample() {
  return (
    <div>
      <EditorOrHigher>
        <div className="content-management">
          <h2>Content Management</h2>
          
          <ProductGuard action="create">
            <button>New Product</button>
          </ProductGuard>

          <ProductGuard action="update">
            <button>Edit Products</button>
          </ProductGuard>

          <AdminOnly>
            <ProductGuard action="delete">
              <button className="text-red-600">Delete Products</button>
            </ProductGuard>
          </AdminOnly>
        </div>
      </EditorOrHigher>
    </div>
  )
}

/**
 * Example 10: Dynamic Permission Checking
 */
export function DynamicPermissionExample({ 
  resources 
}: { 
  resources: Array<{ id: string; name: string; ownerId: string }> 
}) {
  return (
    <div>
      {resources.map((resource) => (
        <div key={resource.id} className="resource-item">
          <h3>{resource.name}</h3>
          
          {/* Show edit button only if user can edit this specific resource */}
          <ConditionalRender
            condition={(permissions) => {
              // Can edit if admin or owner
              return permissions.isAdmin() || permissions.user?.id === resource.ownerId
            }}
          >
            <button>Edit {resource.name}</button>
          </ConditionalRender>

          {/* Show delete button only for admins */}
          <AdminOnly>
            <button className="text-red-600">Delete {resource.name}</button>
          </AdminOnly>
        </div>
      ))}
    </div>
  )
}