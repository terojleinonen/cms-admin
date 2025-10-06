/**
 * Role Guard Testing Utilities
 * Specialized testing utilities for role guard components and hooks
 */

import React from 'react'
import { render, RenderResult, waitFor } from '@testing-library/react'
import { UserRole } from '@prisma/client'
import { jest } from '@jest/globals'
import { User, Permission } from '../../app/lib/types'
import { RoleGuardOptions, RoleGuardResult } from '../../app/lib/hooks/useRoleGuard'
import { createMockUser, createMockPermissionHook, PermissionProviderWrapper } from './permission-test-utils'

// Mock router for redirect testing
const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/test',
    route: '/test',
    query: {},
    asPath: '/test',
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}))

// Role guard test scenarios
export const ROLE_GUARD_SCENARIOS = {
  ADMIN_ONLY: {
    options: { requiredRole: UserRole.ADMIN },
    description: 'Admin only access',
    authorizedRoles: [UserRole.ADMIN],
    unauthorizedRoles: [UserRole.EDITOR, UserRole.VIEWER],
  },
  EDITOR_OR_HIGHER: {
    options: { minimumRole: UserRole.EDITOR },
    description: 'Editor or higher access',
    authorizedRoles: [UserRole.ADMIN, UserRole.EDITOR],
    unauthorizedRoles: [UserRole.VIEWER],
  },
  VIEWER_OR_HIGHER: {
    options: { minimumRole: UserRole.VIEWER },
    description: 'Any authenticated user',
    authorizedRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER],
    unauthorizedRoles: [],
  },
  SPECIFIC_ROLES: {
    options: { allowedRoles: [UserRole.ADMIN, UserRole.VIEWER] },
    description: 'Admin or Viewer only',
    authorizedRoles: [UserRole.ADMIN, UserRole.VIEWER],
    unauthorizedRoles: [UserRole.EDITOR],
  },
  PRODUCT_CREATE: {
    options: { requiredPermissions: [{ resource: 'products', action: 'create' }] },
    description: 'Can create products',
    authorizedRoles: [UserRole.ADMIN, UserRole.EDITOR],
    unauthorizedRoles: [UserRole.VIEWER],
  },
  USER_MANAGEMENT: {
    options: { requiredPermissions: [{ resource: 'users', action: 'manage' }] },
    description: 'Can manage users',
    authorizedRoles: [UserRole.ADMIN],
    unauthorizedRoles: [UserRole.EDITOR, UserRole.VIEWER],
  },
  MULTIPLE_PERMISSIONS_AND: {
    options: {
      requiredPermissions: [
        { resource: 'products', action: 'create' },
        { resource: 'categories', action: 'update' }
      ],
      requireAllPermissions: true,
    },
    description: 'Must have ALL specified permissions',
    authorizedRoles: [UserRole.ADMIN, UserRole.EDITOR],
    unauthorizedRoles: [UserRole.VIEWER],
  },
  MULTIPLE_PERMISSIONS_OR: {
    options: {
      requiredPermissions: [
        { resource: 'analytics', action: 'read' },
        { resource: 'products', action: 'read' }
      ],
      requireAllPermissions: false,
    },
    description: 'Must have ANY of the specified permissions',
    authorizedRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER],
    unauthorizedRoles: [],
  },
} as const

