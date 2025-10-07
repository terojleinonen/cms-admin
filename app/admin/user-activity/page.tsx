/**
 * User Activity Analysis Page
 * Admin interface for analyzing user behavior patterns
 */

import { Metadata } from 'next'
import { UserActivityAnalysis } from '@/app/components/admin/UserActivityAnalysis'

export const metadata: Metadata = {
  title: 'User Activity Analysis | Admin Dashboard',
  description: 'Analyze user behavior patterns and identify potential risks',
}

export default function UserActivityPage() {
  return <UserActivityAnalysis />
}