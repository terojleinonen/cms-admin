import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search Analytics - Kin Workspace CMS',
  description: 'Monitor search behavior and optimize content discoverability',
}

export default function SearchAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-matte-black font-satoshi">Search Analytics</h1>
        <p className="text-slate-gray font-inter">Monitor search behavior and optimize content discoverability</p>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-matte-black mb-4 font-satoshi">
          Search Performance
        </h3>
        <p className="text-slate-gray font-inter">
          Search analytics features will be available here. This includes search queries, 
          results performance, and content optimization recommendations.
        </p>
      </div>
    </div>
  )
}