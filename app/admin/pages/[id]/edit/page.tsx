/**
 * Edit Page
 * Interface for editing existing content pages
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import PageForm from '@/app/components/pages/PageForm'
import { Page } from '@/app/lib/types'

interface EditPagePageProps {
  params: Promise<{ id: string }>
}

export default function EditPagePage({ params }: EditPagePageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPage()
  }, [id])

  const fetchPage = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/pages/${id}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Page not found')
        }
        throw new Error('Failed to fetch page')
      }

      const pageData = await response.json()
      setPage(pageData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch page')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (updatedPage: Page) => {
    setPage(updatedPage)
    // Optionally redirect back to pages list
    // router.push('/admin/pages')
  }

  const handleCancel = () => {
    router.push('/admin/pages')
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchPage}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-500">Page not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageForm
        page={page}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}