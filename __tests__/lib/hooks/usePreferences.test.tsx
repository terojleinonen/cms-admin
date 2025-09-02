/**
 * Tests for usePreferences hook
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { usePreferences } from '../../../app/lib/hooks/usePreferences'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock fetch
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock document methods
Object.defineProperty(document, 'documentElement', {
  value: {
    classList: {
      remove: jest.fn(),
      add: jest.fn(),
      contains: jest.fn(),
    },
    setAttribute: jest.fn(),
    style: {
      setProperty: jest.fn(),
    },
  },
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

describe('usePreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockFetch.mockClear();
  });

  it('should initialize with loading state', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    } as any);

    const { result } = renderHook(() => usePreferences());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.preferences).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should load preferences from cache', async () => {
    const mockSession = {
      user: { id: 'user-123' },
    };
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    } as any);

    const cachedPrefs = {
      data: {
        theme: 'DARK',
        timezone: 'America/New_York',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          security: true,
          marketing: false,
        },
        dashboard: {
          layout: 'default',
          widgets: [],
          defaultView: 'dashboard',
        },
      },
      timestamp: Date.now(),
    };

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cachedPrefs));

    const { result } = renderHook(() => usePreferences());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preferences?.theme).toBe('DARK');
    expect(result.current.preferences?.timezone).toBe('America/New_York');
  });

  it('should fetch preferences from API when cache is expired', async () => {
    const mockSession = {
      user: { id: 'user-123' },
    };
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    } as any);

    // Expired cache
    const expiredCache = {
      data: {
        theme: 'LIGHT',
        timezone: 'UTC',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          security: true,
          marketing: false,
        },
        dashboard: {
          layout: 'default',
          widgets: [],
          defaultView: 'dashboard',
        },
      },
      timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago (expired)
    };

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(expiredCache));

    const apiResponse = {
      preferences: {
        theme: 'DARK',
        timezone: 'America/New_York',
        language: 'en',
        notifications: {
          email: false,
          push: true,
          security: true,
          marketing: false,
        },
        dashboard: {
          layout: 'compact',
          widgets: ['weather'],
          defaultView: 'analytics',
        },
      },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(apiResponse),
    } as Response);

    const { result } = renderHook(() => usePreferences());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/users/user-123/preferences', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(result.current.preferences?.theme).toBe('DARK');
    expect(result.current.preferences?.timezone).toBe('America/New_York');
  });

  it('should update preferences', async () => {
    const mockSession = {
      user: { id: 'user-123' },
    };
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    } as any);

    const initialPrefs = {
      theme: 'LIGHT' as const,
      timezone: 'UTC',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        security: true,
        marketing: false,
      },
      dashboard: {
        layout: 'default',
        widgets: [],
        defaultView: 'dashboard',
      },
    };

    // Mock initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ preferences: initialPrefs }),
    } as Response);

    const { result } = renderHook(() => usePreferences());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock update response
    const updatedPrefs = {
      ...initialPrefs,
      theme: 'DARK' as const,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ preferences: updatedPrefs }),
    } as Response);

    await act(async () => {
      await result.current.updatePreferences({ theme: 'DARK' });
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/users/user-123/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ theme: 'DARK' }),
    });

    expect(result.current.preferences?.theme).toBe('DARK');
    expect(result.current.isUpdating).toBe(false);
  });

  it('should handle update errors', async () => {
    const mockSession = {
      user: { id: 'user-123' },
    };
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    } as any);

    // Mock initial successful fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        preferences: {
          theme: 'LIGHT',
          timezone: 'UTC',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            security: true,
            marketing: false,
          },
          dashboard: {
            layout: 'default',
            widgets: [],
            defaultView: 'dashboard',
          },
        },
      }),
    } as Response);

    const { result } = renderHook(() => usePreferences());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock failed update
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        error: { message: 'Validation failed' },
      }),
    } as Response);

    await act(async () => {
      try {
        await result.current.updatePreferences({ theme: 'INVALID' as any });
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('Validation failed');
    expect(result.current.isUpdating).toBe(false);
  });

  it('should invalidate cache and refetch', async () => {
    const mockSession = {
      user: { id: 'user-123' },
    };
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    } as any);

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        preferences: {
          theme: 'SYSTEM',
          timezone: 'UTC',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            security: true,
            marketing: false,
          },
          dashboard: {
            layout: 'default',
            widgets: [],
            defaultView: 'dashboard',
          },
        },
      }),
    } as Response);

    const { result } = renderHook(() => usePreferences());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.invalidateCache();
    });

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user_preferences');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});