/**
 * Permission Events Tests
 * Tests for permission event broadcasting and real-time updates
 * @jest-environment jsdom
 */

import { 
  PermissionEventBroadcaster, 
  ServerPermissionEvents,
  PermissionUpdate 
} from '@/lib/permission-events'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock permission service
jest.mock('@/lib/permissions', () => ({
  enhancedPermissionService: {
    invalidateUserCache: jest.fn(),
    invalidateResourceCache: jest.fn(),
    clearCache: jest.fn(),
  },
}))

describe('PermissionEventBroadcaster', () => {
  let broadcaster: PermissionEventBroadcaster
  
  beforeEach(() => {
    // Get fresh instance for each test
    broadcaster = PermissionEventBroadcaster.getInstance()
    jest.clearAllMocks()
    mockLocalStorage.clear()
  })

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PermissionEventBroadcaster.getInstance()
      const instance2 = PermissionEventBroadcaster.getInstance()
      
      expect(instance1).toBe(instance2)
    })
  })

  describe('Event subscription', () => {
    it('should allow subscribing to events', () => {
      const callback = jest.fn()
      const unsubscribe = broadcaster.subscribe(callback)
      
      expect(typeof unsubscribe).toBe('function')
    })

    it('should call subscribers when event is broadcast', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()
      
      broadcaster.subscribe(callback1)
      broadcaster.subscribe(callback2)
      
      const update: PermissionUpdate = {
        type: 'USER_ROLE_CHANGED',
        userId: 'user-1',
        timestamp: Date.now()
      }
      
      broadcaster.broadcast(update)
      
      expect(callback1).toHaveBeenCalledWith(update)
      expect(callback2).toHaveBeenCalledWith(update)
    })

    it('should allow unsubscribing from events', () => {
      const callback = jest.fn()
      const unsubscribe = broadcaster.subscribe(callback)
      
      // Broadcast before unsubscribe
      broadcaster.broadcast({
        type: 'USER_ROLE_CHANGED',
        userId: 'user-1',
        timestamp: Date.now()
      })
      
      expect(callback).toHaveBeenCalledTimes(1)
      
      // Unsubscribe and broadcast again
      unsubscribe()
      broadcaster.broadcast({
        type: 'USER_ROLE_CHANGED',
        userId: 'user-2',
        timestamp: Date.now()
      })
      
      expect(callback).toHaveBeenCalledTimes(1) // Should not be called again
    })

    it('should handle errors in callbacks gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error')
      })
      const normalCallback = jest.fn()
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      broadcaster.subscribe(errorCallback)
      broadcaster.subscribe(normalCallback)
      
      broadcaster.broadcast({
        type: 'USER_ROLE_CHANGED',
        userId: 'user-1',
        timestamp: Date.now()
      })
      
      expect(errorCallback).toHaveBeenCalled()
      expect(normalCallback).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith('Error in permission update listener:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('localStorage broadcasting', () => {
    it('should broadcast to localStorage', () => {
      const update: PermissionUpdate = {
        type: 'USER_ROLE_CHANGED',
        userId: 'user-1',
        timestamp: Date.now()
      }
      
      broadcaster.broadcast(update)
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'permission_update',
        JSON.stringify(update)
      )
    })

    it('should clear localStorage after broadcasting', (done) => {
      const update: PermissionUpdate = {
        type: 'USER_ROLE_CHANGED',
        userId: 'user-1',
        timestamp: Date.now()
      }
      
      broadcaster.broadcast(update)
      
      // Check that removeItem is called after timeout
      setTimeout(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('permission_update')
        done()
      }, 150)
    })

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      broadcaster.broadcast({
        type: 'USER_ROLE_CHANGED',
        userId: 'user-1',
        timestamp: Date.now()
      })
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to broadcast permission update via localStorage:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Specific broadcast methods', () => {
    it('should broadcast user role change', () => {
      const callback = jest.fn()
      broadcaster.subscribe(callback)
      
      broadcaster.broadcastUserRoleChange('user-1', 'VIEWER', 'EDITOR')
      
      expect(callback).toHaveBeenCalledWith({
        type: 'USER_ROLE_CHANGED',
        userId: 'user-1',
        timestamp: expect.any(Number),
        metadata: { oldRole: 'VIEWER', newRole: 'EDITOR' }
      })
    })

    it('should broadcast permission update', () => {
      const callback = jest.fn()
      broadcaster.subscribe(callback)
      
      broadcaster.broadcastPermissionUpdate('products')
      
      expect(callback).toHaveBeenCalledWith({
        type: 'PERMISSION_UPDATED',
        resource: 'products',
        timestamp: expect.any(Number)
      })
    })

    it('should broadcast user deactivation', () => {
      const callback = jest.fn()
      broadcaster.subscribe(callback)
      
      broadcaster.broadcastUserDeactivation('user-1')
      
      expect(callback).toHaveBeenCalledWith({
        type: 'USER_DEACTIVATED',
        userId: 'user-1',
        timestamp: expect.any(Number)
      })
    })

    it('should broadcast cache invalidation', () => {
      const callback = jest.fn()
      broadcaster.subscribe(callback)
      
      broadcaster.broadcastCacheInvalidation('user-1', 'products')
      
      expect(callback).toHaveBeenCalledWith({
        type: 'CACHE_INVALIDATED',
        userId: 'user-1',
        resource: 'products',
        timestamp: expect.any(Number)
      })
    })
  })
})

