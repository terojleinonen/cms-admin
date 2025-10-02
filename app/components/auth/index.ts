/**
 * Auth Components Index
 * Centralized exports for all authentication and authorization components
 */

// Existing components
export { LoginForm } from './LoginForm'
export { PasswordReset } from './PasswordReset'
export { RegisterForm } from './RegisterForm'
export { SessionProvider } from './SessionProvider'

// Role Guard Components
export {
  RoleGuard,
  AdminOnly,
  EditorOrHigher,
  ViewerOrHigher,
  MultiRoleGuard,
  ProductGuard,
  CategoryGuard,
  PageGuard,
  MediaGuard,
  UserGuard,
  AnalyticsGuard,
  SecurityGuard,
  SettingsGuard,
  OwnershipGuard,
  FeatureFlagGuard,
  type RoleGuardProps,
  type AdminOnlyProps,
  type EditorOrHigherProps,
  type ViewerOrHigherProps,
  type MultiRoleGuardProps,
  type ProductGuardProps,
  type CategoryGuardProps,
  type PageGuardProps,
  type MediaGuardProps,
  type UserGuardProps,
  type AnalyticsGuardProps,
  type SecurityGuardProps,
  type SettingsGuardProps,
  type OwnershipGuardProps,
  type FeatureFlagGuardProps,
} from './RoleGuard'

// Permission Gate Components
export {
  PermissionGate,
  ResourceGate,
  AnyPermissionGate,
  AllPermissionsGate,
  OwnerOrAdminGate,
  FeatureGate,
  AuthenticatedGate,
  UserManagementGate,
  ContentCreationGate,
  SystemAdminGate,
  type PermissionGateProps,
  type ResourceGateProps,
  type AnyPermissionGateProps,
  type AllPermissionsGateProps,
  type OwnerOrAdminGateProps,
  type FeatureGateProps,
  type AuthenticatedGateProps,
  type UserManagementGateProps,
  type ContentCreationGateProps,
  type SystemAdminGateProps,
} from './PermissionGate'

// Conditional Render Components
export {
  ConditionalRender,
  AndConditions,
  OrConditions,
  NotCondition,
  BusinessRule,
  FeatureToggle,
  RoleConditions,
  PermissionConditions,
  ResourceConditions,
  OwnershipConditions,
  AuthConditions,
  TimeConditions,
  type ConditionalRenderProps,
  type PermissionCondition,
  type AndConditionsProps,
  type OrConditionsProps,
  type NotConditionProps,
  type BusinessRuleProps,
  type FeatureToggleProps,
} from './ConditionalRender'

// Specialized Guard Components (Task 17)
export {
  AdminOnly as SpecializedAdminOnly,
  OwnerOrAdmin,
  FeatureFlag,
  getFeatureConfig,
  useFeatureFlags,
  withFeatureFlag,
  withAdminOnly,
  withOwnerOrAdmin,
  type AdminOnlyProps as SpecializedAdminOnlyProps,
  type OwnerOrAdminProps,
  type FeatureFlagProps,
} from './SpecializedGuards'

// Error Boundary and Fallback Handling (Task 18)
export {
  default as PermissionErrorBoundary,
  PermissionError,
  AuthenticationError,
  withPermissionErrorBoundary,
  usePermissionError,
} from './PermissionErrorBoundary'

export {
  default as PermissionLoadingState,
  AuthenticationLoading,
  AuthorizationLoading,
  PermissionValidationLoading,
  RoleLoading,
  InlinePermissionLoading,
  PermissionSkeleton,
  ProgressivePermissionLoading,
  TimeoutPermissionLoading,
  type PermissionLoadingStateProps,
  type AuthenticationLoadingProps,
  type AuthorizationLoadingProps,
  type PermissionValidationLoadingProps,
  type RoleLoadingProps,
  type InlinePermissionLoadingProps,
  type PermissionSkeletonProps,
  type ProgressivePermissionLoadingProps,
  type TimeoutPermissionLoadingProps,
} from './PermissionLoadingState'

export {
  default as UnauthorizedFallback,
  PermissionDeniedFallback,
  RoleInsufficientFallback,
  AuthenticationRequiredFallback,
  ResourceAccessDeniedFallback,
  InlineUnauthorized,
  UnauthorizedPlaceholder,
  FeatureUnavailableFallback,
  ComingSoonFallback,
  type UnauthorizedFallbackProps,
  type PermissionDeniedFallbackProps,
  type RoleInsufficientFallbackProps,
  type AuthenticationRequiredFallbackProps,
  type ResourceAccessDeniedFallbackProps,
  type InlineUnauthorizedProps,
  type UnauthorizedPlaceholderProps,
  type FeatureUnavailableFallbackProps,
  type ComingSoonFallbackProps,
} from './UnauthorizedFallback'