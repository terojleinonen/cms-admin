import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import CreateApiKeyForm from '@/components/admin/CreateApiKeyForm'

export const metadata: Metadata = {
  title: 'Create API Key - Kin Workspace CMS',
  description: 'Create a new API key for external integrations',
}

export default async function CreateApiKeyPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-matte-black font-satoshi">Create API Key</h1>
        <p className="text-slate-gray font-inter">
          Generate a new API key with specific permissions for external integrations
        </p>
      </div>

      <CreateApiKeyForm />
    </div>
  )
}