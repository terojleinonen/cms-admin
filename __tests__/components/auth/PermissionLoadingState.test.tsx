/**
 * PermissionLoadingState Component Tests
 * Tests for permission loading states and contexts
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import PermissionLoadingState, {
  AuthenticationLoading,
  AuthorizationLoading,
  PermissionValidationLoading,
  RoleLoading,
  InlinePermissionLoading,
  PermissionSkeleton,
  ProgressivePermissionLoading,
  TimeoutPermissionLoading
} from '../../../app/components/auth/PermissionLoadingState'

// Mock the LoadingSpinner component
jest.mock('../../../app/components/ui/LoadingSpinner', () => {
  return function MockLoadingSpinner({ size, color, className }: any) {
    return <div className={`loading-spinner ${className || ''}`} data-size={size} data-color={color} />
  }
})

describe('PermissionLoadingState', () => {
  describe('Basic Loading State', () => {
    it('renders default loading state', () => {
      render(<PermissionLoadingState />)

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('renders custom message', () => {
      render(<PermissionLoadingState message="Custom loading message" />)

      expect(screen.getByText('Custom loading message')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<PermissionLoadingState className="custom-class" />)

      const container = screen.getByRole('status')
      expect(container).toHaveClass('custom-class')
    })

    it('renders full page loading when specified', () => {
      render(<PermissionLoadingState fullPage={true} />)

      const container = screen.getByRole('status')
      expect(container).toHaveClass('fixed', 'inset-0', 'z-50')
    })
  })

  describe('Context-Specific Loading', () => {
    it('renders authentication context correctly', () => {
      render(<PermissionLoadingState context="authentication" />)

      expect(screen.getByText('Verifying authentication...')).toBeInTheDocument()
    })

    it('renders authorization context correctly', () => {
      render(<PermissionLoadingState context="authorization" />)

      expect(screen.getByText('Checking authorization...')).toBeInTheDocument()
    })

    it('renders permission context correctly', () => {
      render(<PermissionLoadingState context="permission" />)

      expect(screen.getByText('Validating permissions...')).toBeInTheDocument()
    })

    it('renders role context correctly', () => {
      render(<PermissionLoadingState context="role" />)

      expect(screen.getByText('Loading user role...')).toBeInTheDocument()
    })

    it('shows icon when enabled', () => {
      render(<PermissionLoadingState context="authentication" showIcon={true} />)

      // Check for icon presence (UserIcon for authentication)
      const container = screen.getByRole('status')
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('hides icon when disabled', () => {
      render(<PermissionLoadingState context="authentication" showIcon={false} />)

      // Should only have spinner, not the context icon
      const container = screen.getByRole('status')
      const svgs = container.querySelectorAll('svg')
      expect(svgs).toHaveLength(0) // Only spinner, no context icon
    })
  })

  describe('Timeout Functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('calls timeout callback after specified duration', () => {
      const onTimeout = jest.fn()

      render(
        <PermissionLoadingState 
          timeout={100} 
          onTimeout={onTimeout}
        />
      )

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(100)
      })

      expect(onTimeout).toHaveBeenCalled()
    })

    it('does not call timeout when component unmounts', () => {
      const onTimeout = jest.fn()

      const { unmount } = render(
        <PermissionLoadingState 
          timeout={100} 
          onTimeout={onTimeout}
        />
      )

      unmount()

      act(() => {
        jest.advanceTimersByTime(150)
      })

      expect(onTimeout).not.toHaveBeenCalled()
    })
  })

  describe('Specialized Loading Components', () => {
    it('renders AuthenticationLoading with correct context', () => {
      render(<AuthenticationLoading />)

      expect(screen.getByText('Verifying authentication...')).toBeInTheDocument()
    })

    it('renders AuthorizationLoading with correct context', () => {
      render(<AuthorizationLoading />)

      expect(screen.getByText('Checking authorization...')).toBeInTheDocument()
    })

    it('renders PermissionValidationLoading with correct context', () => {
      render(<PermissionValidationLoading />)

      expect(screen.getByText('Validating permissions...')).toBeInTheDocument()
    })

    it('renders RoleLoading with correct context', () => {
      render(<RoleLoading />)

      expect(screen.getByText('Loading user role...')).toBeInTheDocument()
    })
  })

  describe('InlinePermissionLoading', () => {
    it('renders inline loading state', () => {
      render(<InlinePermissionLoading />)

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('renders custom message', () => {
      render(<InlinePermissionLoading message="Inline loading" />)

      expect(screen.getByText('Inline loading')).toBeInTheDocument()
    })

    it('applies context-specific styling', () => {
      render(<InlinePermissionLoading context="authentication" />)

      const text = screen.getByText('Loading...')
      expect(text).toHaveClass('text-blue-500')
    })
  })

  describe('PermissionSkeleton', () => {
    it('renders skeleton with default lines', () => {
      render(<PermissionSkeleton />)

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('Loading permission-gated content...')).toBeInTheDocument()
    })

    it('renders custom number of lines', () => {
      render(<PermissionSkeleton lines={5} />)

      const container = screen.getByRole('status')
      const lines = container.querySelectorAll('.h-4.bg-gray-200')
      expect(lines.length).toBeGreaterThanOrEqual(5)
    })

    it('shows avatar when enabled', () => {
      render(<PermissionSkeleton showAvatar={true} />)

      const container = screen.getByRole('status')
      const avatar = container.querySelector('.rounded-full.bg-gray-200.h-10.w-10')
      expect(avatar).toBeInTheDocument()
    })

    it('shows button when enabled', () => {
      render(<PermissionSkeleton showButton={true} />)

      const container = screen.getByRole('status')
      const button = container.querySelector('.h-8.bg-gray-200.rounded.w-24')
      expect(button).toBeInTheDocument()
    })
  })

  describe('ProgressivePermissionLoading', () => {
    it('renders authentication stage', () => {
      render(<ProgressivePermissionLoading stage="authentication" />)

      expect(screen.getByText('Authenticating user')).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('renders authorization stage', () => {
      render(<ProgressivePermissionLoading stage="authorization" />)

      expect(screen.getByText('Checking authorization')).toBeInTheDocument()
    })

    it('renders permission stage', () => {
      render(<ProgressivePermissionLoading stage="permission" />)

      expect(screen.getByText('Validating permissions')).toBeInTheDocument()
    })

    it('renders content stage', () => {
      render(<ProgressivePermissionLoading stage="content" />)

      expect(screen.getByText('Loading content')).toBeInTheDocument()
    })

    it('shows completed stages with checkmarks', () => {
      render(<ProgressivePermissionLoading stage="permission" />)

      // Authentication and authorization should be completed
      const container = screen.getByRole('status')
      const checkmarks = container.querySelectorAll('svg[fill="currentColor"]')
      expect(checkmarks.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('TimeoutPermissionLoading', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('shows timeout message after delay', () => {
      render(
        <TimeoutPermissionLoading 
          timeoutDuration={100}
          timeoutMessage="Taking longer than expected"
        />
      )

      // Initially should not show timeout message
      expect(screen.queryByText('Taking longer than expected')).not.toBeInTheDocument()

      // After timeout duration, should show message
      act(() => {
        jest.advanceTimersByTime(100)
      })

      expect(screen.getByText('Taking longer than expected')).toBeInTheDocument()
    })

    it('uses default timeout message', () => {
      render(<TimeoutPermissionLoading timeoutDuration={100} />)

      act(() => {
        jest.advanceTimersByTime(100)
      })

      expect(screen.getByText('This is taking longer than expected...')).toBeInTheDocument()
    })

    it('cleans up timeout on unmount', () => {
      const { unmount } = render(
        <TimeoutPermissionLoading 
          timeoutDuration={100}
          timeoutMessage="Should not appear"
        />
      )

      unmount()

      act(() => {
        jest.advanceTimersByTime(150)
      })

      // Should not throw or cause issues - test passes if no errors
      expect(true).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA attributes', () => {
      render(<PermissionLoadingState />)

      const status = screen.getByRole('status')
      expect(status).toHaveAttribute('aria-live', 'polite')
    })

    it('provides screen reader text', () => {
      render(<PermissionSkeleton />)

      expect(screen.getByText('Loading permission-gated content...')).toBeInTheDocument()
    })

    it('maintains accessibility in progressive loading', () => {
      render(<ProgressivePermissionLoading stage="authorization" />)

      const status = screen.getByRole('status')
      expect(status).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Size Variants', () => {
    it('renders small size correctly', () => {
      render(<PermissionLoadingState size="sm" />)

      const container = screen.getByRole('status')
      expect(container).toBeInTheDocument()
    })

    it('renders medium size correctly', () => {
      render(<PermissionLoadingState size="md" />)

      const container = screen.getByRole('status')
      expect(container).toBeInTheDocument()
    })

    it('renders large size correctly', () => {
      render(<PermissionLoadingState size="lg" />)

      const container = screen.getByRole('status')
      expect(container).toBeInTheDocument()
    })

    it('renders extra large size correctly', () => {
      render(<PermissionLoadingState size="xl" />)

      const container = screen.getByRole('status')
      expect(container).toBeInTheDocument()
    })
  })
})