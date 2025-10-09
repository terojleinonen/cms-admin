/**
 * Production Monitoring Page
 * Admin page for production RBAC system monitoring and maintenance
 */

import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/app/lib/permissions'
import ProductionMonitoringDashboard from '@/app/components/admin/ProductionMonitoringDashboard'

export const metadata: Metadata = {
  title: 'Production Monitoring - Admin Dashboard',
  description: 'Production monitoring and maintenance for RBAC system'
}

export default async function ProductionMonitoringPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  // Check if user has system management permissions
  if (!hasPermission(session.user, 'system', 'read')) {
    redirect('/admin')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductionMonitoringDashboard />
      </div>
    </div>
  )
}