import { Metadata } from 'next'
import { auth } from "@/auth"
import { redirect } from 'next/navigation'
import ApiManagementDashboard from '@/components/admin/ApiManagementDashboard'

export const metadata: Metadata = {
  title: 'API Management - Kin Workspace CMS',
  description: 'Manage API keys, documentation, and analytics',
}

export default async function ApiManagementPage() {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-matte-black font-satoshi">API Management</h1>
        <p className="text-slate-gray font-inter">
          Manage API keys, view documentation, and monitor API usage
        </p>
      </div>

      <ApiManagementDashboard />
    </div>
  )
}