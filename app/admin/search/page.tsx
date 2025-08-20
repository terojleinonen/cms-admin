import { Suspense } from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search - Kin Workspace CMS',
  description: 'Search products, pages, and media content',
}

interface SearchPageProps {
  searchParams: {
    q?: string
    type?: string
    category?: string
    status?: string
  }
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const initialQuery = searchParams.q || ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-matte-black font-satoshi">Search</h1>
        <p className="text-slate-gray font-inter">
          Find products, pages, and media content across your CMS
        </p>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-matte-black mb-4 font-satoshi">
          Search Content
        </h3>
        {initialQuery ? (
          <p className="text-slate-gray font-inter">
            Searching for: &quot;{initialQuery}&quot;
          </p>
        ) : (
          <p className="text-slate-gray font-inter">
            Search functionality will be available here. Enter a query to find products, 
            pages, and media content across your CMS.
          </p>
        )}
      </div>
    </div>
  )
}