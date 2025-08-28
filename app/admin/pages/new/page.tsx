/**
 * New Page Creation Page
 * Interface for creating new content pages
 */

'use client'

import { useRouter } from 'next/navigation'
import PageForm from '@/components/pages/PageForm'
import { Page } from '@/lib/types'

export default function NewPagePage() {
  const router = useRouter()

  const handleSave = (page: Page) => {
    // Redirect to edit page after creation
    router.push(`/admin/pages/${page.id}/edit`)
  }

  const handleCancel = () => {
    router.push('/admin/pages')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageForm
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}