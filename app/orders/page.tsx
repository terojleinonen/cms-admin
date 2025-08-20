import { Metadata } from 'next'
import Link from 'next/link'
import { 
  ShoppingBagIcon, 
  PlusIcon,
  ChartBarIcon,
  ClockIcon 
} from '@heroicons/react/24/outline'

export const metadata: Metadata = {
  title: 'Orders - Kin Workspace CMS',
  description: 'Manage customer orders and track sales performance',
}

export default function OrdersPage() {
  // In a real app, you would fetch orders from your database
  const orders: any[] = []

  if (orders.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-matte-black font-satoshi">Orders</h1>
            <p className="text-slate-gray font-inter">Manage customer orders and track sales</p>
          </div>
          <div className="flex gap-3">
            <Link 
              href="/admin/analytics" 
              className="btn-outline inline-flex items-center"
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              View Analytics
            </Link>
          </div>
        </div>

        {/* Empty State */}
        <div className="card p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-warm-beige rounded-full flex items-center justify-center mb-6">
            <ShoppingBagIcon className="h-8 w-8 text-slate-gray" />
          </div>
          
          <h3 className="text-xl font-semibold text-matte-black mb-2 font-satoshi">
            No Orders Yet
          </h3>
          
          <p className="text-slate-gray mb-6 font-inter max-w-md mx-auto">
            When customers place orders through your Kin Workspace store, they&apos;ll appear here. 
            You can track, process, and manage all orders from this dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/admin/products" 
              className="btn-primary inline-flex items-center justify-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Products
            </Link>
            
            <Link 
              href="/admin/analytics" 
              className="btn-secondary inline-flex items-center justify-center"
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              View Analytics
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6 text-center">
            <div className="text-2xl font-bold text-matte-black font-satoshi">0</div>
            <div className="text-sm text-slate-gray font-inter">Total Orders</div>
          </div>
          
          <div className="card p-6 text-center">
            <div className="text-2xl font-bold text-matte-black font-satoshi">$0</div>
            <div className="text-sm text-slate-gray font-inter">Total Revenue</div>
          </div>
          
          <div className="card p-6 text-center">
            <div className="text-2xl font-bold text-matte-black font-satoshi">0</div>
            <div className="text-sm text-slate-gray font-inter">Pending Orders</div>
          </div>
          
          <div className="card p-6 text-center">
            <div className="text-2xl font-bold text-matte-black font-satoshi">$0</div>
            <div className="text-sm text-slate-gray font-inter">This Month</div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-matte-black mb-4 font-satoshi">
            Getting Started with Orders
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-dusty-sage rounded-full flex items-center justify-center">
                <span className="text-soft-white font-bold text-sm font-inter">1</span>
              </div>
              <div>
                <h4 className="font-medium text-matte-black font-satoshi">Add Products</h4>
                <p className="text-sm text-slate-gray font-inter">
                  Create your product catalog with descriptions, images, and pricing.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-dusty-sage rounded-full flex items-center justify-center">
                <span className="text-soft-white font-bold text-sm font-inter">2</span>
              </div>
              <div>
                <h4 className="font-medium text-matte-black font-satoshi">Configure Payment</h4>
                <p className="text-sm text-slate-gray font-inter">
                  Set up payment processing to accept customer orders.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-dusty-sage rounded-full flex items-center justify-center">
                <span className="text-soft-white font-bold text-sm font-inter">3</span>
              </div>
              <div>
                <h4 className="font-medium text-matte-black font-satoshi">Launch Your Store</h4>
                <p className="text-sm text-slate-gray font-inter">
                  Publish your products and start receiving orders.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-dusty-sage rounded-full flex items-center justify-center">
                <span className="text-soft-white font-bold text-sm font-inter">4</span>
              </div>
              <div>
                <h4 className="font-medium text-matte-black font-satoshi">Process Orders</h4>
                <p className="text-sm text-slate-gray font-inter">
                  Manage fulfillment and track customer satisfaction.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // When there are orders, show the orders list
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-matte-black font-satoshi">Orders</h1>
          <p className="text-slate-gray font-inter">Manage customer orders and track sales</p>
        </div>
      </div>

      {/* Orders list would go here */}
      <div className="card p-6">
        <p className="text-slate-gray font-inter">Orders list will be displayed here when available.</p>
      </div>
    </div>
  )
}