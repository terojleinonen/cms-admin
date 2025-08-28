/**
 * Media Library page
 * Provides media management interface for the CMS
 */

import { Metadata } from 'next'
import MediaLibrary from '@/components/media/MediaLibrary'

export const metadata: Metadata = {
  title: 'Media Library - Kin Workspace CMS',
  description: 'Manage images, videos, and other media files for your content',
}

export default function MediaPage() {
  return (
    <div className="space-y-6">
      <MediaLibrary />
    </div>
  )
}