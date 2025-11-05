import { Metadata } from 'next'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/permissions'
import SystemHealthDashboard from '@/components/admin/SystemHealthDashboard'
import AlertConfigurationPanel from '@/components/admin/AlertConfigurationPanel'
import MonitoringServiceControl from '@/components/admin/MonitoringServiceControl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const metadata: Metadata = {
  title: 'System Health Monitoring - Admin Dashboard',
  description: 'Monitor system health, performance metrics, and alerts for the RBAC system'
}

export default async function SystemHealthPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/login')
  }

  // Check if user has permission to view system health monitoring
  if (session.user.role !== 'ADMIN') {
    redirect('/admin?error=insufficient_permissions')
  }

  const canManageAlerts = session.user.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Health Monitoring</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor the health and performance of the permission system and related components.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Health Dashboard</TabsTrigger>
          <TabsTrigger value="service" disabled={!canManageAlerts}>
            Service Control
          </TabsTrigger>
          <TabsTrigger value="alerts" disabled={!canManageAlerts}>
            Alert Configuration
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-6">
          <SystemHealthDashboard />
        </TabsContent>
        
        <TabsContent value="service" className="space-y-6">
          {canManageAlerts ? (
            <MonitoringServiceControl />
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-500">
                You don't have permission to manage monitoring service.
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="alerts" className="space-y-6">
          {canManageAlerts ? (
            <AlertConfigurationPanel />
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-500">
                You don't have permission to manage alert configurations.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}