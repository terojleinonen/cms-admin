/**
 * Page Templates API
 * Handles available page templates and their configurations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'

// Define available page templates
const PAGE_TEMPLATES = [
  {
    id: 'default',
    name: 'Default Page',
    description: 'Standard page layout with title, content, and sidebar',
    preview: '/templates/default-preview.jpg',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'content', type: 'richtext', required: false },
      { name: 'excerpt', type: 'textarea', required: false }
    ]
  },
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Full-width landing page with hero section and call-to-action',
    preview: '/templates/landing-preview.jpg',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'heroTitle', type: 'text', required: true },
      { name: 'heroSubtitle', type: 'text', required: false },
      { name: 'heroImage', type: 'media', required: false },
      { name: 'content', type: 'richtext', required: false },
      { name: 'ctaText', type: 'text', required: false },
      { name: 'ctaUrl', type: 'url', required: false }
    ]
  },
  {
    id: 'about',
    name: 'About Page',
    description: 'About page with team section and company information',
    preview: '/templates/about-preview.jpg',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'content', type: 'richtext', required: false },
      { name: 'mission', type: 'textarea', required: false },
      { name: 'vision', type: 'textarea', required: false },
      { name: 'teamSection', type: 'richtext', required: false }
    ]
  },
  {
    id: 'contact',
    name: 'Contact Page',
    description: 'Contact page with form and location information',
    preview: '/templates/contact-preview.jpg',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'content', type: 'richtext', required: false },
      { name: 'address', type: 'textarea', required: false },
      { name: 'phone', type: 'text', required: false },
      { name: 'email', type: 'email', required: false },
      { name: 'mapEmbed', type: 'textarea', required: false }
    ]
  },
  {
    id: 'blog-post',
    name: 'Blog Post',
    description: 'Blog post layout with author info and related posts',
    preview: '/templates/blog-post-preview.jpg',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'content', type: 'richtext', required: true },
      { name: 'excerpt', type: 'textarea', required: true },
      { name: 'featuredImage', type: 'media', required: false },
      { name: 'author', type: 'text', required: false },
      { name: 'publishDate', type: 'date', required: false },
      { name: 'tags', type: 'text', required: false }
    ]
  },
  {
    id: 'product-showcase',
    name: 'Product Showcase',
    description: 'Product showcase page with gallery and specifications',
    preview: '/templates/product-showcase-preview.jpg',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'content', type: 'richtext', required: false },
      { name: 'productGallery', type: 'media-gallery', required: false },
      { name: 'specifications', type: 'richtext', required: false },
      { name: 'features', type: 'richtext', required: false },
      { name: 'pricing', type: 'text', required: false }
    ]
  }
]

// GET /api/pages/templates - Get available page templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')

    if (templateId) {
      const template = PAGE_TEMPLATES.find(t => t.id === templateId)
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      return NextResponse.json(template)
    }

    return NextResponse.json({
      templates: PAGE_TEMPLATES,
      count: PAGE_TEMPLATES.length
    })

  } catch (error) {
    console.error('Error fetching page templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch page templates' },
      { status: 500 }
    )
  }
}