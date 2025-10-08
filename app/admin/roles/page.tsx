/**
 * Admin Roles Management Page
 * Comprehensive role configuration interface for managing RBAC system
 */

import { Metadata } from 'next'
import RoleConfigurationInterface from '@/components/admin/RoleConfigurationInterface'

export const metadata: Metadata = {
  title: 'Role Configuration - Admin Dashboard',
  description: 'Manage roles, permissions, and access control for the CMS system',
}

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Role Configuration</h1>
        <p className="mt-2 text-sm text-gray-700">
          Manage roles, permissions, and access control for your CMS system. Configure role hierarchies, 
          create custom roles, and fine-tune permissions for different user types.
        </p>
      </div>

      <RoleConfigurationInterface />
    </div>
  )
}