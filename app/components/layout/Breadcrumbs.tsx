/**
 * Breadcrumbs component
 * Provides navigation context showing the current page hierarchy
 */

'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface BreadcrumbItem {
  name: string
  href: string
  current: boolean
}

// Map of paths to readable names
const pathNameMap: Record<string, string> = {
  '/': 'Dashboard',
  '/admin': 'Admin',
  '/admin/products': 'Products',
  '/admin/categories': 'Categories',
  '/admin/pages': 'Pages',
  '/admin/analytics': 'Analytics',
  '/media': 'Media Library',
  '/users': 'Users',
  '/settings': 'Settings',
  '/profile': 'Profile',
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  // Always start with home/dashboard
  if (pathname !== '/') {
    breadcrumbs.push({
      name: 'Dashboard',
      href: '/',
      current: false,
    })
  }

  // Build breadcrumbs from path segments
  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1
    
    // Get readable name from map or format the segment
    const name = pathNameMap[currentPath] || 
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')

    breadcrumbs.push({
      name,
      href: currentPath,
      current: isLast,
    })
  })

  return breadcrumbs
}

export default function Breadcrumbs() {
  const pathname = usePathname()
  const breadcrumbs = generateBreadcrumbs(pathname)

  // Don't show breadcrumbs on the dashboard
  if (pathname === '/') {
    return null
  }

  return (
    <nav className="flex py-4" aria-label="Breadcrumb">
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
              <span className="text-sm font-medium text-matte-black font-satoshi">
                {breadcrumb.name}
              </span>
            ) : (
              <Link
                href={breadcrumb.href}
                className={clsx(
                  'text-sm font-medium text-slate-gray hover:text-matte-black font-inter transition-colors duration-200',
                  index === 0 && 'flex items-center'
                )}
              >
                {index === 0 && (
                  <HomeIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                )}
                {breadcrumb.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}