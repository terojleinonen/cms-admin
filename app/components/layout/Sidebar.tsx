/**
 * Sidebar Navigation Component for Kin Workspace CMS
 * 
 * This component provides a responsive sidebar navigation with role-based access control.
 * It displays different navigation items based on the user's role (ADMIN, EDITOR, VIEWER)
 * and includes both mobile and desktop layouts with smooth transitions.
 * 
 * Features:
 * - Role-based navigation filtering
 * - Responsive design (mobile overlay + desktop fixed)
 * - Active state highlighting
 * - Hierarchical navigation sections
 * - User role indicator
 * - Smooth animations and transitions
 * 
 * @module Sidebar
 * @version 1.0.0
 * @author Kin Workspace CMS Team
 * @since 2024-01-01
 * 
 * @example
 * ```tsx
 * import Sidebar from '@/components/layout/Sidebar'
 * 
 * function AdminLayout() {
 *   const [sidebarOpen, setSidebarOpen] = useState(false)
 *   const { data: session } = useSession()
 * 
 *   return (
 *     <div>
 *       <Sidebar 
 *         isOpen={sidebarOpen}
 *         onClose={() => setSidebarOpen(false)}
 *         userRole={session?.user?.role}
 *       />
 *       // ... rest of layout
 *     </div>
 *   )
 * }
 * ```
 */

'use client'

import { Fragment } from 'react'
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
} from '@heroicons/react/24/outline'
import { UserRole } from '@prisma/client'
import clsx from 'clsx'

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
  /** Minimum required role to access this item */
  requiredRole?: UserRole
  /** Optional badge text (e.g., "New", "Beta") */
  badge?: string
}

/**
 * Sidebar component props interface
 */
interface SidebarProps {
  /** Whether the mobile sidebar is open */
  isOpen: boolean
  /** Callback function to close the mobile sidebar */
  onClose: () => void
  /** Current user's role for permission checking */
  userRole?: UserRole
}

/**
 * Main navigation items configuration
 * These items are available to users based on their role permissions
 */
const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: HomeIcon,
  },
  {
    name: 'Products',
    href: '/admin/products',
    icon: CubeIcon,
    requiredRole: UserRole.EDITOR,
  },
  {
    name: 'Orders',
    href: '/orders',
    icon: ShoppingBagIcon,
    requiredRole: UserRole.EDITOR,
  },
  {
    name: 'Categories',
    href: '/admin/categories',
    icon: TagIcon,
    requiredRole: UserRole.EDITOR,
  },
  {
    name: 'Media Library',
    href: '/media',
    icon: PhotoIcon,
    requiredRole: UserRole.EDITOR,
  },
  {
    name: 'Pages',
    href: '/admin/pages',
    icon: DocumentTextIcon,
    requiredRole: UserRole.EDITOR,
  },
  {
    name: 'Users',
    href: '/users',
    icon: UsersIcon,
    requiredRole: UserRole.EDITOR,
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: ChartBarIcon,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: CogIcon,
    requiredRole: UserRole.ADMIN,
  },
]

/**
 * Admin-only navigation items (shown in a separate section)
 * These items are only visible to users with ADMIN role
 */
const adminNavigation: NavigationItem[] = [
  {
    name: 'User Management',
    href: '/admin/users',
    icon: UsersIcon,
    requiredRole: UserRole.ADMIN,
  },
  {
    name: 'Database Monitor',
    href: '/admin/database',
    icon: CircleStackIcon,
    requiredRole: UserRole.ADMIN,
  },
  {
    name: 'Security Monitor',
    href: '/admin/security',
    icon: ShieldCheckIcon,
    requiredRole: UserRole.ADMIN,
  },
  {
    name: 'API Management',
    href: '/admin/api',
    icon: ServerIcon,
    requiredRole: UserRole.ADMIN,
  },
  {
    name: 'Backup & Restore',
    href: '/admin/backup',
    icon: ShieldCheckIcon,
    requiredRole: UserRole.ADMIN,
  },
  {
    name: 'Performance',
    href: '/admin/performance',
    icon: ChartBarIcon,
    requiredRole: UserRole.ADMIN,
  },
  {
    name: 'Search Management',
    href: '/admin/search',
    icon: MagnifyingGlassIcon,
    requiredRole: UserRole.ADMIN,
  },
  {
    name: 'Workflow',
    href: '/admin/workflow',
    icon: DocumentTextIcon,
    requiredRole: UserRole.ADMIN,
  },
]

