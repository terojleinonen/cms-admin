import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Performance Monitoring - Kin Workspace CMS',
  description: 'Monitor system performance and optimization metrics',
}

export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-matte-black font-satoshi">Performance Monitoring</h1>
        <p className="text-slate-gray font-inter">Monitor system performance and optimization metrics</p>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-matte-black mb-4 font-satoshi">
          System Performance
        </h3>
        <p className="text-slate-gray font-inter">
          Performance monitoring features will be available here. This includes system metrics, 
          load times, database performance, and optimization recommendations.
        </p>
      </div>
    </div>
  )
}