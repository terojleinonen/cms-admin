/**
 * Edit Product Page
 * Interface for editing existing products
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ProductForm from '@/components/products/ProductForm'
import { Product } from '@/lib/types'

export default function EditProductPage() {
  const params = useParams()
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
        <p className="text-gray-600">
          Update product information
        </p>
      </div>

      {/* Form */}
      {product && <ProductForm product={product} />}
    </div>
  )
}