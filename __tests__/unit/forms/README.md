# Form and Interaction Permission Testing

This directory contains comprehensive tests for form field permission restrictions, button action permissions, and modal dialog permissions as part of the RBAC system testing suite.

## Test Files

### 1. `form-permission-restrictions.test.tsx`
Tests form field permission-based restrictions and validation:
- **Simple Form Permission Tests**: Basic form rendering and interactions
- **CategoryForm Permission Tests**: Category creation permissions for different roles
- **CreateApiKeyForm Permission Tests**: API key creation restricted to admin users
- **Form Field Conditional Rendering**: Role-based field visibility
- **Form Error Handling**: Permission-specific error messages and network error handling

### 2. `button-action-permissions.test.tsx` (in interactions/)
Tests button visibility, enablement, and action permissions:
- **Basic Button Permission Tests**: Button rendering and authorization
- **Role-Based Button Visibility**: Admin, editor, and viewer button access
- **Conditional Button States**: Loading, disabled, and permission states
- **Action Button Groups**: CRUD operation button permissions
- **Destructive Action Confirmations**: Confirmation dialogs for dangerous actions
- **Bulk Action Permissions**: Mass operation permissions
- **Context-Sensitive Actions**: Resource ownership-based permissions
- **Button State Management**: Async operations and error handling

### 3. `modal-dialog-permissions.test.tsx` (in modals/)
Tests modal and dialog permission-based access and interactions:
- **Basic Modal Permission Tests**: Modal rendering and close actions
- **UserDetailModal Permission Tests**: User detail viewing and editing permissions
- **MediaModal Permission Tests**: Media management permissions by role
- **Modal Permission Context**: Permission context passing to modal children
- **Modal Error Handling**: Permission errors and async operation handling

## Test Utilities

### `form-interaction-test-utils.tsx`
Comprehensive helper functions for testing form permissions and user interactions:
- **Form Testing Utilities**: Field access, form submission, validation testing
- **Button Testing Utilities**: Button visibility, action execution, loading states
- **Modal Testing Utilities**: Modal opening, content testing, action testing
- **Permission Scenarios**: CRUD permissions, ownership permissions
- **Error Testing Utilities**: Permission errors, network errors

## Key Features Tested

### Permission-Based Form Access
- Form field visibility based on user roles
- Form submission restrictions for unauthorized users
- Validation handling with permission context
- Error messaging for permission violations

### Button Action Permissions
- Button visibility based on user permissions
- Role-based action availability (ADMIN, EDITOR, VIEWER)
- Ownership-based permissions (users can edit their own resources)
- Confirmation dialogs for destructive actions
- Loading and error states during async operations

### Modal Dialog Permissions
- Modal content access based on permissions
- Tab-based navigation with role restrictions
- Media management permissions
- Permission context inheritance in modal children
- Error handling for permission violations

### Testing Patterns
- Mock authentication with different user roles
- Permission gate component mocking for consistent testing
- Async operation testing with proper error handling
- User interaction simulation with userEvent
- Component state management during permission checks

## Usage

Run the tests with:
```bash
# Run all form and interaction tests
npm test -- __tests__/components/forms/ __tests__/components/interactions/ __tests__/components/modals/

# Run specific test file
npm test -- __tests__/components/forms/form-permission-restrictions.test.tsx
```

## Requirements Coverage

These tests fulfill the requirements for task 27:
- ✅ Test form field permission restrictions
- ✅ Add button and action permission tests  
- ✅ Create modal and dialog permission tests
- ✅ Requirements: 4.1, 4.5 (Comprehensive Testing Coverage)

The tests ensure that the RBAC system properly restricts access to forms, buttons, and modals based on user roles and permissions, providing comprehensive coverage for UI-level permission enforcement.