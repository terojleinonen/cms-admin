/**
 * Admin Security Page
 * Security monitoring and management interface
 */

import { Metadata } from 'next'
import { SecurityMonitoringDashboard } from '@/components/admin/SecurityMonitoringDashboard'

export const metadata: Metadata = {
  title: 'Security Monitoring - CMS Admin',
  description: 'Real-time security event monitoring and alerting',
}

export default function SecurityPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <SecurityMonitoringDashboard />
    </div>
  )
}