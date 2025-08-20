/**
 * New Product Page
 * Interface for creating new products
 */

'use client'

import ProductForm from '@/app/components/products/ProductForm'

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Product</h1>
        <p className="text-gray-600">
          Add a new product to your catalog
        </p>
      </div>

      {/* Form */}
      <ProductForm />
    </div>
  )
}