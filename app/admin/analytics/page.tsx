import { Metadata } from 'next';
import AnalyticsDashboard from '@/app/components/analytics/AnalyticsDashboard';

export const metadata: Metadata = {
  title: 'Analytics Dashboard - Kin Workspace CMS',
  description: 'Monitor performance and track key metrics across your content management system',
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <AnalyticsDashboard />
    </div>
  );
}