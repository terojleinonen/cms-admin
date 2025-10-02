/**
 * Specialized Guards Integration Tests
 * Task 17: Integration tests for specialized guard components
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { UserRole } from '@prisma/client'
import { 
  AdminOnly, 
  OwnerOrAdmin, 
  FeatureFlag 
} from '../../app/components/auth/SpecializedGuards'
import { usePermissions } from '../../app/lib/hooks/usePermissions'

// Mock the usePermissions hook
jest.mock('../../app/lib/hooks/usePermissions')
const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>

// Mock UI components
jest.mock('../../app/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => <div data-testid="loading-spinner">Loading {size}</div>
}))

jest.mock('../../app/components/ui/ErrorMessage', () => ({
  ErrorMessage: ({ message }: { message: string }) => <div data-testid="error-message">{message}</div>
}))

describe('Specialized Guards Integration', () => {
  const createMockPermissions = (role: UserRole, userId: string = 'user-1') => ({
    isLoading: false,
    isAuthenticated: true,
    user: { id: userId, role },
    isAdmin: jest.fn().mockReturnValue(role === UserRole.ADMIN),
    hasMinimumRole: jest.fn().mockImplementation((minRole: UserRole) => {
      const roleHierarchy = {
        [UserRole.VIEWER]: 1,
        [UserRole.EDITOR]: 2,
        [UserRole.ADMIN]: 3,
      }
      return roleHierarchy[role] >= roleHierarchy[minRole]
    }),
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Complex Permission Scenarios', () => {
    it('handles nested guard components correctly', () => {
      const adminPermissions = createMockPermissions(UserRole.ADMIN)
      mockUsePermissions.mockReturnValue(adminPermissions as any)

      render(
        <AdminOnly>
          <div data-testid="admin-content">
            <OwnerOrAdmin resourceOwnerId="other-user">
              <div data-testid="nested-content">
                <FeatureFlag feature="test-feature" enabledFeatures={['test-feature']}>
                  <div data-testid="feature-content">All guards passed!</div>
                </FeatureFlag>
              </div>
            </OwnerOrAdmin>
          </div>
        </AdminOnly>
      )

      expect(screen.getByTestId('admin-content')).toBeInTheDocument()
      expect(screen.getByTestId('nested-content')).toBeInTheDocument()
      expect(screen.getByTestId('feature-content')).toBeInTheDocument()
    })

    it('blocks access when any guard fails in nested structure', () => {
      const editorPermissions = createMockPermissions(UserRole.EDITOR)
      mockUsePermissions.mockReturnValue(editorPermissions as any)

      render(
        <AdminOnly fallback={<div data-testid="admin-blocked">Admin required</div>}>
          <div data-testid="admin-content">
            <OwnerOrAdmin resourceOwnerId="other-user">
              <div data-testid="nested-content">Should not render</div>
            </OwnerOrAdmin>
          </div>
        </AdminOnly>
      )

      expect(screen.getByTestId('admin-blocked')).toBeInTheDocument()
      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument()
      expect(screen.queryByTestId('nested-content')).not.toBeInTheDocument()
    })

    it('handles owner access with feature flags', () => {
      const editorPermissions = createMockPermissions(UserRole.EDITOR, 'owner-user')
      mockUsePermissions.mockReturnValue(editorPermissions as any)

      render(
        <OwnerOrAdmin resourceOwnerId="owner-user">
          <FeatureFlag 
            feature="owner-features" 
            enabledFeatures={['owner-features']}
            requireAuthentication={true}
            minimumRole={UserRole.EDITOR}
          >
            <div data-testid="owner-feature-content">Owner with feature access</div>
          </FeatureFlag>
        </OwnerOrAdmin>
      )

      expect(screen.getByTestId('owner-feature-content')).toBeInTheDocument()
    })

    it('blocks when feature flag fails even with ownership', () => {
      const editorPermissions = createMockPermissions(UserRole.EDITOR, 'owner-user')
      mockUsePermissions.mockReturnValue(editorPermissions as any)

      render(
        <OwnerOrAdmin resourceOwnerId="owner-user">
          <FeatureFlag 
            feature="disabled-feature" 
            enabledFeatures={[]}
            fallback={<div data-testid="feature-blocked">Feature disabled</div>}
          >
            <div data-testid="owner-feature-content">Should not render</div>
          </FeatureFlag>
        </OwnerOrAdmin>
      )

      expect(screen.getByTestId('feature-blocked')).toBeInTheDocument()
      expect(screen.queryByTestId('owner-feature-content')).not.toBeInTheDocument()
    })
  })

  describe('Role Hierarchy Integration', () => {
    it('admin can access all content regardless of ownership', () => {
      const adminPermissions = createMockPermissions(UserRole.ADMIN, 'admin-user')
      mockUsePermissions.mockReturnValue(adminPermissions as any)

      render(
        <div>
          <AdminOnly>
            <div data-testid="admin-only">Admin Only Content</div>
          </AdminOnly>
          <OwnerOrAdmin resourceOwnerId="different-user">
            <div data-testid="owner-or-admin">Owner or Admin Content</div>
          </OwnerOrAdmin>
          <FeatureFlag 
            feature="admin-features" 
            enabledFeatures={['admin-features']}
            minimumRole={UserRole.ADMIN}
          >
            <div data-testid="admin-feature">Admin Feature Content</div>
          </FeatureFlag>
        </div>
      )

      expect(screen.getByTestId('admin-only')).toBeInTheDocument()
      expect(screen.getByTestId('owner-or-admin')).toBeInTheDocument()
      expect(screen.getByTestId('admin-feature')).toBeInTheDocument()
    })

    it('editor has limited access based on ownership and features', () => {
      const editorPermissions = createMockPermissions(UserRole.EDITOR, 'editor-user')
      mockUsePermissions.mockReturnValue(editorPermissions as any)

      render(
        <div>
          <AdminOnly fallback={<div data-testid="admin-blocked">No admin access</div>}>
            <div data-testid="admin-only">Admin Only Content</div>
          </AdminOnly>
          <OwnerOrAdmin resourceOwnerId="editor-user">
            <div data-testid="owner-access">Own Content</div>
          </OwnerOrAdmin>
          <OwnerOrAdmin 
            resourceOwnerId="different-user"
            fallback={<div data-testid="not-owner">Not owner</div>}
          >
            <div data-testid="other-content">Other's Content</div>
          </OwnerOrAdmin>
          <FeatureFlag 
            feature="editor-features" 
            enabledFeatures={['editor-features']}
            minimumRole={UserRole.EDITOR}
          >
            <div data-testid="editor-feature">Editor Feature Content</div>
          </FeatureFlag>
        </div>
      )

      expect(screen.getByTestId('admin-blocked')).toBeInTheDocument()
      expect(screen.getByTestId('owner-access')).toBeInTheDocument()
      expect(screen.getByTestId('not-owner')).toBeInTheDocument()
      expect(screen.getByTestId('editor-feature')).toBeInTheDocument()
      expect(screen.queryByTestId('admin-only')).not.toBeInTheDocument()
      expect(screen.queryByTestId('other-content')).not.toBeInTheDocument()
    })

    it('viewer has most limited access', () => {
      const viewerPermissions = createMockPermissions(UserRole.VIEWER, 'viewer-user')
      mockUsePermissions.mockReturnValue(viewerPermissions as any)

      render(
        <div>
          <AdminOnly fallback={<div data-testid="admin-blocked">No admin access</div>}>
            <div data-testid="admin-only">Admin Only Content</div>
          </AdminOnly>
          <OwnerOrAdmin resourceOwnerId="viewer-user">
            <div data-testid="owner-access">Own Content</div>
          </OwnerOrAdmin>
          <FeatureFlag 
            feature="viewer-features" 
            enabledFeatures={['viewer-features']}
            minimumRole={UserRole.VIEWER}
          >
            <div data-testid="viewer-feature">Viewer Feature Content</div>
          </FeatureFlag>
          <FeatureFlag 
            feature="editor-features" 
            enabledFeatures={['editor-features']}
            minimumRole={UserRole.EDITOR}
            fallback={<div data-testid="editor-blocked">Editor required</div>}
          >
            <div data-testid="editor-feature">Editor Feature Content</div>
          </FeatureFlag>
        </div>
      )

      expect(screen.getByTestId('admin-blocked')).toBeInTheDocument()
      expect(screen.getByTestId('owner-access')).toBeInTheDocument()
      expect(screen.getByTestId('viewer-feature')).toBeInTheDocument()
      expect(screen.getByTestId('editor-blocked')).toBeInTheDocument()
      expect(screen.queryByTestId('admin-only')).not.toBeInTheDocument()
      expect(screen.queryByTestId('editor-feature')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling Integration', () => {
    it('handles authentication errors gracefully across all guards', () => {
      mockUsePermissions.mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        isAdmin: jest.fn().mockReturnValue(false),
        hasMinimumRole: jest.fn().mockReturnValue(false),
      } as any)

      render(
        <div>
          <AdminOnly showError>
            <div data-testid="admin-content">Admin Content</div>
          </AdminOnly>
          <OwnerOrAdmin resourceOwnerId="any-user" showError>
            <div data-testid="owner-content">Owner Content</div>
          </OwnerOrAdmin>
          <FeatureFlag 
            feature="auth-feature" 
            enabledFeatures={['auth-feature']}
            requireAuthentication={true}
            showError
          >
            <div data-testid="feature-content">Feature Content</div>
          </FeatureFlag>
        </div>
      )

      const errorMessages = screen.getAllByTestId('error-message')
      expect(errorMessages).toHaveLength(3)
      expect(errorMessages[0]).toHaveTextContent('Not authenticated')
      expect(errorMessages[1]).toHaveTextContent('Not authenticated')
      expect(errorMessages[2]).toHaveTextContent('Authentication required')
    })

    it('handles loading states consistently', () => {
      mockUsePermissions.mockReturnValue({
        isLoading: true,
        isAuthenticated: false,
        user: null,
        isAdmin: jest.fn(),
        hasMinimumRole: jest.fn(),
      } as any)

      render(
        <div>
          <AdminOnly>
            <div data-testid="admin-content">Admin Content</div>
          </AdminOnly>
          <OwnerOrAdmin resourceOwnerId="any-user">
            <div data-testid="owner-content">Owner Content</div>
          </OwnerOrAdmin>
          <FeatureFlag 
            feature="auth-feature" 
            enabledFeatures={['auth-feature']}
            requireAuthentication={true}
          >
            <div data-testid="feature-content">Feature Content</div>
          </FeatureFlag>
        </div>
      )

      const loadingSpinners = screen.getAllByTestId('loading-spinner')
      expect(loadingSpinners).toHaveLength(3)
    })
  })
})