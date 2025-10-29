/**
 * ConditionalRender Component Tests
 * Comprehensive tests for complex permission logic and conditional rendering
 */

import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'
import {
  ConditionalRender,
  AndConditions,
  OrConditions,
  NotCondition,
  BusinessRule,
  FeatureToggle,
  RoleConditions,
  PermissionConditions,
  ResourceConditions,
  OwnershipConditions,
  AuthConditions,
  TimeConditions,
} from '../../../app/components/auth/ConditionalRender'
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

describe('ConditionalRender Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Conditional Render', () => {
    it('should render children when condition is true', async () => {
      const user = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      const condition = jest.fn().mockReturnValue(true)

      render(
        <ConditionalRender condition={condition}>
          <div data-testid="conditional-content">Conditional Content</div>
        </ConditionalRender>
      )

      await waitFor(() => {
        expect(condition).toHaveBeenCalled()
        expect(screen.getByTestId('conditional-content')).toBeInTheDocument()
      })
    })

    it('should render fallback when condition is false', async () => {
      const user = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      const condition = jest.fn().mockReturnValue(false)

      render(
        <ConditionalRender 
          condition={condition}
          fallback={<div data-testid="fallback-content">Fallback Content</div>}
        >
          <div data-testid="conditional-content">Conditional Content</div>
        </ConditionalRender>
      )

      await waitFor(() => {
        expect(condition).toHaveBeenCalled()
        expect(screen.getByTestId('fallback-content')).toBeInTheDocument()
        expect(screen.queryByTestId('conditional-content')).not.toBeInTheDocument()
      })
    })

    it('should show loading state when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading'
      })

      const condition = jest.fn().mockReturnValue(true)

      render(
        <ConditionalRender condition={condition}>
          <div data-testid="conditional-content">Conditional Content</div>
        </ConditionalRender>
      )

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(condition).not.toHaveBeenCalled()
    })

    it('should show error message when showError is true and condition is false', async () => {
      const user = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      const condition = jest.fn().mockReturnValue(false)

      render(
        <ConditionalRender 
          condition={condition}
          showError={true}
          errorMessage="Custom error message"
        >
          <div data-testid="conditional-content">Conditional Content</div>
        </ConditionalRender>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
        expect(screen.getByText('Custom error message')).toBeInTheDocument()
      })
    })
  })

  describe('Multiple Conditions with Logical Operators', () => {
    it('should work with AND operator (all conditions must be true)', async () => {
      const user = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      const condition1 = jest.fn().mockReturnValue(true)
      const condition2 = jest.fn().mockReturnValue(true)
      const condition3 = jest.fn().mockReturnValue(true)

      render(
        <ConditionalRender 
          condition={condition1}
          conditions={[condition2, condition3]}
          operator="AND"
        >
          <div data-testid="and-content">AND Content</div>
        </ConditionalRender>
      )

      await waitFor(() => {
        expect(condition1).toHaveBeenCalled()
        expect(condition2).toHaveBeenCalled()
        expect(condition3).toHaveBeenCalled()
        expect(screen.getByTestId('and-content')).toBeInTheDocument()
      })
    })

    it('should fail with AND operator when any condition is false', async () => {
      const user = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      const condition1 = jest.fn().mockReturnValue(true)
      const condition2 = jest.fn().mockReturnValue(false)
      const condition3 = jest.fn().mockReturnValue(true)

      render(
        <ConditionalRender 
          condition={condition1}
          conditions={[condition2, condition3]}
          operator="AND"
          fallback={<div data-testid="and-fallback">AND Fallback</div>}
        >
          <div data-testid="and-content">AND Content</div>
        </ConditionalRender>
      )

      await waitFor(() => {
        expect(screen.getByTestId('and-fallback')).toBeInTheDocument()
        expect(screen.queryByTestId('and-content')).not.toBeInTheDocument()
      })
    })

    it('should work with OR operator (any condition can be true)', async () => {
      const user = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      const condition1 = jest.fn().mockReturnValue(false)
      const condition2 = jest.fn().mockReturnValue(true)
      const condition3 = jest.fn().mockReturnValue(false)

      render(
        <ConditionalRender 
          condition={condition1}
          conditions={[condition2, condition3]}
          operator="OR"
        >
          <div data-testid="or-content">OR Content</div>
        </ConditionalRender>
      )

      await waitFor(() => {
        expect(screen.getByTestId('or-content')).toBeInTheDocument()
      })
    })

    it('should work with NOT operator (negates the condition)', async () => {
      const user = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      const condition = jest.fn().mockReturnValue(false)

      render(
        <ConditionalRender 
          condition={condition}
          operator="NOT"
        >
          <div data-testid="not-content">NOT Content</div>
        </ConditionalRender>
      )

      await waitFor(() => {
        expect(condition).toHaveBeenCalled()
        expect(screen.getByTestId('not-content')).toBeInTheDocument()
      })
    })
  })

  describe('Pre-built Condition Functions', () => {
    describe('RoleConditions', () => {
      it('should work with isAdmin condition', async () => {
        const adminUser = createMockUser({ role: UserRole.ADMIN })
        mockUseSession.mockReturnValue({
          data: createMockSession(adminUser),
          status: 'authenticated'
        })

        render(
          <ConditionalRender condition={RoleConditions.isAdmin}>
            <div data-testid="admin-content">Admin Content</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(screen.getByTestId('admin-content')).toBeInTheDocument()
        })
      })

      it('should work with hasRole condition', async () => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })

        render(
          <ConditionalRender condition={RoleConditions.hasRole(UserRole.EDITOR)}>
            <div data-testid="editor-content">Editor Content</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(screen.getByTestId('editor-content')).toBeInTheDocument()
        })
      })

      it('should work with hasMinimumRole condition', async () => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })

        render(
          <ConditionalRender condition={RoleConditions.hasMinimumRole(UserRole.VIEWER)}>
            <div data-testid="minimum-role-content">Minimum Role Content</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(screen.getByTestId('minimum-role-content')).toBeInTheDocument()
        })
      })

      it('should work with hasAnyRole condition', async () => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })

        render(
          <ConditionalRender condition={RoleConditions.hasAnyRole([UserRole.ADMIN, UserRole.EDITOR])}>
            <div data-testid="any-role-content">Any Role Content</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(screen.getByTestId('any-role-content')).toBeInTheDocument()
        })
      })
    })

    describe('PermissionConditions', () => {
      it('should work with canAccess condition', async () => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })

        render(
          <ConditionalRender condition={PermissionConditions.canAccess('products', 'create')}>
            <div data-testid="permission-content">Permission Content</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(screen.getByTestId('permission-content')).toBeInTheDocument()
        })
      })

      it('should work with hasAllPermissions condition', async () => {
        const adminUser = createMockUser({ role: UserRole.ADMIN })
        mockUseSession.mockReturnValue({
          data: createMockSession(adminUser),
          status: 'authenticated'
        })

        const permissions = [
          { resource: 'products', action: 'create' },
          { resource: 'categories', action: 'create' }
        ]

        render(
          <ConditionalRender condition={PermissionConditions.hasAllPermissions(permissions)}>
            <div data-testid="all-permissions-content">All Permissions Content</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(screen.getByTestId('all-permissions-content')).toBeInTheDocument()
        })
      })

      it('should work with hasAnyPermission condition', async () => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })

        const permissions = [
          { resource: 'products', action: 'create' },
          { resource: 'users', action: 'create' } // Editor doesn't have this
        ]

        render(
          <ConditionalRender condition={PermissionConditions.hasAnyPermission(permissions)}>
            <div data-testid="any-permission-content">Any Permission Content</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(screen.getByTestId('any-permission-content')).toBeInTheDocument()
        })
      })
    })

    describe('ResourceConditions', () => {
      it('should work with canCreateProduct condition', async () => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })

        render(
          <ConditionalRender condition={ResourceConditions.canCreateProduct}>
            <div data-testid="create-product-content">Create Product Content</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(screen.getByTestId('create-product-content')).toBeInTheDocument()
        })
      })

      it('should work with canReadProduct condition with ownership', async () => {
        const user = createMockUser({ id: 'user-123', role: UserRole.VIEWER })
        mockUseSession.mockReturnValue({
          data: createMockSession(user),
          status: 'authenticated'
        })

        render(
          <ConditionalRender condition={ResourceConditions.canReadProduct('user-123')}>
            <div data-testid="read-product-content">Read Product Content</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(screen.getByTestId('read-product-content')).toBeInTheDocument()
        })
      })
    })

    describe('OwnershipConditions', () => {
      it('should work with isOwner condition', async () => {
        const user = createMockUser({ id: 'user-123', role: UserRole.VIEWER })
        mockUseSession.mockReturnValue({
          data: createMockSession(user),
          status: 'authenticated'
        })

        render(
          <ConditionalRender condition={OwnershipConditions.isOwner('user-123')}>
            <div data-testid="owner-content">Owner Content</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(screen.getByTestId('owner-content')).toBeInTheDocument()
        })
      })

      it('should work with isOwnerOrAdmin condition', async () => {
        const adminUser = createMockUser({ id: 'admin-123', role: UserRole.ADMIN })
        mockUseSession.mockReturnValue({
          data: createMockSession(adminUser),
          status: 'authenticated'
        })

        render(
          <ConditionalRender condition={OwnershipConditions.isOwnerOrAdmin('user-456')}>
            <div data-testid="owner-admin-content">Owner or Admin Content</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(screen.getByTestId('owner-admin-content')).toBeInTheDocument()
        })
      })
    })

    describe('AuthConditions', () => {
      it('should work with isAuthenticated condition', async () => {
        const user = createMockUser({ role: UserRole.VIEWER })
        mockUseSession.mockReturnValue({
          data: createMockSession(user),
          status: 'authenticated'
        })

        render(
          <ConditionalRender condition={AuthConditions.isAuthenticated}>
            <div data-testid="authenticated-content">Authenticated Content</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(screen.getByTestId('authenticated-content')).toBeInTheDocument()
        })
      })

      it('should work with isNotAuthenticated condition', async () => {
        mockUseSession.mockReturnValue({
          data: null,
          status: 'unauthenticated'
        })

        render(
          <ConditionalRender condition={AuthConditions.isNotAuthenticated}>
            <div data-testid="not-authenticated-content">Not Authenticated Content</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(screen.getByTestId('not-authenticated-content')).toBeInTheDocument()
        })
      })
    })

    describe('TimeConditions', () => {
      it('should work with time-based conditions', () => {
        // Mock current time to be during business hours (10 AM)
        const mockDate = new Date('2023-01-01T10:00:00Z')
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any)

        const isBusinessHours = TimeConditions.isBusinessHours()
        expect(isBusinessHours).toBe(true)

        jest.restoreAllMocks()
      })

      it('should work with isAfterDate condition', () => {
        const pastDate = new Date('2020-01-01')
        const isAfterDate = TimeConditions.isAfterDate(pastDate)()
        expect(isAfterDate).toBe(true)
      })

      it('should work with isBeforeDate condition', () => {
        const futureDate = new Date('2030-01-01')
        const isBeforeDate = TimeConditions.isBeforeDate(futureDate)()
        expect(isBeforeDate).toBe(true)
      })
    })
  })

  describe('Specialized Components', () => {
    it('AndConditions should require all conditions to be true', async () => {
      const user = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      const conditions = [
        RoleConditions.isAdmin,
        AuthConditions.isAuthenticated,
        () => true
      ]

      render(
        <AndConditions conditions={conditions}>
          <div data-testid="and-conditions-content">AND Conditions Content</div>
        </AndConditions>
      )

      await waitFor(() => {
        expect(screen.getByTestId('and-conditions-content')).toBeInTheDocument()
      })
    })

    it('OrConditions should require any condition to be true', async () => {
      const user = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      const conditions = [
        RoleConditions.isAdmin, // false
        AuthConditions.isAuthenticated, // true
        () => false
      ]

      render(
        <OrConditions conditions={conditions}>
          <div data-testid="or-conditions-content">OR Conditions Content</div>
        </OrConditions>
      )

      await waitFor(() => {
        expect(screen.getByTestId('or-conditions-content')).toBeInTheDocument()
      })
    })

    it('NotCondition should negate the condition', async () => {
      const user = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      render(
        <NotCondition condition={RoleConditions.isAdmin}>
          <div data-testid="not-condition-content">NOT Admin Content</div>
        </NotCondition>
      )

      await waitFor(() => {
        expect(screen.getByTestId('not-condition-content')).toBeInTheDocument()
      })
    })

    it('BusinessRule should work with predefined rules', async () => {
      const adminUser = createMockUser({ id: 'admin-123', role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      render(
        <BusinessRule rule="admin_or_owner" resourceOwnerId="user-456">
          <div data-testid="business-rule-content">Business Rule Content</div>
        </BusinessRule>
      )

      await waitFor(() => {
        expect(screen.getByTestId('business-rule-content')).toBeInTheDocument()
      })
    })

    it('FeatureToggle should work with feature flags', async () => {
      const user = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      render(
        <FeatureToggle 
          feature="new-feature"
          enabledFeatures={['new-feature', 'beta-features']}
        >
          <div data-testid="feature-toggle-content">Feature Toggle Content</div>
        </FeatureToggle>
      )

      await waitFor(() => {
        expect(screen.getByTestId('feature-toggle-content')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle condition evaluation errors gracefully', async () => {
      const user = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      const errorCondition = jest.fn().mockImplementation(() => {
        throw new Error('Condition error')
      })

      render(
        <ConditionalRender 
          condition={errorCondition}
          fallback={<div data-testid="error-fallback">Error Fallback</div>}
        >
          <div data-testid="conditional-content">Conditional Content</div>
        </ConditionalRender>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-fallback')).toBeInTheDocument()
        expect(screen.queryByTestId('conditional-content')).not.toBeInTheDocument()
      })
    })

    it('should log errors in debug mode', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const user = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      const errorCondition = jest.fn().mockImplementation(() => {
        throw new Error('Debug error')
      })

      render(
        <ConditionalRender 
          condition={errorCondition}
          debug={true}
          fallback={<div data-testid="debug-fallback">Debug Fallback</div>}
        >
          <div data-testid="conditional-content">Conditional Content</div>
        </ConditionalRender>
      )

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Condition evaluation error:', expect.any(Error))
        expect(screen.getByTestId('debug-fallback')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Callbacks', () => {
    it('should call onConditionMet when condition is true', async () => {
      const onConditionMet = jest.fn()
      const user = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      render(
        <ConditionalRender 
          condition={RoleConditions.isAdmin}
          onConditionMet={onConditionMet}
        >
          <div data-testid="conditional-content">Conditional Content</div>
        </ConditionalRender>
      )

      await waitFor(() => {
        expect(onConditionMet).toHaveBeenCalled()
      })
    })

    it('should call onConditionNotMet when condition is false', async () => {
      const onConditionNotMet = jest.fn()
      const user = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      render(
        <ConditionalRender 
          condition={RoleConditions.isAdmin}
          onConditionNotMet={onConditionNotMet}
        >
          <div data-testid="conditional-content">Conditional Content</div>
        </ConditionalRender>
      )

      await waitFor(() => {
        expect(onConditionNotMet).toHaveBeenCalledWith('Condition not met')
      })
    })
  })
})