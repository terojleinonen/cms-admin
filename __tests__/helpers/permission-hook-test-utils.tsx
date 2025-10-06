/**
 * Comprehensive Permission Hook Testing Utilities
 * Advanced testing utilities for permission hooks with mock providers and assertion helpers
 */

import React from 'react'
import { renderHook, RenderHookResult } from '@testing-library/react'
import { act, waitFor } from '@testing-library/react'
import { UserRole } from '@prisma/client'
import { jest } from '@jest/globals'
import { User, Permission } from '../../app/lib/types'
import { PermissionHook } from '../../app/lib/hooks/usePermissions'
import { RoleGuardResult, RoleGuardOptions } from '../../app/lib/hooks/useRoleGuard'
import { AuditLogger, AuditLogEntry, AuditLoggerOptions } from '../../app/lib/hooks/useAuditLogger'
import { 
  createMockUser, 
  createMockSession, 
  createMockPermissionHook,
  PermissionProviderWrapper,
  PERMISSION_TEST_SCENARIOS,
  PermissionAssertions,
  TestDataGenerators
} from './permission-test-utils'
import { 
  createMockRoleGuard,
  ROLE_GUARD_SCENARIOS,
  RoleGuardAssertions
} from './role-guard-test-utils'
import {
  createMockAuditLogger,
  AUDIT_LOG_SCENARIOS,
  AuditLoggerAssertions
} from './audit-logger-test-utils'

// Mock next-auth for hook testing
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock permission service
jest.mock('../../app/lib/permissions', () => ({
  permissionService: {
    hasPermission: jest.fn(),
    canUserAccessRoute: jest.fn(),
    filterByPermissions: jest.fn(),
  },
}))

const mockUseSession = require('next-auth/react').useSession as jest.MockedFunction<any>
const mockPermissionService = require('../../app/lib/permissions').permissionService

// Enhanced mock permission provider for testing
interface MockPermissionProviderProps {
  user?: User | null
  customPermissions?: Record<string, boolean>
  isLoading?: boolean
  children: React.ReactNode
}

export function MockPermissionProvider({ 
  user = null, 
  customPermissions = {},
  isLoading = false,
  children 
}: MockPermissionProviderProps) {
  React.useEffect(() => {
    const session = user ? createMockSession({ user }) : null
    
    mockUseSession.mockReturnValue({
      data: session,
      status: isLoading ? 'loading' : (session ? 'authenticated' : 'unauthenticated'),
      update: jest.fn(),
    })

    // Setup permission service mocks
    mockPermissionService.hasPermission.mockImplementation((mockUser: User | null, permission: Permission) => {
      if (!mockUser) return false
      
      const key = `${permission.resource}.${permission.action}${permission.scope ? `.${permission.scope}` : ''}`
      if (customPermissions[key] !== undefined) {
        return customPermissions[key]
      }
      
      // Default permission logic based on role
      switch (mockUser.role) {
        case UserRole.ADMIN:
          return true
        case UserRole.EDITOR:
          return ['products', 'categories', 'pages', 'media', 'orders'].includes(permission.resource) &&
                 ['create', 'read', 'update', 'delete', 'manage'].includes(permission.action)
        case UserRole.VIEWER:
          return permission.action === 'read' && 
                 ['products', 'categories', 'pages', 'media', 'orders'].includes(permission.resource)
        default:
          return false
      }
    })

    mockPermissionService.canUserAccessRoute.mockImplementation((mockUser: User | null, route: string) => {
      if (!mockUser) return false
      if (mockUser.role === UserRole.ADMIN) return true
      if (route.startsWith('/admin/users')) return false
      return true
    })

    mockPermissionService.filterByPermissions.mockImplementation((mockUser: User | null, items: any[], getResource: (item: any) => string) => {
      if (!mockUser) return []
      return items.filter(item => {
        const resource = getResource(item)
        return mockPermissionService.hasPermission(mockUser, { resource, action: 'read' })
      })
    })
  }, [user, customPermissions, isLoading])

  return <div data-testid="mock-permission-provider">{children}</div>
}

