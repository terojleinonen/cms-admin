/**
 * Enhanced Permission-Aware Breadcrumbs Component for Kin Workspace CMS
 * 
 * Provides intelligent navigation context showing the current page hierarchy
 * with enhanced features including permission-based filtering, role-aware actions,
 * and contextual navigation for different user roles.
 * 
 * Features:
 * - Automatic breadcrumb generation from URL paths
 * - Permission-based breadcrumb filtering
 * - Role-aware contextual quick actions
 * - Permission-aware navigation history
 * - Page metadata display (last modified, status, etc.)
 * - Keyboard navigation support
 * - Mobile-responsive design
 * - SEO-friendly structured data
 * 
 * @module Breadcrumbs
 * @version 3.0.0
 * @author Kin Workspace CMS Team
 * @since 2024-02-09
 */

'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronRightIcon, 
  HomeIcon, 
  PlusIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  EyeSlashIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import React, { useState, useMemo, useCallback } from 'react'
import { usePermissions } from '../../lib/hooks/usePermissions'
import { Permission } from '../../lib/permissions'
import { UserRole } from '@prisma/client'
import { PermissionAwareNavigationHistory } from './NavigationHistory'

/**
 * Permission-aware breadcrumb item interface with enhanced metadata
 */
interface BreadcrumbItem {
  /** Display name for the breadcrumb */
  name: string
  /** URL path for the breadcrumb */
  href: string
  /** Whether this is the current page */
  current: boolean
  /** Optional icon for the breadcrumb */
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  /** Quick actions available for this page */
  actions?: QuickAction[]
  /** Page metadata */
  metadata?: {
    lastModified?: string
    status?: string
    count?: number
  }
  /** Required permissions to access this breadcrumb */
  requiredPermissions?: Permission[]
  /** Whether this breadcrumb is accessible to current user */
  accessible?: boolean
  /** Fallback display when not accessible */
  fallbackName?: string
  /** Role-specific styling or behavior */
  roleContext?: {
    role: UserRole
    priority: number
    badge?: string
  }
}

/**
 * Permission-aware quick action interface for contextual actions
 */
interface QuickAction {
  /** Action identifier */
  id: string
  /** Display label */
  label: string
  /** Action icon */
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  /** Action handler */
  onClick: () => void
  /** Keyboard shortcut */
  shortcut?: string
  /** Whether action is available */
  enabled?: boolean
  /** Required permissions for this action */
  requiredPermissions?: Permission[]
  /** Minimum role required for this action */
  minimumRole?: UserRole
  /** Whether action is visible to current user */
  visible?: boolean
}

/**
 * Enhanced path configuration with metadata, actions, and permissions
 */
