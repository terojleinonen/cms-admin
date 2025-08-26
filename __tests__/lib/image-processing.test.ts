/**
 * Enhanced Image Processing Service Tests
 * Tests for comprehensive image processing capabilities including optimization,
 * format conversion, metadata extraction, and responsive variants generation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import {
  ImageProcessingService,
  imageProcessingService,
  RESPONSIVE_BREAKPOINTS,
  FORMAT_SETTINGS,
  imageProcessingOptionsSchema,
  formatFileSize,
  calculateCompressionRatio,
  getAspectRatio,
  type ImageProcessingOptions,
  type ImageMetadataExtended,
  type ResponsiveImageVariant,
  type CDNConfig,
} from '@/lib/image-processing'

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

describe('ImageProcessingService', () => {
  let service: ImageProcessingService
  let mockSharpInstance: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset singleton instance
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
    
    service = ImageProcessingService.getInstance()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ImageProcessingService.getInstance()
      const instance2 = ImageProcessingService.getInstance()
      
      expect(instance1).toBe(instance2)
      // Note: imageProcessingService is created at module load time, so it won't be the same instance after reset
    })

    it('should accept CDN configuration', () => {
      const cdnConfig: CDNConfig = {
        baseUrl: 'https://cdn.example.com',
        enableWebP: true,
        enableAVIF: true,
      }
      
      const instance = ImageProcessingService.getInstance(cdnConfig)
      expect(instance).toBeInstanceOf(ImageProcessingService)
    })
  })

  describe('extractMetadata', () => {
    it('should extract comprehensive image metadata', async () => {
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
        exif: Buffer.from([0xFF, 0xE1, 0x00, 0x16]),
        icc: Buffer.from('icc-profile'),
        iptc: { keywords: ['test'] },
        xmp: Buffer.from('<xmp>test</xmp>'),
      }

      mockSharpInstance.metadata.mockResolvedValue(mockMetadata)

      const result = await service.extractMetadata('/path/to/image.jpg')

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
        icc: mockMetadata.icc,
        iptc: mockMetadata.iptc,
        xmp: '<xmp>test</xmp>',
      })
    })

    it('should handle missing metadata fields gracefully', async () => {
      const mockMetadata = {
        format: 'png',
      }

      mockSharpInstance.metadata.mockResolvedValue(mockMetadata)

      const result = await service.extractMetadata('/path/to/image.png')

      expect(result).toEqual({
        width: 0,
        height: 0,
        format: 'png',
        size: 0,
        density: undefined,
        hasAlpha: undefined,
        orientation: undefined,
        colorSpace: undefined,
        channels: undefined,
        exif: {},
        icc: undefined,
        iptc: undefined,
        xmp: undefined,
      })
    })

    it('should handle EXIF parsing errors gracefully', async () => {
      const mockMetadata = {
        width: 800,
        height: 600,
        format: 'jpeg',
        size: 102400,
        exif: Buffer.from([0x00, 0x01]), // Invalid EXIF data
      }

      mockSharpInstance.metadata.mockResolvedValue(mockMetadata)

      const result = await service.extractMetadata('/path/to/image.jpg')

      expect(result.exif).toEqual({})
    })

    it('should throw error for invalid image', async () => {
      mockSharpInstance.metadata.mockRejectedValue(new Error('Invalid image'))

      await expect(service.extractMetadata('/path/to/invalid.jpg'))
        .rejects.toThrow('Failed to extract image metadata')
    })
  })

  describe('optimizeImage', () => {
    beforeEach(() => {
      mockSharpInstance.toFile.mockResolvedValue({
        width: 800,
        height: 600,
        format: 'webp',
        size: 51200,
        channels: 3,
      })
    })

    it('should optimize image with default settings', async () => {
      const mockMetadata = { width: 1920, height: 1080, format: 'jpeg' }
      mockSharpInstance.metadata.mockResolvedValue(mockMetadata)

      const result = await service.optimizeImage('/input.jpg', '/output.webp')

      expect(mockSharp).toHaveBeenCalledWith('/input.jpg')
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({
        quality: 85,
        progressive: true,
        mozjpeg: true,
      })
      expect(mockSharpInstance.toFile).toHaveBeenCalledWith('/output.webp')
      expect(result).toEqual({
        width: 800,
        height: 600,
        format: 'webp',
        size: 51200,
        channels: 3,
      })
    })

    it('should apply resize transformations', async () => {
      const mockMetadata = { width: 1920, height: 1080, format: 'jpeg' }
      mockSharpInstance.metadata.mockResolvedValue(mockMetadata)

      const options: ImageProcessingOptions = {
        width: 800,
        height: 600,
        fit: 'cover',
        position: 'center',
      }

      await service.optimizeImage('/input.jpg', '/output.jpg', options)

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(800, 600, {
        fit: 'cover',
        position: 'center',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        withoutEnlargement: true,
      })
    })

    it('should apply image filters', async () => {
      const mockMetadata = { width: 800, height: 600, format: 'jpeg' }
      mockSharpInstance.metadata.mockResolvedValue(mockMetadata)

      const options: ImageProcessingOptions = {
        blur: 2,
        sharpen: true,
        grayscale: true,
      }

      await service.optimizeImage('/input.jpg', '/output.jpg', options)

      expect(mockSharpInstance.blur).toHaveBeenCalledWith(2)
      expect(mockSharpInstance.sharpen).toHaveBeenCalled()
      expect(mockSharpInstance.grayscale).toHaveBeenCalled()
    })

    it('should handle different output formats', async () => {
      const mockMetadata = { width: 800, height: 600, format: 'jpeg' }
      mockSharpInstance.metadata.mockResolvedValue(mockMetadata)

      // Test JPEG
      await service.optimizeImage('/input.jpg', '/output.jpg', { format: 'jpeg', quality: 90 })
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({
        quality: 90,
        progressive: true,
        mozjpeg: true,
      })

      // Test PNG
      await service.optimizeImage('/input.jpg', '/output.png', { format: 'png', quality: 95 })
      expect(mockSharpInstance.png).toHaveBeenCalledWith({
        quality: 95,
        compressionLevel: 8,
        adaptiveFiltering: true,
      })

      // Test AVIF
      await service.optimizeImage('/input.jpg', '/output.avif', { format: 'avif', quality: 75 })
      expect(mockSharpInstance.avif).toHaveBeenCalledWith({
        quality: 75,
        effort: 4,
        chromaSubsampling: '4:2:0',
      })
    })

    it('should throw error on processing failure', async () => {
      mockSharpInstance.metadata.mockResolvedValue({ width: 800, height: 600, format: 'jpeg' })
      mockSharpInstance.toFile.mockRejectedValue(new Error('Processing failed'))

      await expect(service.optimizeImage('/input.jpg', '/output.jpg'))
        .rejects.toThrow('Failed to optimize image')
    })
  })

  describe('generateResponsiveVariants', () => {
    beforeEach(() => {
      mockSharpInstance.metadata.mockResolvedValue({ width: 1920, height: 1080, format: 'jpeg' })
      mockSharpInstance.toFile.mockResolvedValue({
        width: 800,
        height: 600,
        format: 'webp',
        size: 51200,
        channels: 3,
      })
    })

    it('should generate all responsive variants', async () => {
      const variants: ResponsiveImageVariant[] = [
        { width: 320, format: 'webp', quality: 75, suffix: 'xs' },
        { width: 768, format: 'webp', quality: 85, suffix: 'md' },
      ]

      const results = await service.generateResponsiveVariants(
        '/input.jpg',
        '/output',
        'image',
        variants
      )

      expect(mockFs.mkdir).toHaveBeenCalledWith('/output', { recursive: true })
      expect(results).toHaveLength(2)
      expect(results[0].variant.suffix).toBe('xs')
      expect(results[1].variant.suffix).toBe('md')
      expect(results[0].path).toBe('/output/image-xs.webp')
      expect(results[1].path).toBe('/output/image-md.webp')
    })

    it('should use default responsive breakpoints', async () => {
      const results = await service.generateResponsiveVariants('/input.jpg', '/output', 'image')

      expect(results).toHaveLength(RESPONSIVE_BREAKPOINTS.length)
      expect(mockSharpInstance.toFile).toHaveBeenCalledTimes(RESPONSIVE_BREAKPOINTS.length)
    })

    it('should handle variant generation failures gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      mockSharpInstance.toFile.mockRejectedValueOnce(new Error('Failed to generate variant'))

      const variants: ResponsiveImageVariant[] = [
        { width: 320, format: 'webp', quality: 75, suffix: 'xs' },
        { width: 768, format: 'webp', quality: 85, suffix: 'md' },
      ]

      const results = await service.generateResponsiveVariants('/input.jpg', '/output', 'image', variants)

      expect(results).toHaveLength(1) // Only successful variant
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to generate variant xs:', expect.any(Error))
      
      consoleWarnSpy.mockRestore()
    })
  })

  describe('convertFormat', () => {
    it('should convert image to target format', async () => {
      mockSharpInstance.metadata.mockResolvedValue({ width: 800, height: 600, format: 'jpeg' })
      mockSharpInstance.toFile.mockResolvedValue({
        width: 800,
        height: 600,
        format: 'webp',
        size: 40960,
        channels: 3,
      })

      const result = await service.convertFormat('/input.jpg', '/output.webp', 'webp', { quality: 90 })

      expect(mockSharpInstance.webp).toHaveBeenCalledWith({
        quality: 90,
        effort: 4,
        lossless: false,
      })
      expect(result.format).toBe('webp')
    })
  })

  describe('generateModernFormats', () => {
    beforeEach(() => {
      mockSharpInstance.metadata.mockResolvedValue({ width: 800, height: 600, format: 'jpeg' })
      mockSharpInstance.toFile.mockResolvedValue({
        width: 800,
        height: 600,
        format: 'webp',
        size: 40960,
        channels: 3,
      })
    })

    it('should generate WebP and AVIF formats', async () => {
      const results = await service.generateModernFormats('/input.jpg', '/output', 'image')

      expect(mockFs.mkdir).toHaveBeenCalledWith('/output', { recursive: true })
      expect(results.webp).toBe('/output/image.webp')
      expect(results.avif).toBe('/output/image.avif')
      expect(mockSharpInstance.webp).toHaveBeenCalledWith({
        quality: 85,
        effort: 4,
        lossless: false,
      })
      expect(mockSharpInstance.avif).toHaveBeenCalledWith({
        quality: 80,
        effort: 4,
        chromaSubsampling: '4:2:0',
      })
    })

    it('should handle format generation failures gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      mockSharpInstance.toFile.mockRejectedValueOnce(new Error('WebP failed'))

      const results = await service.generateModernFormats('/input.jpg', '/output', 'image')

      expect(results.webp).toBeUndefined()
      expect(results.avif).toBeDefined()
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to generate WebP format:', expect.any(Error))
      
      consoleWarnSpy.mockRestore()
    })
  })

  describe('generateCDNUrl', () => {
    it('should return original path when no CDN config', () => {
      const url = service.generateCDNUrl('/image.jpg', { width: 800 })
      expect(url).toBe('/image.jpg')
    })

    it('should generate CDN URL with transformations', () => {
      // Reset singleton for this test
      ;(ImageProcessingService as any).instance = null
      const cdnService = ImageProcessingService.getInstance({
        baseUrl: 'https://cdn.example.com',
        transformationParams: { auto: 'format' },
      })

      const url = cdnService.generateCDNUrl('/image.jpg', {
        width: 800,
        height: 600,
        quality: 85,
        format: 'webp',
        fit: 'cover',
      })

      expect(url).toContain('https://cdn.example.com/image.jpg')
      expect(url).toContain('w=800')
      expect(url).toContain('h=600')
      expect(url).toContain('q=85')
      expect(url).toContain('f=webp')
      expect(url).toContain('fit=cover')
      expect(url).toContain('auto=format')
    })
  })

  describe('generatePictureElement', () => {
    it('should generate picture element with responsive sources', () => {
      // Reset singleton for this test
      ;(ImageProcessingService as any).instance = null
      const cdnService = ImageProcessingService.getInstance({
        baseUrl: 'https://cdn.example.com',
      })

      const variants: ResponsiveImageVariant[] = [
        { width: 320, format: 'webp', quality: 75, suffix: 'xs' },
        { width: 768, format: 'webp', quality: 85, suffix: 'md' },
      ]

      const html = cdnService.generatePictureElement('/image.jpg', 'Test image', variants, 'responsive-image')

      expect(html).toContain('<picture class="responsive-image">')
      expect(html).toContain('<source media="(max-width: 320px)"')
      expect(html).toContain('<source media="(max-width: 768px)"')
      expect(html).toContain('type="image/webp"')
      expect(html).toContain('<img src="https://cdn.example.com/image.jpg?q=85&f=jpeg"')
      expect(html).toContain('alt="Test image"')
      expect(html).toContain('loading="lazy"')
      expect(html).toContain('decoding="async"')
    })

    it('should generate picture element without class', () => {
      const html = service.generatePictureElement('/image.jpg', 'Test image')

      expect(html).toContain('<picture>')
      expect(html).not.toContain('class=')
    })
  })

  describe('batchProcess', () => {
    beforeEach(() => {
      mockSharpInstance.metadata.mockResolvedValue({ width: 800, height: 600, format: 'jpeg' })
      mockSharpInstance.toFile.mockResolvedValue({
        width: 800,
        height: 600,
        format: 'webp',
        size: 40960,
        channels: 3,
      })
    })

    it('should process multiple images in batches', async () => {
      const inputPaths = ['/input1.jpg', '/input2.jpg', '/input3.jpg']
      
      const results = await service.batchProcess(inputPaths, '/output', { format: 'webp', quality: 85 })

      expect(mockFs.mkdir).toHaveBeenCalledWith('/output', { recursive: true })
      expect(results).toHaveLength(3)
      expect(results[0].input).toBe('/input1.jpg')
      expect(results[0].output).toBe('/output/input1.webp')
      expect(results[1].input).toBe('/input2.jpg')
      expect(results[1].output).toBe('/output/input2.webp')
    })

    it('should handle processing failures gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      mockSharpInstance.toFile.mockRejectedValueOnce(new Error('Processing failed'))

      const inputPaths = ['/input1.jpg', '/input2.jpg']
      
      const results = await service.batchProcess(inputPaths, '/output')

      expect(results).toHaveLength(1) // Only successful processing
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to process /input1.jpg:', expect.any(Error))
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('cleanup', () => {
    it('should delete all specified files', async () => {
      const variants = ['/output/image-sm.webp', '/output/image-md.webp']
      
      await service.cleanup('/output/image.jpg', variants)

      expect(mockFs.unlink).toHaveBeenCalledTimes(3)
      expect(mockFs.unlink).toHaveBeenCalledWith('/output/image.jpg')
      expect(mockFs.unlink).toHaveBeenCalledWith('/output/image-sm.webp')
      expect(mockFs.unlink).toHaveBeenCalledWith('/output/image-md.webp')
    })

    it('should ignore ENOENT errors', async () => {
      const enoentError = new Error('File not found') as NodeJS.ErrnoException
      enoentError.code = 'ENOENT'
      mockFs.unlink.mockRejectedValue(enoentError)

      await expect(service.cleanup('/output/image.jpg')).resolves.toBeUndefined()
    })

    it('should log warnings for other errors', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const otherError = new Error('Permission denied')
      mockFs.unlink.mockRejectedValue(otherError)

      await service.cleanup('/output/image.jpg')

      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to delete /output/image.jpg:', otherError)
      
      consoleWarnSpy.mockRestore()
    })
  })
})

describe('Image Processing Validation', () => {
  describe('imageProcessingOptionsSchema', () => {
    it('should validate valid options', () => {
      const validOptions = {
        width: 800,
        height: 600,
        format: 'webp' as const,
        quality: 85,
        progressive: true,
        fit: 'cover' as const,
      }

      const result = imageProcessingOptionsSchema.parse(validOptions)
      expect(result).toEqual(validOptions)
    })

    it('should reject invalid width', () => {
      const invalidOptions = { width: -100 }
      
      expect(() => imageProcessingOptionsSchema.parse(invalidOptions)).toThrow()
    })

    it('should reject invalid quality', () => {
      const invalidOptions = { quality: 150 }
      
      expect(() => imageProcessingOptionsSchema.parse(invalidOptions)).toThrow()
    })

    it('should reject invalid format', () => {
      const invalidOptions = { format: 'gif' }
      
      expect(() => imageProcessingOptionsSchema.parse(invalidOptions)).toThrow()
    })

    it('should allow optional fields', () => {
      const minimalOptions = {}
      
      const result = imageProcessingOptionsSchema.parse(minimalOptions)
      expect(result).toEqual({})
    })
  })
})

describe('Utility Functions', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0.0 B')
      expect(formatFileSize(512)).toBe('512.0 B')
      expect(formatFileSize(1024)).toBe('1.0 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(1048576)).toBe('1.0 MB')
      expect(formatFileSize(1073741824)).toBe('1.0 GB')
    })
  })

  describe('calculateCompressionRatio', () => {
    it('should calculate compression ratio correctly', () => {
      expect(calculateCompressionRatio(1000, 500)).toBe(50)
      expect(calculateCompressionRatio(1000, 750)).toBe(25)
      expect(calculateCompressionRatio(1000, 1000)).toBe(0)
    })
  })

  describe('getAspectRatio', () => {
    it('should calculate aspect ratio correctly', () => {
      expect(getAspectRatio(1920, 1080)).toBe('16:9')
      expect(getAspectRatio(1024, 768)).toBe('4:3')
      expect(getAspectRatio(800, 800)).toBe('1:1')
      expect(getAspectRatio(1200, 800)).toBe('3:2')
    })
  })
})

describe('Constants', () => {
  it('should have correct responsive breakpoints', () => {
    expect(RESPONSIVE_BREAKPOINTS).toHaveLength(6)
    expect(RESPONSIVE_BREAKPOINTS[0]).toEqual({
      width: 320,
      format: 'webp',
      quality: 75,
      suffix: 'xs',
    })
    expect(RESPONSIVE_BREAKPOINTS[5]).toEqual({
      width: 1920,
      format: 'webp',
      quality: 90,
      suffix: '2xl',
    })
  })

  it('should have correct format settings', () => {
    expect(FORMAT_SETTINGS.jpeg).toEqual({
      quality: 85,
      progressive: true,
      mozjpeg: true,
    })
    expect(FORMAT_SETTINGS.webp).toEqual({
      quality: 85,
      effort: 4,
      nearLossless: false,
    })
  })
})