/**
 * Consolidated Dashboard Components
 * Reusable dashboard patterns to reduce component duplication
 */

'use client'

import React, { ReactNode } from 'react'
import { LoadingSpinner } from './LoadingState'
import { ErrorMessage } from './ErrorMessage'

interface DashboardCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  actions?: ReactNode
  loading?: boolean
  error?: string | null
}

export function DashboardCard({
  title,
  subtitle,
  children,
  className = '',
  actions,
  loading = false,
  error = null
}: DashboardCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <ErrorMessage message={error} />
        ) : (
          children
        )}
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = ''
}: MetricCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <span>{trend.isPositive ? '↗' : '↘'}</span>
              <span className="ml-1">{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 text-gray-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info'
  children: ReactNode
  className?: string
}

export function StatusBadge({ status, children, className = '' }: StatusBadgeProps) {
  const statusClasses = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status]} ${className}`}>
      {children}
    </span>
  )
}

interface DataTableProps {
  headers: string[]
  data: Array<Record<string, any>>
  loading?: boolean
  emptyMessage?: string
  className?: string
  onRowClick?: (row: Record<string, any>) => void
}

export function DataTable({
  headers,
  data,
  loading = false,
  emptyMessage = 'No data available',
  className = '',
  onRowClick
}: DataTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
              onClick={() => onRowClick?.(row)}
            >
              {headers.map((header, cellIndex) => (
                <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row[header.toLowerCase().replace(/\s+/g, '_')] || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface ChartContainerProps {
  title: string
  children: ReactNode
  className?: string
  loading?: boolean
  error?: string | null
}

export function ChartContainer({
  title,
  children,
  className = '',
  loading = false,
  error = null
}: ChartContainerProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <h4 className="text-lg font-medium text-gray-900 mb-4">{title}</h4>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <ErrorMessage message={error} />
        </div>
      ) : (
        <div className="h-64">
          {children}
        </div>
      )}
    </div>
  )
}