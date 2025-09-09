import { Metadata } from 'next'
import { auth } from "@/auth"
import { redirect } from 'next/navigation'
import ApiKeyManager from '@/components/admin/ApiKeyManager'

export const metadata: Metadata = {
  title: 'API Keys - Kin Workspace CMS',
  description: 'Manage API keys and permissions',
}

export default async function ApiKeysPage() {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-matte-black font-satoshi">API Keys</h1>
          <p className="text-slate-gray font-inter">
            Create and manage API keys for external integrations
          </p>
        </div>
      </div>

      <ApiKeyManager />
    </div>
  )
}