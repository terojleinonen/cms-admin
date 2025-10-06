/**
 * Enhanced Sidebar Navigation Component for Kin Workspace CMS
 * 
 * This component provides a responsive sidebar navigation with comprehensive role-based 
 * access control and dynamic permission filtering. It displays different navigation items 
 * based on the user's specific permissions and includes collapsible sections for different 
 * permission levels.
 * 
 * Features:
 * - Dynamic permission-based navigation filtering
 * - Role-based badge and indicator system
 * - Collapsible sections for different permission levels
 * - Responsive design (mobile overlay + desktop fixed)
 * - Active state highlighting
 * - Hierarchical navigation sections
 * - User role indicator with permission count
 * - Smooth animations and transitions
 * 
 * @module Sidebar
 * @version 2.0.0
 * @author Kin Workspace CMS Team
 * @since 2024-01-01
 * 
 * @example
 * ```tsx
 * import Sidebar from '@/components/layout/Sidebar'
 * 
 * function AdminLayout() {
 *   const [sidebarOpen, setSidebarOpen] = useState(false)
 * 
 *   return (
 *     <div>
 *       <Sidebar 
 *         isOpen={sidebarOpen}
 *         onClose={() => setSidebarOpen(false)}
 *       />
 *       // ... rest of layout
 *     </div>
 *   )
 * }
 * ```
 */

'use client'

