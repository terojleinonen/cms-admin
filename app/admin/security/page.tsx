/**
 * System Security Monitoring Page
 * Comprehensive security dashboard for monitoring system-wide security events and metrics
 */

import { Suspense } from 'react'
import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import SecurityDashboard from '@/app/components/admin/SecurityDashboard'
import UserActivityMonitor from '@/app/components/admin/UserActivityMonitor'

export const metadata: Metadata = {
  title: 'Security Monitoring | Admin Dashboard',
  description: 'Monitor system security events, threats, and user activity',
}

// Loading component for security dashboard
function SecurityDashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>
        <div className="flex space-x-2">
          <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
      </div>

      {/* Security metrics skeleton */}
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

      {/* Security alerts skeleton */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity monitor skeleton */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Fetch initial security data server-side
async function fetchInitialSecurityData() {
  try {
    // In a real implementation, this would fetch from your database
    // For now, we'll return empty data and let the client component handle the API calls
    return {
      metrics: {
        totalUsers: 0,
        activeUsers: 0,
        suspiciousActivity: 0,
        securityAlerts: 0,
      },
      recentAlerts: [],
      systemHealth: {
        status: 'healthy',
        uptime: '99.9%',
        lastIncident: null,
      },
    }
  } catch (error) {
    console.error('Error fetching initial security data:', error)
    return {
      metrics: {
        totalUsers: 0,
        activeUsers: 0,
        suspiciousActivity: 0,
        securityAlerts: 0,
      },
      recentAlerts: [],
      systemHealth: {
        status: 'unknown',
        uptime: 'N/A',
        lastIncident: null,
      },
    }
  }
}

export default async function SecurityMonitoringPage() {
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
  const initialData = await fetchInitialSecurityData()

  return (
    <div className="space-y-6">
      <Suspense fallback={<SecurityDashboardLoading />}>
        <SecurityDashboard initialData={initialData} />
      </Suspense>
      
      <Suspense fallback={<div className="bg-white rounded-lg shadow p-6 animate-pulse h-96"></div>}>
        <UserActivityMonitor 
          timeRange={{
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            endDate: new Date()
          }}
          className="mt-6"
        />
      </Suspense>
    </div>
  )
}