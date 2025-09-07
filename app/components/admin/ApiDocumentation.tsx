'use client'

import { useState } from 'react'
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  PlayIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  title: string
  description: string
  parameters?: Array<{
    name: string
    type: string
    required: boolean
    description: string
  }>
  requestBody?: {
    type: string
    example: unknown
  }
  responses: Array<{
    status: number
    description: string
    example: unknown
  }>
  permissions: string[]
}

const apiEndpoints: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/api/public/products',
    title: 'List Products',
    description: 'Retrieve a list of all published products',
    parameters: [
      { name: 'page', type: 'number', required: false, description: 'Page number for pagination' },
      { name: 'limit', type: 'number', required: false, description: 'Number of items per page' },
      { name: 'category', type: 'string', required: false, description: 'Filter by category slug' },
      { name: 'search', type: 'string', required: false, description: 'Search products by name or description' }
    ],
    responses: [
      {
        status: 200,
        description: 'Success',
        example: {
          products: [
            {
              id: 'prod_123',
              name: 'Sample Product',
              slug: 'sample-product',
              description: 'A sample product description',
              price: 29.99,
              images: ['https://example.com/image.jpg'],
              categories: ['electronics']
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 100,
            pages: 5
          }
        }
      }
    ],
    permissions: ['products:read']
  },
  {
    method: 'GET',
    path: '/api/public/products/{id}',
    title: 'Get Product',
    description: 'Retrieve a specific product by ID',
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Product ID' }
    ],
    responses: [
      {
        status: 200,
        description: 'Success',
        example: {
          id: 'prod_123',
          name: 'Sample Product',
          slug: 'sample-product',
          description: 'A detailed product description',
          price: 29.99,
          images: ['https://example.com/image.jpg'],
          categories: ['electronics'],
          variants: [],
          createdAt: '2024-01-01T00:00:00Z'
        }
      },
      {
        status: 404,
        description: 'Product not found',
        example: { error: 'Product not found' }
      }
    ],
    permissions: ['products:read']
  },
  {
    method: 'POST',
    path: '/api/products',
    title: 'Create Product',
    description: 'Create a new product (requires authentication)',
    requestBody: {
      type: 'application/json',
      example: {
        name: 'New Product',
        description: 'Product description',
        price: 49.99,
        categoryIds: ['cat_123'],
        images: ['https://example.com/image.jpg']
      }
    },
    responses: [
      {
        status: 201,
        description: 'Product created successfully',
        example: {
          id: 'prod_456',
          name: 'New Product',
          slug: 'new-product',
          message: 'Product created successfully'
        }
      },
      {
        status: 401,
        description: 'Unauthorized',
        example: { error: 'Authentication required' }
      }
    ],
    permissions: ['products:write']
  }
]

type TestResult = {
  status: number;
  data?: unknown;
  headers?: unknown;
  error?: string;
  message?: string;
};

export default function ApiDocumentation() {
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null)
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<TestResult | null>(null)

  const toggleEndpoint = (endpointKey: string) => {
    setExpandedEndpoint(expandedEndpoint === endpointKey ? null : endpointKey)
  }

  const testEndpoint = async (endpoint: ApiEndpoint) => {
    const endpointKey = `${endpoint.method}-${endpoint.path}`
    setTestingEndpoint(endpointKey)
    
    try {
      // Mock API testing - in real implementation, this would make actual API calls
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockResponse = endpoint.responses.find(r => r.status === 200) || endpoint.responses[0]
      setTestResults({
        status: mockResponse.status,
        data: mockResponse.example,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': '45ms'
        }
      })
    } catch (error) {
      setTestResults({
        status: 500,
        error: 'Test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setTestingEndpoint(null)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800'
      case 'POST': return 'bg-blue-100 text-blue-800'
      case 'PUT': return 'bg-yellow-100 text-yellow-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      case 'PATCH': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">API Overview</h2>
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-600">
            The Kin Workspace CMS API provides programmatic access to manage products, categories, 
            orders, and other content. All API requests require proper authentication using API keys.
          </p>
          
          <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">Authentication</h3>
          <p className="text-gray-600">
            Include your API key in the Authorization header:
          </p>
          <div className="bg-gray-50 rounded-md p-3 mt-2">
            <code className="text-sm">Authorization: Bearer YOUR_API_KEY</code>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">Base URL</h3>
          <div className="bg-gray-50 rounded-md p-3">
            <code className="text-sm">https://your-domain.com</code>
          </div>
        </div>
      </div>

      {/* API Endpoints */}
      <div className="space-y-4">
        {apiEndpoints.map((endpoint) => {
          const endpointKey = `${endpoint.method}-${endpoint.path}`
          const isExpanded = expandedEndpoint === endpointKey
          const isTesting = testingEndpoint === endpointKey

          return (
            <div key={endpointKey} className="bg-white rounded-lg shadow">
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleEndpoint(endpointKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(endpoint.method)}`}>
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-mono text-gray-900">{endpoint.path}</code>
                    <span className="text-sm text-gray-600">{endpoint.title}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        testEndpoint(endpoint)
                      }}
                      disabled={isTesting}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      <PlayIcon className="h-3 w-3 mr-1" />
                      {isTesting ? 'Testing...' : 'Test'}
                    </button>
                    {isExpanded ? (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-200 p-6 space-y-6">
                  <p className="text-gray-600">{endpoint.description}</p>

                  {/* Required Permissions */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Required Permissions</h4>
                    <div className="flex flex-wrap gap-2">
                      {endpoint.permissions.map((permission) => (
                        <span key={permission} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Parameters */}
                  {endpoint.parameters && endpoint.parameters.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Parameters</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {endpoint.parameters.map((param) => (
                              <tr key={param.name}>
                                <td className="px-3 py-2 text-sm font-mono text-gray-900">{param.name}</td>
                                <td className="px-3 py-2 text-sm text-gray-600">{param.type}</td>
                                <td className="px-3 py-2 text-sm">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    param.required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {param.required ? 'Required' : 'Optional'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600">{param.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Request Body */}
                  {endpoint.requestBody && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Request Body</h4>
                      <div className="bg-gray-50 rounded-md p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">{endpoint.requestBody.type}</span>
                          <button
                            onClick={() => {
                              if (endpoint.requestBody) {
                                copyToClipboard(JSON.stringify(endpoint.requestBody.example, null, 2))
                              }
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <ClipboardDocumentIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <pre className="text-sm text-gray-900 overflow-x-auto">
                          {JSON.stringify(endpoint.requestBody.example, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Responses */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Responses</h4>
                    <div className="space-y-4">
                      {endpoint.responses.map((response, index) => (
                        <div key={index} className="border border-gray-200 rounded-md">
                          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                              <span className={`text-sm font-medium ${
                                response.status < 300 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {response.status} - {response.description}
                              </span>
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(response.example, null, 2))}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <ClipboardDocumentIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="p-4">
                            <pre className="text-sm text-gray-900 overflow-x-auto">
                              {JSON.stringify(response.example, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Test Results */}
                  {testResults && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Test Results</h4>
                      <div className="bg-gray-50 rounded-md p-4">
                        <div className="mb-2">
                          <span className={`text-sm font-medium ${
                            testResults.status < 300 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            Status: {testResults.status}
                          </span>
                        </div>
                        <pre className="text-sm text-gray-900 overflow-x-auto">
                          {JSON.stringify(testResults.data || testResults, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}