import React, { Fragment, useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dialog, Transition } from '@headlessui/react'
import {
  HomeIcon,
  CubeIcon,
  TagIcon,
  PhotoIcon,
  DocumentTextIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ServerIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  CircleStackIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { UserRole } from '@prisma/client'
import clsx from 'clsx'
import { usePermissions } from '@/lib/hooks/usePermissions'

/**
 * Navigation item configuration interface
 */
interface NavigationItem {
  /** Display name for the navigation item */
  name: string
  /** URL path for the navigation item */
  href: string
  /** Heroicon component for the navigation item */
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  /** Required resource for permission checking */
  resource: string
  /** Required action for permission checking */
  action: string
  /** Optional scope for permission checking */
  scope?: string
  /** Optional badge configuration */
  badge?: {
    text: string
    variant: 'new' | 'beta' | 'admin' | 'warning' | 'success' | 'info'
  }
  /** Optional children for nested navigation */
  children?: NavigationItem[]
  /** Whether this item should be shown in a collapsible section */
  section?: string
}

/**
 * Navigation section configuration
 */
interface NavigationSection {
  /** Section identifier */
  id: string
  /** Display name for the section */
  name: string
  /** Section description */
  description: string
  /** Required permission to see the section */
  requiredPermission?: {
    resource: string
    action: string
    scope?: string
  }
  /** Whether the section is collapsible */
  collapsible: boolean
  /** Default collapsed state */
  defaultCollapsed?: boolean
  /** Section icon */
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

/**
 * Sidebar component props interface
 */
interface SidebarProps {
  /** Whether the mobile sidebar is open */
  isOpen: boolean
  /** Callback function to close the mobile sidebar */
  onClose: () => void
}

/**
 * Navigation sections configuration
 */
const navigationSections: NavigationSection[] = [
  {
    id: 'main',
    name: 'Main Navigation',
    description: 'Core application features',
    collapsible: false,
  },
  {
    id: 'content',
    name: 'Content Management',
    description: 'Manage products, pages, and media',
    requiredPermission: { resource: 'products', action: 'read' },
    collapsible: true,
    defaultCollapsed: false,
    icon: CubeIcon,
  },
  {
    id: 'admin',
    name: 'Administration',
    description: 'System administration and monitoring',
    requiredPermission: { resource: 'users', action: 'read', scope: 'all' },
    collapsible: true,
    defaultCollapsed: false,
    icon: ShieldCheckIcon,
  },
  {
    id: 'user',
    name: 'User Account',
    description: 'Personal account settings',
    collapsible: false,
  },
]

/**
 * Main navigation items configuration with permission-based access control
 */
const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: HomeIcon,
    resource: 'admin',
    action: 'read',
    section: 'main',
  },
  {
    name: 'Products',
    href: '/admin/products',
    icon: CubeIcon,
    resource: 'products',
    action: 'read',
    section: 'content',
    badge: {
      text: 'Manage',
      variant: 'info'
    },
    children: [
      {
        name: 'All Products',
        href: '/admin/products',
        icon: CubeIcon,
        resource: 'products',
        action: 'read',
      },
      {
        name: 'Add Product',
        href: '/admin/products/new',
        icon: CubeIcon,
        resource: 'products',
        action: 'create',
      },
    ],
  },
  {
    name: 'Orders',
    href: '/orders',
    icon: ShoppingBagIcon,
    resource: 'orders',
    action: 'read',
    section: 'content',
  },
  {
    name: 'Categories',
    href: '/admin/categories',
    icon: TagIcon,
    resource: 'categories',
    action: 'read',
    section: 'content',
  },
  {
    name: 'Media Library',
    href: '/media',
    icon: PhotoIcon,
    resource: 'media',
    action: 'read',
    section: 'content',
  },
  {
    name: 'Pages',
    href: '/admin/pages',
    icon: DocumentTextIcon,
    resource: 'pages',
    action: 'read',
    section: 'content',
    children: [
      {
        name: 'All Pages',
        href: '/admin/pages',
        icon: DocumentTextIcon,
        resource: 'pages',
        action: 'read',
      },
      {
        name: 'Create Page',
        href: '/admin/pages/new',
        icon: DocumentTextIcon,
        resource: 'pages',
        action: 'create',
      },
    ],
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: ChartBarIcon,
    resource: 'analytics',
    action: 'read',
    section: 'admin',
    badge: {
      text: 'Admin Only',
      variant: 'admin'
    },
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: UsersIcon,
    resource: 'users',
    action: 'read',
    scope: 'all',
    section: 'admin',
    badge: {
      text: 'Admin Only',
      variant: 'admin'
    },
  },
  {
    name: 'Database Monitor',
    href: '/admin/database',
    icon: CircleStackIcon,
    resource: 'monitoring',
    action: 'read',
    section: 'admin',
    badge: {
      text: 'System',
      variant: 'admin'
    },
  },
  {
    name: 'Security Monitor',
    href: '/admin/security',
    icon: ShieldCheckIcon,
    resource: 'security',
    action: 'read',
    section: 'admin',
    badge: {
      text: 'Critical',
      variant: 'warning'
    },
  },
  {
    name: 'API Management',
    href: '/admin/api',
    icon: ServerIcon,
    resource: 'settings',
    action: 'manage',
    section: 'admin',
    badge: {
      text: 'Config',
      variant: 'admin'
    },
  },
  {
    name: 'Backup & Restore',
    href: '/admin/backup',
    icon: ShieldCheckIcon,
    resource: 'settings',
    action: 'manage',
    section: 'admin',
    badge: {
      text: 'System',
      variant: 'admin'
    },
  },
  {
    name: 'Performance',
    href: '/admin/performance',
    icon: ChartBarIcon,
    resource: 'monitoring',
    action: 'read',
    section: 'admin',
    badge: {
      text: 'Beta',
      variant: 'beta'
    },
  },
  {
    name: 'Search Management',
    href: '/admin/search',
    icon: MagnifyingGlassIcon,
    resource: 'settings',
    action: 'manage',
    section: 'admin',
  },
  {
    name: 'Workflow',
    href: '/admin/workflow',
    icon: DocumentTextIcon,
    resource: 'settings',
    action: 'manage',
    section: 'admin',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: CogIcon,
    resource: 'settings',
    action: 'read',
    section: 'admin',
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: UsersIcon,
    resource: 'profile',
    action: 'read',
    scope: 'own',
    section: 'user',
  },
]

/**
 * Badge component for navigation items
 */
