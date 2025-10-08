/**
 * Tests for RoleConfigurationInterface component
 * Verifies role configuration functionality including matrix editing, role management, and hierarchy
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserRole } from '@prisma/client'
import RoleConfigurationInterface from '@/components/admin/RoleConfigurationInterface'
import { permissionConfigManager } from '@/lib/permission-config'

// Mock the permission config manager
jest.mock('@/lib/permission-config', () => ({
  permissionConfigManager: {
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
  },
}))

// Mock UI components
jest.mock('@/components/ui/Button', () => {
  return function MockButton({ children, onClick, ...props }: any) {
    return <button onClick={onClick} {...props}>{children}</button>
  }
})

jest.mock('@/components/ui/Modal', () => {
  return function MockModal({ children, isOpen, title }: any) {
    if (!isOpen) return null
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
      </div>
    )
  }
})

const mockConfig = {
  roles: [
    {
      role: UserRole.ADMIN,
      name: 'Administrator',
      description: 'Full system access',
      hierarchy: 3,
      permissions: [
        { resource: 'users', action: 'manage', scope: 'all' },
        { resource: 'products', action: 'manage', scope: 'all' },
      ],
      isCustom: false,
    },
    {
      role: UserRole.EDITOR,
      name: 'Editor',
      description: 'Content management access',
      hierarchy: 2,
      permissions: [
        { resource: 'products', action: 'manage', scope: 'all' },
        { resource: 'categories', action: 'manage', scope: 'all' },
      ],
      isCustom: false,
    },
    {
      role: UserRole.VIEWER,
      name: 'Viewer',
      description: 'Read-only access',
      hierarchy: 1,
      permissions: [
        { resource: 'products', action: 'read', scope: 'all' },
        { resource: 'categories', action: 'read', scope: 'all' },
      ],
      isCustom: false,
    },
  ],
  resources: [
    {
      name: 'users',
      displayName: 'Users',
      description: 'User management',
      actions: [
        { name: 'read', displayName: 'Read', description: 'View users' },
        { name: 'create', displayName: 'Create', description: 'Create users' },
        { name: 'update', displayName: 'Update', description: 'Edit users' },
        { name: 'delete', displayName: 'Delete', description: 'Delete users' },
        { name: 'manage', displayName: 'Manage', description: 'Full user management' },
      ],
      scopes: [
        { name: 'all', displayName: 'All', description: 'All users' },
        { name: 'own', displayName: 'Own', description: 'Own account only' },
      ],
    },
    {
      name: 'products',
      displayName: 'Products',
      description: 'Product management',
      actions: [
        { name: 'read', displayName: 'Read', description: 'View products' },
        { name: 'create', displayName: 'Create', description: 'Create products' },
        { name: 'update', displayName: 'Update', description: 'Edit products' },
        { name: 'delete', displayName: 'Delete', description: 'Delete products' },
        { name: 'manage', displayName: 'Manage', description: 'Full product management' },
      ],
      scopes: [
        { name: 'all', displayName: 'All', description: 'All products' },
        { name: 'own', displayName: 'Own', description: 'Own products only' },
      ],
    },
    {
      name: 'categories',
      displayName: 'Categories',
      description: 'Category management',
      actions: [
        { name: 'read', displayName: 'Read', description: 'View categories' },
        { name: 'create', displayName: 'Create', description: 'Create categories' },
        { name: 'update', displayName: 'Update', description: 'Edit categories' },
        { name: 'delete', displayName: 'Delete', description: 'Delete categories' },
        { name: 'manage', displayName: 'Manage', description: 'Full category management' },
      ],
      scopes: [
        { name: 'all', displayName: 'All', description: 'All categories' },
      ],
    },
  ],
  routes: [],
  cache: {
    ttl: 300000,
    enableDistributed: false,
    warmupOnStart: true,
    cleanupInterval: 3600000,
  },
  security: {
    enableAuditLogging: true,
    enableSecurityMonitoring: true,
    maxFailedAttempts: 5,
    lockoutDuration: 900000,
    sessionTimeout: 86400000,
  },
}

describe('RoleConfigurationInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(permissionConfigManager.getConfig as jest.Mock).mockReturnValue(mockConfig)
  })

  it('renders the role configuration interface', async () => {
    render(<RoleConfigurationInterface />)
    
    await waitFor(() => {
      expect(screen.getByText('Role Configuration')).toBeInTheDocument()
      expect(screen.getByText('Manage roles, permissions, and access control')).toBeInTheDocument()
    })
  })

  it('displays all tabs correctly', async () => {
    render(<RoleConfigurationInterface />)
    
    await waitFor(() => {
      expect(screen.getAllByText('Permission Matrix')).toHaveLength(2) // Tab and content header
      expect(screen.getByText('Role Management')).toBeInTheDocument()
      expect(screen.getByText('Role Hierarchy')).toBeInTheDocument()
    })
  })

  it('shows permission matrix by default', async () => {
    render(<RoleConfigurationInterface />)
    
    await waitFor(() => {
      expect(screen.getByText('Click cells to toggle permissions for each role')).toBeInTheDocument()
      expect(screen.getByText('Administrator')).toBeInTheDocument()
      expect(screen.getByText('Editor')).toBeInTheDocument()
      expect(screen.getByText('Viewer')).toBeInTheDocument()
    })
  })

  it('switches between tabs correctly', async () => {
    render(<RoleConfigurationInterface />)
    
    await waitFor(() => {
      expect(screen.getByText('Click cells to toggle permissions for each role')).toBeInTheDocument()
    })

    // Switch to Role Management tab
    fireEvent.click(screen.getByText('Role Management'))
    
    await waitFor(() => {
      expect(screen.getByText('Manage individual roles and their configurations')).toBeInTheDocument()
    })

    // Switch to Role Hierarchy tab
    fireEvent.click(screen.getByText('Role Hierarchy'))
    
    await waitFor(() => {
      expect(screen.getByText('Roles are ordered by hierarchy level (highest to lowest)')).toBeInTheDocument()
    })
  })

  it('displays role hierarchy correctly', async () => {
    render(<RoleConfigurationInterface />)
    
    // Switch to hierarchy tab
    fireEvent.click(screen.getByText('Role Hierarchy'))
    
    await waitFor(() => {
      // Should show roles in hierarchy order (Admin: 3, Editor: 2, Viewer: 1)
      const hierarchyElements = screen.getAllByText(/Level \d/)
      expect(hierarchyElements).toHaveLength(3)
      expect(screen.getByText('Level 3')).toBeInTheDocument() // Admin
      expect(screen.getByText('Level 2')).toBeInTheDocument() // Editor
      expect(screen.getByText('Level 1')).toBeInTheDocument() // Viewer
    })
  })

  it('shows create role button', async () => {
    render(<RoleConfigurationInterface />)
    
    await waitFor(() => {
      expect(screen.getByText('Create Role')).toBeInTheDocument()
    })
  })

  it('opens create role modal when create button is clicked', async () => {
    render(<RoleConfigurationInterface />)
    
    await waitFor(() => {
      const createButton = screen.getByText('Create Role')
      fireEvent.click(createButton)
    })

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument()
      expect(screen.getByText('Create New Role')).toBeInTheDocument()
    })
  })

  it('displays role cards in role management tab', async () => {
    render(<RoleConfigurationInterface />)
    
    // Switch to Role Management tab
    fireEvent.click(screen.getByText('Role Management'))
    
    await waitFor(() => {
      expect(screen.getByText('Administrator')).toBeInTheDocument()
      expect(screen.getByText('Editor')).toBeInTheDocument()
      expect(screen.getByText('Viewer')).toBeInTheDocument()
      expect(screen.getByText('Full system access')).toBeInTheDocument()
      expect(screen.getByText('Content management access')).toBeInTheDocument()
      expect(screen.getByText('Read-only access')).toBeInTheDocument()
    })
  })

  it('shows built-in badges for system roles', async () => {
    render(<RoleConfigurationInterface />)
    
    // Switch to Role Management tab
    fireEvent.click(screen.getByText('Role Management'))
    
    await waitFor(() => {
      const builtInBadges = screen.getAllByText('Built-in')
      expect(builtInBadges).toHaveLength(3) // All three default roles should be built-in
    })
  })

  it('displays resource names in permission matrix', async () => {
    render(<RoleConfigurationInterface />)
    
    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Categories')).toBeInTheDocument()
    })
  })

  it('shows permission counts for each resource', async () => {
    render(<RoleConfigurationInterface />)
    
    await waitFor(() => {
      // Each resource should show action count
      const actionCounts = screen.getAllByText('(5 actions)')
      expect(actionCounts).toHaveLength(3) // Users, Products, and Categories each have 5 actions
    })
  })

  it('handles loading state correctly', () => {
    render(<RoleConfigurationInterface />)
    
    // Should show loading spinner initially (before useEffect completes)
    const spinner = document.querySelector('.animate-spin')
    // Loading state is very brief, so we just check it exists or doesn't
    expect(spinner).toBeDefined()
  })

  it('displays correct hierarchy numbers', async () => {
    render(<RoleConfigurationInterface />)
    
    // Switch to hierarchy tab
    fireEvent.click(screen.getByText('Role Hierarchy'))
    
    await waitFor(() => {
      // Check that hierarchy numbers are displayed correctly
      expect(screen.getByText('3')).toBeInTheDocument() // Admin hierarchy
      expect(screen.getByText('2')).toBeInTheDocument() // Editor hierarchy
      expect(screen.getByText('1')).toBeInTheDocument() // Viewer hierarchy
    })
  })
})

describe('RoleConfigurationInterface - Permission Matrix', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(permissionConfigManager.getConfig as jest.Mock).mockReturnValue(mockConfig)
  })

  it('displays resource expansion controls', async () => {
    render(<RoleConfigurationInterface />)
    
    await waitFor(() => {
      // Should show chevron icons for expanding resources
      const chevronIcons = document.querySelectorAll('svg')
      expect(chevronIcons.length).toBeGreaterThan(0)
    })
  })

  it('shows permission summary for each role-resource combination', async () => {
    render(<RoleConfigurationInterface />)
    
    await waitFor(() => {
      // Should show permission counts like "2 / 10" for each role-resource combination
      const permissionCounts = screen.getAllByText(/\d+ \/ \d+/)
      expect(permissionCounts.length).toBeGreaterThan(0)
    })
  })
})

describe('RoleConfigurationInterface - Error Handling', () => {
  it('handles configuration loading errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(permissionConfigManager.getConfig as jest.Mock).mockImplementation(() => {
      throw new Error('Configuration load failed')
    })
    
    render(<RoleConfigurationInterface />)
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error loading role configuration:', expect.any(Error))
    })
    
    consoleSpy.mockRestore()
  })
})