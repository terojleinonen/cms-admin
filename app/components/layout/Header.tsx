/**
 * Enhanced Header Component for Kin Workspace CMS
 * 
 * Provides a comprehensive top navigation bar with advanced features including
 * global search, notifications, user management, and quick actions.
 * 
 * Features:
 * - Global search with keyboard shortcuts
 * - Real-time notifications with badge counts
 * - Enhanced user menu with role indicators
 * - Quick action buttons for common tasks
 * - Responsive design with mobile optimization
 * - Accessibility support with ARIA labels
 * - Theme and preference indicators
 * 
 * @module Header
 * @version 2.0.0
 * @author Kin Workspace CMS Team
 * @since 2024-02-09
 */

'use client'

import { Fragment, useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { Menu, Transition, Combobox } from '@headlessui/react'
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  CommandLineIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { UserRole } from '@prisma/client'
import clsx from 'clsx'

/**
 * Enhanced user interface with additional properties
 */
interface User {
  id: string
  name: string
  email: string
  role: UserRole
  profilePicture?: string
  twoFactorEnabled?: boolean
  lastLoginAt?: string
}

/**
 * Header component props interface
 */
interface HeaderProps {
  /** Callback to open mobile sidebar */
  onMenuClick: () => void
  /** Current user information */
  user?: User
}

/**
 * Search result interface for global search
 */
interface SearchResult {
  id: string
  title: string
  type: 'product' | 'user' | 'page' | 'category'
  url: string
  description?: string
}

/**
 * Notification interface
 */
interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: string
  read: boolean
  actionUrl?: string
}

/**
 * Enhanced user navigation with additional options
 */
const userNavigation = [
  { name: 'Your Profile', href: '/profile', icon: UserCircleIcon },
  { name: 'Account Settings', href: '/profile/settings', icon: Cog6ToothIcon },
  { name: 'Security', href: '/profile/security', icon: Cog6ToothIcon },
]

/**
 * Quick action buttons for common tasks
 */
const quickActions = [
  { 
    id: 'new-product', 
    label: 'New Product', 
    icon: PlusIcon, 
    href: '/admin/products/new',
    shortcut: 'Cmd+Shift+P'
  },
  { 
    id: 'new-user', 
    label: 'New User', 
    icon: PlusIcon, 
    href: '/admin/users/new',
    shortcut: 'Cmd+Shift+U'
  },
]

/**
 * Global search component
 */
function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)

  // Mock search results - replace with actual search API
  const mockResults: SearchResult[] = [
    { id: '1', title: 'Ergonomic Chair', type: 'product', url: '/admin/products/1', description: 'Office furniture' },
    { id: '2', title: 'John Doe', type: 'user', url: '/admin/users/2', description: 'Admin user' },
    { id: '3', title: 'About Us', type: 'page', url: '/admin/pages/3', description: 'Company information' },
  ]

  useEffect(() => {
    if (query.length > 2) {
      // Simulate search delay
      const timer = setTimeout(() => {
        setResults(mockResults.filter(item => 
          item.title.toLowerCase().includes(query.toLowerCase())
        ))
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setResults([])
    }
  }, [query])

  return (
    <Combobox value="" onChange={() => {}}>
      <div className="relative">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Combobox.Input
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Search... (Cmd+K)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            ⌘K
          </kbd>
        </div>

        {isOpen && results.length > 0 && (
          <Combobox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {results.map((result) => (
              <Combobox.Option
                key={result.id}
                value={result}
                className={({ active }) =>
                  clsx(
                    'relative cursor-pointer select-none py-2 px-4',
                    active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                  )
                }
              >
                <div className="flex items-center">
                  <div className="flex-1">
                    <div className="font-medium">{result.title}</div>
                    <div className="text-sm text-gray-500">
                      {result.type} • {result.description}
                    </div>
                  </div>
                </div>
              </Combobox.Option>
            ))}
          </Combobox.Options>
        )}
      </div>
    </Combobox>
  )
}

/**
 * Notifications dropdown component
 */
function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'New Order',
      message: 'Order #1234 has been placed',
      type: 'info',
      timestamp: '2 minutes ago',
      read: false,
      actionUrl: '/orders/1234'
    },
    {
      id: '2',
      title: 'Low Stock Alert',
      message: 'Ergonomic Chair is running low',
      type: 'warning',
      timestamp: '1 hour ago',
      read: false,
      actionUrl: '/admin/products/chair'
    }
  ])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="relative -m-2.5 p-2.5 text-slate-gray hover:text-matte-black transition-colors duration-200">
        <span className="sr-only">View notifications</span>
        <BellIcon className="h-6 w-6" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2.5 w-80 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-200 focus:outline-none">
          <div className="px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          </div>
          
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No notifications
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {notifications.map((notification) => (
                <Menu.Item key={notification.id}>
                  {({ active }) => (
                    <div
                      className={clsx(
                        'px-4 py-3 cursor-pointer',
                        active ? 'bg-gray-50' : '',
                        !notification.read ? 'bg-blue-50' : ''
                      )}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {notification.timestamp}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 mt-1" />
                        )}
                      </div>
                    </div>
                  )}
                </Menu.Item>
              ))}
            </div>
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  )
}