const pathConfig: Record<string, {
  name: string
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  actions?: Omit<QuickAction, 'onClick'>[]
  requiredPermissions?: Permission[]
  fallbackName?: string
  roleSpecific?: {
    [key in UserRole]?: {
      name?: string
      actions?: Omit<QuickAction, 'onClick'>[]
      badge?: string
    }
  }
}> = {
  '/': { 
    name: 'Dashboard',
    icon: HomeIcon,
    actions: [
      { id: 'refresh', label: 'Refresh Dashboard', icon: ArrowPathIcon, shortcut: 'Cmd+R' }
    ],
    requiredPermissions: [],
    roleSpecific: {
      [UserRole.ADMIN]: {
        name: 'Admin Dashboard',
        badge: 'Admin',
        actions: [
          { id: 'refresh', label: 'Refresh Dashboard', icon: ArrowPathIcon, shortcut: 'Cmd+R' },
          { id: 'system-status', label: 'System Status', icon: ShieldCheckIcon, requiredPermissions: [{ resource: 'monitoring', action: 'read', scope: 'all' }] }
        ]
      },
      [UserRole.EDITOR]: {
        name: 'Content Dashboard',
        badge: 'Editor'
      },
      [UserRole.VIEWER]: {
        name: 'Dashboard',
        badge: 'Viewer'
      }
    }
  },
  '/admin': { 
    name: 'Admin',
    requiredPermissions: [{ resource: 'admin', action: 'read', scope: 'all' }],
    fallbackName: 'Restricted Area'
  },
  '/admin/products': { 
    name: 'Products',
    requiredPermissions: [{ resource: 'products', action: 'read', scope: 'all' }],
    fallbackName: 'Content',
    actions: [
      { 
        id: 'new-product', 
        label: 'New Product', 
        icon: PlusIcon, 
        shortcut: 'Cmd+Shift+P',
        requiredPermissions: [{ resource: 'products', action: 'create', scope: 'all' }],
        minimumRole: UserRole.EDITOR
      },
      { id: 'search', label: 'Search Products', icon: MagnifyingGlassIcon, shortcut: 'Cmd+K' },
      { 
        id: 'bulk-edit', 
        label: 'Bulk Edit', 
        icon: DocumentDuplicateIcon,
        requiredPermissions: [{ resource: 'products', action: 'update', scope: 'all' }],
        minimumRole: UserRole.EDITOR
      }
    ],
    roleSpecific: {
      [UserRole.VIEWER]: {
        name: 'Products (Read Only)',
        actions: [
          { id: 'search', label: 'Search Products', icon: MagnifyingGlassIcon, shortcut: 'Cmd+K' }
        ]
      }
    }
  },
  '/admin/categories': { 
    name: 'Categories',
    requiredPermissions: [{ resource: 'categories', action: 'read', scope: 'all' }],
    fallbackName: 'Content',
    actions: [
      { 
        id: 'new-category', 
        label: 'New Category', 
        icon: PlusIcon,
        requiredPermissions: [{ resource: 'categories', action: 'create', scope: 'all' }],
        minimumRole: UserRole.EDITOR
      },
      { 
        id: 'reorder', 
        label: 'Reorder Categories', 
        icon: DocumentDuplicateIcon,
        requiredPermissions: [{ resource: 'categories', action: 'update', scope: 'all' }],
        minimumRole: UserRole.EDITOR
      }
    ]
  },
  '/admin/pages': { 
    name: 'Pages',
    requiredPermissions: [{ resource: 'pages', action: 'read', scope: 'all' }],
    fallbackName: 'Content',
    actions: [
      { 
        id: 'new-page', 
        label: 'New Page', 
        icon: PlusIcon,
        requiredPermissions: [{ resource: 'pages', action: 'create', scope: 'all' }],
        minimumRole: UserRole.EDITOR
      },
      { 
        id: 'templates', 
        label: 'Manage Templates', 
        icon: Cog6ToothIcon,
        requiredPermissions: [{ resource: 'pages', action: 'manage', scope: 'all' }],
        minimumRole: UserRole.ADMIN
      }
    ]
  },
  '/admin/analytics': { 
    name: 'Analytics',
    requiredPermissions: [{ resource: 'analytics', action: 'read', scope: 'all' }],
    fallbackName: 'Reports'
  },
  '/admin/api': { 
    name: 'API Management',
    requiredPermissions: [{ resource: 'api-keys', action: 'read', scope: 'all' }],
    fallbackName: 'System',
    actions: [
      { 
        id: 'new-key', 
        label: 'New API Key', 
        icon: PlusIcon,
        requiredPermissions: [{ resource: 'api-keys', action: 'create', scope: 'all' }],
        minimumRole: UserRole.ADMIN
      },
      { id: 'docs', label: 'View Documentation', icon: DocumentDuplicateIcon }
    ]
  },
  '/admin/backup': { 
    name: 'Backup & Restore',
    requiredPermissions: [{ resource: 'system', action: 'manage', scope: 'all' }],
    fallbackName: 'System'
  },
  '/admin/performance': { 
    name: 'Performance',
    requiredPermissions: [{ resource: 'monitoring', action: 'read', scope: 'all' }],
    fallbackName: 'System'
  },
  '/admin/search': { 
    name: 'Search Management',
    requiredPermissions: [{ resource: 'search', action: 'manage', scope: 'all' }],
    fallbackName: 'System'
  },
  '/admin/workflow': { 
    name: 'Workflow',
    requiredPermissions: [{ resource: 'workflow', action: 'read', scope: 'all' }],
    fallbackName: 'System'
  },
  '/admin/users': { 
    name: 'User Management',
    requiredPermissions: [{ resource: 'users', action: 'read', scope: 'all' }],
    fallbackName: 'System',
    actions: [
      { 
        id: 'new-user', 
        label: 'New User', 
        icon: PlusIcon, 
        shortcut: 'Cmd+Shift+U',
        requiredPermissions: [{ resource: 'users', action: 'create', scope: 'all' }],
        minimumRole: UserRole.ADMIN
      },
      { 
        id: 'bulk-actions', 
        label: 'Bulk Actions', 
        icon: DocumentDuplicateIcon,
        requiredPermissions: [{ resource: 'users', action: 'update', scope: 'all' }],
        minimumRole: UserRole.ADMIN
      }
    ]
  },
  '/admin/database': { 
    name: 'Database Monitor',
    requiredPermissions: [{ resource: 'system', action: 'manage', scope: 'all' }],
    fallbackName: 'System'
  },
  '/admin/security': { 
    name: 'Security Monitor',
    requiredPermissions: [{ resource: 'security', action: 'read', scope: 'all' }],
    fallbackName: 'System'
  },
  '/media': { 
    name: 'Media Library',
    requiredPermissions: [{ resource: 'media', action: 'read', scope: 'all' }],
    fallbackName: 'Files',
    actions: [
      { 
        id: 'upload', 
        label: 'Upload Files', 
        icon: PlusIcon,
        requiredPermissions: [{ resource: 'media', action: 'create', scope: 'all' }],
        minimumRole: UserRole.EDITOR
      },
      { 
        id: 'organize', 
        label: 'Organize Files', 
        icon: Cog6ToothIcon,
        requiredPermissions: [{ resource: 'media', action: 'update', scope: 'all' }],
        minimumRole: UserRole.EDITOR
      }
    ]
  },
  '/users': { 
    name: 'Users',
    requiredPermissions: [{ resource: 'users', action: 'read', scope: 'all' }],
    fallbackName: 'Directory'
  },
  '/settings': { 
    name: 'Settings',
    requiredPermissions: [{ resource: 'profile', action: 'update', scope: 'own' }],
    actions: [
      { 
        id: 'backup-settings', 
        label: 'Backup Settings', 
        icon: DocumentDuplicateIcon,
        requiredPermissions: [{ resource: 'settings', action: 'manage', scope: 'all' }],
        minimumRole: UserRole.ADMIN
      }
    ]
  },
  '/profile': { 
    name: 'Profile',
    requiredPermissions: [{ resource: 'profile', action: 'read', scope: 'own' }]
  },
}