/**
 * Check if user has permission to access a navigation item
 * 
 * Uses role hierarchy where ADMIN > EDITOR > VIEWER.
 * Users can access items that require their role level or lower.
 * 
 * @param userRole - Current user's role
 * @param requiredRole - Minimum required role for the item
 * @returns boolean - True if user has permission
 */
function hasPermission(userRole: UserRole | undefined, requiredRole?: UserRole): boolean {
  // If no role is required, everyone can access
  if (!requiredRole) return true
  
  // If user has no role, deny access to protected items
  if (!userRole) return false

  // Role hierarchy: ADMIN (3) > EDITOR (2) > VIEWER (1)
  const roleHierarchy = {
    [UserRole.VIEWER]: 1,
    [UserRole.EDITOR]: 2,
    [UserRole.ADMIN]: 3,
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

/**
 * Sidebar content component
 * 
 * Renders the sidebar navigation content including logo, navigation items,
 * and user role indicator. This component is shared between mobile and desktop layouts.
 * 
 * @param userRole - Current user's role for filtering navigation items
 */
function SidebarContent({ userRole }: { userRole?: UserRole }) {
  const pathname = usePathname()

  const filteredNavigation = navigation.filter(item => 
    hasPermission(userRole, item.requiredRole)
  )

  const filteredAdminNavigation = adminNavigation.filter(item => 
    hasPermission(userRole, item.requiredRole)
  )

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 bg-matte-black">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-dusty-sage rounded-lg flex items-center justify-center">
              <span className="text-soft-white font-bold text-sm font-satoshi">K</span>
            </div>
          </div>
          <div className="ml-3">
            <h1 className="text-soft-white font-semibold text-lg font-satoshi">Kin Workspace</h1>
            <p className="text-warm-beige text-xs font-inter">CMS</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 bg-slate-gray overflow-y-auto">
        {/* Main Navigation */}
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'sidebar-link',
                isActive && 'active'
              )}
            >
              <item.icon
                className={clsx(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive
                    ? 'text-soft-white'
                    : 'text-warm-beige'
                )}
              />
              {item.name}
              {item.badge && (
                <span className="ml-auto inline-block py-0.5 px-2 text-xs font-medium rounded-full bg-dusty-sage text-soft-white font-inter">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}

        {/* Admin Section */}
        {filteredAdminNavigation.length > 0 && (
          <>
            <div className="pt-6 pb-2">
              <div className="px-3">
                <h3 className="text-xs font-semibold text-warm-beige uppercase tracking-wider font-inter">
                  Admin Tools
                </h3>
              </div>
            </div>
            {filteredAdminNavigation.map((item) => {
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'sidebar-link',
                    isActive && 'active'
                  )}
                >
                  <item.icon
                    className={clsx(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive
                        ? 'text-soft-white'
                        : 'text-warm-beige'
                    )}
                  />
                  {item.name}
                  {item.badge && (
                    <span className="ml-auto inline-block py-0.5 px-2 text-xs font-medium rounded-full bg-dusty-sage text-soft-white font-inter">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User role indicator */}
      <div className="px-4 py-4 bg-matte-black border-t border-slate-gray">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={clsx(
              'w-2 h-2 rounded-full',
              userRole === UserRole.ADMIN ? 'bg-dusty-sage' :
              userRole === UserRole.EDITOR ? 'bg-warm-beige' :
              'bg-soft-white'
            )} />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-warm-beige font-inter">
              {userRole || 'Unknown'} Role
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Main Sidebar component
 * 
 * Provides responsive sidebar navigation with role-based access control.
 * Includes both mobile overlay and desktop fixed layouts with smooth transitions.
 * 
 * The sidebar automatically filters navigation items based on user permissions
 * and highlights the current active page.
 * 
 * @param props - Sidebar component props
 * @param props.isOpen - Whether mobile sidebar is open
 * @param props.onClose - Callback to close mobile sidebar
 * @param props.userRole - Current user's role for permission filtering
 * @returns JSX.Element - Rendered sidebar component
 */
export default function Sidebar({ isOpen, onClose, userRole }: SidebarProps) {
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
                  <SidebarContent userRole={userRole} />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-gray">
          <SidebarContent userRole={userRole} />
        </div>
      </div>
    </>
  )
}