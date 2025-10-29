/**
 * Tests for useAuditLogger hook
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'
import { useAuditLogger } from '../../../app/lib/hooks/useAuditLogger'
import { User } from '../../../app/lib/types'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock fetch
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// Mock window and document for context detection
const mockContext = {
  url: 'http://localhost:3000/test',
  pathname: '/test',
  userAgent: 'test-agent',
  timestamp: expect.any(String),
  viewport: { width: 1920, height: 1080 },
  referrer: 'http://localhost:3000/previous',
}

describe('useAuditLogger', () => {
  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.EDITOR,
    isActive: true,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as Response)
  })

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      })
    })

    it('should be disabled and not send logs', async () => {
      const { result } = renderHook(() => useAuditLogger())

      expect(result.current.isEnabled).toBe(false)
      expect(result.current.user).toBe(null)

      await act(async () => {
        await result.current.log({
          action: 'test.action',
          resource: 'test',
        })
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: jest.fn(),
      })
    })

    it('should be enabled and return user', () => {
      const { result } = renderHook(() => useAuditLogger())

      expect(result.current.isEnabled).toBe(true)
      expect(result.current.user).toEqual(mockUser)
    })

    describe('basic logging', () => {
      it('should send audit log with basic entry', async () => {
        const { result } = renderHook(() => useAuditLogger())

        await act(async () => {
          await result.current.log({
            action: 'test.action',
            resource: 'test',
            resourceId: 'test-1',
            details: { key: 'value' },
            severity: 'medium',
          })
        })

        expect(mockFetch).toHaveBeenCalledWith('/api/audit-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"action":"test.action"'),
        })
      })

      it('should use default severity when not provided', async () => {
        const { result } = renderHook(() => 
          useAuditLogger({ defaultSeverity: 'high' })
        )

        await act(async () => {
          await result.current.log({
            action: 'test.action',
            resource: 'test',
          })
        })

        const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
        expect(callBody.severity).toBe('high')
      })

      it('should not include context when autoDetectContext is false', async () => {
        const { result } = renderHook(() => 
          useAuditLogger({ autoDetectContext: false })
        )

        await act(async () => {
          await result.current.log({
            action: 'test.action',
            resource: 'test',
          })
        })

        const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
        expect(callBody.details).toEqual({})
      })
    })

    describe('convenience methods', () => {
      it('should log auth actions with correct format', async () => {
        const { result } = renderHook(() => useAuditLogger())

        await act(async () => {
          await result.current.logAuth('login', { ip: '127.0.0.1' })
        })

        const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
        expect(callBody.action).toBe('auth.login')
        expect(callBody.resource).toBe('user')
        expect(callBody.resourceId).toBe('user-1')
        expect(callBody.severity).toBe('low')
      })

      it('should log failed auth actions with medium severity', async () => {
        const { result } = renderHook(() => useAuditLogger())

        await act(async () => {
          await result.current.logAuth('login_failed')
        })

        const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
        expect(callBody.action).toBe('auth.login_failed')
        expect(callBody.severity).toBe('medium')
      })

      it('should log user actions with correct format', async () => {
        const { result } = renderHook(() => useAuditLogger())

        await act(async () => {
          await result.current.logUser('updated', 'target-user-1', { field: 'name' })
        })

        const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
        expect(callBody.action).toBe('user.updated')
        expect(callBody.resource).toBe('user')
        expect(callBody.resourceId).toBe('target-user-1')
        expect(callBody.severity).toBe('medium')
      })

      it('should log security actions with high severity', async () => {
        const { result } = renderHook(() => useAuditLogger())

        await act(async () => {
          await result.current.logSecurity('suspicious_activity', { reason: 'test' })
        })

        const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
        expect(callBody.action).toBe('security.suspicious_activity')
        expect(callBody.resource).toBe('system')
        expect(callBody.severity).toBe('high')
      })

      it('should log permission checks', async () => {
        const { result } = renderHook(() => useAuditLogger())

        await act(async () => {
          await result.current.logPermissionCheck(
            { resource: 'products', action: 'create' },
            false,
            'Insufficient role'
          )
        })

        const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
        expect(callBody.action).toBe('permission.denied')
        expect(callBody.resource).toBe('products')
        expect(callBody.severity).toBe('medium')
        expect(callBody.details.permission).toEqual({ resource: 'products', action: 'create' })
        expect(callBody.details.result).toBe(false)
        expect(callBody.details.reason).toBe('Insufficient role')
      })
    })

    describe('UI interaction logging', () => {
      it('should log button clicks', async () => {
        const { result } = renderHook(() => useAuditLogger())

        await act(async () => {
          await result.current.logButtonClick('save-button', { form: 'product-form' })
        })

        const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
        expect(callBody.action).toBe('ui.button_click')
        expect(callBody.resource).toBe('ui')
        expect(callBody.resourceId).toBe('save-button')
        expect(callBody.severity).toBe('low')
      })

      it('should log form submissions', async () => {
        const { result } = renderHook(() => useAuditLogger())

        await act(async () => {
          await result.current.logFormSubmit('product-form', false, { name: 'Required' })
        })

        const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
        expect(callBody.action).toBe('ui.form_submit_error')
        expect(callBody.resource).toBe('ui')
        expect(callBody.resourceId).toBe('product-form')
        expect(callBody.severity).toBe('medium')
        expect(callBody.details.success).toBe(false)
        expect(callBody.details.errors).toEqual({ name: 'Required' })
      })

      it('should log navigation', async () => {
        const { result } = renderHook(() => useAuditLogger())

        await act(async () => {
          await result.current.logNavigation('/products', '/products/new', 'click')
        })

        const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
        expect(callBody.action).toBe('ui.navigation')
        expect(callBody.details.from).toBe('/products')
        expect(callBody.details.to).toBe('/products/new')
        expect(callBody.details.method).toBe('click')
      })

      it('should log search actions', async () => {
        const { result } = renderHook(() => useAuditLogger())

        await act(async () => {
          await result.current.logSearch('test query', 5, { category: 'electronics' })
        })

        const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
        expect(callBody.action).toBe('ui.search')
        expect(callBody.resource).toBe('search')
        expect(callBody.details.query).toBe('test query')
        expect(callBody.details.results).toBe(5)
        expect(callBody.details.filters).toEqual({ category: 'electronics' })
      })
    })

    describe('synchronous logging', () => {
      it('should queue logs for async processing', async () => {
        const { result } = renderHook(() => useAuditLogger())

        act(() => {
          result.current.logSync({
            action: 'test.sync',
            resource: 'test',
          })
        })

        // Should not have been called immediately
        expect(mockFetch).not.toHaveBeenCalled()

        // Wait for the async operation to complete
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
        })

        expect(mockFetch).toHaveBeenCalled()
      })
    })

    describe('batching', () => {
      it('should batch logs when enabled', async () => {
        const { result } = renderHook(() => 
          useAuditLogger({ 
            enableBatching: true, 
            batchSize: 2,
            batchTimeout: 100 
          })
        )

        await act(async () => {
          await result.current.log({ action: 'test.1', resource: 'test' })
        })

        // First log should not trigger fetch yet
        expect(mockFetch).not.toHaveBeenCalled()

        await act(async () => {
          await result.current.log({ action: 'test.2', resource: 'test' })
        })

        // Second log should trigger batch processing
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledTimes(2)
        })
      })

      it('should flush batch manually', async () => {
        const { result } = renderHook(() => 
          useAuditLogger({ enableBatching: true })
        )

        await act(async () => {
          await result.current.log({ action: 'test.1', resource: 'test' })
        })

        expect(mockFetch).not.toHaveBeenCalled()

        await act(async () => {
          await result.current.flush()
        })

        expect(mockFetch).toHaveBeenCalledTimes(1)
      })
    })

    describe('error handling', () => {
      it('should call onError callback when fetch fails', async () => {
        const onError = jest.fn()
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        const { result } = renderHook(() => 
          useAuditLogger({ onError })
        )

        await act(async () => {
          await result.current.log({
            action: 'test.action',
            resource: 'test',
          })
        })

        expect(onError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            action: 'test.action',
            resource: 'test',
          })
        )
      })

      it('should call onSuccess callback when fetch succeeds', async () => {
        const onSuccess = jest.fn()

        const { result } = renderHook(() => 
          useAuditLogger({ onSuccess })
        )

        await act(async () => {
          await result.current.log({
            action: 'test.action',
            resource: 'test',
          })
        })

        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'test.action',
            resource: 'test',
          })
        )
      })

      it('should handle non-ok responses', async () => {
        const onError = jest.fn()
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
        } as Response)

        const { result } = renderHook(() => 
          useAuditLogger({ onError })
        )

        await act(async () => {
          await result.current.log({
            action: 'test.action',
            resource: 'test',
          })
        })

        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Audit log failed: 400 Bad Request',
          }),
          expect.any(Object)
        )
      })
    })

    describe('debug mode', () => {
      it('should log debug information when enabled', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

        const { result } = renderHook(() => 
          useAuditLogger({ debug: true })
        )

        await act(async () => {
          await result.current.log({
            action: 'test.action',
            resource: 'test',
          })
        })

        expect(consoleSpy).toHaveBeenCalledWith(
          'Sending audit log:',
          expect.any(Object)
        )

        consoleSpy.mockRestore()
      })
    })
  })
})