/**
 * Generate permission-aware breadcrumbs with actions and metadata
 */
function generatePermissionAwareBreadcrumbs(
  pathname: string, 
  permissions: ReturnType<typeof usePermissions>
): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  // Always start with home/dashboard
  if (pathname !== '/') {
    const dashboardConfig = pathConfig['/']
    const roleSpecific = dashboardConfig.roleSpecific?.[permissions.user?.role as UserRole]
    
    breadcrumbs.push({
      name: roleSpecific?.name || dashboardConfig.name,
      href: '/',
      current: false,
      icon: dashboardConfig.icon,
      accessible: true,
      roleContext: permissions.user?.role ? {
        role: permissions.user.role,
        priority: 1,
        badge: roleSpecific?.badge
      } : undefined
    })
  }

  // Build breadcrumbs from path segments
  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1
    
    // Get configuration or create default
    const config = pathConfig[currentPath] || {
      name: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    }

    // Check if user has access to this breadcrumb
    const hasAccess = !config.requiredPermissions || 
      config.requiredPermissions.every(permission => 
        permissions.canAccess(permission.resource, permission.action, permission.scope)
      )

    // Get role-specific configuration
    const roleSpecific = config.roleSpecific?.[permissions.user?.role as UserRole]
    
    // Filter actions based on permissions
    const filteredActions: QuickAction[] = (roleSpecific?.actions || config.actions || [])
      .map(action => ({
        ...action,
        onClick: () => handleQuickAction(action.id, currentPath),
        enabled: true,
        visible: !action.requiredPermissions || 
          action.requiredPermissions.every(permission => 
            permissions.canAccess(permission.resource, permission.action, permission.scope)
          ) && (!action.minimumRole || permissions.hasMinimumRole(action.minimumRole))
      }))
      .filter(action => action.visible !== false)

    breadcrumbs.push({
      name: hasAccess ? (roleSpecific?.name || config.name) : (config.fallbackName || 'Restricted'),
      href: hasAccess ? currentPath : '#',
      current: isLast,
      icon: hasAccess ? config.icon : EyeSlashIcon,
      actions: isLast ? filteredActions : [], // Only show actions for current page
      accessible: hasAccess,
      requiredPermissions: config.requiredPermissions,
      fallbackName: config.fallbackName,
      roleContext: permissions.user?.role ? {
        role: permissions.user.role,
        priority: hasAccess ? 1 : 0,
        badge: roleSpecific?.badge
      } : undefined
    })
  })

  return breadcrumbs
}



