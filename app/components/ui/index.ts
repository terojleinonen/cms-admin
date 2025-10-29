/**
 * UI Components Index
 * Centralized exports for all shared UI components
 */

// Form Components
export { default as FormField } from './FormField'
export { default as Input } from './Input'
export { default as Select } from './Select'
export { default as Textarea } from './Textarea'
export { default as Button } from './Button'

// Data Display Components
export { default as DataTable } from './DataTable'
export { default as Badge } from './Badge'

// Loading Components
export { default as LoadingState, LoadingSpinner, InlineLoading, LoadingOverlay } from './LoadingState'
export { default as Skeleton } from './Skeleton'

// Error Handling Components
export { default as ErrorBoundary } from './ErrorBoundary'
export { default as ErrorMessage } from './ErrorMessage'
export { default as EmptyState } from './EmptyState'

// Layout Components
export { default as CustomModal, Dialog, DialogPanel, DialogTitle, Transition } from './CustomModal'
export { default as Modal } from './CustomModal' // Alias for compatibility

// Media Components
export { default as MediaPicker } from './MediaPicker'
export { default as ProductImageGallery } from './ProductImageGallery'

// Dashboard Components
export { DashboardCard, MetricCard, StatusBadge, DataTable as DashboardDataTable, ChartContainer } from './DashboardCard'

// Utility Components
export * from './Icons'