// Hook testing utilities
export interface RenderPermissionHookOptions {
  user?: User | null
  customPermissions?: Record<string, boolean>
  isLoading?: boolean
}

export function renderPermissionHook<T>(
  hook: () => T,
  options: RenderPermissionHookOptions = {}
): RenderHookResult<T, any> & {
  user: User | null
  updateUser: (newUser: User | null) => void
  updatePermissions: (permissions: Record<string, boolean>) => void
  setLoading: (loading: boolean) => void
} {
  const { user = null, customPermissions = {}, isLoading = false } = options
  
  let currentUser = user
  let currentPermissions = customPermissions
  let currentLoading = isLoading

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MockPermissionProvider 
      user={currentUser} 
      customPermissions={currentPermissions}
      isLoading={currentLoading}
    >
      {children}
    </MockPermissionProvider>
  )

  const result = renderHook(hook, { wrapper })

  return {
    ...result,
    user: currentUser,
    updateUser: (newUser: User | null) => {
      currentUser = newUser
      result.rerender()
    },
    updatePermissions: (permissions: Record<string, boolean>) => {
      currentPermissions = { ...currentPermissions, ...permissions }
      result.rerender()
    },
    setLoading: (loading: boolean) => {
      currentLoading = loading
      result.rerender()
    }
  }
}

// Role-specific hook rendering utilities
export const PermissionHookTestUtils = {
  // Render hook with specific roles
  renderAsAdmin: <T>(hook: () => T, customPermissions?: Record<string, boolean>) => {
    const adminUser = createMockUser({ role: UserRole.ADMIN })
    return renderPermissionHook(hook, { user: adminUser, customPermissions })
  },

  renderAsEditor: <T>(hook: () => T, customPermissions?: Record<string, boolean>) => {
    const editorUser = createMockUser({ role: UserRole.EDITOR })
    return renderPermissionHook(hook, { user: editorUser, customPermissions })
  },

  renderAsViewer: <T>(hook: () => T, customPermissions?: Record<string, boolean>) => {
    const viewerUser = createMockUser({ role: UserRole.VIEWER })
    return renderPermissionHook(hook, { user: viewerUser, customPermissions })
  },

  renderAsUnauthenticated: <T>(hook: () => T) => {
    return renderPermissionHook(hook, { user: null })
  },

  renderWithLoading: <T>(hook: () => T) => {
    return renderPermissionHook(hook, { isLoading: true })
  },

  // Render hook with specific scenarios
  renderWithScenario: <T>(
    hook: () => T, 
    scenarioKey: keyof typeof PERMISSION_TEST_SCENARIOS,
    customPermissions?: Record<string, boolean>
  ) => {
    const scenario = PERMISSION_TEST_SCENARIOS[scenarioKey]
    const user = scenario.role ? createMockUser({ role: scenario.role }) : null
    return renderPermissionHook(hook, { user, customPermissions })
  },

  // Test all role scenarios
  testAllRoleScenarios: async <T>(
    hook: () => T,
    testCallback: (result: RenderHookResult<T, any>, scenario: typeof PERMISSION_TEST_SCENARIOS[keyof typeof PERMISSION_TEST_SCENARIOS]) => void | Promise<void>
  ) => {
    for (const [key, scenario] of Object.entries(PERMISSION_TEST_SCENARIOS)) {
      const user = scenario.role ? createMockUser({ role: scenario.role }) : null
      const result = renderPermissionHook(hook, { user })
      
      await act(async () => {
        await testCallback(result, scenario)
      })
      
      result.unmount()
    }
  },

  // Performance testing
  measureHookPerformance: async <T>(
    hook: () => T,
    iterations: number = 100,
    role: UserRole = UserRole.EDITOR
  ) => {
    const user = createMockUser({ role })
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      
      const result = renderPermissionHook(hook, { user })
      
      await act(async () => {
        // Trigger hook execution
        result.result.current
      })
      
      const end = performance.now()
      times.push(end - start)
      
      result.unmount()
    }

    return {
      average: times.reduce((sum, time) => sum + time, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
    }
  },
}

