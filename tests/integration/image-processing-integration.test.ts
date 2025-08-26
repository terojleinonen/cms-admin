/**
 * Image Processing Integration Tests
 * Tests the integration between image processing service, media utilities, and cache service
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import {
  getEnhancedImageMetadata,
  optimizeImageEnhanced,
  generateResponsiveImages,
  generateModernFormats,
} from '@/lib/media-utils'
import { ImageProcessingService } from '@/lib/image-processing'
import { ImageCache } from '@/lib/cache'

// Mock fs and sharp
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    unlink: jest.fn(),
  },
}))

jest.mock('sharp')

const mockFs = fs as jest.Mocked<typeof fs>
const mockSharp = sharp as jest.MockedFunction<typeof sharp>

describe('Image Processing Integration', () => {
  let mockSharpInstance: any
  let imageCache: ImageCache

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset singleton
    ;(ImageProcessingService as any).instance = null
    
    // Create mock Sharp instance
    mockSharpInstance = {
      metadata: jest.fn(),
      resize: jest.fn().mockReturnThis(),
      blur: jest.fn().mockReturnThis(),
      sharpen: jest.fn().mockReturnThis(),
      grayscale: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      png: jest.fn().mockReturnThis(),
      webp: jest.fn().mockReturnThis(),
      avif: jest.fn().mockReturnThis(),
      toFile: jest.fn(),
    }
    
    mockSharp.mockReturnValue(mockSharpInstance)
    mockFs.mkdir.mockResolvedValue(undefined)
    mockFs.unlink.mockResolvedValue(undefined)
    
    imageCache = new ImageCache('./test-cache')
  })

  describe('Enhanced Metadata Extraction', () => {
    it('should extract comprehensive metadata through media utils', async () => {
      const mockMetadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 245760,
        density: 72,
        hasAlpha: false,
        orientation: 1,
        space: 'srgb',
        channels: 3,
      }

      mockSharpInstance.metadata.mockResolvedValue(mockMetadata)

      const result = await getEnhancedImageMetadata('/path/to/image.jpg')

      expect(result).toEqual({
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 245760,
        density: 72,
        hasAlpha: false,
        orientation: 1,
        colorSpace: 'srgb',
        channels: 3,
        exif: {},
        icc: undefined,
        iptc: undefined,
        xmp: undefined,
      })
    })
  })

  describe('Enhanced Image Optimization', () => {
    it('should optimize images with custom options through media utils', async () => {
      const mockMetadata = { width: 1920, height: 1080, format: 'jpeg' }
      mockSharpInstance.metadata.mockResolvedValue(mockMetadata)
      mockSharpInstance.toFile.mockResolvedValue({
        width: 800,
        height: 600,
        format: 'webp',
        size: 51200,
        channels: 3,
      })

      await optimizeImageEnhanced('/input.jpg', '/output.webp', {
        width: 800,
        height: 600,
        format: 'webp',
        quality: 90,
      })

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(800, 600, {
        fit: 'inside',
        position: 'center',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        withoutEnlargement: true,
      })
      expect(mockSharpInstance.webp).toHaveBeenCalledWith({
        quality: 90,
        effort: 4,
        lossless: false,
      })
    })
  })

  describe('Responsive Image Generation', () => {
    it('should generate responsive variants through media utils', async () => {
      mockSharpInstance.metadata.mockResolvedValue({ width: 1920, height: 1080, format: 'jpeg' })
      mockSharpInstance.toFile.mockResolvedValue({
        width: 800,
        height: 600,
        format: 'webp',
        size: 51200,
        channels: 3,
      })

      const results = await generateResponsiveImages('/input.jpg', '/output', 'image')

      expect(mockFs.mkdir).toHaveBeenCalledWith('/output', { recursive: true })
      expect(results).toHaveLength(6) // Default responsive breakpoints
      expect(results[0].variant.suffix).toBe('xs')
      expect(results[0].path).toBe('/output/image-xs.webp')
    })
  })

  describe('Modern Format Generation', () => {
    it('should generate WebP and AVIF formats through media utils', async () => {
      mockSharpInstance.metadata.mockResolvedValue({ width: 800, height: 600, format: 'jpeg' })
      mockSharpInstance.toFile.mockResolvedValue({
        width: 800,
        height: 600,
        format: 'webp',
        size: 40960,
        channels: 3,
      })

      const results = await generateModernFormats('/input.jpg', '/output', 'image')

      expect(mockFs.mkdir).toHaveBeenCalledWith('/output', { recursive: true })
      expect(results.webp).toBe('/output/image.webp')
      expect(results.avif).toBe('/output/image.avif')
    })
  })

  describe('Cache Integration', () => {
    it('should cache processed image metadata', async () => {
      const originalPath = '/path/to/original.jpg'
      const processedPath = '/path/to/processed.webp'
      const metadata = {
        width: 800,
        height: 600,
        format: 'webp',
        size: 51200,
        quality: 85,
      }

      await imageCache.cacheImageMetadata(originalPath, processedPath, metadata)

      const cached = await imageCache.getCachedImageMetadata(originalPath, {
        width: 800,
        height: 600,
        format: 'webp',
        quality: 85,
      })

      expect(cached).toBeDefined()
      expect(cached?.processedPath).toBe(processedPath)
      expect(cached?.metadata).toEqual(metadata)
    })

    it('should generate cache keys with enhanced options', () => {
      const cacheKey = imageCache.getCacheKey('/image.jpg', {
        width: 800,
        height: 600,
        format: 'webp',
        quality: 85,
        fit: 'cover',
      })

      expect(cacheKey).toMatch(/^image-/)
      expect(cacheKey.length).toBeGreaterThan(10)
    })

    it('should invalidate cached images', async () => {
      const originalPath = '/path/to/original.jpg'
      
      // Cache some data first
      await imageCache.cacheImageMetadata(originalPath, '/processed.webp', {
        width: 800,
        height: 600,
        format: 'webp',
      })

      // Invalidate cache
      await imageCache.invalidateImageCache(originalPath)

      // Should not find cached data
      const cached = await imageCache.getCachedImageMetadata(originalPath, {
        width: 800,
        height: 600,
        format: 'webp',
      })

      expect(cached).toBeNull()
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle image processing errors gracefully', async () => {
      mockSharpInstance.metadata.mockRejectedValue(new Error('Invalid image'))

      await expect(getEnhancedImageMetadata('/invalid.jpg'))
        .rejects.toThrow('Failed to extract image metadata')
    })

    it('should handle optimization errors gracefully', async () => {
      mockSharpInstance.metadata.mockResolvedValue({ width: 800, height: 600, format: 'jpeg' })
      mockSharpInstance.toFile.mockRejectedValue(new Error('Write failed'))

      await expect(optimizeImageEnhanced('/input.jpg', '/output.webp'))
        .rejects.toThrow('Failed to optimize image')
    })
  })

  describe('Performance Integration', () => {
    it('should handle batch processing efficiently', async () => {
      const imageService = ImageProcessingService.getInstance()
      
      mockSharpInstance.metadata.mockResolvedValue({ width: 800, height: 600, format: 'jpeg' })
      mockSharpInstance.toFile.mockResolvedValue({
        width: 400,
        height: 300,
        format: 'webp',
        size: 25600,
        channels: 3,
      })

      const inputPaths = ['/input1.jpg', '/input2.jpg', '/input3.jpg']
      
      const results = await imageService.batchProcess(inputPaths, '/output', {
        format: 'webp',
        quality: 85,
        width: 400,
      })

      expect(results).toHaveLength(3)
      expect(mockSharpInstance.toFile).toHaveBeenCalledTimes(3)
      expect(mockFs.mkdir).toHaveBeenCalledWith('/output', { recursive: true })
    })
  })

  describe('CDN Integration', () => {
    it('should generate CDN URLs for optimized images', () => {
      // Reset singleton with CDN config
      ;(ImageProcessingService as any).instance = null
      const imageService = ImageProcessingService.getInstance({
        baseUrl: 'https://cdn.example.com',
        enableWebP: true,
        enableAVIF: true,
      })

      const url = imageService.generateCDNUrl('/image.jpg', {
        width: 800,
        height: 600,
        quality: 85,
        format: 'webp',
      })

      expect(url).toContain('https://cdn.example.com/image.jpg')
      expect(url).toContain('w=800')
      expect(url).toContain('h=600')
      expect(url).toContain('q=85')
      expect(url).toContain('f=webp')
    })

    it('should generate responsive picture elements', () => {
      // Reset singleton with CDN config
      ;(ImageProcessingService as any).instance = null
      const imageService = ImageProcessingService.getInstance({
        baseUrl: 'https://cdn.example.com',
      })

      const html = imageService.generatePictureElement('/image.jpg', 'Test image')

      expect(html).toContain('<picture>')
      expect(html).toContain('<source')
      expect(html).toContain('type="image/webp"')
      expect(html).toContain('<img')
      expect(html).toContain('alt="Test image"')
      expect(html).toContain('loading="lazy"')
    })
  })
})