/**
 * Admin User Management Dashboard
 * Main interface for managing users with comprehensive user management capabilities
 */

import { Suspense } from 'react'
import { Metadata } from 'next'
import UserManagement from '@/components/admin/UserManagement'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'

export const metadata: Metadata = {
  title: 'User Management | Admin Dashboard',
  description: 'Manage user accounts, roles, and permissions',
}

// Loading component for user management
function UserManagementLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded w-12 animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Fetch initial user data server-side
async function fetchInitialUsers() {
  try {
    // In a real implementation, this would fetch from your database
    // For now, we'll return empty data and let the client component handle the API calls
    return {
      users: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    }
  } catch (error) {
    console.error('Error fetching initial users:', error)
    return {
      users: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    }
  }
}

export default async function UserManagementPage() {
  // Check authentication and authorization
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }

  // Check if user has admin privileges
  if (session.user.role !== UserRole.ADMIN) {
    redirect('/dashboard')
  }

  // Fetch initial data
  const initialData = await fetchInitialUsers()

  return (
    <div className="space-y-6">
      <Suspense fallback={<UserManagementLoading />}>
        <UserManagement 
          initialUsers={initialData.users}
          initialPagination={initialData.pagination}
        />
      </Suspense>
    </div>
  )
}