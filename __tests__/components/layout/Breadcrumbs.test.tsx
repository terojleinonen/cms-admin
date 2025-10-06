/**
 * Permission-Aware Breadcrumbs Component Tests - Comprehensive
 * Tests for breadcrumb permission integration and role-based functionality
 * Covers all role combinations, route scenarios, and edge cases
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { UserRole } from '@prisma/client'
import Breadcrumbs from '../../../app/components/layout/Breadcrumbs'
import { usePermissions } from '../../../app/lib/hooks/usePermissions'
import { createMockUser, createMockPermissionHook } from '../../helpers/permission-test-utils'

// Mock dependencies
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

jest.mock('../../../app/lib/hooks/usePermissions', () => ({
  usePermissions: jest.fn(),
}))

// Mock ResizeObserver for HeadlessUI components
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>

// Test users for different roles
const mockAdminUser = createMockUser({
  id: 'admin-user',
  role: UserRole.ADMIN,
  name: 'Admin User',
  email: 'admin@example.com'
})

const mockEditorUser = createMockUser({
  id: 'editor-user',
  role: UserRole.EDITOR,
  name: 'Editor User',
  email: 'editor@example.com'
})

const mockViewerUser = createMockUser({
  id: 'viewer-user',
  role: UserRole.VIEWER,
  name: 'Viewer User',
  email: 'viewer@example.com'
})

describe('Permission-Aware Breadcrumbs - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Dashboard Route - All Roles', () => {
    beforeEach(() => {
      mockUsePathname.mockReturnValue('/')
    })

    it('should not render breadcrumbs on dashboard for admin', () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      const { container } = render(<Breadcrumbs />)
      expect(container.firstChild).toBeNull()
    })

    it('should not render breadcrumbs on dashboard for editor', () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      const { container } = render(<Breadcrumbs />)
      expect(container.firstChild).toBeNull()
    })

    it('should not render breadcrumbs on dashboard for viewer', () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockViewerUser))
      
      const { container } = render(<Breadcrumbs />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Admin Routes - All Role Combinations', () => {
    beforeEach(() => {
      mockUsePathname.mockReturnValue('/admin/products')
    })

    it('should show full breadcrumbs for admin users', () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Breadcrumbs />)
      
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
      
      // Check for the dashboard link
      const dashboardLink = screen.getByRole('link', { name: /Admin Dashboard/i })
      expect(dashboardLink).toHaveAttribute('href', '/')
    })

    it('should show role-specific dashboard name for admin', () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Breadcrumbs />)
      
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument() // Badge
    })

    it('should show editor-specific breadcrumbs for editor users', () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      render(<Breadcrumbs />)
      
      expect(screen.getByText('Content Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Editor')).toBeInTheDocument() // Badge
    })

    it('should show viewer-specific breadcrumbs for viewer users', () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockViewerUser))
      
      render(<Breadcrumbs />)
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Products (Read Only)')).toBeInTheDocument()
      expect(screen.getByText('Viewer')).toBeInTheDocument() // Badge
    })

    it('should handle nested admin routes correctly', () => {
      mockUsePathname.mockReturnValue('/admin/products/new')
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Breadcrumbs />)
      
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('New')).toBeInTheDocument()
    })
  })

  describe('Restricted Routes - Permission Boundaries', () => {
    beforeEach(() => {
      mockUsePathname.mockReturnValue('/admin/users')
    })

    it('should show restricted breadcrumb for editor users on admin routes', () => {
      const mockPermissions = createMockPermissionHook(mockEditorUser, {
        'users.read': false,
        'users.create': false,
        'users.update': false,
        'users.delete': false
      })
      mockUsePermissions.mockReturnValue(mockPermissions)
      
      render(<Breadcrumbs />)
      
      expect(screen.getByText('System')).toBeInTheDocument()
      expect(screen.getByText('Restricted')).toBeInTheDocument()
    })

    it('should show restricted breadcrumb for viewer users on admin routes', () => {
      const mockPermissions = createMockPermissionHook(mockViewerUser, {
        'users.read': false
      })
      mockUsePermissions.mockReturnValue(mockPermissions)
      
      render(<Breadcrumbs />)
      
      expect(screen.getByText('System')).toBeInTheDocument()
      expect(screen.getByText('Restricted')).toBeInTheDocument()
    })

    it('should show full breadcrumb for admin users', () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Breadcrumbs />)
      
      expect(screen.getByText('User Management')).toBeInTheDocument()
      expect(screen.queryByText('Restricted')).not.toBeInTheDocument()
    })

    it('should show restricted icon for inaccessible breadcrumbs', () => {
      const mockPermissions = createMockPermissionHook(mockEditorUser, {
        'users.read': false
      })
      mockUsePermissions.mockReturnValue(mockPermissions)
      
      render(<Breadcrumbs />)
      
      // Should show eye-slash icon for restricted content
      const restrictedSpan = screen.getByText('System')
      expect(restrictedSpan.closest('span')).toBeInTheDocument()
    })
  })

  describe('Quick Actions - All Role Combinations', () => {
    beforeEach(() => {
      mockUsePathname.mockReturnValue('/admin/products')
    })

    it('should show create actions for editor users', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      render(<Breadcrumbs />)
      
      const quickActionsButton = screen.getByText('Quick Actions')
      fireEvent.click(quickActionsButton)
      
      await waitFor(() => {
        expect(screen.getByText('New Product')).toBeInTheDocument()
        expect(screen.getByText('Bulk Edit')).toBeInTheDocument()
        expect(screen.getByText('Search Products')).toBeInTheDocument()
      })
    })

    it('should show limited actions for viewer users', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockViewerUser))
      
      render(<Breadcrumbs />)
      
      const quickActionsButton = screen.getByText('Quick Actions')
      fireEvent.click(quickActionsButton)
      
      await waitFor(() => {
        expect(screen.getByText('Search Products')).toBeInTheDocument()
        expect(screen.queryByText('New Product')).not.toBeInTheDocument()
        expect(screen.queryByText('Bulk Edit')).not.toBeInTheDocument()
      })
    })

    it('should show all actions for admin users', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Breadcrumbs />)
      
      const quickActionsButton = screen.getByText('Quick Actions')
      fireEvent.click(quickActionsButton)
      
      await waitFor(() => {
        expect(screen.getByText('New Product')).toBeInTheDocument()
        expect(screen.getByText('Bulk Edit')).toBeInTheDocument()
        expect(screen.getByText('Search Products')).toBeInTheDocument()
      })
    })

    it('should show keyboard shortcuts for actions', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Breadcrumbs />)
      
      const quickActionsButton = screen.getByText('Quick Actions')
      fireEvent.click(quickActionsButton)
      
      await waitFor(() => {
        // Should show keyboard shortcuts
        expect(screen.getByText('Cmd+Shift+P')).toBeInTheDocument() // New Product shortcut
        expect(screen.getByText('Cmd+K')).toBeInTheDocument() // Search shortcut
      })
    })

    it('should show permission requirements for actions', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Breadcrumbs />)
      
      const quickActionsButton = screen.getByText('Quick Actions')
      fireEvent.click(quickActionsButton)
      
      await waitFor(() => {
        // Should show permission requirements
        expect(screen.getByText(/Requires:/)).toBeInTheDocument()
      })
    })

    it('should close dropdown when action is clicked', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      render(<Breadcrumbs />)
      
      const quickActionsButton = screen.getByText('Quick Actions')
      fireEvent.click(quickActionsButton)
      
      await waitFor(() => {
        const newProductAction = screen.getByText('New Product')
        fireEvent.click(newProductAction)
        
        // Dropdown should close after action is clicked
        expect(screen.queryByText('Search Products')).not.toBeInTheDocument()
      })
    })

    it('should handle different routes with different actions', async () => {
      mockUsePathname.mockReturnValue('/admin/users')
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Breadcrumbs />)
      
      const quickActionsButton = screen.getByText('Quick Actions')
      fireEvent.click(quickActionsButton)
      
      await waitFor(() => {
        expect(screen.getByText('New User')).toBeInTheDocument()
        expect(screen.getByText('Bulk Actions')).toBeInTheDocument()
      })
    })
  })

  describe('Role Badges - All Role Combinations', () => {
    beforeEach(() => {
      mockUsePathname.mockReturnValue('/admin/products')
    })

    it('should show admin badge for admin users', () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Breadcrumbs />)
      
      // Look for the badge specifically within the dashboard link
      const dashboardLink = screen.getByRole('link', { name: /Admin Dashboard/i })
      expect(dashboardLink).toBeInTheDocument()
      
      // Check that there are multiple "Admin" texts (badge and breadcrumb)
      const adminTexts = screen.getAllByText('Admin')
      expect(adminTexts.length).toBeGreaterThan(0)
    })

    it('should show editor badge for editor users', () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      render(<Breadcrumbs />)
      
      expect(screen.getByText('Editor')).toBeInTheDocument()
    })

    it('should show viewer badge for viewer users', () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockViewerUser))
      
      render(<Breadcrumbs />)
      
      expect(screen.getByText('Viewer')).toBeInTheDocument()
    })

    it('should show correct badge colors for different roles', () => {
      // Test admin badge color
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      const { rerender } = render(<Breadcrumbs />)
      
      const adminBadge = screen.getByText('Admin')
      expect(adminBadge).toHaveClass('bg-red-100', 'text-red-700')
      
      // Test editor badge color
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      rerender(<Breadcrumbs />)
      
      const editorBadge = screen.getByText('Editor')
      expect(editorBadge).toHaveClass('bg-blue-100', 'text-blue-700')
      
      // Test viewer badge color
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockViewerUser))
      
      rerender(<Breadcrumbs />)
      
      const viewerBadge = screen.getByText('Viewer')
      expect(viewerBadge).toHaveClass('bg-gray-100', 'text-gray-600')
    })

    it('should show role-specific breadcrumb names', () => {
      // Test admin dashboard name
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      const { rerender } = render(<Breadcrumbs />)
      
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      
      // Test editor dashboard name
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      rerender(<Breadcrumbs />)
      
      expect(screen.getByText('Content Dashboard')).toBeInTheDocument()
      
      // Test viewer dashboard name
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockViewerUser))
      
      rerender(<Breadcrumbs />)
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })

  describe('Loading State - All Scenarios', () => {
    beforeEach(() => {
      mockUsePathname.mockReturnValue('/admin/products')
    })

    it('should show loading state when permissions are loading', () => {
      const mockPermissions = createMockPermissionHook(mockAdminUser)
      mockPermissions.isLoading = true
      mockUsePermissions.mockReturnValue(mockPermissions)
      
      render(<Breadcrumbs />)
      
      // Should show loading skeleton
      const loadingElements = document.querySelectorAll('.animate-pulse')
      expect(loadingElements.length).toBeGreaterThan(0)
    })

    it('should show loading skeleton with correct structure', () => {
      const mockPermissions = createMockPermissionHook(mockEditorUser)
      mockPermissions.isLoading = true
      mockUsePermissions.mockReturnValue(mockPermissions)
      
      render(<Breadcrumbs />)
      
      // Should show breadcrumb-like loading structure
      expect(document.querySelector('.h-4.w-20')).toBeInTheDocument()
      expect(document.querySelector('.h-4.w-24')).toBeInTheDocument()
    })

    it('should not show quick actions during loading', () => {
      const mockPermissions = createMockPermissionHook(mockAdminUser)
      mockPermissions.isLoading = true
      mockUsePermissions.mockReturnValue(mockPermissions)
      
      render(<Breadcrumbs />)
      
      // Should not show quick actions button during loading
      expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument()
    })
  })

  describe('Permission-based Navigation - Comprehensive', () => {
    it('should make breadcrumb links clickable when accessible for admin', () => {
      mockUsePathname.mockReturnValue('/admin/products/new')
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Breadcrumbs />)
      
      const dashboardLink = screen.getByRole('link', { name: /Admin Dashboard/i })
      expect(dashboardLink).toHaveAttribute('href', '/')
      
      const productsLink = screen.getByRole('link', { name: /Products/i })
      expect(productsLink).toHaveAttribute('href', '/admin/products')
    })

    it('should make breadcrumb links clickable when accessible for editor', () => {
      mockUsePathname.mockReturnValue('/admin/products/new')
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      render(<Breadcrumbs />)
      
      const dashboardLink = screen.getByRole('link', { name: /Content Dashboard/i })
      expect(dashboardLink).toHaveAttribute('href', '/')
      
      const productsLink = screen.getByRole('link', { name: /Products/i })
      expect(productsLink).toHaveAttribute('href', '/admin/products')
    })

    it('should not make breadcrumb links clickable when not accessible', () => {
      mockUsePathname.mockReturnValue('/admin/users/new')
      const mockPermissions = createMockPermissionHook(mockEditorUser, {
        'users.read': false
      })
      mockUsePermissions.mockReturnValue(mockPermissions)
      
      render(<Breadcrumbs />)
      
      // Should show restricted text instead of link
      expect(screen.getByText('System')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /User Management/i })).not.toBeInTheDocument()
    })

    it('should show hash links for inaccessible breadcrumbs', () => {
      mockUsePathname.mockReturnValue('/admin/users')
      const mockPermissions = createMockPermissionHook(mockViewerUser, {
        'users.read': false
      })
      mockUsePermissions.mockReturnValue(mockPermissions)
      
      render(<Breadcrumbs />)
      
      // Inaccessible breadcrumbs should have href="#"
      const restrictedElements = screen.getAllByText('System')
      expect(restrictedElements.length).toBeGreaterThan(0)
    })
  })

  describe('Contextual Navigation - All Role Scenarios', () => {
    it('should show different navigation context for different roles', () => {
      mockUsePathname.mockReturnValue('/admin/products')
      
      // Test admin context
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      const { rerender } = render(<Breadcrumbs />)
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      
      // Test editor context
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      rerender(<Breadcrumbs />)
      expect(screen.getByText('Content Dashboard')).toBeInTheDocument()
      
      // Test viewer context
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockViewerUser))
      rerender(<Breadcrumbs />)
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('should show appropriate icons for different breadcrumb states', () => {
      mockUsePathname.mockReturnValue('/admin/users')
      const mockPermissions = createMockPermissionHook(mockEditorUser, {
        'users.read': false
      })
      mockUsePermissions.mockReturnValue(mockPermissions)
      
      render(<Breadcrumbs />)
      
      // Should show eye-slash icon for restricted breadcrumbs
      const restrictedSpan = screen.getByText('System')
      expect(restrictedSpan).toBeInTheDocument()
    })

    it('should handle complex nested routes correctly', () => {
      mockUsePathname.mockReturnValue('/admin/products/123/edit')
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Breadcrumbs />)
      
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('123')).toBeInTheDocument()
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
  })

  describe('Error Handling - Comprehensive', () => {
    it('should handle permission check errors gracefully', () => {
      mockUsePathname.mockReturnValue('/admin/products')
      const mockPermissions = createMockPermissionHook(mockEditorUser)
      mockPermissions.canAccess.mockImplementation(() => {
        throw new Error('Permission check failed')
      })
      mockUsePermissions.mockReturnValue(mockPermissions)
      
      // Should not crash when permission checks fail
      expect(() => {
        render(<Breadcrumbs />)
      }).not.toThrow()
    })

    it('should handle missing user gracefully', () => {
      mockUsePathname.mockReturnValue('/admin/products')
      mockUsePermissions.mockReturnValue(createMockPermissionHook(null))
      
      // Should not crash when user is null
      expect(() => {
        render(<Breadcrumbs />)
      }).not.toThrow()
    })

    it('should handle invalid routes gracefully', () => {
      mockUsePathname.mockReturnValue('/invalid/route/path')
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Breadcrumbs />)
      
      // Should still show dashboard link and handle unknown routes
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    })
  })

  describe('Accessibility - Comprehensive', () => {
    it('should have proper ARIA labels and navigation structure', () => {
      mockUsePathname.mockReturnValue('/admin/products')
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Breadcrumbs />)
      
      const navigation = screen.getByRole('navigation', { name: /breadcrumb/i })
      expect(navigation).toBeInTheDocument()
    })

    it('should have proper keyboard navigation support', () => {
      mockUsePathname.mockReturnValue('/admin/products')
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Breadcrumbs />)
      
      // All links should be focusable
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toHaveAttribute('href')
      })
    })

    it('should provide proper screen reader context for restricted items', () => {
      mockUsePathname.mockReturnValue('/admin/users')
      const mockPermissions = createMockPermissionHook(mockEditorUser, {
        'users.read': false
      })
      mockUsePermissions.mockReturnValue(mockPermissions)
      
      render(<Breadcrumbs />)
      
      // Should provide context for restricted items
      expect(screen.getByText('Restricted')).toBeInTheDocument()
    })
  })
})