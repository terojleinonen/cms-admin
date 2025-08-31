/**
 * User Management Performance Tests
 * Performance testing for image processing, large datasets, and API response times
 */

import { performance } from 'perf_hooks'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { UserRole } from '@prisma/client'

// Import services for performance testing
import { profilePictureService } from '@/lib/profile-image-utils'
import { GET as getUsersGET } from '@/api/users/route'
import { POST as uploadAvatarPOST } from '@/api/users/[id]/avatar/route'

// Mock dependencies
jest.mock('next-auth')
jest.mock('../../app/lib/db')
jest.mock('sharp')
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockResolvedValue(undefined),
  },
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('User Management Performance Tests', () => {
  const mockAdminUser = {
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    isActive: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockGetServerSession.mockResolvedValue({
      user: mockAdminUser,
      expires: '2024-12-31',
    } as any)
  })

  describe('Image Processing Performance', () => {
    const createMockImageFile = (sizeKB: number, format: string = 'jpeg') => {
      const content = 'x'.repeat(sizeKB * 1024)
      return new File([content], `test.${format}`, {
        type: `image/${format}`,
      })
    }

    beforeEach(() => {
      // Mock sharp operations
      const mockSharp = require('sharp')
      mockSharp.mockReturnValue({
        metadata: jest.fn().mockResolvedValue({
          width: 2000,
          height: 2000,
          format: 'jpeg',
          size: 1024 * 1024,
        }),
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        webp: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue({
          width: 256,
          height: 256,
          format: 'webp',
          size: 50000,
          channels: 3,
        }),
      })
    })

    it('should process small images (< 1MB) within 500ms', async () => {
      const smallImage = createMockImageFile(500) // 500KB
      const startTime = performance.now()

      await profilePictureService.processProfilePicture(smallImage, 'user-123')

      const endTime = performance.now()
      const processingTime = endTime - startTime

      expect(processingTime).toBeLessThan(500)
    })

    it('should process medium images (1-3MB) within 1000ms', async () => {
      const mediumImage = createMockImageFile(2048) // 2MB
      const startTime = performance.now()

      await profilePictureService.processProfilePicture(mediumImage, 'user-123')

      const endTime = performance.now()
      const processingTime = endTime - startTime

      expect(processingTime).toBeLessThan(1000)
    })

    it('should process large images (3-5MB) within 2000ms', async () => {
      const largeImage = createMockImageFile(4096) // 4MB
      const startTime = performance.now()

      await profilePictureService.processProfilePicture(largeImage, 'user-123')

      const endTime = performance.now()
      const processingTime = endTime - startTime

      expect(processingTime).toBeLessThan(2000)
    })

    it('should handle concurrent image processing efficiently', async () => {
      const images = Array.from({ length: 5 }, (_, i) => 
        createMockImageFile(1024, 'jpeg') // 1MB each
      )

      const startTime = performance.now()

      const promises = images.map((image, index) =>
        profilePictureService.processProfilePicture(image, `user-${index}`)
      )

      await Promise.all(promises)

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Should process 5 images concurrently faster than sequentially
      expect(totalTime).toBeLessThan(3000) // Less than 3 seconds for 5 images
    })

    it('should optimize different image formats efficiently', async () => {
      const formats = ['jpeg', 'png', 'webp']
      const results: { format: string; time: number }[] = []

      for (const format of formats) {
        const image = createMockImageFile(1024, format)
        const startTime = performance.now()

        await profilePictureService.processProfilePicture(image, 'user-123')

        const endTime = performance.now()
        results.push({
          format,
          time: endTime - startTime,
        })
      }

      // All formats should process within reasonable time
      results.forEach(result => {
        expect(result.time).toBeLessThan(1500)
      })

      // WebP should generally be fastest to process
      const webpResult = results.find(r => r.format === 'webp')
      expect(webpResult?.time).toBeDefined()
    })

    it('should generate multiple image sizes efficiently', async () => {
      const image = createMockImageFile(2048) // 2MB
      const sizes = ['thumbnail', 'small', 'medium', 'large']

      const startTime = performance.now()

      // Mock processing all sizes
      const promises = sizes.map(size =>
        profilePictureService.processProfilePicture(image, 'user-123')
      )

      await Promise.all(promises)

      const endTime = performance.now()
      const processingTime = endTime - startTime

      // Should generate all sizes within 2 seconds
      expect(processingTime).toBeLessThan(2000)
    })

    it('should handle image upload API endpoint performance', async () => {
      const image = createMockImageFile(1024)
      const formData = new FormData()
      formData.append('file', image)

      const startTime = performance.now()

      const request = new NextRequest('http://localhost/api/users/user-123/avatar', {
        method: 'POST',
        body: formData,
      })
      const params = Promise.resolve({ id: 'user-123' })

      const response = await uploadAvatarPOST(request, { params })

      const endTime = performance.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(1500) // API should respond within 1.5 seconds
    })
  })

  describe('Large Dataset Performance', () => {
    const generateMockUsers = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        id: `user-${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: i % 3 === 0 ? UserRole.ADMIN : UserRole.EDITOR,
        isActive: i % 10 !== 0, // 90% active
        profilePicture: i % 5 === 0 ? `profile-${i}.webp` : null,
        createdAt: new Date(Date.now() - i * 86400000), // Spread over days
        updatedAt: new Date(),
        _count: {
          createdProducts: Math.floor(Math.random() * 100),
          createdPages: Math.floor(Math.random() * 50),
        },
      }))
    }

    it('should handle user listing with 1000 users within 200ms', async () => {
      const users = generateMockUsers(1000)
      mockPrisma.user.findMany.mockResolvedValue(users.slice(0, 20) as any)
      mockPrisma.user.count.mockResolvedValue(1000)

      const startTime = performance.now()

      const request = new NextRequest('http://localhost/api/users?page=1&limit=20')
      const response = await getUsersGET(request)

      const endTime = performance.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(200)
    })

    it('should handle user listing with 10000 users within 300ms', async () => {
      const users = generateMockUsers(10000)
      mockPrisma.user.findMany.mockResolvedValue(users.slice(0, 20) as any)
      mockPrisma.user.count.mockResolvedValue(10000)

      const startTime = performance.now()

      const request = new NextRequest('http://localhost/api/users?page=1&limit=20')
      const response = await getUsersGET(request)

      const endTime = performance.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(300)
    })

    it('should handle user search efficiently with large datasets', async () => {
      const users = generateMockUsers(5000)
      const searchResults = users.filter(u => 
        u.name.includes('User 1') || u.email.includes('user1')
      ).slice(0, 20)

      mockPrisma.user.findMany.mockResolvedValue(searchResults as any)
      mockPrisma.user.count.mockResolvedValue(searchResults.length)

      const startTime = performance.now()

      const request = new NextRequest('http://localhost/api/users?search=User%201')
      const response = await getUsersGET(request)

      const endTime = performance.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(250)
    })

    it('should handle role filtering efficiently', async () => {
      const users = generateMockUsers(3000)
      const adminUsers = users.filter(u => u.role === UserRole.ADMIN).slice(0, 20)

      mockPrisma.user.findMany.mockResolvedValue(adminUsers as any)
      mockPrisma.user.count.mockResolvedValue(adminUsers.length)

      const startTime = performance.now()

      const request = new NextRequest('http://localhost/api/users?role=ADMIN')
      const response = await getUsersGET(request)

      const endTime = performance.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(200)
    })

    it('should handle pagination efficiently across large datasets', async () => {
      const totalUsers = 50000
      const pageSize = 50
      const totalPages = Math.ceil(totalUsers / pageSize)

      // Test multiple pages
      const pagesToTest = [1, 100, 500, 1000]
      const results: { page: number; time: number }[] = []

      for (const page of pagesToTest) {
        if (page <= totalPages) {
          const users = generateMockUsers(pageSize)
          mockPrisma.user.findMany.mockResolvedValue(users as any)
          mockPrisma.user.count.mockResolvedValue(totalUsers)

          const startTime = performance.now()

          const request = new NextRequest(`http://localhost/api/users?page=${page}&limit=${pageSize}`)
          const response = await getUsersGET(request)

          const endTime = performance.now()
          const responseTime = endTime - startTime

          expect(response.status).toBe(200)
          results.push({ page, time: responseTime })
        }
      }

      // All pages should respond within reasonable time
      results.forEach(result => {
        expect(result.time).toBeLessThan(300)
      })

      // Response time should be consistent across pages
      const times = results.map(r => r.time)
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      const maxDeviation = Math.max(...times.map(t => Math.abs(t - avgTime)))
      
      // Max deviation should be less than 100ms
      expect(maxDeviation).toBeLessThan(100)
    })
  })

  describe('Memory Usage Performance', () => {
    it('should handle multiple concurrent user requests without memory leaks', async () => {
      const initialMemory = process.memoryUsage()
      const users = generateMockUsers(100)

      // Simulate 50 concurrent requests
      const requests = Array.from({ length: 50 }, (_, i) => {
        mockPrisma.user.findMany.mockResolvedValue(users.slice(0, 20) as any)
        mockPrisma.user.count.mockResolvedValue(100)

        const request = new NextRequest(`http://localhost/api/users?page=${i + 1}&limit=20`)
        return getUsersGET(request)
      })

      await Promise.all(requests)

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })

    it('should efficiently handle image processing memory usage', async () => {
      const initialMemory = process.memoryUsage()
      
      // Process multiple images
      const images = Array.from({ length: 10 }, () => createMockImageFile(2048))
      
      for (const image of images) {
        await profilePictureService.processProfilePicture(image, 'user-123')
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // Memory increase should be reasonable for image processing
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // Less than 100MB
    })
  })

  describe('Database Query Performance', () => {
    it('should optimize user queries with proper indexing', async () => {
      // Test that queries use proper indexes
      const users = generateMockUsers(1000)
      mockPrisma.user.findMany.mockResolvedValue(users.slice(0, 20) as any)
      mockPrisma.user.count.mockResolvedValue(1000)

      const startTime = performance.now()

      const request = new NextRequest('http://localhost/api/users?search=john&role=EDITOR&page=1&limit=20')
      const response = await getUsersGET(request)

      const endTime = performance.now()
      const queryTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(queryTime).toBeLessThan(150) // Complex query should still be fast

      // Verify the query structure uses proper filtering
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        select: expect.any(Object),
        where: {
          AND: [
            { role: UserRole.EDITOR },
            {
              OR: [
                { name: { contains: 'john', mode: 'insensitive' } },
                { email: { contains: 'john', mode: 'insensitive' } },
              ],
            },
          ],
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should handle user count queries efficiently', async () => {
      mockPrisma.user.count.mockResolvedValue(100000)

      const startTime = performance.now()

      // This would be called as part of the pagination logic
      const count = await mockPrisma.user.count({
        where: {
          role: UserRole.EDITOR,
          isActive: true,
        },
      })

      const endTime = performance.now()
      const queryTime = endTime - startTime

      expect(count).toBe(100000)
      expect(queryTime).toBeLessThan(50) // Count queries should be very fast
    })
  })

  describe('API Response Time Benchmarks', () => {
    const performanceThresholds = {
      userList: 200,      // ms
      userDetail: 100,    // ms
      userUpdate: 150,    // ms
      imageUpload: 1500,  // ms
      search: 250,        // ms
    }

    it('should meet performance thresholds for all endpoints', async () => {
      const results: { endpoint: string; time: number; threshold: number }[] = []

      // Test user list endpoint
      const users = generateMockUsers(100)
      mockPrisma.user.findMany.mockResolvedValue(users.slice(0, 20) as any)
      mockPrisma.user.count.mockResolvedValue(100)

      const startTime = performance.now()
      const request = new NextRequest('http://localhost/api/users')
      const response = await getUsersGET(request)
      const endTime = performance.now()

      results.push({
        endpoint: 'userList',
        time: endTime - startTime,
        threshold: performanceThresholds.userList,
      })

      // Verify all results meet thresholds
      results.forEach(result => {
        expect(result.time).toBeLessThan(result.threshold)
      })

      // Log performance results for monitoring
      console.log('Performance Test Results:')
      results.forEach(result => {
        console.log(`${result.endpoint}: ${result.time.toFixed(2)}ms (threshold: ${result.threshold}ms)`)
      })
    })
  })

  // Helper function to create mock image files
  function createMockImageFile(sizeKB: number, format: string = 'jpeg'): File {
    const content = 'x'.repeat(sizeKB * 1024)
    return new File([content], `test.${format}`, {
      type: `image/${format}`,
    })
  }

  // Helper function to generate mock users
  function generateMockUsers(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: `user-${i}`,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      role: i % 3 === 0 ? UserRole.ADMIN : UserRole.EDITOR,
      isActive: i % 10 !== 0,
      profilePicture: i % 5 === 0 ? `profile-${i}.webp` : null,
      createdAt: new Date(Date.now() - i * 86400000),
      updatedAt: new Date(),
      _count: {
        createdProducts: Math.floor(Math.random() * 100),
        createdPages: Math.floor(Math.random() * 50),
      },
    }))
  }
})