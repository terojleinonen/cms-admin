import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Integration - Kin Workspace CMS',
  description: 'Manage API integrations and documentation',
}

export default function ApiIntegrationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-matte-black font-satoshi">API Integration</h1>
        <p className="text-slate-gray font-inter">Manage API integrations and documentation</p>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-matte-black mb-4 font-satoshi">
          API Documentation
        </h3>
        <p className="text-slate-gray font-inter">
          API integration features will be available here. This includes API key management, 
          endpoint documentation, and integration guides.
        </p>
      </div>
    </div>
  )
}