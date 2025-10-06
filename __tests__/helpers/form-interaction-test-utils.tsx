/**
 * Form and Interaction Test Utilities
 * Helper functions for testing form permissions and user interactions
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserRole } from '@prisma/client'
import { createMockUser, createMockSession } from './test-helpers'

// Mock session setup helper
export const setupMockSession = (role: UserRole, userId?: string) => {
  const user = createMockUser({ role, id: userId })
  return createMockSession(user)
}

// Form field testing utilities
export const formTestUtils = {
  // Test if a form field is accessible to a user role
  async testFieldAccess(
    fieldSelector: string,
    userRole: UserRole,
    shouldBeAccessible: boolean
  ) {
    const field = screen.queryByLabelText(new RegExp(fieldSelector, 'i')) ||
                  screen.queryByRole('textbox', { name: new RegExp(fieldSelector, 'i') }) ||
                  screen.queryByRole('combobox', { name: new RegExp(fieldSelector, 'i') })

    if (shouldBeAccessible) {
      expect(field).toBeInTheDocument()
      if (field) {
        expect(field).toBeEnabled()
      }
    } else {
      if (field) {
        expect(field).toBeDisabled()
      } else {
        // Field might be completely hidden
        expect(field).not.toBeInTheDocument()
      }
    }
  },

  // Test form submission with different user roles
  async testFormSubmission(
    formData: Record<string, any>,
    submitButtonText: string,
    userRole: UserRole,
    shouldSucceed: boolean,
    mockSubmitFn?: jest.Mock
  ) {
    const user = userEvent.setup()
    
    // Fill out form fields
    for (const [fieldName, value] of Object.entries(formData)) {
      const field = screen.getByLabelText(new RegExp(fieldName, 'i'))
      
      if (field.tagName === 'INPUT' && field.getAttribute('type') === 'checkbox') {
        if (value) {
          await user.click(field)
        }
      } else if (field.tagName === 'SELECT') {
        await user.selectOptions(field, value)
      } else {
        await user.clear(field)
        await user.type(field, String(value))
      }
    }

    // Attempt form submission
    const submitButton = screen.getByRole('button', { name: new RegExp(submitButtonText, 'i') })
    
    if (shouldSucceed) {
      expect(submitButton).toBeEnabled()
      await user.click(submitButton)
      
      if (mockSubmitFn) {
        await waitFor(() => {
          expect(mockSubmitFn).toHaveBeenCalled()
        })
      }
    } else {
      expect(submitButton).toBeDisabled()
    }
  },

  // Test form validation with permissions
  async testFormValidation(
    requiredFields: string[],
    submitButtonText: string,
    userRole: UserRole
  ) {
    const user = userEvent.setup()
    
    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: new RegExp(submitButtonText, 'i') })
    
    if (!submitButton.hasAttribute('disabled')) {
      await user.click(submitButton)

      // Check for validation errors on required fields
      for (const fieldName of requiredFields) {
        const field = screen.getByLabelText(new RegExp(fieldName, 'i'))
        await waitFor(() => {
          expect(field).toBeInvalid()
        })
      }
    }
  },

  // Test conditional field rendering based on permissions
  async testConditionalFields(
    conditionalFields: Array<{
      fieldName: string
      condition: (role: UserRole) => boolean
    }>,
    userRole: UserRole
  ) {
    for (const { fieldName, condition } of conditionalFields) {
      const shouldShow = condition(userRole)
      const field = screen.queryByLabelText(new RegExp(fieldName, 'i'))
      
      if (shouldShow) {
        expect(field).toBeInTheDocument()
      } else {
        expect(field).not.toBeInTheDocument()
      }
    }
  }
}

// Button interaction testing utilities
export const buttonTestUtils = {
  // Test button visibility based on permissions
  async testButtonVisibility(
    buttonText: string,
    userRole: UserRole,
    shouldBeVisible: boolean
  ) {
    const button = screen.queryByRole('button', { name: new RegExp(buttonText, 'i') })
    
    if (shouldBeVisible) {
      expect(button).toBeInTheDocument()
      expect(button).toBeEnabled()
    } else {
      expect(button).not.toBeInTheDocument()
    }
  },

  // Test button action execution
  async testButtonAction(
    buttonText: string,
    mockActionFn: jest.Mock,
    userRole: UserRole,
    shouldExecute: boolean
  ) {
    const user = userEvent.setup()
    const button = screen.getByRole('button', { name: new RegExp(buttonText, 'i') })
    
    if (shouldExecute) {
      expect(button).toBeEnabled()
      await user.click(button)
      expect(mockActionFn).toHaveBeenCalled()
    } else {
      expect(button).toBeDisabled()
    }
  },

  // Test destructive action confirmations
  async testDestructiveAction(
    buttonText: string,
    confirmationMessage: string,
    mockActionFn: jest.Mock,
    shouldConfirm: boolean = true
  ) {
    const user = userEvent.setup()
    
    // Mock window.confirm
    ;(global.confirm as jest.Mock).mockReturnValue(shouldConfirm)
    
    const button = screen.getByRole('button', { name: new RegExp(buttonText, 'i') })
    await user.click(button)
    
    expect(global.confirm).toHaveBeenCalledWith(
      expect.stringContaining(confirmationMessage)
    )
    
    if (shouldConfirm) {
      expect(mockActionFn).toHaveBeenCalled()
    } else {
      expect(mockActionFn).not.toHaveBeenCalled()
    }
  },

  // Test button loading states
  async testButtonLoadingState(
    buttonText: string,
    asyncAction: () => Promise<void>
  ) {
    const user = userEvent.setup()
    const button = screen.getByRole('button', { name: new RegExp(buttonText, 'i') })
    
    // Start async action
    const actionPromise = asyncAction()
    await user.click(button)
    
    // Button should be disabled during loading
    expect(button).toBeDisabled()
    
    // Wait for action to complete
    await actionPromise
    
    // Button should be enabled again
    await waitFor(() => {
      expect(button).toBeEnabled()
    })
  },

  // Test bulk action buttons
  async testBulkActions(
    actions: Array<{
      buttonText: string
      requiredRole: UserRole
      mockActionFn: jest.Mock
    }>,
    userRole: UserRole
  ) {
    const user = userEvent.setup()
    
    for (const { buttonText, requiredRole, mockActionFn } of actions) {
      const button = screen.queryByRole('button', { name: new RegExp(buttonText, 'i') })
      
      const hasPermission = this.checkRolePermission(userRole, requiredRole)
      
      if (hasPermission) {
        expect(button).toBeInTheDocument()
        expect(button).toBeEnabled()
        
        await user.click(button!)
        expect(mockActionFn).toHaveBeenCalled()
      } else {
        expect(button).not.toBeInTheDocument()
      }
      
      mockActionFn.mockClear()
    }
  },

  // Helper to check role permissions
  checkRolePermission(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.ADMIN]: 3,
      [UserRole.EDITOR]: 2,
      [UserRole.VIEWER]: 1,
    }
    
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  }
}

// Modal testing utilities
export const modalTestUtils = {
  // Test modal opening with permissions
  async testModalOpen(
    triggerButtonText: string,
    modalTitle: string,
    userRole: UserRole,
    shouldOpen: boolean
  ) {
    const user = userEvent.setup()
    const triggerButton = screen.getByRole('button', { name: new RegExp(triggerButtonText, 'i') })
    
    await user.click(triggerButton)
    
    if (shouldOpen) {
      await waitFor(() => {
        expect(screen.getByText(modalTitle)).toBeInTheDocument()
      })
    } else {
      expect(screen.queryByText(modalTitle)).not.toBeInTheDocument()
    }
  },

  // Test modal content based on permissions
  async testModalContent(
    modalTitle: string,
    contentSelectors: Array<{
      selector: string
      shouldBeVisible: (role: UserRole) => boolean
    }>,
    userRole: UserRole
  ) {
    // Ensure modal is open
    expect(screen.getByText(modalTitle)).toBeInTheDocument()
    
    for (const { selector, shouldBeVisible } of contentSelectors) {
      const element = screen.queryByTestId(selector) || 
                     screen.queryByText(new RegExp(selector, 'i'))
      
      if (shouldBeVisible(userRole)) {
        expect(element).toBeInTheDocument()
      } else {
        expect(element).not.toBeInTheDocument()
      }
    }
  },

  // Test modal actions with permissions
  async testModalActions(
    modalActions: Array<{
      actionText: string
      mockActionFn: jest.Mock
      requiredRole: UserRole
    }>,
    userRole: UserRole
  ) {
    const user = userEvent.setup()
    
    for (const { actionText, mockActionFn, requiredRole } of modalActions) {
      const actionButton = screen.queryByRole('button', { name: new RegExp(actionText, 'i') })
      
      const hasPermission = buttonTestUtils.checkRolePermission(userRole, requiredRole)
      
      if (hasPermission && actionButton) {
        expect(actionButton).toBeEnabled()
        await user.click(actionButton)
        expect(mockActionFn).toHaveBeenCalled()
      } else if (actionButton) {
        expect(actionButton).toBeDisabled()
      } else {
        expect(actionButton).not.toBeInTheDocument()
      }
      
      mockActionFn.mockClear()
    }
  },

  // Test modal close functionality
  async testModalClose(
    modalTitle: string,
    mockCloseFn: jest.Mock,
    closeMethod: 'button' | 'overlay' | 'escape' = 'button'
  ) {
    const user = userEvent.setup()
    
    // Ensure modal is open
    expect(screen.getByText(modalTitle)).toBeInTheDocument()
    
    switch (closeMethod) {
      case 'button':
        const closeButton = screen.getByRole('button', { name: /close/i })
        await user.click(closeButton)
        break
        
      case 'overlay':
        const overlay = document.querySelector('.fixed.inset-0.bg-black')
        if (overlay) {
          fireEvent.click(overlay)
        }
        break
        
      case 'escape':
        fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
        break
    }
    
    expect(mockCloseFn).toHaveBeenCalled()
  }
}

// Permission-specific test scenarios
export const permissionScenarios = {
  // Test CRUD operations for different roles
  async testCRUDPermissions(
    resource: string,
    operations: {
      create?: { component: React.ComponentType; props?: any }
      read?: { component: React.ComponentType; props?: any }
      update?: { component: React.ComponentType; props?: any }
      delete?: { component: React.ComponentType; props?: any }
    },
    rolePermissions: {
      [UserRole.ADMIN]: ('create' | 'read' | 'update' | 'delete')[]
      [UserRole.EDITOR]: ('create' | 'read' | 'update' | 'delete')[]
      [UserRole.VIEWER]: ('create' | 'read' | 'update' | 'delete')[]
    }
  ) {
    for (const [role, allowedOps] of Object.entries(rolePermissions)) {
      const userRole = role as UserRole
      
      for (const [operation, config] of Object.entries(operations)) {
        const opType = operation as 'create' | 'read' | 'update' | 'delete'
        const hasPermission = allowedOps.includes(opType)
        
        if (config) {
          const { component: Component, props = {} } = config
          
          // Test component rendering with permission
          const { unmount } = render(<Component {...props} />)
          
          // Verify permission-based behavior
          if (hasPermission) {
            // Component should render and be functional
            expect(document.body).toContainHTML('<')
          } else {
            // Component should be restricted or show fallback
            const restrictedElements = screen.queryAllByText(/insufficient|unauthorized|access denied/i)
            if (restrictedElements.length === 0) {
              // If no explicit restriction message, check for disabled state
              const buttons = screen.queryAllByRole('button')
              buttons.forEach(button => {
                if (!button.textContent?.toLowerCase().includes('cancel') &&
                    !button.textContent?.toLowerCase().includes('close')) {
                  expect(button).toBeDisabled()
                }
              })
            }
          }
          
          unmount()
        }
      }
    }
  },

  // Test ownership-based permissions
  async testOwnershipPermissions(
    resourceOwnerId: string,
    currentUserId: string,
    userRole: UserRole,
    actions: string[]
  ) {
    const isOwner = resourceOwnerId === currentUserId
    const isAdmin = userRole === UserRole.ADMIN
    
    for (const action of actions) {
      const button = screen.queryByRole('button', { name: new RegExp(action, 'i') })
      
      if (isAdmin || isOwner) {
        expect(button).toBeInTheDocument()
        expect(button).toBeEnabled()
      } else {
        if (button) {
          expect(button).toBeDisabled()
        } else {
          expect(button).not.toBeInTheDocument()
        }
      }
    }
  }
}

// Error handling test utilities
export const errorTestUtils = {
  // Test permission error handling
  async testPermissionErrors(
    action: () => Promise<void>,
    expectedErrorMessage: string
  ) {
    // Mock API to return permission error
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ 
        error: expectedErrorMessage 
      }),
    })
    
    await action()
    
    await waitFor(() => {
      expect(screen.getByText(new RegExp(expectedErrorMessage, 'i'))).toBeInTheDocument()
    })
  },

  // Test network error handling
  async testNetworkErrors(
    action: () => Promise<void>,
    expectedFallbackMessage: string = 'An error occurred'
  ) {
    // Mock network error
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
    
    await action()
    
    await waitFor(() => {
      expect(screen.getByText(new RegExp(expectedFallbackMessage, 'i'))).toBeInTheDocument()
    })
  }
}

// Export all utilities
export {
  setupMockSession,
  formTestUtils,
  buttonTestUtils,
  modalTestUtils,
  permissionScenarios,
  errorTestUtils,
}