describe('ServerPermissionEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Server-side event notifications', () => {
    it('should notify user role change and invalidate cache', async () => {
      const { enhancedPermissionService } = require('@/lib/permissions')
      
      await ServerPermissionEvents.notifyUserRoleChange('user-1', 'VIEWER', 'EDITOR')
      
      expect(enhancedPermissionService.invalidateUserCache).toHaveBeenCalledWith('user-1')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'permission_update',
        expect.stringContaining('"type":"USER_ROLE_CHANGED"')
      )
    })

    it('should notify permission update and invalidate resource cache', async () => {
      const { enhancedPermissionService } = require('@/lib/permissions')
      
      await ServerPermissionEvents.notifyPermissionUpdate('products')
      
      expect(enhancedPermissionService.invalidateResourceCache).toHaveBeenCalledWith('products')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'permission_update',
        expect.stringContaining('"type":"PERMISSION_UPDATED"')
      )
    })

    it('should notify permission update and clear all cache when no resource specified', async () => {
      const { enhancedPermissionService } = require('@/lib/permissions')
      
      await ServerPermissionEvents.notifyPermissionUpdate()
      
      expect(enhancedPermissionService.clearCache).toHaveBeenCalled()
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'permission_update',
        expect.stringContaining('"type":"PERMISSION_UPDATED"')
      )
    })

    it('should notify user deactivation and invalidate user cache', async () => {
      const { enhancedPermissionService } = require('@/lib/permissions')
      
      await ServerPermissionEvents.notifyUserDeactivation('user-1')
      
      expect(enhancedPermissionService.invalidateUserCache).toHaveBeenCalledWith('user-1')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'permission_update',
        expect.stringContaining('"type":"USER_DEACTIVATED"')
      )
    })

    it('should handle cache invalidation errors gracefully', async () => {
      const { enhancedPermissionService } = require('@/lib/permissions')
      enhancedPermissionService.invalidateUserCache.mockRejectedValue(new Error('Cache error'))
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      await ServerPermissionEvents.notifyUserRoleChange('user-1', 'VIEWER', 'EDITOR')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to invalidate server-side permission cache:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })
})

describe('Integration tests', () => {
  it('should handle complete permission update flow', async () => {
    const broadcaster = PermissionEventBroadcaster.getInstance()
    const callback = jest.fn()
    
    broadcaster.subscribe(callback)
    
    // Simulate server-side role change
    await ServerPermissionEvents.notifyUserRoleChange('user-1', 'VIEWER', 'EDITOR')
    
    // Should have called local callback
    expect(callback).toHaveBeenCalledWith({
      type: 'USER_ROLE_CHANGED',
      userId: 'user-1',
      timestamp: expect.any(Number),
      metadata: { oldRole: 'VIEWER', newRole: 'EDITOR' }
    })
    
    // Should have broadcast to localStorage
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'permission_update',
      expect.stringContaining('"type":"USER_ROLE_CHANGED"')
    )
    
    // Should have invalidated server cache
    const { enhancedPermissionService } = require('@/lib/permissions')
    expect(enhancedPermissionService.invalidateUserCache).toHaveBeenCalledWith('user-1')
  })

  it('should handle multiple subscribers and events', () => {
    const broadcaster = PermissionEventBroadcaster.getInstance()
    const callback1 = jest.fn()
    const callback2 = jest.fn()
    const callback3 = jest.fn()
    
    broadcaster.subscribe(callback1)
    broadcaster.subscribe(callback2)
    const unsubscribe3 = broadcaster.subscribe(callback3)
    
    // Broadcast first event
    broadcaster.broadcastUserRoleChange('user-1', 'VIEWER', 'EDITOR')
    
    expect(callback1).toHaveBeenCalledTimes(1)
    expect(callback2).toHaveBeenCalledTimes(1)
    expect(callback3).toHaveBeenCalledTimes(1)
    
    // Unsubscribe one callback
    unsubscribe3()
    
    // Broadcast second event
    broadcaster.broadcastPermissionUpdate('products')
    
    expect(callback1).toHaveBeenCalledTimes(2)
    expect(callback2).toHaveBeenCalledTimes(2)
    expect(callback3).toHaveBeenCalledTimes(1) // Should not be called again
  })
})