/**
 * Scalability Monitoring Page
 * Admin page for viewing scalability metrics and system performance
 */

import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/lib/auth-utils';
import { hasPermission } from '@/app/lib/has-permission';
import ScalabilityMonitoringDashboard from '@/app/components/admin/ScalabilityMonitoringDashboard';

export const metadata: Metadata = {
  title: 'Scalability Monitoring - Admin Dashboard',
  description: 'Monitor concurrent users, database performance, and system resources',
};

export default async function ScalabilityMonitoringPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  // Check monitoring permissions
  if (!hasPermission(session.user, { resource: 'monitoring', action: 'read', scope: 'all' })) {
    redirect('/admin?error=insufficient_permissions');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ScalabilityMonitoringDashboard />
      </div>
    </div>
  );
}