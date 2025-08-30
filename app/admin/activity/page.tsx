/**
 * Admin Activity Monitor Page
 * Demonstrates the UserActivityMonitor component
 */

import { Metadata } from 'next'
import UserActivityMonitor from '@/components/admin/UserActivityMonitor'

export const metadata: Metadata = {
  title: 'User Activity Monitor - Admin Dashboard',
  description: 'Monitor user activity and security events across the system',
}

export default function ActivityMonitorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Activity Monitor</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor and track user activities, security events, and system access logs.
        </p>
      </div>

      <UserActivityMonitor />
    </div>
  )
}