// Enhanced assertion utilities for permission hooks
export const PermissionHookAssertions = {
  // Basic permission assertions
  expectCanAccess: (permissions: PermissionHook, resource: string, action: string, scope?: string) => {
    expect(permissions.canAccess(resource, action, scope)).toBe(true)
  },

  expectCannotAccess: (permissions: PermissionHook, resource: string, action: string, scope?: string) => {
    expect(permissions.canAccess(resource, action, scope)).toBe(false)
  },

  // Role assertions
  expectHasRole: (permissions: PermissionHook, role: UserRole) => {
    expect(permissions.hasRole(role)).toBe(true)
  },

  expectDoesNotHaveRole: (permissions: PermissionHook, role: UserRole) => {
    expect(permissions.hasRole(role)).toBe(false)
  },

  expectIsAdmin: (permissions: PermissionHook) => {
    expect(permissions.isAdmin()).toBe(true)
  },

  expectIsNotAdmin: (permissions: PermissionHook) => {
    expect(permissions.isAdmin()).toBe(false)
  },

  expectIsEditor: (permissions: PermissionHook) => {
    expect(permissions.isEditor()).toBe(true)
  },

  expectIsNotEditor: (permissions: PermissionHook) => {
    expect(permissions.isEditor()).toBe(false)
  },

  expectIsViewer: (permissions: PermissionHook) => {
    expect(permissions.isViewer()).toBe(true)
  },

  expectIsNotViewer: (permissions: PermissionHook) => {
    expect(permissions.isViewer()).toBe(false)
  },

  expectHasMinimumRole: (permissions: PermissionHook, minimumRole: UserRole) => {
    expect(permissions.hasMinimumRole(minimumRole)).toBe(true)
  },

  expectDoesNotHaveMinimumRole: (permissions: PermissionHook, minimumRole: UserRole) => {
    expect(permissions.hasMinimumRole(minimumRole)).toBe(false)
  },

  // Authentication assertions
  expectIsAuthenticated: (permissions: PermissionHook) => {
    expect(permissions.isAuthenticated).toBe(true)
    expect(permissions.user).not.toBeNull()
  },

  expectIsNotAuthenticated: (permissions: PermissionHook) => {
    expect(permissions.isAuthenticated).toBe(false)
    expect(permissions.user).toBeNull()
  },

  expectIsLoading: (permissions: PermissionHook) => {
    expect(permissions.isLoading).toBe(true)
  },

  expectIsNotLoading: (permissions: PermissionHook) => {
    expect(permissions.isLoading).toBe(false)
  },

  // Route assertions
  expectCanAccessRoute: (permissions: PermissionHook, route: string) => {
    expect(permissions.canAccessRoute(route)).toBe(true)
  },

  expectCannotAccessRoute: (permissions: PermissionHook, route: string) => {
    expect(permissions.canAccessRoute(route)).toBe(false)
  },

  // Resource-specific assertions
  expectCanCreateProduct: (permissions: PermissionHook) => {
    expect(permissions.canCreateProduct()).toBe(true)
  },

  expectCannotCreateProduct: (permissions: PermissionHook) => {
    expect(permissions.canCreateProduct()).toBe(false)
  },

  expectCanReadProduct: (permissions: PermissionHook, ownerId?: string) => {
    expect(permissions.canReadProduct(ownerId)).toBe(true)
  },

  expectCannotReadProduct: (permissions: PermissionHook, ownerId?: string) => {
    expect(permissions.canReadProduct(ownerId)).toBe(false)
  },

  expectCanUpdateProduct: (permissions: PermissionHook, ownerId?: string) => {
    expect(permissions.canUpdateProduct(ownerId)).toBe(true)
  },

  expectCannotUpdateProduct: (permissions: PermissionHook, ownerId?: string) => {
    expect(permissions.canUpdateProduct(ownerId)).toBe(false)
  },

  expectCanDeleteProduct: (permissions: PermissionHook, ownerId?: string) => {
    expect(permissions.canDeleteProduct(ownerId)).toBe(true)
  },

  expectCannotDeleteProduct: (permissions: PermissionHook, ownerId?: string) => {
    expect(permissions.canDeleteProduct(ownerId)).toBe(false)
  },

  // Category assertions
  expectCanCreateCategory: (permissions: PermissionHook) => {
    expect(permissions.canCreateCategory()).toBe(true)
  },

  expectCannotCreateCategory: (permissions: PermissionHook) => {
    expect(permissions.canCreateCategory()).toBe(false)
  },

  expectCanReadCategory: (permissions: PermissionHook) => {
    expect(permissions.canReadCategory()).toBe(true)
  },

  expectCannotReadCategory: (permissions: PermissionHook) => {
    expect(permissions.canReadCategory()).toBe(false)
  },

  expectCanUpdateCategory: (permissions: PermissionHook) => {
    expect(permissions.canUpdateCategory()).toBe(true)
  },

  expectCannotUpdateCategory: (permissions: PermissionHook) => {
    expect(permissions.canUpdateCategory()).toBe(false)
  },

  expectCanDeleteCategory: (permissions: PermissionHook) => {
    expect(permissions.canDeleteCategory()).toBe(true)
  },

  expectCannotDeleteCategory: (permissions: PermissionHook) => {
    expect(permissions.canDeleteCategory()).toBe(false)
  },

  // User management assertions
  expectCanCreateUser: (permissions: PermissionHook) => {
    expect(permissions.canCreateUser()).toBe(true)
  },

  expectCannotCreateUser: (permissions: PermissionHook) => {
    expect(permissions.canCreateUser()).toBe(false)
  },

  expectCanReadUser: (permissions: PermissionHook, targetUserId?: string) => {
    expect(permissions.canReadUser(targetUserId)).toBe(true)
  },

  expectCannotReadUser: (permissions: PermissionHook, targetUserId?: string) => {
    expect(permissions.canReadUser(targetUserId)).toBe(false)
  },

  expectCanUpdateUser: (permissions: PermissionHook, targetUserId?: string) => {
    expect(permissions.canUpdateUser(targetUserId)).toBe(true)
  },

  expectCannotUpdateUser: (permissions: PermissionHook, targetUserId?: string) => {
    expect(permissions.canUpdateUser(targetUserId)).toBe(false)
  },

  expectCanDeleteUser: (permissions: PermissionHook, targetUserId?: string) => {
    expect(permissions.canDeleteUser(targetUserId)).toBe(true)
  },

  expectCannotDeleteUser: (permissions: PermissionHook, targetUserId?: string) => {
    expect(permissions.canDeleteUser(targetUserId)).toBe(false)
  },

  // Analytics and security assertions
  expectCanReadAnalytics: (permissions: PermissionHook) => {
    expect(permissions.canReadAnalytics()).toBe(true)
  },

  expectCannotReadAnalytics: (permissions: PermissionHook) => {
    expect(permissions.canReadAnalytics()).toBe(false)
  },

  expectCanManageSecurity: (permissions: PermissionHook) => {
    expect(permissions.canManageSecurity()).toBe(true)
  },

  expectCannotManageSecurity: (permissions: PermissionHook) => {
    expect(permissions.canManageSecurity()).toBe(false)
  },

  expectCanManageSettings: (permissions: PermissionHook) => {
    expect(permissions.canManageSettings()).toBe(true)
  },

  expectCannotManageSettings: (permissions: PermissionHook) => {
    expect(permissions.canManageSettings()).toBe(false)
  },

  // Filtering assertions
  expectFilteredItems: <T>(
    permissions: PermissionHook,
    items: T[],
    getResource: (item: T) => string,
    expectedCount: number,
    action?: string
  ) => {
    const filtered = permissions.filterByPermissions(items, getResource, action)
    expect(filtered).toHaveLength(expectedCount)
  },

  expectAllItemsFiltered: <T>(
    permissions: PermissionHook,
    items: T[],
    getResource: (item: T) => string,
    action?: string
  ) => {
    const filtered = permissions.filterByPermissions(items, getResource, action)
    expect(filtered).toHaveLength(items.length)
  },

  expectNoItemsFiltered: <T>(
    permissions: PermissionHook,
    items: T[],
    getResource: (item: T) => string,
    action?: string
  ) => {
    const filtered = permissions.filterByPermissions(items, getResource, action)
    expect(filtered).toHaveLength(0)
  },
}

