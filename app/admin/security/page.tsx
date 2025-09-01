/**
 * Admin Security Page
 * Security monitoring and management interface
 */

import { Metadata } from 'next'
import SecurityDashboard from '@/components/admin/SecurityDashboard'

export const metadata: Metadata = {
  title: 'Security Dashboard - CMS Admin',
  description: 'Monitor security events and manage threats',
}

export default function SecurityPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <SecurityDashboard />
    </div>
  )
}