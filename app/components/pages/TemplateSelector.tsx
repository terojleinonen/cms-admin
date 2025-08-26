/**
 * Template Selector Component
 * Allows users to select page templates
 */

'use client'

import { useState } from 'react'
import { CheckIcon } from '@heroicons/react/24/solid'
import { DocumentTextIcon, GlobeAltIcon, NewspaperIcon, ShoppingBagIcon, PhoneIcon } from '@heroicons/react/24/outline'

interface Template {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  preview?: string
  features: string[]
}

interface TemplateSelectorProps {
  selectedTemplate?: string
  onTemplateSelect: (templateId: string) => void
  className?: string
}

const AVAILABLE_TEMPLATES: Template[] = [
  {
    id: 'default',
    name: 'Default Page',
    description: 'A simple, clean page layout suitable for most content types.',
    icon: DocumentTextIcon,
    features: ['Clean layout', 'SEO optimized', 'Mobile responsive', 'Fast loading']
  },
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Designed for marketing campaigns and product launches.',
    icon: GlobeAltIcon,
    features: ['Hero section', 'Call-to-action buttons', 'Conversion optimized', 'A/B test ready']
  },
  {
    id: 'blog',
    name: 'Blog Post',
    description: 'Perfect for articles, news, and blog content.',
    icon: NewspaperIcon,
    features: ['Reading time', 'Social sharing', 'Author bio', 'Related posts']
  },
  {
    id: 'product',
    name: 'Product Page',
    description: 'Showcase products with detailed information and media.',
    icon: ShoppingBagIcon,
    features: ['Image gallery', 'Product specs', 'Reviews section', 'Purchase options']
  },
  {
    id: 'contact',
    name: 'Contact Page',
    description: 'Contact forms and business information.',
    icon: PhoneIcon,
    features: ['Contact form', 'Map integration', 'Business hours', 'Multiple contact methods']
  }
]

export default function TemplateSelector({
  selectedTemplate = 'default',
  onTemplateSelect,
  className = ''
}: TemplateSelectorProps) {
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null)

  const handleTemplateSelect = (templateId: string) => {
    onTemplateSelect(templateId)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Choose Template</h3>
        <p className="text-sm text-gray-600">
          Select a template that best fits your content type and goals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AVAILABLE_TEMPLATES.map((template) => {
          const isSelected = selectedTemplate === template.id
          const isHovered = hoveredTemplate === template.id
          const IconComponent = template.icon

          return (
            <div
              key={template.id}
              className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleTemplateSelect(template.id)}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                  <CheckIcon className="w-4 h-4" />
                </div>
              )}

              {/* Template Icon */}
              <div className={`mb-3 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                <IconComponent className="w-8 h-8" />
              </div>

              {/* Template Info */}
              <div className="space-y-2">
                <h4 className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                  {template.name}
                </h4>
                <p className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                  {template.description}
                </p>

                {/* Features List */}
                <div className="space-y-1">
                  {template.features.slice(0, isHovered ? template.features.length : 2).map((feature, index) => (
                    <div
                      key={index}
                      className={`text-xs flex items-center ${
                        isSelected ? 'text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      <div className={`w-1 h-1 rounded-full mr-2 ${
                        isSelected ? 'bg-blue-600' : 'bg-gray-400'
                      }`} />
                      {feature}
                    </div>
                  ))}
                  
                  {!isHovered && template.features.length > 2 && (
                    <div className={`text-xs ${isSelected ? 'text-blue-500' : 'text-gray-400'}`}>
                      +{template.features.length - 2} more features
                    </div>
                  )}
                </div>
              </div>

              {/* Hover Effect */}
              {isHovered && !isSelected && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-transparent rounded-lg pointer-events-none opacity-50" />
              )}
            </div>
          )
        })}
      </div>

      {/* Selected Template Details */}
      {selectedTemplate && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="text-blue-600">
              {React.createElement(
                AVAILABLE_TEMPLATES.find(t => t.id === selectedTemplate)?.icon || DocumentTextIcon,
                { className: "w-6 h-6" }
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">
                {AVAILABLE_TEMPLATES.find(t => t.id === selectedTemplate)?.name}
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                {AVAILABLE_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {AVAILABLE_TEMPLATES.find(t => t.id === selectedTemplate)?.features.map((feature, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}