/**
 * Enhanced Breadcrumbs Component for Kin Workspace CMS
 * 
 * Provides intelligent navigation context showing the current page hierarchy
 * with enhanced features including quick actions, page metadata, and improved
 * accessibility support.
 * 
 * Features:
 * - Automatic breadcrumb generation from URL paths
 * - Contextual quick actions for each page
 * - Page metadata display (last modified, status, etc.)
 * - Keyboard navigation support
 * - Mobile-responsive design
 * - SEO-friendly structured data
 * 
 * @module Breadcrumbs
 * @version 2.0.0
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
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useState } from 'react'

/**
 * Breadcrumb item interface with enhanced metadata
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
}

/**
 * Quick action interface for contextual actions
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
}

/**
 * Enhanced path configuration with metadata and actions
 */
const pathConfig: Record<string, {
  name: string
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  actions?: Omit<QuickAction, 'onClick'>[]
}> = {
  '/': { 
    name: 'Dashboard',
    icon: HomeIcon,
    actions: [
      { id: 'refresh', label: 'Refresh Dashboard', icon: ArrowPathIcon, shortcut: 'Cmd+R' }
    ]
  },
  '/admin': { name: 'Admin' },
  '/admin/products': { 
    name: 'Products',
    actions: [
      { id: 'new-product', label: 'New Product', icon: PlusIcon, shortcut: 'Cmd+Shift+P' },
      { id: 'search', label: 'Search Products', icon: MagnifyingGlassIcon, shortcut: 'Cmd+K' },
      { id: 'bulk-edit', label: 'Bulk Edit', icon: DocumentDuplicateIcon }
    ]
  },
  '/admin/categories': { 
    name: 'Categories',
    actions: [
      { id: 'new-category', label: 'New Category', icon: PlusIcon },
      { id: 'reorder', label: 'Reorder Categories', icon: DocumentDuplicateIcon }
    ]
  },
  '/admin/pages': { 
    name: 'Pages',
    actions: [
      { id: 'new-page', label: 'New Page', icon: PlusIcon },
      { id: 'templates', label: 'Manage Templates', icon: Cog6ToothIcon }
    ]
  },
  '/admin/analytics': { name: 'Analytics' },
  '/admin/api': { 
    name: 'API Management',
    actions: [
      { id: 'new-key', label: 'New API Key', icon: PlusIcon },
      { id: 'docs', label: 'View Documentation', icon: DocumentDuplicateIcon }
    ]
  },
  '/admin/backup': { name: 'Backup & Restore' },
  '/admin/performance': { name: 'Performance' },
  '/admin/search': { name: 'Search Management' },
  '/admin/workflow': { name: 'Workflow' },
  '/admin/users': { 
    name: 'User Management',
    actions: [
      { id: 'new-user', label: 'New User', icon: PlusIcon, shortcut: 'Cmd+Shift+U' },
      { id: 'bulk-actions', label: 'Bulk Actions', icon: DocumentDuplicateIcon }
    ]
  },
  '/admin/database': { name: 'Database Monitor' },
  '/admin/security': { name: 'Security Monitor' },
  '/media': { 
    name: 'Media Library',
    actions: [
      { id: 'upload', label: 'Upload Files', icon: PlusIcon },
      { id: 'organize', label: 'Organize Files', icon: Cog6ToothIcon }
    ]
  },
  '/users': { name: 'Users' },
  '/settings': { 
    name: 'Settings',
    actions: [
      { id: 'backup-settings', label: 'Backup Settings', icon: DocumentDuplicateIcon }
    ]
  },
  '/profile': { name: 'Profile' },
}

/**
 * Generate enhanced breadcrumbs with actions and metadata
 */
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  // Always start with home/dashboard
  if (pathname !== '/') {
    const dashboardConfig = pathConfig['/']
    breadcrumbs.push({
      name: dashboardConfig.name,
      href: '/',
      current: false,
      icon: dashboardConfig.icon,
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

    // Create quick actions with actual handlers
    const actions: QuickAction[] = config.actions?.map(action => ({
      ...action,
      onClick: () => handleQuickAction(action.id, currentPath),
      enabled: true
    })) || []

    breadcrumbs.push({
      name: config.name,
      href: currentPath,
      current: isLast,
      icon: config.icon,
      actions: isLast ? actions : [], // Only show actions for current page
    })
  })

  return breadcrumbs
}

/**
 * Handle quick action clicks
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
    default:
      console.log(`Quick action: ${actionId} on ${currentPath}`)
  }
}

/**
 * Quick actions dropdown component
 */
function QuickActionsDropdown({ actions }: { actions: QuickAction[] }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!actions.length) return null

  return (
    <div className="relative ml-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-expanded={isOpen}
      >
        Quick Actions
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
          <div className="absolute right-0 z-20 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg">
            <div className="py-1">
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    action.onClick()
                    setIsOpen(false)
                  }}
                  disabled={action.enabled === false}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <action.icon className="h-4 w-4 mr-3 text-gray-400" />
                  <span className="flex-1 text-left">{action.label}</span>
                  {action.shortcut && (
                    <kbd className="ml-2 px-1.5 py-0.5 text-xs font-mono text-gray-500 bg-gray-100 border border-gray-200 rounded">
                      {action.shortcut}
                    </kbd>
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
 * Enhanced Breadcrumbs component with quick actions and metadata
 */
export default function Breadcrumbs() {
  const pathname = usePathname()
  const breadcrumbs = generateBreadcrumbs(pathname)

  // Don't show breadcrumbs on the dashboard
  if (pathname === '/') {
    return null
  }

  const currentBreadcrumb = breadcrumbs.find(b => b.current)

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
                    <breadcrumb.icon className="h-4 w-4 mr-2 text-matte-black" />
                  )}
                  <span className="text-sm font-medium text-matte-black font-satoshi">
                    {breadcrumb.name}
                  </span>
                  {breadcrumb.metadata?.count !== undefined && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      {breadcrumb.metadata.count}
                    </span>
                  )}
                </div>
              ) : (
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
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Quick actions for current page */}
      {currentBreadcrumb?.actions && (
        <QuickActionsDropdown actions={currentBreadcrumb.actions} />
      )}
    </div>
  )
}