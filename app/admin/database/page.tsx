import { Metadata } from 'next'
import { auth } from "@/auth"
import { redirect } from 'next/navigation'
import DatabaseMonitoringDashboard from '@/components/admin/DatabaseMonitoringDashboard'

export const metadata: Metadata = {
  title: 'Database Monitoring - CMS Admin',
  description: 'Monitor database health, performance, and configuration',
}

export default async function DatabasePage() {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Database Monitoring</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor database health, performance metrics, and configuration settings.
        </p>
      </div>

      <DatabaseMonitoringDashboard />
    </div>
  )
}