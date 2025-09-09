import { Metadata } from 'next'
import { auth } from "@/auth"
import { redirect } from 'next/navigation'
import ApiAnalytics from '@/components/admin/ApiAnalytics'

export const metadata: Metadata = {
  title: 'API Analytics - Kin Workspace CMS',
  description: 'Monitor API usage, performance, and analytics',
}

export default async function ApiAnalyticsPage() {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-matte-black font-satoshi">API Analytics</h1>
        <p className="text-slate-gray font-inter">
          Monitor API usage patterns, performance metrics, and usage analytics
        </p>
      </div>

      <ApiAnalytics />
    </div>
  )
}