// Mock role guard hook factory
export function createMockRoleGuard(
  user: User | null,
  options: RoleGuardOptions = {}
): RoleGuardResult {
  const permissions = createMockPermissionHook(user)
  
  // Determine authorization based on options
  let isAuthorized = false
  let reason: string | undefined

  if (!user) {
    isAuthorized = false
    reason = 'Not authenticated'
  } else {
    // Check role requirements
    if (options.requiredRole && user.role !== options.requiredRole) {
      isAuthorized = false
      reason = `Required role: ${options.requiredRole}, current role: ${user.role}`
    } else if (options.minimumRole) {
      const hierarchy = { [UserRole.VIEWER]: 1, [UserRole.EDITOR]: 2, [UserRole.ADMIN]: 3 }
      if (hierarchy[user.role] < hierarchy[options.minimumRole]) {
        isAuthorized = false
        reason = `Minimum role required: ${options.minimumRole}, current role: ${user.role}`
      } else {
        isAuthorized = true
      }
    } else if (options.allowedRoles && options.allowedRoles.length > 0) {
      if (!options.allowedRoles.includes(user.role)) {
        isAuthorized = false
        reason = `Allowed roles: ${options.allowedRoles.join(', ')}, current role: ${user.role}`
      } else {
        isAuthorized = true
      }
    } else if (options.requiredPermissions && options.requiredPermissions.length > 0) {
      if (options.requireAllPermissions !== false) {
        // AND logic - must have all permissions
        isAuthorized = options.requiredPermissions.every(permission =>
          permissions.canAccess(permission.resource, permission.action, permission.scope)
        )
        if (!isAuthorized) {
          const missing = options.requiredPermissions.find(permission =>
            !permissions.canAccess(permission.resource, permission.action, permission.scope)
          )
          reason = missing ? `Missing required permission: ${missing.resource}.${missing.action}` : 'Missing permissions'
        }
      } else {
        // OR logic - must have at least one permission
        isAuthorized = options.requiredPermissions.some(permission =>
          permissions.canAccess(permission.resource, permission.action, permission.scope)
        )
        if (!isAuthorized) {
          reason = 'Missing any of required permissions'
        }
      }
    } else if (options.customValidator) {
      try {
        isAuthorized = options.customValidator(permissions)
        if (!isAuthorized) {
          reason = 'Custom validation failed'
        }
      } catch (error) {
        isAuthorized = false
        reason = 'Custom validation error'
      }
    } else {
      isAuthorized = true // No specific requirements
    }
  }

  return {
    isAuthorized,
    isLoading: false,
    user,
    permissions,
    reason,
    redirect: jest.fn().mockImplementation(() => {
      if (options.redirectTo) {
        mockPush(options.redirectTo)
      }
    }),
  }
}

// Test component for role guard testing
interface TestComponentProps {
  children?: React.ReactNode
  onAuthorized?: () => void
  onUnauthorized?: (reason: string) => void
}

export function TestComponent({ children, onAuthorized, onUnauthorized }: TestComponentProps) {
  React.useEffect(() => {
    onAuthorized?.()
  }, [onAuthorized])

  return <div data-testid="test-component">{children || 'Test Content'}</div>
}

// Role guard wrapper component for testing
interface RoleGuardWrapperProps {
  user?: User | null
  options?: RoleGuardOptions
  children?: React.ReactNode
  onAuthorized?: () => void
  onUnauthorized?: (reason: string) => void
}

export function RoleGuardWrapper({
  user = null,
  options = {},
  children,
  onAuthorized,
  onUnauthorized
}: RoleGuardWrapperProps) {
  const roleGuard = createMockRoleGuard(user, options)

  React.useEffect(() => {
    if (roleGuard.isAuthorized) {
      onAuthorized?.()
    } else {
      onUnauthorized?.(roleGuard.reason || 'Unauthorized')
      if (options.redirectOnUnauthorized) {
        roleGuard.redirect()
      }
    }
  }, [roleGuard.isAuthorized, roleGuard.reason, onAuthorized, onUnauthorized, options.redirectOnUnauthorized])

  if (roleGuard.isLoading) {
    return <div data-testid="loading">Loading...</div>
  }

  if (!roleGuard.isAuthorized) {
    return <div data-testid="unauthorized">Unauthorized: {roleGuard.reason}</div>
  }

  return (
    <div data-testid="authorized">
      {children || <TestComponent onAuthorized={onAuthorized} onUnauthorized={onUnauthorized} />}
    </div>
  )
}

// Render function for role guard testing
interface RenderRoleGuardOptions {
  user?: User | null
  options?: RoleGuardOptions
  onAuthorized?: () => void
  onUnauthorized?: (reason: string) => void
}

