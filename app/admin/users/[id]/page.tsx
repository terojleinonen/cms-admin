/**
 * Individual User Management Page
 * Detailed view and management interface for a specific user
 */

import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import UserDetailView from '@/components/admin/UserDetailView'
import UserActivityMonitor from '@/components/admin/UserActivityMonitor'

interface UserManagementPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: UserManagementPageProps): Promise<Metadata> {
  // In a real implementation, you'd fetch the user name for the title
  return {
    title: `User Management | Admin Dashboard`,
    description: 'Manage individual user account, roles, and activity',
  }
}

// Loading component for user detail view
function UserDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 w-20 bg-gray-200 rounded-t animate-pulse"></div>
            ))}
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Fetch user data server-side
async function fetchUserData(userId: string) {
  try {
    // In a real implementation, this would fetch from your database
    // For now, we'll return null and let the client component handle the API calls
    return null
  } catch (error) {
    console.error('Error fetching user data:', error)
    return null
  }
}

export default async function UserManagementPage({ params }: UserManagementPageProps) {
  // Check authentication and authorization
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }

  // Check if user has admin privileges
  if (session.user.role !== UserRole.ADMIN) {
    redirect('/dashboard')
  }

  // Validate user ID format
  if (!params.id || params.id.length < 1) {
    notFound()
  }

  // Fetch user data
  const userData = await fetchUserData(params.id)

  return (
    <div className="space-y-6">
      <Suspense fallback={<UserDetailLoading />}>
        <UserDetailView userId={params.id} initialData={userData} />
      </Suspense>
      
      <Suspense fallback={<div className="bg-white rounded-lg shadow p-6 animate-pulse h-96"></div>}>
        <UserActivityMonitor 
          userId={params.id}
          timeRange={{
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            endDate: new Date()
          }}
        />
      </Suspense>
    </div>
  )
}