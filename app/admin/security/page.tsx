import { Metadata } from 'next';
import { SecurityMonitoringDashboard } from '../../components/admin/SecurityMonitoringDashboard';

export const metadata: Metadata = {
  title: 'Security Monitoring | Admin Dashboard',
  description: 'Real-time security monitoring and threat detection dashboard',
};

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Security Monitoring</h1>
        <p className="mt-2 text-gray-600">
          Monitor security events, detect threats, and manage incidents in real-time.
        </p>
      </div>
      
      <SecurityMonitoringDashboard />
    </div>
  );
}