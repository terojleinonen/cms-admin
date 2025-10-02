/**
 * Permission Error Handling Integration Tests
 * Tests for integrated error boundary and fallback handling
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { RoleGuard, PermissionGate, ConditionalRender } from '../../app/components/auth'
import { PermissionError } from '../../app/components/auth/PermissionErrorBoundary'

// Mock session provider
const mockSession = {
  user: { id: '1', email: 'test@example.com', role: 'VIEWER' },
  expires: '2024-01-01',
}

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SessionProvider session={mockSession}>
    {children}
  </SessionProvider>
)

// Mock the permission service
jest.mock('../../app/lib/permissions', () => ({
  permissionService: {
    hasPermission: jest.fn(() => false),
    canUserAccessRoute: jest.fn(() => false),
    filterByPermissions: jest.fn(() => []),
  },
  Permission: {},
}))

// Mock the useRoleGuard hook
jest.mock('../../app/lib/hooks/useRoleGuard', () => ({
  useRoleGuard: jest.fn(() => ({
    isAuthorized: false,
    isLoading: false,
    reason: 'Insufficient role: required ADMIN, current VIEWER'
  }))
}))

// Mock the usePermissions hook
jest.mock('../../app/lib/hooks/usePermissions', () => ({
  usePermissions: jest.fn(() => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: '1', role: 'VIEWER' },
    canAccess: jest.fn(() => false),
    isAdmin: jest.fn(() => false),
    isEditor: jest.fn(() => false),
    isViewer: jest.fn(() => true),
  }))
}))

// Mock UI components
jest.mock('../../app/components/ui/Button', () => {
  return function MockButton({ children, onClick, ...props }: any) {
    return <button onClick={onClick} {...props}>{children}</button>
  }
})

describe('Permission Error Handling Integration', () => {
  describe('RoleGuard with Error Boundary', () => {
    it('shows unauthorized fallback when access is denied', () => {
      render(
        <TestWrapper>
          <RoleGuard requiredRole="ADMIN">
            <div>Protected content</div>
          </RoleGuard>
        </TestWrapper>
      )

      expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
      expect(screen.getByText('Insufficient Role')).toBeInTheDocument()
      expect(screen.getByText(/Your current role does not allow access/)).toBeInTheDocument()
    })

    it('shows loading state during permission checks', () => {
      const { useRoleGuard } = require('../../app/lib/hooks/useRoleGuard')
      useRoleGuard.mockReturnValue({
        isAuthorized: false,
        isLoading: true,
        reason: null
      })

      render(
        <TestWrapper>
          <RoleGuard requiredRole="ADMIN">
            <div>Protected content</div>
          </RoleGuard>
        </TestWrapper>
      )

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('Checking authorization...')).toBeInTheDocument()
    })

    it('shows detailed error information when enabled', () => {
      render(
        <TestWrapper>
          <RoleGuard 
            requiredRole="ADMIN" 
            showFallbackDetails={true}
          >
            <div>Protected content</div>
          </RoleGuard>
        </TestWrapper>
      )

      expect(screen.getByText('Required Role:')).toBeInTheDocument()
      expect(screen.getByText('ADMIN')).toBeInTheDocument()
    })

    it('provides action buttons for navigation', () => {
      render(
        <TestWrapper>
          <RoleGuard requiredRole="ADMIN">
            <div>Protected content</div>
          </RoleGuard>
        </TestWrapper>
      )

      expect(screen.getByText('Go Back')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })

  describe('PermissionGate with Error Boundary', () => {
    it('shows permission denied fallback for insufficient permissions', () => {
      render(
        <TestWrapper>
          <PermissionGate resource="products" action="create">
            <div>Create product form</div>
          </PermissionGate>
        </TestWrapper>
      )

      expect(screen.queryByText('Create product form')).not.toBeInTheDocument()
      expect(screen.getByText('Permission Denied')).toBeInTheDocument()
    })

    it('shows authentication required for unauthenticated users', () => {
      const { usePermissions } = require('../../app/lib/hooks/usePermissions')
      usePermissions.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        canAccess: jest.fn(() => false),
      })

      render(
        <TestWrapper>
          <PermissionGate resource="products" action="read">
            <div>Product list</div>
          </PermissionGate>
        </TestWrapper>
      )

      expect(screen.getByText('Authentication Required')).toBeInTheDocument()
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })
  })

  describe('ConditionalRender with Error Boundary', () => {
    it('shows fallback when condition is not met', () => {
      const condition = jest.fn(() => false)

      render(
        <TestWrapper>
          <ConditionalRender condition={condition}>
            <div>Conditional content</div>
          </ConditionalRender>
        </TestWrapper>
      )

      expect(screen.queryByText('Conditional content')).not.toBeInTheDocument()
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
    })

    it('renders content when condition is met', () => {
      const condition = jest.fn(() => true)

      render(
        <TestWrapper>
          <ConditionalRender condition={condition}>
            <div>Conditional content</div>
          </ConditionalRender>
        </TestWrapper>
      )

      expect(screen.getByText('Conditional content')).toBeInTheDocument()
    })
  })

  describe('Error Boundary Integration', () => {
    it('catches errors thrown by child components', () => {
      const ErrorComponent = () => {
        throw new PermissionError('Test permission error', 'PERMISSION_DENIED')
      }

      render(
        <TestWrapper>
          <RoleGuard requiredRole="VIEWER" enableErrorBoundary={true}>
            <ErrorComponent />
          </RoleGuard>
        </TestWrapper>
      )

      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.getByText('Test permission error')).toBeInTheDocument()
    })

    it('can be disabled to allow errors to bubble up', () => {
      const ErrorComponent = () => {
        throw new Error('Test error')
      }

      // This should throw since error boundary is disabled
      expect(() => {
        render(
          <TestWrapper>
            <RoleGuard requiredRole="VIEWER" enableErrorBoundary={false}>
              <ErrorComponent />
            </RoleGuard>
          </TestWrapper>
        )
      }).toThrow('Test error')
    })
  })

  describe('Loading State Integration', () => {
    it('shows context-appropriate loading messages', () => {
      const { usePermissions } = require('../../app/lib/hooks/usePermissions')
      usePermissions.mockReturnValue({
        isAuthenticated: true,
        isLoading: true,
        user: null,
      })

      render(
        <TestWrapper>
          <PermissionGate 
            resource="products" 
            action="read"
            loadingContext="permission"
          >
            <div>Content</div>
          </PermissionGate>
        </TestWrapper>
      )

      expect(screen.getByText('Validating permissions...')).toBeInTheDocument()
    })

    it('handles loading timeouts', () => {
      jest.useFakeTimers()
      
      const onTimeout = jest.fn()
      const { usePermissions } = require('../../app/lib/hooks/usePermissions')
      usePermissions.mockReturnValue({
        isAuthenticated: true,
        isLoading: true,
        user: null,
      })

      render(
        <TestWrapper>
          <PermissionGate 
            resource="products" 
            action="read"
            loadingTimeout={1000}
            onLoadingTimeout={onTimeout}
          >
            <div>Content</div>
          </PermissionGate>
        </TestWrapper>
      )

      // Fast-forward time
      fireEvent.click(screen.getByRole('status'))
      jest.advanceTimersByTime(1000)

      expect(onTimeout).toHaveBeenCalled()
      
      jest.useRealTimers()
    })
  })

  describe('Accessibility Integration', () => {
    it('maintains proper ARIA attributes across components', () => {
      render(
        <TestWrapper>
          <RoleGuard requiredRole="ADMIN">
            <div>Protected content</div>
          </RoleGuard>
        </TestWrapper>
      )

      // Check for proper heading structure
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toBeInTheDocument()

      // Check for proper button roles
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('provides proper loading state accessibility', () => {
      const { useRoleGuard } = require('../../app/lib/hooks/useRoleGuard')
      useRoleGuard.mockReturnValue({
        isAuthorized: false,
        isLoading: true,
        reason: null
      })

      render(
        <TestWrapper>
          <RoleGuard requiredRole="ADMIN">
            <div>Protected content</div>
          </RoleGuard>
        </TestWrapper>
      )

      const status = screen.getByRole('status')
      expect(status).toHaveAttribute('aria-live', 'polite')
    })
  })
})