export function renderRoleGuard(
  children: React.ReactNode,
  {
    user = null,
    options = {},
    onAuthorized,
    onUnauthorized
  }: RenderRoleGuardOptions = {}
): RenderResult & {
  user: User | null
  rerender: (newProps: RenderRoleGuardOptions) => void
} {
  const Wrapper = ({ children: wrapperChildren }: { children: React.ReactNode }) => (
    <PermissionProviderWrapper user={user}>
      <RoleGuardWrapper
        user={user}
        options={options}
        onAuthorized={onAuthorized}
        onUnauthorized={onUnauthorized}
      >
        {wrapperChildren}
      </RoleGuardWrapper>
    </PermissionProviderWrapper>
  )

  const result = render(<div>{children}</div>, { wrapper: Wrapper })

  return {
    ...result,
    user,
    rerender: (newProps: RenderRoleGuardOptions) => {
      const NewWrapper = ({ children: wrapperChildren }: { children: React.ReactNode }) => (
        <PermissionProviderWrapper user={newProps.user || user}>
          <RoleGuardWrapper
            user={newProps.user || user}
            options={newProps.options || options}
            onAuthorized={newProps.onAuthorized || onAuthorized}
            onUnauthorized={newProps.onUnauthorized || onUnauthorized}
          >
            {wrapperChildren}
          </RoleGuardWrapper>
        </PermissionProviderWrapper>
      )
      result.rerender(<div>{children}</div>)
    }
  }
}

// Role-specific render utilities
export const RoleGuardTestUtils = {
  renderAsAdmin: (children: React.ReactNode, options: Omit<RenderRoleGuardOptions, 'user'> = {}) => {
    const adminUser = createMockUser({ role: UserRole.ADMIN })
    return renderRoleGuard(children, { ...options, user: adminUser })
  },

  renderAsEditor: (children: React.ReactNode, options: Omit<RenderRoleGuardOptions, 'user'> = {}) => {
    const editorUser = createMockUser({ role: UserRole.EDITOR })
    return renderRoleGuard(children, { ...options, user: editorUser })
  },

  renderAsViewer: (children: React.ReactNode, options: Omit<RenderRoleGuardOptions, 'user'> = {}) => {
    const viewerUser = createMockUser({ role: UserRole.VIEWER })
    return renderRoleGuard(children, { ...options, user: viewerUser })
  },

  renderAsUnauthenticated: (children: React.ReactNode, options: Omit<RenderRoleGuardOptions, 'user'> = {}) => {
    return renderRoleGuard(children, { ...options, user: null })
  },

  renderWithScenario: (
    children: React.ReactNode,
    scenarioKey: keyof typeof ROLE_GUARD_SCENARIOS,
    role: UserRole | null,
    additionalOptions: Partial<RoleGuardOptions> = {}
  ) => {
    const scenario = ROLE_GUARD_SCENARIOS[scenarioKey]
    const user = role ? createMockUser({ role }) : null
    const options = { ...scenario.options, ...additionalOptions }
    return renderRoleGuard(children, { user, options })
  },
}

// Assertion utilities for role guard testing
export const RoleGuardAssertions = {
  expectAuthorized: async (container: HTMLElement) => {
    await waitFor(() => {
      expect(container.querySelector('[data-testid="authorized"]')).toBeInTheDocument()
    })
  },

  expectUnauthorized: async (container: HTMLElement, expectedReason?: string) => {
    await waitFor(() => {
      const unauthorizedElement = container.querySelector('[data-testid="unauthorized"]')
      expect(unauthorizedElement).toBeInTheDocument()
      if (expectedReason) {
        expect(unauthorizedElement).toHaveTextContent(expectedReason)
      }
    })
  },

  expectLoading: async (container: HTMLElement) => {
    await waitFor(() => {
      expect(container.querySelector('[data-testid="loading"]')).toBeInTheDocument()
    })
  },

  expectRedirect: (expectedPath: string) => {
    expect(mockPush).toHaveBeenCalledWith(expectedPath)
  },

  expectNoRedirect: () => {
    expect(mockPush).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  },

  expectCallbackCalled: (callback: jest.Mock, times: number = 1) => {
    expect(callback).toHaveBeenCalledTimes(times)
  },

  expectCallbackNotCalled: (callback: jest.Mock) => {
    expect(callback).not.toHaveBeenCalled()
  },
}

