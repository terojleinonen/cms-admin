/**
 * Product View Page
 * Display detailed product information
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  PencilIcon, 
  TrashIcon, 
  ArrowLeftIcon,
  TagIcon,
  CubeIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import { Product } from '@/lib/types'

export default function ProductViewPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${params.id}`)
        if (!response.ok) {
          throw new Error('Product not found')
        }
        
        const data = await response.json()
        setProduct(data.product)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchProduct()
    }
  }, [params.id])

  const handleDelete = async () => {
    if (!product || !confirm('Are you sure you want to delete this product?')) return

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Failed to delete product')
        return
      }

      router.push('/products')
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PUBLISHED: 'bg-green-100 text-green-800',
      ARCHIVED: 'bg-red-100 text-red-800',
    }
    return styles[status as keyof typeof styles] || styles.DRAFT
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Product not found'}</p>
        <Link
          href="/products"
          className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Products
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/products"
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <div className="flex items-center space-x-4 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(product.status)}`}>
                {product.status}
              </span>
              {product.featured && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  Featured
                </span>
              )}
              {product.sku && (
                <span className="text-sm text-gray-500">SKU: {product.sku}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href={`/products/${product.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Product Information</h2>
            
            {product.shortDescription && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Short Description</h3>
                <p className="text-gray-600">{product.shortDescription}</p>
              </div>
            )}

            {product.description && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                <div className="text-gray-600 whitespace-pre-wrap">{product.description}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Slug:</span>
                <span className="ml-2 text-gray-600">{product.slug}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <span className="ml-2 text-gray-600">
                  {new Date(product.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Updated:</span>
                <span className="ml-2 text-gray-600">
                  {new Date(product.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created by:</span>
                <span className="ml-2 text-gray-600">{product.creator?.name}</span>
              </div>
            </div>
          </div>

          {/* SEO Information */}
          {(product.seoTitle || product.seoDescription) && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">SEO Information</h2>
              
              {product.seoTitle && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">SEO Title</h3>
                  <p className="text-gray-600">{product.seoTitle}</p>
                </div>
              )}

              {product.seoDescription && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">SEO Description</h3>
                  <p className="text-gray-600">{product.seoDescription}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
              <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Pricing</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Price:</span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatPrice(product.price)}
                </span>
              </div>
              
              {product.comparePrice && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Compare Price:</span>
                  <span className="text-sm text-gray-500 line-through">
                    {formatPrice(product.comparePrice)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Inventory */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
              <CubeIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Inventory</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Quantity:</span>
                <span className={`text-sm font-medium ${
                  product.inventoryQuantity > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {product.inventoryQuantity}
                </span>
              </div>
              
              {product.weight && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Weight:</span>
                  <span className="text-sm text-gray-600">{product.weight} lbs</span>
                </div>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
              <TagIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Categories</h2>
            </div>
            
            {product.categories && product.categories.length > 0 ? (
              <div className="space-y-2">
                {product.categories.map((pc) => (
                  <div
                    key={pc.categoryId}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 mr-2 mb-2"
                  >
                    {pc.category?.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No categories assigned</p>
            )}
          </div>

          {/* Media */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Media</h2>
            
            {product.media && product.media.length > 0 ? (
              <p className="text-sm text-gray-600">
                {product.media.length} media file{product.media.length !== 1 ? 's' : ''} attached
              </p>
            ) : (
              <p className="text-sm text-gray-500">No media files</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}