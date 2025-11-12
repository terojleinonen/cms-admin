/**
 * Scalability Monitoring Page
 * Admin page for viewing scalability metrics and system performance
 */

import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/has-permission';
import ScalabilityMonitoringDashboard from '@/components/admin/ScalabilityMonitoringDashboard';

export const metadata: Metadata = {
  title: 'Scalability Monitoring - Admin Dashboard',
  description: 'Monitor concurrent users, database performance, and system resources',
};

export default async function ScalabilityMonitoringPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  // Check monitoring permissions
  if (session.user.role !== 'ADMIN') {
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