// Role guard hook testing utilities
export const RoleGuardHookTestUtils = {
  renderRoleGuardHook: (
    options: RoleGuardOptions = {},
    user: User | null = null
  ): RenderHookResult<RoleGuardResult, any> & {
    updateUser: (newUser: User | null) => void
    updateOptions: (newOptions: RoleGuardOptions) => void
  } => {
    let currentUser = user
    let currentOptions = options

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MockPermissionProvider user={currentUser}>
        {children}
      </MockPermissionProvider>
    )

    const result = renderHook(() => createMockRoleGuard(currentUser, currentOptions), { wrapper })

    return {
      ...result,
      updateUser: (newUser: User | null) => {
        currentUser = newUser
        result.rerender()
      },
      updateOptions: (newOptions: RoleGuardOptions) => {
        currentOptions = newOptions
        result.rerender()
      }
    }
  },

  testRoleGuardScenario: async (
    scenarioKey: keyof typeof ROLE_GUARD_SCENARIOS,
    additionalOptions: Partial<RoleGuardOptions> = {}
  ) => {
    const scenario = ROLE_GUARD_SCENARIOS[scenarioKey]
    const options = { ...scenario.options, ...additionalOptions }
    const results: Array<{
      role: UserRole | null
      isAuthorized: boolean
      reason?: string
    }> = []

    // Test authorized roles
    for (const role of scenario.authorizedRoles) {
      const user = createMockUser({ role })
      const result = RoleGuardHookTestUtils.renderRoleGuardHook(options, user)
      
      await waitFor(() => {
        expect(result.result.current.isAuthorized).toBe(true)
      })
      
      results.push({ role, isAuthorized: true })
      result.unmount()
    }

    // Test unauthorized roles
    for (const role of scenario.unauthorizedRoles) {
      const user = createMockUser({ role })
      const result = RoleGuardHookTestUtils.renderRoleGuardHook(options, user)
      
      await waitFor(() => {
        expect(result.result.current.isAuthorized).toBe(false)
      })
      
      results.push({ 
        role, 
        isAuthorized: false, 
        reason: result.result.current.reason 
      })
      result.unmount()
    }

    // Test unauthenticated user
    const result = RoleGuardHookTestUtils.renderRoleGuardHook(options, null)
    
    await waitFor(() => {
      expect(result.result.current.isAuthorized).toBe(false)
    })
    
    results.push({ 
      role: null, 
      isAuthorized: false, 
      reason: result.result.current.reason 
    })
    result.unmount()

    return results
  },
}