/**
 * Enhanced Header component with improved UX
 */
export default function Header({ onMenuClick, user }: HeaderProps) {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'system'>('system')

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/auth/login' })
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const toggleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(currentTheme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    setCurrentTheme(nextTheme)
    // TODO: Implement actual theme switching
  }

  const getThemeIcon = () => {
    switch (currentTheme) {
      case 'light': return SunIcon
      case 'dark': return MoonIcon
      default: return ComputerDesktopIcon
    }
  }

  const ThemeIcon = getThemeIcon()

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-warm-beige bg-soft-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-slate-gray lg:hidden hover:text-matte-black transition-colors duration-200"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-warm-beige lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Global search */}
        <div className="flex flex-1 items-center">
          <div className="w-full max-w-lg">
            <GlobalSearch />
          </div>
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Quick actions */}
          <div className="hidden md:flex items-center gap-x-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => window.location.href = action.href}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title={`${action.label} (${action.shortcut})`}
              >
                <action.icon className="h-3 w-3 mr-1" />
                {action.label}
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="-m-2.5 p-2.5 text-slate-gray hover:text-matte-black transition-colors duration-200"
            title={`Current theme: ${currentTheme}`}
          >
            <span className="sr-only">Toggle theme</span>
            <ThemeIcon className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Notifications */}
          <NotificationsDropdown />

          {/* Separator */}
          <div
            className="hidden lg:block lg:h-6 lg:w-px lg:bg-warm-beige"
            aria-hidden="true"
          />

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="-m-1.5 flex items-center p-1.5 hover:bg-warm-beige rounded-lg transition-colors duration-200">
              <span className="sr-only">Open user menu</span>
              {user?.profilePicture ? (
                <img
                  className="h-8 w-8 rounded-full object-cover"
                  src={user.profilePicture}
                  alt={user.name}
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-dusty-sage flex items-center justify-center">
                  <span className="text-sm font-medium text-soft-white font-inter">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <span className="hidden lg:flex lg:items-center">
                <span
                  className="ml-4 text-sm font-semibold leading-6 text-matte-black font-satoshi"
                  aria-hidden="true"
                >
                  {user?.name || 'User'}
                </span>
                <svg
                  className="ml-2 h-5 w-5 text-slate-gray"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-64 origin-top-right rounded-md bg-soft-white py-2 shadow-lg ring-1 ring-warm-beige focus:outline-none">
                {/* Enhanced user info */}
                <div className="px-4 py-3 border-b border-warm-beige">
                  <div className="flex items-center">
                    {user?.profilePicture ? (
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={user.profilePicture}
                        alt={user.name}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-dusty-sage flex items-center justify-center">
                        <span className="text-lg font-medium text-soft-white font-inter">
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-matte-black font-satoshi">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-sm text-slate-gray truncate font-inter">
                        {user?.email || 'user@example.com'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={clsx(
                      'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full',
                      user?.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                      user?.role === 'EDITOR' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    )}>
                      {user?.role || 'Unknown'}
                    </span>
                    {user?.twoFactorEnabled && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        2FA Enabled
                      </span>
                    )}
                  </div>
                  {user?.lastLoginAt && (
                    <p className="text-xs text-slate-gray mt-1 font-inter">
                      Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Navigation items */}
                {userNavigation.map((item) => (
                  <Menu.Item key={item.name}>
                    {({ active }) => (
                      <a
                        href={item.href}
                        className={clsx(
                          active ? 'bg-warm-beige' : '',
                          'flex items-center px-4 py-2 text-sm text-slate-gray font-inter hover:bg-warm-beige hover:text-matte-black transition-colors duration-200'
                        )}
                      >
                        <item.icon className="mr-3 h-4 w-4 text-slate-gray" />
                        {item.name}
                      </a>
                    )}
                  </Menu.Item>
                ))}

                {/* Keyboard shortcuts */}
                <Menu.Item>
                  {({ active }) => (
                    <button
                      type="button"
                      onClick={() => {
                        const event = new CustomEvent('show-shortcuts')
                        document.dispatchEvent(event)
                      }}
                      className={clsx(
                        active ? 'bg-warm-beige' : '',
                        'flex w-full items-center px-4 py-2 text-sm text-slate-gray font-inter hover:bg-warm-beige hover:text-matte-black transition-colors duration-200'
                      )}
                    >
                      <CommandLineIcon className="mr-3 h-4 w-4 text-slate-gray" />
                      Keyboard Shortcuts
                      <kbd className="ml-auto text-xs text-gray-400">?</kbd>
                    </button>
                  )}
                </Menu.Item>

                {/* Sign out */}
                <div className="border-t border-warm-beige mt-2 pt-2">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className={clsx(
                          active ? 'bg-warm-beige' : '',
                          'flex w-full items-center px-4 py-2 text-sm text-slate-gray font-inter hover:bg-warm-beige hover:text-matte-black transition-colors duration-200'
                        )}
                      >
                        <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4 text-slate-gray" />
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </div>
  )
}