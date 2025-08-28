/**
 * Pages Management Page
 * Interface for managing content pages with rich text editing
 */

'use client'

import { useRouter } from 'next/navigation'
import PageList from '@/components/pages/PageList'
import { Page } from '@/lib/types'

type PageStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED'

export default function PagesPage() {
  const router = useRouter()

  const handleEdit = (page: Page) => {
    router.push(`/admin/pages/${page.id}/edit`)
  }

  const handleDelete = (pageId: string) => {
    // PageList handles the deletion, this is just for callback
    console.log('Page deleted:', pageId)
  }

  const handleStatusChange = (pageId: string, status: PageStatus) => {
    // PageList handles the status change, this is just for callback
    console.log('Page status changed:', pageId, status)
  }

  return (
    <PageList
      onEdit={handleEdit}
      onDelete={handleDelete}
      onStatusChange={handleStatusChange}
    />
  )
}