// Audit logger hook testing utilities
export const AuditLoggerHookTestUtils = {
  renderAuditLoggerHook: (
    options: AuditLoggerOptions = {},
    user: User | null = null
  ): RenderHookResult<AuditLogger, any> & {
    updateUser: (newUser: User | null) => void
    updateOptions: (newOptions: AuditLoggerOptions) => void
    getMockLogger: () => ReturnType<typeof createMockAuditLogger>
  } => {
    let currentUser = user
    let currentOptions = options
    const mockLogger = createMockAuditLogger(currentUser, currentOptions)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MockPermissionProvider user={currentUser}>
        {children}
      </MockPermissionProvider>
    )

    const result = renderHook(() => mockLogger, { wrapper })

    return {
      ...result,
      updateUser: (newUser: User | null) => {
        currentUser = newUser
        mockLogger.user = newUser
        mockLogger.isEnabled = !!newUser
        result.rerender()
      },
      updateOptions: (newOptions: AuditLoggerOptions) => {
        currentOptions = newOptions
        result.rerender()
      },
      getMockLogger: () => mockLogger
    }
  },

  testAuditLoggerScenario: async (
    scenarioKey: keyof typeof AUDIT_LOG_SCENARIOS,
    user: User | null = createMockUser({ role: UserRole.EDITOR })
  ) => {
    const scenario = AUDIT_LOG_SCENARIOS[scenarioKey]
    const result = AuditLoggerHookTestUtils.renderAuditLoggerHook({}, user)
    const logger = result.getMockLogger()

    // Test each action in the scenario
    for (const action of scenario.actions) {
      await act(async () => {
        if ('resources' in scenario) {
          // Test with multiple resources
          for (const resource of scenario.resources) {
            await logger.logResource(action, resource, 'test-id', { test: 'data' })
          }
        } else {
          // Test with single resource
          const resource = scenario.expectedResource || 'test'
          await logger.logResource(action, resource, 'test-id', { test: 'data' })
        }
      })
    }

    result.unmount()
    return logger.getLogs()
  },
}

