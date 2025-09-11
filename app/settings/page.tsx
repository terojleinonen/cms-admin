/**
 * Settings page
 * Provides system configuration interface for admin users
 */

import { Metadata } from 'next'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import SettingsPanel from '@/components/settings/SettingsPanel'

export const metadata: Metadata = {
  title: 'Settings - Kin Workspace CMS',
  description: 'Configure system settings and preferences',
}

export default async function SettingsPage() {
  const session = await auth()
  
  // Only admin users can access settings
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/')
  }

  return (
    <div className="space-y-6">
      <SettingsPanel />
    </div>
  )
}