// Test scenario runner
export async function runRoleGuardScenario(
  scenarioKey: keyof typeof ROLE_GUARD_SCENARIOS,
  children: React.ReactNode = <TestComponent />,
  additionalOptions: Partial<RoleGuardOptions> = {}
) {
  const scenario = ROLE_GUARD_SCENARIOS[scenarioKey]
  const results: Array<{
    role: UserRole | null
    isAuthorized: boolean
    container: HTMLElement
  }> = []

  // Test authorized roles
  for (const role of scenario.authorizedRoles) {
    const { container } = RoleGuardTestUtils.renderWithScenario(
      children,
      scenarioKey,
      role,
      additionalOptions
    )
    await RoleGuardAssertions.expectAuthorized(container)
    results.push({ role, isAuthorized: true, container })
  }

  // Test unauthorized roles
  for (const role of scenario.unauthorizedRoles) {
    const { container } = RoleGuardTestUtils.renderWithScenario(
      children,
      scenarioKey,
      role,
      additionalOptions
    )
    await RoleGuardAssertions.expectUnauthorized(container)
    results.push({ role, isAuthorized: false, container })
  }

  // Test unauthenticated user
  const { container } = RoleGuardTestUtils.renderWithScenario(
    children,
    scenarioKey,
    null,
    additionalOptions
  )
  await RoleGuardAssertions.expectUnauthorized(container, 'Not authenticated')
  results.push({ role: null, isAuthorized: false, container })

  return results
}

// Custom validation test utilities
export const CustomValidationUtils = {
  createOwnershipValidator: (resourceOwnerId: string) => (permissions: any) => {
    return permissions.user?.id === resourceOwnerId
  },

  createTimeBasedValidator: (allowedHours: number[]) => (permissions: any) => {
    const currentHour = new Date().getHours()
    return allowedHours.includes(currentHour)
  },

  createFeatureFlagValidator: (requiredFlags: string[]) => (permissions: any) => {
    // Mock feature flag check
    const userFlags = permissions.user?.featureFlags || []
    return requiredFlags.every(flag => userFlags.includes(flag))
  },

  createComplexValidator: (conditions: {
    requireAdmin?: boolean
    requireOwnership?: string
    requireFeatureFlag?: string
    customLogic?: (permissions: any) => boolean
  }) => (permissions: any) => {
    if (conditions.requireAdmin && !permissions.isAdmin()) {
      return false
    }
    
    if (conditions.requireOwnership && permissions.user?.id !== conditions.requireOwnership) {
      return false
    }
    
    if (conditions.requireFeatureFlag) {
      const userFlags = permissions.user?.featureFlags || []
      if (!userFlags.includes(conditions.requireFeatureFlag)) {
        return false
      }
    }
    
    if (conditions.customLogic && !conditions.customLogic(permissions)) {
      return false
    }
    
    return true
  },
}

// Performance testing utilities
export const PerformanceTestUtils = {
  measureRoleGuardRender: async (
    scenarioKey: keyof typeof ROLE_GUARD_SCENARIOS,
    iterations: number = 100
  ) => {
    const scenario = ROLE_GUARD_SCENARIOS[scenarioKey]
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      
      const { container } = RoleGuardTestUtils.renderWithScenario(
        <TestComponent />,
        scenarioKey,
        scenario.authorizedRoles[0] || UserRole.VIEWER
      )
      
      await waitFor(() => {
        expect(container.querySelector('[data-testid="authorized"], [data-testid="unauthorized"]')).toBeInTheDocument()
      })
      
      const end = performance.now()
      times.push(end - start)
    }

    return {
      average: times.reduce((sum, time) => sum + time, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
    }
  },
}

// Cleanup utilities
export const RoleGuardTestCleanup = {
  beforeEach: () => {
    jest.clearAllMocks()
    mockPush.mockClear()
    mockReplace.mockClear()
  },

  afterEach: () => {
    // Clean up any timers or async operations
  },
}

export default {
  createMockRoleGuard,
  TestComponent,
  RoleGuardWrapper,
  renderRoleGuard,
  RoleGuardTestUtils,
  RoleGuardAssertions,
  runRoleGuardScenario,
  CustomValidationUtils,
  PerformanceTestUtils,
  RoleGuardTestCleanup,
  ROLE_GUARD_SCENARIOS,
}