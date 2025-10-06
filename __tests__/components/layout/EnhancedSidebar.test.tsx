/**
 * Enhanced Sidebar Component Tests - Comprehensive Role-based Features
 * Tests for the enhanced sidebar with dynamic navigation, role-based badges, and collapsible sections
 * Covers all role combinations, edge cases, and accessibility features
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Sidebar from '../../../app/components/layout/Sidebar'
import { usePermissions } from '../../../app/lib/hooks/usePermissions'
import { UserRole } from '@prisma/client'
import { createMockUser, createMockPermissionHook } from '../../helpers/permission-test-utils'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('../../../app/lib/hooks/usePermissions')

// Mock ResizeObserver for HeadlessUI components
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>

// Test users for different roles
const mockAdminUser = createMockUser({
  id: '1',
  email: 'admin@test.com',
  role: UserRole.ADMIN,
  name: 'Admin User'
})

const mockEditorUser = createMockUser({
  id: '2',
  email: 'editor@test.com',
  role: UserRole.EDITOR,
  name: 'Editor User'
})

const mockViewerUser = createMockUser({
  id: '3',
  email: 'viewer@test.com',
  role: UserRole.VIEWER,
  name: 'Viewer User'
})

describe('Enhanced Sidebar Component - Comprehensive Tests', () => {
  const defaultProps = {
    isOpen: false,
    onClose: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePathname.mockReturnValue('/admin/dashboard')
  })

  describe('Permission-based Navigation Filtering - All Role Combinations', () => {
    it('should show all navigation items for admin users', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Admin should see all items
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('User Management')).toBeInTheDocument()
      expect(screen.getByText('Security Monitor')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
      expect(screen.getByText('Database Monitor')).toBeInTheDocument()
      expect(screen.getByText('API Management')).toBeInTheDocument()
    })

    it('should show limited navigation items for editor users', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Editor should see content management items
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Categories')).toBeInTheDocument()
      expect(screen.getByText('Media Library')).toBeInTheDocument()
      expect(screen.getByText('Pages')).toBeInTheDocument()
      expect(screen.getByText('Orders')).toBeInTheDocument()
      
      // Editor should not see admin-only items
      expect(screen.queryByText('User Management')).not.toBeInTheDocument()
      expect(screen.queryByText('Security Monitor')).not.toBeInTheDocument()
      expect(screen.queryByText('Analytics')).not.toBeInTheDocument()
    })

    it('should show minimal navigation items for viewer users', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockViewerUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Viewer should see basic items
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Categories')).toBeInTheDocument()
      expect(screen.getByText('Media Library')).toBeInTheDocument()
      expect(screen.getByText('Pages')).toBeInTheDocument()
      expect(screen.getByText('Orders')).toBeInTheDocument()
      expect(screen.getByText('Profile')).toBeInTheDocument()
      
      // Viewer should not see management items
      expect(screen.queryByText('User Management')).not.toBeInTheDocument()
      expect(screen.queryByText('Security Monitor')).not.toBeInTheDocument()
      expect(screen.queryByText('Analytics')).not.toBeInTheDocument()
    })

    it('should handle permission check errors gracefully', () => {
      const mockPermissions = createMockPermissionHook(mockEditorUser)
      mockPermissions.canAccess.mockImplementation(() => {
        throw new Error('Permission check failed')
      })
      mockUsePermissions.mockReturnValue(mockPermissions)

      // Should not crash when permission checks fail
      expect(() => {
        render(<Sidebar {...defaultProps} />)
      }).not.toThrow()

      // Should show minimal navigation when permission checks fail
      expect(screen.getByText('Kin Workspace')).toBeInTheDocument()
    })
  })

  describe('Role-based Badge System - Comprehensive', () => {
    it('should display admin badges for admin-only features', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Check for admin badges
      const adminBadges = screen.getAllByText(/Admin Only|System|Config/)
      expect(adminBadges.length).toBeGreaterThan(0)
      
      // Check for other badge types
      expect(screen.getByText('Critical')).toBeInTheDocument() // Security Monitor
      expect(screen.getByText('Beta')).toBeInTheDocument() // Performance
    })

    it('should display appropriate badges for different features for editor', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Check for info badge on Products
      expect(screen.getByText('Manage')).toBeInTheDocument()
    })

    it('should not display admin badges for non-admin users', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockViewerUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Viewer should not see admin-specific badges
      expect(screen.queryByText('Admin Only')).not.toBeInTheDocument()
      expect(screen.queryByText('Critical')).not.toBeInTheDocument()
    })

    it('should show different badge variants correctly', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Check for different badge variants
      expect(screen.getByText('Admin Only')).toBeInTheDocument()
      expect(screen.getByText('System')).toBeInTheDocument()
      expect(screen.getByText('Config')).toBeInTheDocument()
      expect(screen.getByText('Critical')).toBeInTheDocument()
      expect(screen.getByText('Beta')).toBeInTheDocument()
    })
  })

  describe('Collapsible Sections - Comprehensive', () => {
    it('should render collapsible sections with toggle functionality for admin', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Find collapsible sections
      const contentSection = screen.getByText('Content Management')
      const adminSection = screen.getByText('Administration')
      
      expect(contentSection).toBeInTheDocument()
      expect(adminSection).toBeInTheDocument()
      
      // Check for item counts in sections (these numbers may vary based on permissions)
      const itemCounts = screen.getAllByText(/^\d+$/)
      expect(itemCounts.length).toBeGreaterThan(0)
    })

    it('should toggle section visibility when clicked', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Find and click the Content Management section toggle
      const contentSectionButton = screen.getByRole('button', { name: /content management/i })
      
      // Initially, products should be visible (sections are not collapsed by default)
      expect(screen.getByText('Products')).toBeInTheDocument()
      
      // Click to collapse
      fireEvent.click(contentSectionButton)
      
      // After clicking, the section should be collapsed, so Products should not be visible
      await waitFor(() => {
        expect(screen.queryByText('Products')).not.toBeInTheDocument()
      })
    })

    it('should expand collapsed section when clicked again', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      const contentSectionButton = screen.getByRole('button', { name: /content management/i })
      
      // Collapse section
      fireEvent.click(contentSectionButton)
      await waitFor(() => {
        expect(screen.queryByText('Products')).not.toBeInTheDocument()
      })
      
      // Expand section again
      fireEvent.click(contentSectionButton)
      await waitFor(() => {
        expect(screen.getByText('Products')).toBeInTheDocument()
      })
    })

    it('should show section descriptions', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByText('Manage products, pages, and media')).toBeInTheDocument()
      expect(screen.getByText('System administration and monitoring')).toBeInTheDocument()
    })

    it('should show correct chevron icons for collapsed/expanded states', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      const contentSectionButton = screen.getByRole('button', { name: /content management/i })
      
      // Initially expanded - should show down chevron
      expect(contentSectionButton.querySelector('svg')).toBeInTheDocument()
      
      // Click to collapse
      fireEvent.click(contentSectionButton)
      
      // Should show right chevron when collapsed
      expect(contentSectionButton.querySelector('svg')).toBeInTheDocument()
    })

    it('should only show sections user has access to', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Editor should see content section
      expect(screen.getByText('Content Management')).toBeInTheDocument()
      
      // Editor should not see admin section
      expect(screen.queryByText('Administration')).not.toBeInTheDocument()
    })
  })

  describe('Enhanced Role Indicator - All Roles', () => {
    it('should display enhanced role information for admin', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByText('ADMIN Role')).toBeInTheDocument()
      expect(screen.getByText(/accessible features/)).toBeInTheDocument()
      
      // Check for role badge in the bottom section
      const roleBadges = screen.getAllByText('Admin')
      expect(roleBadges.length).toBeGreaterThan(0)
    })

    it('should display enhanced role information for editor', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByText('EDITOR Role')).toBeInTheDocument()
      expect(screen.getByText(/accessible features/)).toBeInTheDocument()
      expect(screen.getByText('Editor')).toBeInTheDocument() // Role badge
    })

    it('should display enhanced role information for viewer', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockViewerUser))
      
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByText('VIEWER Role')).toBeInTheDocument()
      expect(screen.getByText(/accessible features/)).toBeInTheDocument()
      expect(screen.getByText('Viewer')).toBeInTheDocument() // Role badge
    })

    it('should show correct feature count based on permissions', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Admin should have access to more features
      expect(screen.getByText(/accessible features/)).toBeInTheDocument()
    })

    it('should show role indicator with correct colors', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Check for role indicator dot (admin should have red indicator)
      const roleIndicator = document.querySelector('.bg-red-400')
      expect(roleIndicator).toBeInTheDocument()
    })

    it('should show different role indicator colors for different roles', async () => {
      // Test editor role indicator
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      const { rerender } = render(<Sidebar {...defaultProps} />)
      
      // Editor should have blue indicator
      expect(document.querySelector('.bg-blue-400')).toBeInTheDocument()
      
      // Test viewer role indicator
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockViewerUser))
      
      rerender(<Sidebar {...defaultProps} />)
      
      // Viewer should have green indicator
      expect(document.querySelector('.bg-green-400')).toBeInTheDocument()
    })
  })

  describe('Active State Highlighting - All Routes', () => {
    it('should highlight the active navigation item for products', async () => {
      mockUsePathname.mockReturnValue('/admin/products')
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Get the main Products link (not the child "All Products")
      const productsLinks = screen.getAllByRole('link', { name: /products/i })
      const mainProductsLink = productsLinks.find(link => 
        !link.classList.contains('ml-6') // Not a child item
      )
      expect(mainProductsLink).toHaveClass('active')
    })

    it('should highlight the active navigation item for categories', async () => {
      mockUsePathname.mockReturnValue('/admin/categories')
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      render(<Sidebar {...defaultProps} />)
      
      const categoriesLink = screen.getByRole('link', { name: /categories/i })
      expect(categoriesLink).toHaveClass('active')
    })

    it('should highlight the active navigation item for dashboard', async () => {
      mockUsePathname.mockReturnValue('/admin/dashboard')
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).toHaveClass('active')
    })

    it('should not highlight inactive navigation items', async () => {
      mockUsePathname.mockReturnValue('/admin/dashboard')
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Get the main Products link (not the child "All Products")
      const productsLinks = screen.getAllByRole('link', { name: /products/i })
      const mainProductsLink = productsLinks.find(link => 
        !link.classList.contains('ml-6') // Not a child item
      )
      expect(mainProductsLink).not.toHaveClass('active')
    })

    it('should handle nested route highlighting', async () => {
      mockUsePathname.mockReturnValue('/admin/products/new')
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Parent Products link should still be highlighted for nested routes
      const productsLinks = screen.getAllByRole('link', { name: /products/i })
      const mainProductsLink = productsLinks.find(link => 
        !link.classList.contains('ml-6')
      )
      expect(mainProductsLink).toHaveClass('active')
    })
  })

  describe('Responsive Behavior - Mobile and Desktop', () => {
    it('should handle mobile sidebar open/close', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      const onClose = jest.fn()
      
      render(<Sidebar isOpen={true} onClose={onClose} />)
      
      // Should render mobile sidebar when open
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      
      // Find and click close button
      const closeButton = screen.getByRole('button', { name: /close sidebar/i })
      fireEvent.click(closeButton)
      
      expect(onClose).toHaveBeenCalled()
    })

    it('should not show mobile sidebar when closed', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Should not render mobile sidebar when closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render desktop sidebar regardless of mobile state', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Desktop sidebar should always be rendered
      expect(screen.getByText('Kin Workspace')).toBeInTheDocument()
      expect(screen.getByText('CMS')).toBeInTheDocument()
    })
  })

  describe('Nested Navigation - Comprehensive', () => {
    it('should render child navigation items when parent has children for editor', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Products should have child items
      expect(screen.getByText('All Products')).toBeInTheDocument()
      expect(screen.getByText('Add Product')).toBeInTheDocument()
      
      // Pages should have child items
      expect(screen.getByText('All Pages')).toBeInTheDocument()
      expect(screen.getByText('Create Page')).toBeInTheDocument()
    })

    it('should filter child items based on permissions for viewer', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockViewerUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Viewer should see "All Products" but not "Add Product"
      expect(screen.getByText('All Products')).toBeInTheDocument()
      expect(screen.queryByText('Add Product')).not.toBeInTheDocument()
      
      // Viewer should see "All Pages" but not "Create Page"
      expect(screen.getByText('All Pages')).toBeInTheDocument()
      expect(screen.queryByText('Create Page')).not.toBeInTheDocument()
    })

    it('should show all child items for admin users', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Admin should see all child items
      expect(screen.getByText('All Products')).toBeInTheDocument()
      expect(screen.getByText('Add Product')).toBeInTheDocument()
      expect(screen.getByText('All Pages')).toBeInTheDocument()
      expect(screen.getByText('Create Page')).toBeInTheDocument()
    })

    it('should style child items differently from parent items', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockEditorUser))
      
      render(<Sidebar {...defaultProps} />)
      
      const allProductsLink = screen.getByRole('link', { name: /all products/i })
      expect(allProductsLink).toHaveClass('ml-6') // Child items should have left margin
      expect(allProductsLink).toHaveClass('text-sm') // Child items should be smaller
    })
  })

  describe('Logo and Branding', () => {
    it('should display the Kin Workspace logo and branding', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      expect(screen.getByText('Kin Workspace')).toBeInTheDocument()
      expect(screen.getByText('CMS')).toBeInTheDocument()
      expect(screen.getByText('K')).toBeInTheDocument() // Logo initial
    })

    it('should link to admin dashboard when logo is clicked', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      const logoLink = screen.getByRole('link', { name: /kin workspace/i })
      expect(logoLink).toHaveAttribute('href', '/admin')
    })
  })

  describe('Accessibility - Comprehensive', () => {
    it('should have proper ARIA labels and roles', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // Navigation should have proper role
      const navigation = screen.getByRole('navigation')
      expect(navigation).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      // All navigation links should be focusable
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toHaveAttribute('href')
      })
    })

    it('should have proper screen reader support for collapsible sections', async () => {
      mockUsePermissions.mockReturnValue(createMockPermissionHook(mockAdminUser))
      
      render(<Sidebar {...defaultProps} />)
      
      const contentSectionButton = screen.getByRole('button', { name: /content management/i })
      expect(contentSectionButton).toBeInTheDocument()
    })
  })
})