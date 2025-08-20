import Link from 'next/link'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-matte-black mb-4 font-satoshi">
          Welcome to Kin Workspace CMS
        </h2>
        <p className="text-slate-gray mb-6 font-inter">
          Manage your workspace content, products, and orders from this central dashboard. Create calm. Work better.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-warm-beige rounded-lg p-4 hover:shadow-lg transition-shadow duration-200">
            <h3 className="font-semibold text-matte-black mb-2 font-satoshi">Products</h3>
            <p className="text-slate-gray text-sm mb-3 font-inter">
              Manage your workspace product catalog, inventory, and pricing.
            </p>
            <Link 
              href="/admin/products" 
              className="btn-primary inline-block text-sm"
            >
              Manage Products
            </Link>
          </div>
          
          <div className="bg-dusty-sage/10 rounded-lg p-4 hover:shadow-lg transition-shadow duration-200">
            <h3 className="font-semibold text-matte-black mb-2 font-satoshi">Orders</h3>
            <p className="text-slate-gray text-sm mb-3 font-inter">
              View and process customer orders and payments.
            </p>
            <Link 
              href="/orders" 
              className="btn-secondary inline-block text-sm"
            >
              View Orders
            </Link>
          </div>
          
          <div className="bg-slate-gray/10 rounded-lg p-4 hover:shadow-lg transition-shadow duration-200">
            <h3 className="font-semibold text-matte-black mb-2 font-satoshi">Analytics</h3>
            <p className="text-slate-gray text-sm mb-3 font-inter">
              Track sales performance and customer insights.
            </p>
            <Link 
              href="/admin/analytics" 
              className="btn-outline inline-block text-sm"
            >
              View Analytics
            </Link>
          </div>
        </div>
      </div>
      
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-matte-black mb-4 font-satoshi">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-matte-black font-satoshi">0</div>
            <div className="text-sm text-slate-gray font-inter">Total Products</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-matte-black font-satoshi">0</div>
            <div className="text-sm text-slate-gray font-inter">Pending Orders</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-matte-black font-satoshi">$0</div>
            <div className="text-sm text-slate-gray font-inter">Monthly Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-matte-black font-satoshi">0</div>
            <div className="text-sm text-slate-gray font-inter">Active Users</div>
          </div>
        </div>
      </div>
    </div>
  )
}