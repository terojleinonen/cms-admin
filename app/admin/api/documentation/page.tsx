import { Metadata } from 'next'
import { auth } from "@/auth"
import { redirect } from 'next/navigation'
import ApiDocumentation from '@/components/admin/ApiDocumentation'

export const metadata: Metadata = {
  title: 'API Documentation - Kin Workspace CMS',
  description: 'Interactive API documentation and testing interface',
}

export default async function ApiDocumentationPage() {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-matte-black font-satoshi">API Documentation</h1>
        <p className="text-slate-gray font-inter">
          Interactive documentation and testing interface for the CMS API
        </p>
      </div>

      <ApiDocumentation />
    </div>
  )
}