// Comprehensive test suite runner
export const PermissionTestSuiteRunner = {
  runFullPermissionSuite: async (hookFactory: () => PermissionHook) => {
    const results = {
      roleTests: [] as any[],
      permissionTests: [] as any[],
      performanceTests: {} as any,
    }

    // Test all role scenarios
    await PermissionHookTestUtils.testAllRoleScenarios(hookFactory, async (result, scenario) => {
      const permissions = result.result.current
      
      // Test expected permissions for this role
      Object.entries(scenario.expectedPermissions).forEach(([method, expected]) => {
        const actual = (permissions as any)[method]()
        results.roleTests.push({
          role: scenario.role,
          method,
          expected,
          actual,
          passed: actual === expected
        })
      })
    })

    // Performance tests
    results.performanceTests = await PermissionHookTestUtils.measureHookPerformance(hookFactory)

    return results
  },

  runRoleGuardSuite: async () => {
    const results = [] as any[]

    for (const [scenarioKey, scenario] of Object.entries(ROLE_GUARD_SCENARIOS)) {
      const scenarioResults = await RoleGuardHookTestUtils.testRoleGuardScenario(
        scenarioKey as keyof typeof ROLE_GUARD_SCENARIOS
      )
      
      results.push({
        scenario: scenarioKey,
        description: scenario.description,
        results: scenarioResults
      })
    }

    return results
  },

  runAuditLoggerSuite: async () => {
    const results = [] as any[]

    for (const [scenarioKey, scenario] of Object.entries(AUDIT_LOG_SCENARIOS)) {
      const logs = await AuditLoggerHookTestUtils.testAuditLoggerScenario(
        scenarioKey as keyof typeof AUDIT_LOG_SCENARIOS
      )
      
      results.push({
        scenario: scenarioKey,
        description: scenario.description,
        logCount: logs.length,
        logs
      })
    }

    return results
  },
}

// Test cleanup utilities
export const PermissionHookTestCleanup = {
  beforeEach: () => {
    jest.clearAllMocks()
    mockUseSession.mockClear()
    mockPermissionService.hasPermission.mockClear()
    mockPermissionService.canUserAccessRoute.mockClear()
    mockPermissionService.filterByPermissions.mockClear()
  },

  afterEach: () => {
    // Clean up any pending timers or async operations
  },

  beforeAll: () => {
    // Setup global mocks
  },

  afterAll: () => {
    // Restore original implementations
    jest.restoreAllMocks()
  },
}

export default {
  MockPermissionProvider,
  renderPermissionHook,
  PermissionHookTestUtils,
  PermissionHookAssertions,
  RoleGuardHookTestUtils,
  AuditLoggerHookTestUtils,
  PermissionTestSuiteRunner,
  PermissionHookTestCleanup,
}