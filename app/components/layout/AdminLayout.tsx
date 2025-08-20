/**
 * Admin layout component
 * Provides the main layout structure for the CMS with sidebar and header
 */

'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from './Sidebar'
import Header from './Header'
import Breadcrumbs from './Breadcrumbs'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session, status } = useSession()

  // Show loading state while session is loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dusty-sage"></div>
      </div>
    )
  }

  // Redirect to login if not authenticated (handled by middleware, but good fallback)
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-matte-black mb-2 font-satoshi">
            Authentication Required
          </h2>
          <p className="text-slate-gray font-inter">
            Please sign in to access the CMS.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-soft-white">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-slate-gray bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        userRole={session?.user?.role}
      />

      {/* Main content area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Header */}
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
          user={session?.user}
        />

        {/* Main content */}
        <main className="flex-1">
          {/* Breadcrumbs */}
          <div className="bg-soft-white border-b border-warm-beige">
            <div className="px-4 sm:px-6 lg:px-8">
              <Breadcrumbs />
            </div>
          </div>

          {/* Page content */}
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}