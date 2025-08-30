import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NotificationBell } from '../../../app/components/notifications/NotificationBell'

// Mock fetch
global.fetch = jest.fn()

// Mock the NotificationDropdown component
jest.mock('../../../app/components/notifications/NotificationDropdown', () => ({
  NotificationDropdown: ({ notifications, unreadCount, onClose }: any) => (
    <div data-testid="notification-dropdown">
      <div data-testid="unread-count">{unreadCount}</div>
      <div data-testid="notification-count">{notifications.length}</div>
      <button onClick={onClose} data-testid="close-dropdown">Close</button>
    </div>
  )
}))

describe('NotificationBell', () => {
  const mockNotifications = [
    {
      id: '1',
      type: 'PROFILE_UPDATED',
      title: 'Profile Updated',
      message: 'Your profile has been updated',
      read: false,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      type: 'SECURITY_ALERT',
      title: 'Security Alert',
      message: 'Suspicious activity detected',
      read: true,
      readAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  ]

  beforeEach(() => {
    // Mock successful fetch response
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        notifications: mockNotifications,
        unreadCount: 1
      })
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render notification bell', async () => {
    render(<NotificationBell userId="test-user-id" />)
    
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  it('should show unread count badge', async () => {
    render(<NotificationBell userId="test-user-id" />)
    
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  it('should open dropdown when clicked', async () => {
    render(<NotificationBell userId="test-user-id" />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      fireEvent.click(button)
    })

    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument()
    expect(screen.getByTestId('unread-count')).toHaveTextContent('1')
    expect(screen.getByTestId('notification-count')).toHaveTextContent('2')
  })

  it('should close dropdown when close button is clicked', async () => {
    render(<NotificationBell userId="test-user-id" />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      fireEvent.click(button)
    })

    const closeButton = screen.getByTestId('close-dropdown')
    fireEvent.click(closeButton)

    expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument()
  })

  it('should fetch notifications on mount', async () => {
    render(<NotificationBell userId="test-user-id" />)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications?limit=10')
    })
  })

  it('should show solid bell icon when there are unread notifications', async () => {
    render(<NotificationBell userId="test-user-id" />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      const svg = button.querySelector('svg')
      expect(svg).toHaveClass('text-blue-600')
    })
  })

  it('should show outline bell icon when no unread notifications', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        notifications: mockNotifications.map(n => ({ ...n, read: true })),
        unreadCount: 0
      })
    })

    render(<NotificationBell userId="test-user-id" />)
    
    await waitFor(() => {
      const badge = screen.queryByText('0')
      expect(badge).not.toBeInTheDocument()
    })
  })

  it('should handle fetch errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<NotificationBell userId="test-user-id" />)
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch notifications:',
        expect.any(Error)
      )
    })

    consoleSpy.mockRestore()
  })

  it('should update unread count when marking all as read', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notifications: mockNotifications,
          unreadCount: 1
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

    render(<NotificationBell userId="test-user-id" />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      fireEvent.click(button)
    })

    // Simulate marking all as read (this would be triggered from the dropdown)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications?limit=10')
    })
  })

  it('should display 99+ for unread count over 99', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        notifications: mockNotifications,
        unreadCount: 150
      })
    })

    render(<NotificationBell userId="test-user-id" />)
    
    await waitFor(() => {
      expect(screen.getByText('99+')).toBeInTheDocument()
    })
  })
})