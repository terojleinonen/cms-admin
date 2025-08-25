/**
 * TemplateSelector Component
 * Allows users to select page templates with preview and field information
 */

'use client'

import { useState, useEffect } from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'

interface PageTemplate {
  id: string
  name: string
  description: string
  preview: string
  fields: TemplateField[]
}

interface TemplateField {
  name: string
  type: string
  required: boolean
}

interface TemplateSelectorProps {
  selectedTemplate?: string
  onSelect: (templateId: string) => void
  className?: string
}

export default function TemplateSelector({ 
  selectedTemplate, 
  onSelect, 
  className = '' 
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<PageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTemplateDetails, setSelectedTemplateDetails] = useState<PageTemplate | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    if (selectedTemplate && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplate)
      setSelectedTemplateDetails(template || null)
    }
  }, [selectedTemplate, templates])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/pages/templates')
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }

      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    onSelect(templateId)
    const template = templates.find(t => t.id === templateId)
    setSelectedTemplateDetails(template || null)
  }

  const getFieldTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      text: 'Text',
      textarea: 'Text Area',
      richtext: 'Rich Text',
      email: 'Email',
      url: 'URL',
      date: 'Date',
      media: 'Media',
      'media-gallery': 'Media Gallery'
    }
    return typeLabels[type] || type
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900">Choose a Template</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900">Choose a Template</h3>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchTemplates}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-gray-900">Choose a Template</h3>
        <p className="text-sm text-gray-600 mt-1">
          Select a template that best fits your page content and layout needs.
        </p>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedTemplate === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleTemplateSelect(template.id)}
          >
            {/* Selection Indicator */}
            {selectedTemplate === template.id && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <CheckIcon className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Template Preview */}
            <div className="aspect-video bg-gray-100 rounded-md mb-3 overflow-hidden">
              <img
                src={template.preview}
                alt={`${template.name} preview`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  const target = e.target as HTMLImageElement
                  target.src = `data:image/svg+xml;base64,${btoa(`
                    <svg width="400" height="225" xmlns="http://www.w3.org/2000/svg">
                      <rect width="100%" height="100%" fill="#f3f4f6"/>
                      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#6b7280" text-anchor="middle" dy=".3em">
                        ${template.name}
                      </text>
                    </svg>
                  `)}`
                }}
              />
            </div>

            {/* Template Info */}
            <div>
              <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              
              {/* Field Count */}
              <div className="text-xs text-gray-500">
                {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
                {template.fields.filter(f => f.required).length > 0 && (
                  <span className="ml-2">
                    • {template.fields.filter(f => f.required).length} required
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Template Details */}
      {selectedTemplateDetails && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {selectedTemplateDetails.name} - Field Details
          </h4>
          
          <div className="space-y-3">
            {selectedTemplateDetails.fields.map((field, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <span className="font-medium text-gray-900">{field.name}</span>
                  <span className="text-sm text-gray-500">
                    ({getFieldTypeLabel(field.type)})
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {field.required && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Required
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Template Usage Tips */}
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <h5 className="text-sm font-medium text-blue-900 mb-1">Template Tips:</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              {selectedTemplateDetails.id === 'landing' && (
                <>
                  <li>• Use compelling hero titles and subtitles</li>
                  <li>• Include high-quality hero images</li>
                  <li>• Add clear call-to-action buttons</li>
                </>
              )}
              {selectedTemplateDetails.id === 'blog-post' && (
                <>
                  <li>• Write engaging excerpts for better SEO</li>
                  <li>• Use featured images to attract readers</li>
                  <li>• Add relevant tags for categorization</li>
                </>
              )}
              {selectedTemplateDetails.id === 'contact' && (
                <>
                  <li>• Include complete contact information</li>
                  <li>• Add map embeds for location visibility</li>
                  <li>• Provide multiple contact methods</li>
                </>
              )}
              {selectedTemplateDetails.id === 'product-showcase' && (
                <>
                  <li>• Use high-quality product images</li>
                  <li>• Include detailed specifications</li>
                  <li>• Highlight key features and benefits</li>
                </>
              )}
              {selectedTemplateDetails.id === 'about' && (
                <>
                  <li>• Tell your company story authentically</li>
                  <li>• Include team member information</li>
                  <li>• Clearly state mission and values</li>
                </>
              )}
              {selectedTemplateDetails.id === 'default' && (
                <>
                  <li>• Perfect for general content pages</li>
                  <li>• Use clear headings and structure</li>
                  <li>• Include relevant images and media</li>
                </>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* No Template Selected State */}
      {!selectedTemplate && templates.length > 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">Select a template above to see field details</p>
        </div>
      )}
    </div>
  )
}