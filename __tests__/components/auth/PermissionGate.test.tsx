/**
 * PermissionGate Component Tests
 * Comprehensive tests for granular permission-based conditional rendering
 */

import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'
import {
  PermissionGate,
  ResourceGate,
  AnyPermissionGate,
  AllPermissionsGate,
  OwnerOrAdminGate,
  FeatureGate,
  AuthenticatedGate,
  UserManagementGate,
  ContentCreationGate,
  SystemAdminGate,
} from '../../../app/components/auth/PermissionGate'
import { createMockUser, createMockSession } from '../../helpers/test-helpers'
import { render } from '../../helpers/component-helpers'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock UI components
jest.mock('../../../app/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => <div data-testid="loading-spinner">Loading {size}</div>
}))

jest.mock('../../../app/components/ui/ErrorMessage', () => ({
  ErrorMessage: ({ message }: { message: string }) => <div data-testid="error-message">{message}</div>
}))

describe('PermissionGate Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Permission Gate', () => {
    it('should render children when user has required permission', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <PermissionGate resource="products" action="create">
          <div data-testid="protected-content">Create Product</div>
        </PermissionGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should render fallback when user lacks required permission', async () => {
      const viewerUser = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(viewerUser),
        status: 'authenticated'
      })

      render(
        <PermissionGate 
          resource="products" 
          action="create"
          fallback={<div data-testid="fallback">Access Denied</div>}
        >
          <div data-testid="protected-content">Create Product</div>
        </PermissionGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('fallback')).toBeInTheDocument()
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      })
    })

    it('should work with multiple permissions (AND logic)', async () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      render(
        <PermissionGate 
          permissions={[
            { resource: 'products', action: 'create' },
            { resource: 'categories', action: 'create' }
          ]}
          requireAllPermissions={true}
        >
          <div data-testid="protected-content">Multi-Permission Content</div>
        </PermissionGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should work with multiple permissions (OR logic)', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <PermissionGate 
          permissions={[
            { resource: 'products', action: 'create' },
            { resource: 'users', action: 'create' } // Editor doesn't have this
          ]}
          requireAllPermissions={false}
        >
          <div data-testid="protected-content">OR Permission Content</div>
        </PermissionGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should work with role-based access', async () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      render(
        <PermissionGate requiredRole={UserRole.ADMIN}>
          <div data-testid="protected-content">Admin Content</div>
        </PermissionGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should work with minimum role requirements', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <PermissionGate minimumRole={UserRole.EDITOR}>
          <div data-testid="protected-content">Editor+ Content</div>
        </PermissionGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should work with allowed roles', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <PermissionGate allowedRoles={[UserRole.ADMIN, UserRole.EDITOR]}>
          <div data-testid="protected-content">Multi-Role Content</div>
        </PermissionGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })
  })

  describe('Ownership-Based Access', () => {
    it('should allow access when user owns resource', async () => {
      const user = createMockUser({ id: 'user-123', role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      render(
        <PermissionGate 
          resource="products" 
          action="update"
          resourceOwnerId="user-123"
          allowOwnerAccess={true}
        >
          <div data-testid="protected-content">Update Own Product</div>
        </PermissionGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should deny access when user does not own resource and lacks permissions', async () => {
      const user = createMockUser({ id: 'user-123', role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      render(
        <PermissionGate 
          resource="products" 
          action="update"
          resourceOwnerId="user-456"
          allowOwnerAccess={true}
          fallback={<div data-testid="no-access">No Access</div>}
        >
          <div data-testid="protected-content">Update Product</div>
        </PermissionGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('no-access')).toBeInTheDocument()
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      })
    })
  })

  describe('Custom Validation', () => {
    it('should use custom validator function', async () => {
      const user = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      const customValidator = jest.fn().mockReturnValue(true)

      render(
        <PermissionGate customValidator={customValidator}>
          <div data-testid="protected-content">Custom Validated Content</div>
        </PermissionGate>
      )

      await waitFor(() => {
        expect(customValidator).toHaveBeenCalled()
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should deny access when custom validator returns false', async () => {
      const user = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      const customValidator = jest.fn().mockReturnValue(false)

      render(
        <PermissionGate 
          customValidator={customValidator}
          fallback={<div data-testid="custom-denied">Custom Denied</div>}
        >
          <div data-testid="protected-content">Custom Validated Content</div>
        </PermissionGate>
      )

      await waitFor(() => {
        expect(customValidator).toHaveBeenCalled()
        expect(screen.getByTestId('custom-denied')).toBeInTheDocument()
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      })
    })
  })

  describe('Specialized Permission Gates', () => {
    it('ResourceGate should work with resource and action', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <ResourceGate resource="products" action="read">
          <div data-testid="resource-content">Product Content</div>
        </ResourceGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('resource-content')).toBeInTheDocument()
      })
    })

    it('AnyPermissionGate should use OR logic', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <AnyPermissionGate 
          permissions={[
            { resource: 'products', action: 'create' },
            { resource: 'users', action: 'create' } // Editor doesn't have this
          ]}
        >
          <div data-testid="any-permission-content">Any Permission Content</div>
        </AnyPermissionGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('any-permission-content')).toBeInTheDocument()
      })
    })

    it('AllPermissionsGate should use AND logic', async () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      render(
        <AllPermissionsGate 
          permissions={[
            { resource: 'products', action: 'create' },
            { resource: 'users', action: 'create' }
          ]}
        >
          <div data-testid="all-permissions-content">All Permissions Content</div>
        </AllPermissionsGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('all-permissions-content')).toBeInTheDocument()
      })
    })

    it('OwnerOrAdminGate should allow admin access', async () => {
      const adminUser = createMockUser({ id: 'admin-123', role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      render(
        <OwnerOrAdminGate resourceOwnerId="user-456">
          <div data-testid="owner-admin-content">Owner or Admin Content</div>
        </OwnerOrAdminGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('owner-admin-content')).toBeInTheDocument()
      })
    })

    it('OwnerOrAdminGate should allow owner access', async () => {
      const user = createMockUser({ id: 'user-123', role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      render(
        <OwnerOrAdminGate resourceOwnerId="user-123">
          <div data-testid="owner-admin-content">Owner or Admin Content</div>
        </OwnerOrAdminGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('owner-admin-content')).toBeInTheDocument()
      })
    })

    it('FeatureGate should work with feature flags', async () => {
      const user = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      render(
        <FeatureGate 
          feature="new-feature"
          enabledFeatures={['new-feature', 'beta-features']}
        >
          <div data-testid="feature-content">Feature Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('feature-content')).toBeInTheDocument()
      })
    })

    it('AuthenticatedGate should require authentication', async () => {
      const user = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      render(
        <AuthenticatedGate>
          <div data-testid="authenticated-content">Authenticated Content</div>
        </AuthenticatedGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('authenticated-content')).toBeInTheDocument()
      })
    })

    it('UserManagementGate should allow user to manage themselves', async () => {
      const user = createMockUser({ id: 'user-123', role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      render(
        <UserManagementGate targetUserId="user-123">
          <div data-testid="user-management-content">User Management</div>
        </UserManagementGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-management-content')).toBeInTheDocument()
      })
    })

    it('ContentCreationGate should require editor role', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <ContentCreationGate>
          <div data-testid="content-creation">Content Creation</div>
        </ContentCreationGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('content-creation')).toBeInTheDocument()
      })
    })

    it('SystemAdminGate should require admin role', async () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      render(
        <SystemAdminGate>
          <div data-testid="system-admin">System Admin</div>
        </SystemAdminGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('system-admin')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error message when showError is true', async () => {
      const viewerUser = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(viewerUser),
        status: 'authenticated'
      })

      render(
        <PermissionGate 
          resource="products" 
          action="create"
          showError={true}
          errorMessage="Custom error message"
        >
          <div data-testid="protected-content">Create Product</div>
        </PermissionGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
        expect(screen.getByText('Custom error message')).toBeInTheDocument()
      })
    })

    it('should handle custom validator errors gracefully', async () => {
      const user = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      const customValidator = jest.fn().mockImplementation(() => {
        throw new Error('Validator error')
      })

      render(
        <PermissionGate 
          customValidator={customValidator}
          fallback={<div data-testid="validator-error">Validator Error</div>}
        >
          <div data-testid="protected-content">Content</div>
        </PermissionGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('validator-error')).toBeInTheDocument()
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      })
    })
  })

  describe('Callbacks', () => {
    it('should call onAuthorized when access is granted', async () => {
      const onAuthorized = jest.fn()
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <PermissionGate 
          resource="products" 
          action="create"
          onAuthorized={onAuthorized}
        >
          <div data-testid="protected-content">Create Product</div>
        </PermissionGate>
      )

      await waitFor(() => {
        expect(onAuthorized).toHaveBeenCalled()
      })
    })

    it('should call onUnauthorized when access is denied', async () => {
      const onUnauthorized = jest.fn()
      const viewerUser = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(viewerUser),
        status: 'authenticated'
      })

      render(
        <PermissionGate 
          resource="products" 
          action="create"
          onUnauthorized={onUnauthorized}
        >
          <div data-testid="protected-content">Create Product</div>
        </PermissionGate>
      )

      await waitFor(() => {
        expect(onUnauthorized).toHaveBeenCalledWith(expect.stringContaining('Missing required permission'))
      })
    })
  })
})