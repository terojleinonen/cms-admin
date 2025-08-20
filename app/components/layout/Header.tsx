/**
 * Header component
 * Provides the top navigation bar with user menu and logout functionality
 */

'use client'

import { Fragment } from 'react'
import { signOut } from 'next-auth/react'
import { Menu, Transition } from '@headlessui/react'
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { UserRole } from '@prisma/client'
import clsx from 'clsx'

interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

interface HeaderProps {
  onMenuClick: () => void
  user?: User
}

const userNavigation = [
  { name: 'Your Profile', href: '/profile', icon: UserCircleIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
]

export default function Header({ onMenuClick, user }: HeaderProps) {
  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/auth/login' })
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

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
        {/* Search bar placeholder */}
        <div className="flex flex-1 items-center">
          <div className="w-full max-w-lg">
            {/* Search functionality can be added here later */}
          </div>
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Notifications button */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-slate-gray hover:text-matte-black transition-colors duration-200"
          >
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div
            className="hidden lg:block lg:h-6 lg:w-px lg:bg-warm-beige"
            aria-hidden="true"
          />

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="-m-1.5 flex items-center p-1.5 hover:bg-warm-beige rounded-lg transition-colors duration-200">
              <span className="sr-only">Open user menu</span>
              <div className="h-8 w-8 rounded-full bg-dusty-sage flex items-center justify-center">
                <span className="text-sm font-medium text-soft-white font-inter">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
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
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-56 origin-top-right rounded-md bg-soft-white py-2 shadow-lg ring-1 ring-warm-beige focus:outline-none">
                {/* User info */}
                <div className="px-4 py-3 border-b border-warm-beige">
                  <p className="text-sm font-medium text-matte-black font-satoshi">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-sm text-slate-gray truncate font-inter">
                    {user?.email || 'user@example.com'}
                  </p>
                  <p className="text-xs text-slate-gray mt-1 font-inter">
                    {user?.role || 'Unknown'} Role
                  </p>
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

                {/* Sign out */}
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
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </div>
  )
}