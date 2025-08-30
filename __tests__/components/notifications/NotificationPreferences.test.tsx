import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NotificationPreferences } from '../../../app/components/notifications/NotificationPreferences'

// Mock fetch
global.fetch = jest.fn()

describe('NotificationPreferences', () => {
  const mockPreferences = {
    email: true,
    security: true,
    marketing: false,
    accountUpdates: true,
    adminMessages: true
  }

  beforeEach(() => {
    // Mock successful fetch responses
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: mockPreferences })
      })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render notification preferences form', async () => {
    render(<NotificationPreferences userId="test-user-id" />)
    
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument()
      expect(screen.getByText('Email Notifications')).toBeInTheDocument()
      expect(screen.getByText('Security Alerts')).toBeInTheDocument()
      expect(screen.getByText('Account Updates')).toBeInTheDocument()
      expect(screen.getByText('Admin Messages')).toBeInTheDocument()
      expect(screen.getByText('Marketing & Updates')).toBeInTheDocument()
    })
  })

  it('should fetch preferences on mount', async () => {
    render(<NotificationPreferences userId="test-user-id" />)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/users/test-user-id/notification-preferences')
    })
  })

  it('should display loading state initially', () => {
    render(<NotificationPreferences userId="test-user-id" />)
    
    expect(screen.getByTestId('loading') || document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('should toggle preferences when switches are clicked', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: mockPreferences })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          preferences: { ...mockPreferences, email: false },
          message: 'Notification preferences updated successfully'
        })
      })

    render(<NotificationPreferences userId="test-user-id" />)
    
    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeInTheDocument()
    })

    // Find and click the email notifications switch
    const emailSwitch = screen.getByRole('switch', { name: /email notifications/i })
    fireEvent.click(emailSwitch)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users/test-user-id/notification-preferences',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...mockPreferences, email: false })
        })
      )
    })
  })

  it('should show success message after updating preferences', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: mockPreferences })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          preferences: mockPreferences,
          message: 'Notification preferences updated successfully'
        })
      })

    render(<NotificationPreferences userId="test-user-id" />)
    
    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeInTheDocument()
    })

    const emailSwitch = screen.getByRole('switch', { name: /email notifications/i })
    fireEvent.click(emailSwitch)

    await waitFor(() => {
      expect(screen.getByText('Notification preferences updated successfully')).toBeInTheDocument()
    })
  })

  it('should show error message when update fails', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: mockPreferences })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Update failed' })
      })

    render(<NotificationPreferences userId="test-user-id" />)
    
    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeInTheDocument()
    })

    const emailSwitch = screen.getByRole('switch', { name: /email notifications/i })
    fireEvent.click(emailSwitch)

    await waitFor(() => {
      expect(screen.getByText('Failed to update preferences. Please try again.')).toBeInTheDocument()
    })
  })

  it('should call onUpdate callback when preferences are updated', async () => {
    const mockOnUpdate = jest.fn()
    const updatedPreferences = { ...mockPreferences, email: false }

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: mockPreferences })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          preferences: updatedPreferences,
          message: 'Notification preferences updated successfully'
        })
      })

    render(<NotificationPreferences userId="test-user-id" onUpdate={mockOnUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeInTheDocument()
    })

    const emailSwitch = screen.getByRole('switch', { name: /email notifications/i })
    fireEvent.click(emailSwitch)

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(updatedPreferences)
    })
  })

  it('should disable switches while saving', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: mockPreferences })
      })
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 1000)))

    render(<NotificationPreferences userId="test-user-id" />)
    
    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeInTheDocument()
    })

    const emailSwitch = screen.getByRole('switch', { name: /email notifications/i })
    fireEvent.click(emailSwitch)

    // Switch should be disabled while saving
    expect(emailSwitch).toBeDisabled()
  })

  it('should show security recommendation', async () => {
    render(<NotificationPreferences userId="test-user-id" />)
    
    await waitFor(() => {
      expect(screen.getByText('Security Notifications')).toBeInTheDocument()
      expect(screen.getByText(/We strongly recommend keeping security alerts enabled/)).toBeInTheDocument()
    })
  })

  it('should handle fetch errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<NotificationPreferences userId="test-user-id" />)
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch notification preferences:',
        expect.any(Error)
      )
    })

    consoleSpy.mockRestore()
  })
})