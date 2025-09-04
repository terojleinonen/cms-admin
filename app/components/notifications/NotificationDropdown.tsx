'use client'

import { Fragment } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { 
  XMarkIcon, 
  CheckIcon, 
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  UserIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import { NotificationType } from '@prisma/client'
import { Notification } from '@/lib/types'

interface NotificationDropdownProps {
  notifications: Notification[]
  unreadCount: number
  onClose: () => void
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onDelete: (id: string) => void
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete
}: NotificationDropdownProps) {
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SECURITY_ALERT:
      case NotificationType.ACCOUNT_LOCKED:
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      case NotificationType.PASSWORD_CHANGED:
      case NotificationType.TWO_FACTOR_ENABLED:
      case NotificationType.TWO_FACTOR_DISABLED:
        return <ShieldCheckIcon className="h-5 w-5 text-blue-500" />
      case NotificationType.PROFILE_UPDATED:
      case NotificationType.EMAIL_CHANGED:
        return <UserIcon className="h-5 w-5 text-green-500" />
      case NotificationType.PREFERENCES_UPDATED:
        return <CogIcon className="h-5 w-5 text-gray-500" />
      default:
        return <CheckIcon className="h-5 w-5 text-blue-500" />
    }
  }

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SECURITY_ALERT:
      case NotificationType.ACCOUNT_LOCKED:
        return 'border-l-red-500 bg-red-50'
      case NotificationType.PASSWORD_CHANGED:
      case NotificationType.TWO_FACTOR_ENABLED:
        return 'border-l-blue-500 bg-blue-50'
      case NotificationType.PROFILE_UPDATED:
      case NotificationType.EMAIL_CHANGED:
        return 'border-l-green-500 bg-green-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Dropdown */}
      <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({unreadCount} unread)
              </span>
            )}
          </h3>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <CheckIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-2">
                          {!notification.read && (
                            <button
                              onClick={() => onMarkAsRead(notification.id)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                              title="Mark as read"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onDelete(notification.id)}
                            className="text-gray-400 hover:text-red-600 text-xs"
                            title="Delete notification"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium w-full text-center"
            >
              View all notifications
            </button>
          </div>
        )}
      </div>
    </>
  )
}