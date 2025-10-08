/**
 * User Activity Monitoring Page
 * Enhanced admin interface for real-time user activity monitoring and analytics
 */

import { Metadata } from 'next'
import UserActivityDashboard from '@/app/components/admin/UserActivityDashboard'

export const metadata: Metadata = {
  title: 'User Activity Monitoring | Admin Dashboard',
  description: 'Real-time user activity monitoring with permission analytics and behavior analysis',
}

export default function UserActivityPage() {
  return <UserActivityDashboard />
}