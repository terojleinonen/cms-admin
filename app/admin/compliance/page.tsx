/**
 * Compliance Management Page
 * Admin interface for compliance reporting and audit trail management
 */

import { Metadata } from 'next'
import { ComplianceDashboard } from '@/app/components/admin/ComplianceDashboard'

export const metadata: Metadata = {
  title: 'Compliance Management | Admin Dashboard',
  description: 'Monitor compliance status and generate audit reports',
}

export default function CompliancePage() {
  return <ComplianceDashboard />
}