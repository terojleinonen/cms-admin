/**
 * Permission Utilities Index
 * Centralized exports for all permission utility functions
 */

export * from '../permission-utils'

// Re-export commonly used utilities with shorter names for convenience
export {
  canPerformAnyAction as canAny,
  canPerformAllActions as canAll,
  hasElevatedPermissions as isElevated,
  hasAdminPermissions as isAdmin,
  canAccessOwnedResource as canAccessOwned,
  filterArrayByPermissions as filterByPermissions,
  getFieldPermissions as fieldPerms,
  getButtonPermissions as buttonPerms,
} from '../permission-utils'