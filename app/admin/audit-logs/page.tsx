/**
 * Audit Logs Admin Page
 * Comprehensive audit log management and analysis interface
 */

import { Metadata } from 'next'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/has-permission'
import AuditLogAnalytics from '@/components/admin/AuditLogAnalytics'
import AuditLogViewer from '@/components/admin/AuditLogViewer'

export const metadata: Metadata = {
  title: 'Audit Logs - Admin Dashboard',
  description: 'View and analyze audit logs and security events',
}

export default async function AuditLogsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/login')
  }

  // Check if user has permission to view audit logs
  if (!await hasPermission(session.user, 'system', 'read')) {
    redirect('/admin')
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-2 text-gray-600">
          Monitor system activity, security events, and user actions with comprehensive audit trail analysis.
        </p>
      </div>

      {/* Analytics Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Analytics & Insights</h2>
          <p className="text-gray-600">
            Comprehensive analysis of audit logs with security monitoring and compliance reporting.
          </p>
        </div>
        <AuditLogAnalytics />
      </section>

      {/* Audit Log Viewer Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Audit Log Viewer</h2>
          <p className="text-gray-600">
            Search, filter, and examine individual audit log entries in detail.
          </p>
        </div>
        <AuditLogViewer />
      </section>
    </div>
  )
}