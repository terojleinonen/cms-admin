/**
 * Permission-Aware Navigation History Component Tests
 * Tests for navigation history permission integration and role-based functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserRole } from '@prisma/client'
import NavigationHistory, { PermissionAwareNavigationHistory } from '../../../app/components/layout/NavigationHistory'
import { usePermissions } from '../../../app/lib/hooks/usePermissions'

// Mock dependencies
jest.mock('../../../app/lib/hooks/usePermissions', () => ({
  usePermissions: jest.fn(),
}))

const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock permission hook responses
const createMockPermissions = (role: UserRole, overrides = {}) => ({
  user: { id: 'test-user', role, name: 'Test User', email: 'test@example.com' },
  isAuthenticated: true,
  isLoading: false,
  canAccess: jest.fn((resource: string, action: string, scope?: string) => {
    // Default permission logic based on role
    if (role === UserRole.ADMIN) return true
    if (role === UserRole.EDITOR) {
      return ['products', 'categories', 'pages', 'media'].includes(resource) || 
             (resource === 'profile' && scope === 'own')
    }
    if (role === UserRole.VIEWER) {
      return (resource === 'profile' && scope === 'own') ||
             (['products', 'categories', 'pages', 'media'].includes(resource) && action === 'read')
    }
    return false
  }),
  hasMinimumRole: jest.fn((minRole: UserRole) => {
    const roleHierarchy = { [UserRole.VIEWER]: 1, [UserRole.EDITOR]: 2, [UserRole.ADMIN]: 3 }
    return roleHierarchy[role] >= roleHierarchy[minRole]
  }),
  isAdmin: jest.fn(() => role === UserRole.ADMIN),
  isEditor: jest.fn(() => role === UserRole.EDITOR || role === UserRole.ADMIN),
  isViewer: jest.fn(() => true),
  ...overrides
})

describe('Permission-Aware Navigation History', () => {
  let navigationHistory: PermissionAwareNavigationHistory

  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    navigationHistory = PermissionAwareNavigationHistory.getInstance()
    navigationHistory.clearHistory()
  })

  describe('Navigation History Manager', () => {
    it('should add items to history', () => {
      navigationHistory.addToHistory('/admin/products', 'Products', true, UserRole.ADMIN)
      
      const history = navigationHistory.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0]).toMatchObject({
        path: '/admin/products',
        name: 'Products',
        accessible: true,
        roleAtTime: UserRole.ADMIN
      })
    })

    it('should not add certain paths to history', () => {
      navigationHistory.addToHistory('/', 'Dashboard', true, UserRole.ADMIN)
      navigationHistory.addToHistory('/api/test', 'API', true, UserRole.ADMIN)
      navigationHistory.addToHistory('/auth/login', 'Login', true, UserRole.ADMIN)
      
      const history = navigationHistory.getHistory()
      expect(history).toHaveLength(0)
    })

    it('should update existing entries', () => {
      navigationHistory.addToHistory('/admin/products', 'Products', true, UserRole.ADMIN)
      navigationHistory.addToHistory('/admin/products', 'Products Updated', true, UserRole.ADMIN)
      
      const history = navigationHistory.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].name).toBe('Products Updated')
    })

    it('should limit history size', () => {
      // Add more than max items
      for (let i = 0; i < 15; i++) {
        navigationHistory.addToHistory(`/admin/test${i}`, `Test ${i}`, true, UserRole.ADMIN)
      }
      
      const history = navigationHistory.getHistory()
      expect(history.length).toBeLessThanOrEqual(10)
    })

    it('should filter history by role accessibility', () => {
      navigationHistory.addToHistory('/admin/products', 'Products', true, UserRole.ADMIN)
      navigationHistory.addToHistory('/admin/users', 'Users', true, UserRole.ADMIN)
      navigationHistory.addToHistory('/profile', 'Profile', true, UserRole.EDITOR)
      
      const adminHistory = navigationHistory.getAccessibleHistory(UserRole.ADMIN)
      const editorHistory = navigationHistory.getAccessibleHistory(UserRole.EDITOR)
      
      expect(adminHistory).toHaveLength(3) // Admin can see all
      expect(editorHistory).toHaveLength(1) // Editor can only see profile
    })

    it('should remove items from history', () => {
      navigationHistory.addToHistory('/admin/products', 'Products', true, UserRole.ADMIN)
      navigationHistory.addToHistory('/admin/users', 'Users', true, UserRole.ADMIN)
      
      navigationHistory.removeFromHistory('/admin/products')
      
      const history = navigationHistory.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].path).toBe('/admin/users')
    })

    it('should clear all history', () => {
      navigationHistory.addToHistory('/admin/products', 'Products', true, UserRole.ADMIN)
      navigationHistory.addToHistory('/admin/users', 'Users', true, UserRole.ADMIN)
      
      navigationHistory.clearHistory()
      
      const history = navigationHistory.getHistory()
      expect(history).toHaveLength(0)
    })
  })

  describe('Navigation History Component', () => {
    beforeEach(() => {
      // Add some test history
      navigationHistory.addToHistory('/admin/products', 'Products', true, UserRole.ADMIN)
      navigationHistory.addToHistory('/admin/users', 'Users', true, UserRole.ADMIN)
      navigationHistory.addToHistory('/profile', 'Profile', true, UserRole.EDITOR)
    })

    it('should not render when user is not authenticated', () => {
      mockUsePermissions.mockReturnValue({
        ...createMockPermissions(UserRole.ADMIN),
        isAuthenticated: false
      })
      
      const { container } = render(<NavigationHistory />)
      expect(container.firstChild).toBeNull()
    })

    it('should not render when history is empty', () => {
      navigationHistory.clearHistory()
      mockUsePermissions.mockReturnValue(createMockPermissions(UserRole.ADMIN))
      
      const { container } = render(<NavigationHistory />)
      expect(container.firstChild).toBeNull()
    })

    it('should render recent button with history count', () => {
      mockUsePermissions.mockReturnValue(createMockPermissions(UserRole.ADMIN))
      
      render(<NavigationHistory />)
      
      expect(screen.getByText('Recent')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument() // History count
    })

    it('should show history dropdown when clicked', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissions(UserRole.ADMIN))
      
      render(<NavigationHistory />)
      
      const recentButton = screen.getByText('Recent')
      fireEvent.click(recentButton)
      
      await waitFor(() => {
        expect(screen.getByText('Recent Pages')).toBeInTheDocument()
        expect(screen.getByText('Products')).toBeInTheDocument()
        expect(screen.getByText('Users')).toBeInTheDocument()
        expect(screen.getByText('Profile')).toBeInTheDocument()
      })
    })

    it('should filter history based on user role', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissions(UserRole.EDITOR))
      
      render(<NavigationHistory />)
      
      const recentButton = screen.getByText('Recent')
      fireEvent.click(recentButton)
      
      await waitFor(() => {
        expect(screen.getByText('Recent Pages')).toBeInTheDocument()
        expect(screen.getByText('Profile')).toBeInTheDocument()
        // Should not show admin-only pages
        expect(screen.queryByText('Users')).not.toBeInTheDocument()
      })
    })

    it('should show role badges for history items', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissions(UserRole.ADMIN))
      
      render(<NavigationHistory />)
      
      const recentButton = screen.getByText('Recent')
      fireEvent.click(recentButton)
      
      await waitFor(() => {
        const adminBadges = screen.getAllByText('ADMIN')
        const editorBadges = screen.getAllByText('EDITOR')
        
        expect(adminBadges.length).toBeGreaterThan(0)
        expect(editorBadges.length).toBeGreaterThan(0)
      })
    })

    it('should allow clearing all history', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissions(UserRole.ADMIN))
      
      render(<NavigationHistory />)
      
      const recentButton = screen.getByText('Recent')
      fireEvent.click(recentButton)
      
      await waitFor(() => {
        const clearButton = screen.getByText('Clear All')
        fireEvent.click(clearButton)
      })
      
      // History should be cleared
      const history = navigationHistory.getHistory()
      expect(history).toHaveLength(0)
    })

    it('should allow removing individual history items', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissions(UserRole.ADMIN))
      
      render(<NavigationHistory />)
      
      const recentButton = screen.getByText('Recent')
      fireEvent.click(recentButton)
      
      await waitFor(() => {
        const removeButtons = screen.getAllByTitle('Remove from history')
        fireEvent.click(removeButtons[0])
      })
      
      // One item should be removed
      const history = navigationHistory.getHistory()
      expect(history).toHaveLength(2)
    })

    it('should limit displayed items based on maxItems prop', async () => {
      // Add more history items
      for (let i = 0; i < 10; i++) {
        navigationHistory.addToHistory(`/admin/test${i}`, `Test ${i}`, true, UserRole.ADMIN)
      }
      
      mockUsePermissions.mockReturnValue(createMockPermissions(UserRole.ADMIN))
      
      render(<NavigationHistory maxItems={3} />)
      
      const recentButton = screen.getByText('Recent')
      fireEvent.click(recentButton)
      
      await waitFor(() => {
        // Should only show 3 items despite having more in history
        expect(screen.getByText('3')).toBeInTheDocument() // Count in button
      })
    })

    it('should close dropdown when clicking outside', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissions(UserRole.ADMIN))
      
      render(<NavigationHistory />)
      
      const recentButton = screen.getByText('Recent')
      fireEvent.click(recentButton)
      
      await waitFor(() => {
        expect(screen.getByText('Recent Pages')).toBeInTheDocument()
      })
      
      // Find and click the overlay div that handles outside clicks
      const overlay = document.querySelector('.fixed.inset-0.z-10')
      expect(overlay).toBeInTheDocument()
      
      fireEvent.click(overlay!)
      
      await waitFor(() => {
        expect(screen.queryByText('Recent Pages')).not.toBeInTheDocument()
      })
    })

    it('should show permission filter message', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissions(UserRole.ADMIN))
      
      render(<NavigationHistory />)
      
      const recentButton = screen.getByText('Recent')
      fireEvent.click(recentButton)
      
      await waitFor(() => {
        expect(screen.getByText('History is filtered based on your current role and permissions')).toBeInTheDocument()
      })
    })
  })

  describe('Local Storage Integration', () => {
    it('should save history to localStorage', () => {
      navigationHistory.addToHistory('/admin/products', 'Products', true, UserRole.ADMIN)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'navigation-history',
        expect.stringContaining('Products')
      )
    })

    it('should load history from localStorage', () => {
      const mockHistory = JSON.stringify([
        {
          path: '/admin/products',
          name: 'Products',
          timestamp: new Date().toISOString(),
          accessible: true,
          roleAtTime: 'ADMIN'
        }
      ])
      
      localStorageMock.getItem.mockReturnValue(mockHistory)
      
      // Create new instance to trigger loading
      const newHistory = new (PermissionAwareNavigationHistory as any)()
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('navigation-history')
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      
      // Should not throw error
      expect(() => {
        new (PermissionAwareNavigationHistory as any)()
      }).not.toThrow()
    })
  })
})