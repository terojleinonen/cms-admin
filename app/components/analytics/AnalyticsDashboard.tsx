'use client'

import { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  UsersIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface AnalyticsData {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  revenueChange: number
  ordersChange: number
  customersChange: number
  productsChange: number
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    revenueChange: 0,
    ordersChange: 0,
    customersChange: 0,
    productsChange: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading analytics data
    const timer = setTimeout(() => {
      setData({
        totalRevenue: 12450,
        totalOrders: 89,
        totalCustomers: 156,
        totalProducts: 24,
        revenueChange: 12.5,
        ordersChange: 8.2,
        customersChange: 15.3,
        productsChange: 4.1
      })
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const stats = [
    {
      name: 'Total Revenue',
      value: loading ? '...' : `$${data.totalRevenue.toLocaleString()}`,
      change: data.revenueChange,
      icon: CurrencyDollarIcon,
      color: 'bg-dusty-sage'
    },
    {
      name: 'Total Orders',
      value: loading ? '...' : data.totalOrders.toString(),
      change: data.ordersChange,
      icon: ShoppingBagIcon,
      color: 'bg-warm-beige'
    },
    {
      name: 'Total Customers',
      value: loading ? '...' : data.totalCustomers.toString(),
      change: data.customersChange,
      icon: UsersIcon,
      color: 'bg-slate-gray'
    },
    {
      name: 'Total Products',
      value: loading ? '...' : data.totalProducts.toString(),
      change: data.productsChange,
      icon: ChartBarIcon,
      color: 'bg-matte-black'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-matte-black font-satoshi">Analytics Dashboard</h1>
        <p className="text-slate-gray font-inter">Monitor your workspace performance and key metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-gray font-inter">{stat.name}</p>
                <p className="text-2xl font-bold text-matte-black font-satoshi mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-soft-white" />
              </div>
            </div>
            
            {!loading && (
              <div className="mt-4 flex items-center">
                {stat.change > 0 ? (
                  <TrendingUpIcon className="h-4 w-4 text-dusty-sage mr-1" />
                ) : (
                  <TrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${
                  stat.change > 0 ? 'text-dusty-sage' : 'text-red-500'
                }`}>
                  {stat.change > 0 ? '+' : ''}{stat.change}%
                </span>
                <span className="text-sm text-slate-gray ml-1 font-inter">vs last month</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart Placeholder */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-matte-black mb-4 font-satoshi">
            Revenue Overview
          </h3>
          <div className="h-64 bg-warm-beige/20 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="h-12 w-12 text-slate-gray mx-auto mb-2" />
              <p className="text-slate-gray font-inter">Revenue chart will be displayed here</p>
            </div>
          </div>
        </div>

        {/* Orders Chart Placeholder */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-matte-black mb-4 font-satoshi">
            Orders Trend
          </h3>
          <div className="h-64 bg-dusty-sage/10 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ShoppingBagIcon className="h-12 w-12 text-slate-gray mx-auto mb-2" />
              <p className="text-slate-gray font-inter">Orders trend chart will be displayed here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-matte-black mb-4 font-satoshi">
          Recent Activity
        </h3>
        
        <div className="space-y-4">
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-warm-beige rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-warm-beige rounded w-3/4"></div>
                    <div className="h-3 bg-warm-beige/50 rounded w-1/2 mt-1"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-dusty-sage rounded-full flex items-center justify-center">
                  <ShoppingBagIcon className="h-4 w-4 text-soft-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-matte-black font-inter">New order received</p>
                  <p className="text-xs text-slate-gray font-inter">2 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-warm-beige rounded-full flex items-center justify-center">
                  <UsersIcon className="h-4 w-4 text-matte-black" />
                </div>
                <div>
                  <p className="text-sm font-medium text-matte-black font-inter">New customer registered</p>
                  <p className="text-xs text-slate-gray font-inter">15 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-slate-gray rounded-full flex items-center justify-center">
                  <EyeIcon className="h-4 w-4 text-soft-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-matte-black font-inter">Product viewed 50+ times</p>
                  <p className="text-xs text-slate-gray font-inter">1 hour ago</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-matte-black mb-4 font-satoshi">
          Performance Insights
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-dusty-sage font-satoshi">94%</div>
            <div className="text-sm text-slate-gray font-inter">Customer Satisfaction</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-dusty-sage font-satoshi">2.3s</div>
            <div className="text-sm text-slate-gray font-inter">Avg. Page Load Time</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-dusty-sage font-satoshi">68%</div>
            <div className="text-sm text-slate-gray font-inter">Conversion Rate</div>
          </div>
        </div>
      </div>
    </div>
  )
}