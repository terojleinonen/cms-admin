'use client'

import { useState, useEffect } from 'react'
import { BellIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid'
import { NotificationDropdown } from './NotificationDropdown'

interface NotificationBellProps {
  userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    fetchNotifications()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [userId])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=10')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllAsRead' })
      })
      
      if (response.ok) {
        setUnreadCount(0)
        setNotifications(prev => 
          prev.map((notif: any) => ({ ...notif, read: true, readAt: new Date() }))
        )
      }
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAsRead' })
      })
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map((notif: any) => 
            notif.id === notificationId 
              ? { ...notif, read: true, readAt: new Date() }
              : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setNotifications(prev => prev.filter((notif: any) => notif.id !== notificationId))
        const deletedNotif = notifications.find((notif: any) => notif.id === notificationId)
        if (deletedNotif && !(deletedNotif as any).read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="h-6 w-6 text-blue-600" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={() => setIsOpen(false)}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDelete={deleteNotification}
        />
      )}
    </div>
  )
}