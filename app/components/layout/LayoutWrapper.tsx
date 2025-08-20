/**
 * Layout wrapper component
 * Handles switching between auth layout and admin layout based on route
 */

'use client'

import { usePathname } from 'next/navigation'
import AdminLayout from './AdminLayout'

interface LayoutWrapperProps {
  children: React.ReactNode
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname()
  
  // Use simple layout for auth pages
  if (pathname.startsWith('/auth/')) {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    )
  }
  
  // Use admin layout for all other pages
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  )
}