/**
 * Permission-Aware Navigation History Component
 * 
 * Provides a dropdown showing recent navigation history filtered by user permissions
 * and role-based access control.
 * 
 * Features:
 * - Permission-filtered navigation history
 * - Role-aware history display
 * - Quick navigation to accessible pages
 * - History persistence across sessions
 * 
 * @module NavigationHistory
 * @version 1.0.0
 * @author Kin Workspace CMS Team
 */

'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ClockIcon, 
  ChevronDownIcon,
  EyeSlashIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { usePermissions } from '../../lib/hooks/usePermissions'
import { UserRole } from '@prisma/client'

/**
 * Navigation history item interface
 */
interface NavigationHistoryItem {
  path: string
  name: string
  timestamp: Date
  accessible: boolean
  roleAtTime: UserRole
}

/**
 * Permission-aware navigation history manager
 */
class PermissionAwareNavigationHistory {
  private static instance: PermissionAwareNavigationHistory
  private history: NavigationHistoryItem[] = []
  private maxHistorySize = 10
  private storageKey = 'navigation-history'

  static getInstance(): PermissionAwareNavigationHistory {
    if (!PermissionAwareNavigationHistory.instance) {
      PermissionAwareNavigationHistory.instance = new PermissionAwareNavigationHistory()
    }
    return PermissionAwareNavigationHistory.instance
  }

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          this.history = parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }))
        }
      } catch (error) {
        console.warn('Failed to load navigation history from storage:', error)
      }
    }
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.history))
      } catch (error) {
        console.warn('Failed to save navigation history to storage:', error)
      }
    }
  }

  addToHistory(path: string, name: string, accessible: boolean, role: UserRole): void {
    // Skip certain paths
    if (path === '/' || path.includes('/api/') || path.includes('/auth/')) {
      return
    }

    const existingIndex = this.history.findIndex(item => item.path === path)
    
    if (existingIndex !== -1) {
      // Update existing entry
      this.history[existingIndex] = {
        path,
        name,
        timestamp: new Date(),
        accessible,
        roleAtTime: role
      }
    } else {
      // Add new entry
      this.history.unshift({
        path,
        name,
        timestamp: new Date(),
        accessible,
        roleAtTime: role
      })
      
      // Limit history size
      if (this.history.length > this.maxHistorySize) {
        this.history = this.history.slice(0, this.maxHistorySize)
      }
    }

    this.saveToStorage()
  }

  getHistory(): NavigationHistoryItem[] {
    return [...this.history]
  }

  getAccessibleHistory(currentRole: UserRole): NavigationHistoryItem[] {
    return this.history.filter(item => 
      item.accessible && 
      (item.roleAtTime === currentRole || currentRole === UserRole.ADMIN)
    )
  }

  clearHistory(): void {
    this.history = []
    this.saveToStorage()
  }

  removeFromHistory(path: string): void {
    this.history = this.history.filter(item => item.path !== path)
    this.saveToStorage()
  }
}

/**
 * Navigation History Dropdown Component
 */
interface NavigationHistoryProps {
  className?: string
  maxItems?: number
  showClearButton?: boolean
}

export default function NavigationHistory({ 
  className = '',
  maxItems = 5,
  showClearButton = true
}: NavigationHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [history, setHistory] = useState<NavigationHistoryItem[]>([])
  const permissions = usePermissions()
  const navigationHistory = PermissionAwareNavigationHistory.getInstance()

  // Load history when component mounts or user changes
  useEffect(() => {
    if (permissions.user?.role) {
      const accessibleHistory = navigationHistory.getAccessibleHistory(permissions.user.role)
      setHistory(accessibleHistory.slice(0, maxItems))
    }
  }, [permissions.user?.role, maxItems])

  // Refresh history when dropdown opens
  const handleToggle = () => {
    if (!isOpen && permissions.user?.role) {
      const accessibleHistory = navigationHistory.getAccessibleHistory(permissions.user.role)
      setHistory(accessibleHistory.slice(0, maxItems))
    }
    setIsOpen(!isOpen)
  }

  const handleClearHistory = () => {
    navigationHistory.clearHistory()
    setHistory([])
    setIsOpen(false)
  }

  const handleRemoveItem = (path: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    navigationHistory.removeFromHistory(path)
    const updatedHistory = history.filter(item => item.path !== path)
    setHistory(updatedHistory)
  }

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - timestamp.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return timestamp.toLocaleDateString()
  }

  if (!permissions.isAuthenticated || history.length === 0) {
    return null
  }

  return (
    <div className={clsx("relative", className)}>
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
        aria-expanded={isOpen ? 'true' : 'false'}
      >
        <ClockIcon className="h-4 w-4 mr-2" />
        Recent
        <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
          {history.length}
        </span>
        <ChevronDownIcon 
          className={clsx(
            'ml-1 h-3 w-3 transition-transform duration-200',
            isOpen && 'rotate-180'
          )} 
        />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Recent Pages</h3>
                {showClearButton && history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-xs text-gray-500 hover:text-red-600 transition-colors duration-150"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Showing {history.length} recent accessible pages
              </p>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No recent navigation history
                </div>
              ) : (
                <div className="py-1">
                  {history.map((item, index) => (
                    <div
                      key={`${item.path}-${index}`}
                      className="group flex items-center px-4 py-2 hover:bg-gray-50 transition-colors duration-150"
                    >
                      <Link
                        href={item.path}
                        className="flex-1 min-w-0"
                        onClick={() => setIsOpen(false)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {item.path}
                            </p>
                          </div>
                          <div className="ml-2 flex items-center space-x-2">
                            <span className="text-xs text-gray-400">
                              {formatTimestamp(item.timestamp)}
                            </span>
                            <span className={clsx(
                              "inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full",
                              item.roleAtTime === UserRole.ADMIN 
                                ? "bg-red-100 text-red-600" 
                                : item.roleAtTime === UserRole.EDITOR
                                ? "bg-blue-100 text-blue-600"
                                : "bg-gray-100 text-gray-600"
                            )}>
                              {item.roleAtTime}
                            </span>
                          </div>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveItem(item.path, e)}
                        className="ml-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all duration-150"
                        title="Remove from history"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {history.length > 0 && (
              <div className="p-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">
                  History is filtered based on your current role and permissions
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Export the navigation history manager for use in other components
export { PermissionAwareNavigationHistory }