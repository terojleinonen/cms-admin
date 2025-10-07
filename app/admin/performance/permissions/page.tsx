import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../api/auth/[...nextauth]/route';
import { permissionService } from '../../../lib/permissions';
import { redirect } from 'next/navigation';
import PermissionPerformanceDashboard from '../../../components/admin/PermissionPerformanceDashboard';

export const metadata: Metadata = {
  title: 'Permission Performance Monitoring | Admin Dashboard',
  description: 'Monitor permission system performance, cache metrics, and alerts',
};

export default async function PermissionPerformancePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  // Check if user has permission to view performance monitoring
  if (!permissionService.hasResourceAccess(session.user, 'monitoring', 'read')) {
    redirect('/admin');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Permission Performance Monitoring</h1>
        <p className="mt-2 text-sm text-gray-700">
          Monitor permission check latency, cache performance, and system alerts in real-time.
        </p>
      </div>

      <PermissionPerformanceDashboard />
    </div>
  );
}