/**
 * Handle quick action clicks with permission awareness
 */
function handleQuickAction(actionId: string, currentPath: string) {
  switch (actionId) {
    case 'new-product':
      window.location.href = '/admin/products/new'
      break
    case 'new-user':
      window.location.href = '/admin/users/new'
      break
    case 'new-category':
      window.location.href = '/admin/categories/new'
      break
    case 'new-page':
      window.location.href = '/admin/pages/new'
      break
    case 'new-key':
      window.location.href = '/admin/api/keys/new'
      break
    case 'search':
      // Trigger global search
      const searchEvent = new CustomEvent('trigger-search')
      document.dispatchEvent(searchEvent)
      break
    case 'refresh':
      window.location.reload()
      break
    case 'upload':
      // Trigger file upload modal
      const uploadEvent = new CustomEvent('trigger-upload')
      document.dispatchEvent(uploadEvent)
      break
    case 'system-status':
      window.location.href = '/admin/performance'
      break
    default:
      console.log(`Quick action: ${actionId} on ${currentPath}`)
  }
}

/**
 * Permission-aware quick actions dropdown component
 */
function PermissionAwareQuickActionsDropdown({ 
  actions, 
  userRole 
}: { 
  actions: QuickAction[]
  userRole?: UserRole 
}) {
  const [isOpen, setIsOpen] = useState(false)

  // Filter actions based on visibility and permissions
  const visibleActions = actions.filter(action => action.visible !== false)

  if (!visibleActions.length) return null

  return (
    <div className="relative ml-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "inline-flex items-center px-3 py-1.5 text-xs font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200",
          userRole === UserRole.ADMIN 
            ? "text-red-600 bg-red-50 border-red-200 hover:bg-red-100" 
            : userRole === UserRole.EDITOR
            ? "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100"
            : "text-gray-600 bg-white border-gray-200 hover:bg-gray-50"
        )}
        aria-expanded={isOpen ? 'true' : 'false'}
      >
        Quick Actions
        {userRole && (
          <span className={clsx(
            "ml-1 px-1.5 py-0.5 text-xs rounded-full",
            userRole === UserRole.ADMIN 
              ? "bg-red-100 text-red-700" 
              : userRole === UserRole.EDITOR
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-700"
          )}>
            {visibleActions.length}
          </span>
        )}
        <ChevronRightIcon 
          className={clsx(
            'ml-1 h-3 w-3 transition-transform duration-200',
            isOpen && 'rotate-90'
          )} 
        />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg">
            <div className="py-1">
              {visibleActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    action.onClick()
                    setIsOpen(false)
                  }}
                  disabled={action.enabled === false}
                  className={clsx(
                    "flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150",
                    action.requiredPermissions?.length 
                      ? "text-blue-700 hover:bg-blue-50" 
                      : "text-gray-700"
                  )}
                >
                  <action.icon className={clsx(
                    "h-4 w-4 mr-3",
                    action.requiredPermissions?.length 
                      ? "text-blue-400" 
                      : "text-gray-400"
                  )} />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{action.label}</div>
                    {action.requiredPermissions?.length && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        Requires: {action.requiredPermissions.map(p => `${p.resource}:${p.action}`).join(', ')}
                      </div>
                    )}
                  </div>
                  {action.shortcut && (
                    <kbd className="ml-2 px-1.5 py-0.5 text-xs font-mono text-gray-500 bg-gray-100 border border-gray-200 rounded">
                      {action.shortcut}
                    </kbd>
                  )}
                  {action.minimumRole && (
                    <span className={clsx(
                      "ml-2 px-1.5 py-0.5 text-xs rounded-full",
                      action.minimumRole === UserRole.ADMIN 
                        ? "bg-red-100 text-red-700" 
                        : "bg-blue-100 text-blue-700"
                    )}>
                      {action.minimumRole}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Enhanced Permission-Aware Breadcrumbs component with role-based features
 */
export default function Breadcrumbs() {
  const pathname = usePathname()
  const permissions = usePermissions()
  const navigationHistory = PermissionAwareNavigationHistory.getInstance()

  // Generate permission-aware breadcrumbs
  const breadcrumbs = useMemo(() => 
    generatePermissionAwareBreadcrumbs(pathname, permissions), 
    [pathname, permissions.user?.role, permissions.isAuthenticated]
  )

  // Add current page to navigation history
  const currentBreadcrumb = breadcrumbs.find(b => b.current)
  
  const addToNavigationHistory = useCallback(() => {
    if (currentBreadcrumb && permissions.user?.role) {
      navigationHistory.addToHistory(
        pathname,
        currentBreadcrumb.name,
        currentBreadcrumb.accessible || false,
        permissions.user.role
      )
    }
  }, [currentBreadcrumb, pathname, permissions.user?.role, navigationHistory])

  // Add to history when breadcrumb changes
  React.useEffect(() => {
    addToNavigationHistory()
  }, [addToNavigationHistory])

  // Don't show breadcrumbs on the dashboard
  if (pathname === '/') {
    return null
  }

  // Show loading state while permissions are loading
  if (permissions.isLoading) {
    return (
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          <ChevronRightIcon className="h-4 w-4 text-gray-300" />
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-4">
      {/* Breadcrumb navigation */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          {breadcrumbs.map((breadcrumb, index) => (
            <li key={breadcrumb.href} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon
                  className="h-4 w-4 text-slate-gray mx-2"
                  aria-hidden="true"
                />
              )}
              
              {breadcrumb.current ? (
                <div className="flex items-center">
                  {breadcrumb.icon && (
                    <breadcrumb.icon className={clsx(
                      "h-4 w-4 mr-2",
                      breadcrumb.accessible 
                        ? "text-matte-black" 
                        : "text-gray-400"
                    )} />
                  )}
                  <span className={clsx(
                    "text-sm font-medium font-satoshi",
                    breadcrumb.accessible 
                      ? "text-matte-black" 
                      : "text-gray-500"
                  )}>
                    {breadcrumb.name}
                  </span>
                  {breadcrumb.roleContext?.badge && (
                    <span className={clsx(
                      "ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
                      breadcrumb.roleContext.role === UserRole.ADMIN 
                        ? "bg-red-100 text-red-700" 
                        : breadcrumb.roleContext.role === UserRole.EDITOR
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    )}>
                      {breadcrumb.roleContext.badge}
                    </span>
                  )}
                  {breadcrumb.metadata?.count !== undefined && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      {breadcrumb.metadata.count}
                    </span>
                  )}
                  {!breadcrumb.accessible && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                      <EyeSlashIcon className="h-3 w-3 mr-1" />
                      Restricted
                    </span>
                  )}
                </div>
              ) : (
                breadcrumb.accessible ? (
                  <Link
                    href={breadcrumb.href}
                    className={clsx(
                      'text-sm font-medium text-slate-gray hover:text-matte-black font-inter transition-colors duration-200',
                      'flex items-center'
                    )}
                  >
                    {breadcrumb.icon && index === 0 && (
                      <breadcrumb.icon className="h-4 w-4 mr-1" aria-hidden="true" />
                    )}
                    {breadcrumb.name}
                    {breadcrumb.roleContext?.badge && (
                      <span className={clsx(
                        "ml-1 inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full",
                        breadcrumb.roleContext.role === UserRole.ADMIN 
                          ? "bg-red-100 text-red-600" 
                          : breadcrumb.roleContext.role === UserRole.EDITOR
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-500"
                      )}>
                        {breadcrumb.roleContext.badge}
                      </span>
                    )}
                  </Link>
                ) : (
                  <span className="flex items-center text-sm font-medium text-gray-400 font-inter">
                    <EyeSlashIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                    {breadcrumb.name}
                  </span>
                )
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Permission-aware quick actions for current page */}
      {currentBreadcrumb?.actions && currentBreadcrumb.accessible && (
        <PermissionAwareQuickActionsDropdown 
          actions={currentBreadcrumb.actions} 
          userRole={permissions.user?.role}
        />
      )}
    </div>
  )
}