function NavigationBadge({ badge }: { badge: NavigationItem['badge'] }) {
  if (!badge) return null

  const badgeStyles = {
    new: 'bg-green-100 text-green-800 border-green-200',
    beta: 'bg-blue-100 text-blue-800 border-blue-200',
    admin: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  }

  const badgeIcons = {
    new: CheckCircleIcon,
    beta: InformationCircleIcon,
    admin: ShieldCheckIcon,
    warning: ExclamationTriangleIcon,
    success: CheckCircleIcon,
    info: InformationCircleIcon,
  }

  const IconComponent = badgeIcons[badge.variant]

  return (
    <span className={clsx(
      'ml-auto inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border font-inter',
      badgeStyles[badge.variant]
    )}>
      <IconComponent className="w-3 h-3 mr-1" />
      {badge.text}
    </span>
  )
}

/**
 * Enhanced Sidebar content component with dynamic permission filtering
 * 
 * Renders the sidebar navigation content with permission-based filtering,
 * collapsible sections, and role-based badges.
 */
function SidebarContent() {
  const pathname = usePathname()
  const permissions = usePermissions()
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Filter navigation items based on user permissions
  const filteredNavigation = useMemo(() => {
    return navigation.filter(item => 
      permissions.canAccess(item.resource, item.action, item.scope)
    )
  }, [permissions])

  // Group navigation items by section
  const navigationBySection = useMemo(() => {
    const sections: Record<string, NavigationItem[]> = {}
    
    filteredNavigation.forEach(item => {
      const sectionId = item.section || 'main'
      if (!sections[sectionId]) {
        sections[sectionId] = []
      }
      sections[sectionId].push(item)
    })
    
    return sections
  }, [filteredNavigation])

  // Filter sections based on permissions and available items
  const visibleSections = useMemo(() => {
    return navigationSections.filter(section => {
      // Check if section has any items
      const hasItems = navigationBySection[section.id]?.length > 0
      if (!hasItems) return false

      // Check section permission if required
      if (section.requiredPermission) {
        return permissions.canAccess(
          section.requiredPermission.resource,
          section.requiredPermission.action,
          section.requiredPermission.scope
        )
      }

      return true
    })
  }, [navigationBySection, permissions])

  // Initialize collapsed sections based on defaults
  React.useEffect(() => {
    const defaultCollapsed = new Set<string>()
    navigationSections.forEach(section => {
      if (section.defaultCollapsed) {
        defaultCollapsed.add(section.id)
      }
    })
    setCollapsedSections(defaultCollapsed)
  }, [])

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const renderNavigationItem = (item: NavigationItem, isChild = false) => {
    const isActive = pathname === item.href
    const hasChildren = item.children && item.children.length > 0
    const canAccessChildren = hasChildren ? item.children.some(child => 
      permissions.canAccess(child.resource, child.action, child.scope)
    ) : false

    return (
      <div key={item.name}>
        <Link
          href={item.href}
          className={clsx(
            'sidebar-link',
            isActive && 'active',
            isChild && 'ml-6 text-sm'
          )}
        >
          <item.icon
            className={clsx(
              'mr-3 h-5 w-5 flex-shrink-0',
              isActive ? 'text-soft-white' : 'text-warm-beige'
            )}
          />
          {item.name}
          <NavigationBadge badge={item.badge} />
        </Link>
        
        {/* Render children if they exist and user has access */}
        {hasChildren && canAccessChildren && (
          <div className="ml-4 mt-1 space-y-1">
            {item.children!
              .filter(child => permissions.canAccess(child.resource, child.action, child.scope))
              .map(child => renderNavigationItem(child, true))
            }
          </div>
        )}
      </div>
    )
  }

  const renderSection = (section: NavigationSection) => {
    const sectionItems = navigationBySection[section.id] || []
    const isCollapsed = collapsedSections.has(section.id)
    const itemCount = sectionItems.length

    if (sectionItems.length === 0) return null

    return (
      <div key={section.id} className="space-y-1">
        {section.collapsible ? (
          <div className="pt-6 pb-2">
            <button
              onClick={() => toggleSection(section.id)}
              className="flex items-center w-full px-3 py-1 text-xs font-semibold text-warm-beige uppercase tracking-wider font-inter hover:text-soft-white transition-colors"
            >
              {section.icon && (
                <section.icon className="w-4 h-4 mr-2" />
              )}
              <span className="flex-1 text-left">{section.name}</span>
              <span className="ml-2 text-xs bg-slate-600 text-warm-beige px-1.5 py-0.5 rounded-full">
                {itemCount}
              </span>
              {isCollapsed ? (
                <ChevronRightIcon className="w-4 h-4 ml-2" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 ml-2" />
              )}
            </button>
            {section.description && (
              <p className="px-3 text-xs text-warm-beige/70 font-inter mt-1">
                {section.description}
              </p>
            )}
          </div>
        ) : (
          section.name !== 'Main Navigation' && (
            <div className="pt-6 pb-2">
              <div className="px-3">
                <h3 className="text-xs font-semibold text-warm-beige uppercase tracking-wider font-inter">
                  {section.name}
                </h3>
                {section.description && (
                  <p className="text-xs text-warm-beige/70 font-inter mt-1">
                    {section.description}
                  </p>
                )}
              </div>
            </div>
          )
        )}

        {(!section.collapsible || !isCollapsed) && (
          <div className="space-y-1">
            {sectionItems.map(item => renderNavigationItem(item))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 bg-matte-black">
        <Link href="/admin" className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-dusty-sage rounded-lg flex items-center justify-center">
              <span className="text-soft-white font-bold text-sm font-satoshi">K</span>
            </div>
          </div>
          <div className="ml-3">
            <h1 className="text-soft-white font-semibold text-lg font-satoshi">Kin Workspace</h1>
            <p className="text-warm-beige text-xs font-inter">CMS</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 bg-slate-gray overflow-y-auto">
        {visibleSections.map(section => renderSection(section))}
      </nav>

      {/* Enhanced User role indicator */}
      <div className="px-4 py-4 bg-matte-black border-t border-slate-gray">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={clsx(
                'w-3 h-3 rounded-full',
                permissions.isAdmin() ? 'bg-red-400' :
                permissions.isEditor() ? 'bg-blue-400' :
                'bg-green-400'
              )} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-warm-beige font-inter">
                {permissions.user?.role || 'Unknown'} Role
              </p>
              <p className="text-xs text-warm-beige/70 font-inter">
                {filteredNavigation.length} accessible features
              </p>
            </div>
          </div>
          
          {/* Role badge */}
          <div className={clsx(
            'px-2 py-1 text-xs font-medium rounded-full font-inter',
            permissions.isAdmin() ? 'bg-red-100 text-red-800' :
            permissions.isEditor() ? 'bg-blue-100 text-blue-800' :
            'bg-green-100 text-green-800'
          )}>
            {permissions.isAdmin() ? 'Admin' :
             permissions.isEditor() ? 'Editor' :
             'Viewer'}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Main Enhanced Sidebar component
 * 
 * Provides responsive sidebar navigation with comprehensive permission-based access control.
 * Includes both mobile overlay and desktop fixed layouts with smooth transitions.
 * 
 * The sidebar automatically filters navigation items based on user permissions,
 * provides collapsible sections for different permission levels, and includes
 * role-based badges and indicators.
 * 
 * @param props - Sidebar component props
 * @param props.isOpen - Whether mobile sidebar is open
 * @param props.onClose - Callback to close mobile sidebar
 * @returns JSX.Element - Rendered sidebar component
 */
export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-matte-black/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button
                    type="button"
                    className="-m-2.5 p-2.5"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon className="h-6 w-6 text-soft-white" aria-hidden="true" />
                  </button>
                </div>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-gray px-6 pb-4">
                  <SidebarContent />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-gray">
          <SidebarContent />
        </div>
      </div>
    </>
  )
}