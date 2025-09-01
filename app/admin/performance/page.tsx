/**
 * Performance monitoring page for admin dashboard
 * Provides comprehensive performance insights and optimization tools
 */

import { Metadata } from 'next'
import PerformanceDashboard from '@/components/admin/PerformanceDashboard'

export const metadata: Metadata = {
  title: 'Performance Dashboard - CMS Admin',
  description: 'Monitor and optimize system performance',
}

export default function PerformancePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PerformanceDashboard />
    </div>
  )
}