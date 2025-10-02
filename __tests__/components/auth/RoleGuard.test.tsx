/**
 * RoleGuard Component Tests
 * Comprehensive tests for role-based conditional rendering
 */

import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'
import {
  RoleGuard,
  AdminOnly,
  EditorOrHigher,
  ViewerOrHigher,
  ProductGuard,
  CategoryGuard,
  OwnershipGuard,
  FeatureFlagGuard,
} from '../../../app/components/auth/RoleGuard'
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

describe('RoleGuard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Role Guard', () => {
    it('should render children when user has required role', async () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      render(
        <RoleGuard requiredRole={UserRole.ADMIN}>
          <div data-testid="protected-content">Admin Content</div>
        </RoleGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should render fallback when user lacks required role', async () => {
      const viewerUser = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(viewerUser),
        status: 'authenticated'
      })

      render(
        <RoleGuard 
          requiredRole={UserRole.ADMIN}
          fallback={<div data-testid="fallback">Access Denied</div>}
        >
          <div data-testid="protected-content">Admin Content</div>
        </RoleGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('fallback')).toBeInTheDocument()
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      })
    })

    it('should show loading state when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading'
      })

      render(
        <RoleGuard requiredRole={UserRole.ADMIN}>
          <div data-testid="protected-content">Admin Content</div>
        </RoleGuard>
      )

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('should show error message when showError is true and access denied', async () => {
      const viewerUser = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(viewerUser),
        status: 'authenticated'
      })

      render(
        <RoleGuard 
          requiredRole={UserRole.ADMIN}
          showError={true}
          errorMessage="Custom error message"
        >
          <div data-testid="protected-content">Admin Content</div>
        </RoleGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
        expect(screen.getByText('Custom error message')).toBeInTheDocument()
      })
    })

    it('should work with minimum role requirements', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <RoleGuard minimumRole={UserRole.EDITOR}>
          <div data-testid="protected-content">Editor Content</div>
        </RoleGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should work with allowed roles array', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.EDITOR]}>
          <div data-testid="protected-content">Content</div>
        </RoleGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should work with permission requirements', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <RoleGuard requiredPermissions={[{ resource: 'products', action: 'create' }]}>
          <div data-testid="protected-content">Create Product</div>
        </RoleGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })
  })

  describe('Specialized Role Guards', () => {
    it('AdminOnly should only allow admin users', async () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      render(
        <AdminOnly>
          <div data-testid="admin-content">Admin Only Content</div>
        </AdminOnly>
      )

      await waitFor(() => {
        expect(screen.getByTestId('admin-content')).toBeInTheDocument()
      })
    })

    it('EditorOrHigher should allow editor and admin users', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <EditorOrHigher>
          <div data-testid="editor-content">Editor Content</div>
        </EditorOrHigher>
      )

      await waitFor(() => {
        expect(screen.getByTestId('editor-content')).toBeInTheDocument()
      })
    })

    it('ViewerOrHigher should allow all authenticated users', async () => {
      const viewerUser = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(viewerUser),
        status: 'authenticated'
      })

      render(
        <ViewerOrHigher>
          <div data-testid="viewer-content">Viewer Content</div>
        </ViewerOrHigher>
      )

      await waitFor(() => {
        expect(screen.getByTestId('viewer-content')).toBeInTheDocument()
      })
    })
  })

  describe('Resource-Specific Guards', () => {
    it('ProductGuard should check product permissions', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <ProductGuard action="create">
          <div data-testid="create-product">Create Product</div>
        </ProductGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('create-product')).toBeInTheDocument()
      })
    })

    it('CategoryGuard should check category permissions', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <CategoryGuard action="update">
          <div data-testid="update-category">Update Category</div>
        </CategoryGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('update-category')).toBeInTheDocument()
      })
    })
  })

  describe('Ownership Guard', () => {
    it('should allow access when user owns resource', async () => {
      const user = createMockUser({ id: 'user-123', role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      render(
        <OwnershipGuard 
          resourceOwnerId="user-123"
          allowOwnerAccess={true}
          requiredPermissions={[{ resource: 'products', action: 'update' }]}
        >
          <div data-testid="owner-content">Owner Content</div>
        </OwnershipGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('owner-content')).toBeInTheDocument()
      })
    })

    it('should deny access when user does not own resource and lacks permissions', async () => {
      const user = createMockUser({ id: 'user-123', role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      render(
        <OwnershipGuard 
          resourceOwnerId="user-456"
          allowOwnerAccess={true}
          requiredPermissions={[{ resource: 'products', action: 'update' }]}
          fallback={<div data-testid="no-access">No Access</div>}
        >
          <div data-testid="owner-content">Owner Content</div>
        </OwnershipGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('no-access')).toBeInTheDocument()
        expect(screen.queryByTestId('owner-content')).not.toBeInTheDocument()
      })
    })
  })

  describe('Feature Flag Guard', () => {
    it('should render content when feature is enabled', async () => {
      const user = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      render(
        <FeatureFlagGuard 
          feature="new-dashboard"
          enabledFeatures={['new-dashboard', 'beta-features']}
        >
          <div data-testid="feature-content">New Dashboard</div>
        </FeatureFlagGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('feature-content')).toBeInTheDocument()
      })
    })

    it('should not render content when feature is disabled', async () => {
      const user = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      render(
        <FeatureFlagGuard 
          feature="new-dashboard"
          enabledFeatures={['beta-features']}
          fallback={<div data-testid="feature-disabled">Feature Disabled</div>}
        >
          <div data-testid="feature-content">New Dashboard</div>
        </FeatureFlagGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('feature-disabled')).toBeInTheDocument()
        expect(screen.queryByTestId('feature-content')).not.toBeInTheDocument()
      })
    })
  })

  describe('Callbacks', () => {
    it('should call onAuthorized when access is granted', async () => {
      const onAuthorized = jest.fn()
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      render(
        <RoleGuard 
          requiredRole={UserRole.ADMIN}
          onAuthorized={onAuthorized}
        >
          <div data-testid="protected-content">Admin Content</div>
        </RoleGuard>
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
        <RoleGuard 
          requiredRole={UserRole.ADMIN}
          onUnauthorized={onUnauthorized}
        >
          <div data-testid="protected-content">Admin Content</div>
        </RoleGuard>
      )

      await waitFor(() => {
        expect(onUnauthorized).toHaveBeenCalledWith(expect.stringContaining('Required role'))
      })
    })
  })

  describe('Unauthenticated Users', () => {
    it('should deny access to unauthenticated users', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      })

      render(
        <RoleGuard 
          requiredRole={UserRole.VIEWER}
          fallback={<div data-testid="login-required">Login Required</div>}
        >
          <div data-testid="protected-content">Protected Content</div>
        </RoleGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('login-required')).toBeInTheDocument()
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      })
    })
  })
})