/**
 * Media Utilities Tests
 * Tests for media processing, validation, and file management functions
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import {
  validateFile,
  generateUniqueFilename,
  ensureUploadDirectories,
  getImageMetadata,
  getEnhancedImageMetadata,
  generateThumbnails,
  optimizeImage,
  optimizeImageEnhanced,
  generateResponsiveImages,
  generateModernFormats,
  deleteMediaFile,
  getMediaUrl,
  getThumbnailUrls,
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE,
  THUMBNAIL_SIZES,
  UPLOAD_CONFIG
} from '@/lib/media-utils'

// Mock fs and sharp
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    unlink: jest.fn(),
  },
}))

jest.mock('sharp')

const mockFs = fs as jest.Mocked<typeof fs>
const mockSharp = sharp as jest.MockedFunction<typeof sharp>

describe('Media Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateFile', () => {
    it('should validate valid image file', () => {
      const file = {
        name: 'test-image.jpg',
        size: 1024 * 1024, // 1MB
        type: 'image/jpeg'
      }

      const result = validateFile(file)
      expect(result).toEqual(file)
    })

    it('should reject file that is too large', () => {
      const file = {
        name: 'large-image.jpg',
        size: MAX_FILE_SIZE + 1,
        type: 'image/jpeg'
      }

      expect(() => validateFile(file)).toThrow()
    })

    it('should reject unsupported file type', () => {
      const file = {
        name: 'document.pdf',
        size: 1024,
        type: 'application/pdf'
      }

      expect(() => validateFile(file)).toThrow()
    })

    it('should reject file with empty name', () => {
      const file = {
        name: '',
        size: 1024,
        type: 'image/jpeg'
      }

      expect(() => validateFile(file)).toThrow()
    })

    it('should validate all supported image formats', () => {
      const supportedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/svg+xml'
      ]

      supportedTypes.forEach(type => {
        const file = {
          name: `test.${type.split('/')[1]}`,
          size: 1024,
          type
        }

        expect(() => validateFile(file)).not.toThrow()
      })
    })
  })

  describe('generateUniqueFilename', () => {
    it('should generate unique filename with timestamp', () => {
      const originalName = 'test-image.jpg'
      const filename = generateUniqueFilename(originalName)

      expect(filename).toMatch(/^test-image-\d+-[a-z0-9]+\.jpg$/)
      expect(filename).not.toBe(originalName)
    })

    it('should sanitize filename with special characters', () => {
      const originalName = 'test image with spaces & symbols!.jpg'
      const filename = generateUniqueFilename(originalName)

      expect(filename).toMatch(/^test-image-with-spaces-symbols-\d+-[a-z0-9]+\.jpg$/)
    })

    it('should handle filename without extension', () => {
      const originalName = 'test-file'
      const filename = generateUniqueFilename(originalName)

      expect(filename).toMatch(/^test-file-\d+-[a-z0-9]+$/)
    })

    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(100) + '.jpg'
      const filename = generateUniqueFilename(longName)

      expect(filename.length).toBeLessThan(longName.length)
      expect(filename).toMatch(/\.jpg$/)
    })

    it('should generate different filenames for same input', () => {
      const originalName = 'test.jpg'
      const filename1 = generateUniqueFilename(originalName)
      const filename2 = generateUniqueFilename(originalName)

      expect(filename1).not.toBe(filename2)
    })
  })

  describe('ensureUploadDirectories', () => {
    it('should create directories if they do not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'))
      mockFs.mkdir.mockResolvedValue(undefined)

      await ensureUploadDirectories()

      expect(mockFs.mkdir).toHaveBeenCalledWith(UPLOAD_CONFIG.baseDir, { recursive: true })
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.mediaDir),
        { recursive: true }
      )
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.thumbnailDir),
        { recursive: true }
      )
    })

    it('should not create directories if they already exist', async () => {
      mockFs.access.mockResolvedValue(undefined)

      await ensureUploadDirectories()

      expect(mockFs.mkdir).not.toHaveBeenCalled()
    })
  })

  describe('getImageMetadata', () => {
    it('should return image metadata', async () => {
      const mockMetadata = {
        width: 800,
        height: 600,
        format: 'jpeg',
        size: 1024
      }

      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue(mockMetadata)
      }
      mockSharp.mockReturnValue(mockSharpInstance as any)

      const result = await getImageMetadata('/path/to/image.jpg')

      expect(result).toEqual({
        width: 800,
        height: 600,
        format: 'jpeg',
        size: 1024
      })
      expect(mockSharp).toHaveBeenCalledWith('/path/to/image.jpg')
    })

    it('should handle missing metadata fields', async () => {
      const mockMetadata = {
        format: 'jpeg'
      }

      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue(mockMetadata)
      }
      mockSharp.mockReturnValue(mockSharpInstance as any)

      const result = await getImageMetadata('/path/to/image.jpg')

      expect(result).toEqual({
        width: 0,
        height: 0,
        format: 'jpeg',
        size: 0
      })
    })

    it('should throw error for invalid image', async () => {
      const mockSharpInstance = {
        metadata: jest.fn().mockRejectedValue(new Error('Invalid image'))
      }
      mockSharp.mockReturnValue(mockSharpInstance as any)

      await expect(getImageMetadata('/path/to/invalid.jpg')).rejects.toThrow('Failed to read image metadata')
    })
  })

  describe('generateThumbnails', () => {
    it('should generate all thumbnail sizes', async () => {
      const mockSharpInstance = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue(undefined)
      }
      mockSharp.mockReturnValue(mockSharpInstance as any)

      const result = await generateThumbnails('/path/to/original.jpg', 'test.jpg')

      expect(result).toEqual({
        small: '/uploads/thumbnails/small/test.jpg',
        medium: '/uploads/thumbnails/medium/test.jpg',
        large: '/uploads/thumbnails/large/test.jpg'
      })

      // Verify small thumbnail generation
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(
        THUMBNAIL_SIZES.small.width,
        THUMBNAIL_SIZES.small.height,
        { fit: 'cover', position: 'center' }
      )

      // Verify medium thumbnail generation
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(
        THUMBNAIL_SIZES.medium.width,
        THUMBNAIL_SIZES.medium.height,
        { fit: 'cover', position: 'center' }
      )

      // Verify large thumbnail generation
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(
        THUMBNAIL_SIZES.large.width,
        THUMBNAIL_SIZES.large.height,
        { fit: 'inside', withoutEnlargement: true }
      )

      expect(mockSharpInstance.toFile).toHaveBeenCalledTimes(3)
    })

    it('should throw error if thumbnail generation fails', async () => {
      const mockSharpInstance = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockRejectedValue(new Error('Write failed'))
      }
      mockSharp.mockReturnValue(mockSharpInstance as any)

      await expect(generateThumbnails('/path/to/original.jpg', 'test.jpg'))
        .rejects.toThrow('Failed to generate thumbnails')
    })
  })

  describe('optimizeImage', () => {
    it('should optimize image without resizing if within limits', async () => {
      const mockMetadata = { width: 1000, height: 800, format: 'jpeg' }
      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        resize: jest.fn().mockReturnThis(),
        webp: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue(undefined)
      }
      mockSharp.mockReturnValue(mockSharpInstance as any)

      await optimizeImage('/input.jpg', '/output.webp')

      expect(mockSharpInstance.resize).not.toHaveBeenCalled()
      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 85 })
      expect(mockSharpInstance.toFile).toHaveBeenCalledWith('/output.webp')
    })

    it('should resize large images', async () => {
      const mockMetadata = { width: 5000, height: 4000, format: 'jpeg' }
      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        resize: jest.fn().mockReturnThis(),
        webp: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue(undefined)
      }
      mockSharp.mockReturnValue(mockSharpInstance as any)

      await optimizeImage('/input.jpg', '/output.webp')

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(4000, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
    })

    it('should not convert SVG to WebP', async () => {
      const mockMetadata = { width: 1000, height: 800, format: 'svg' }
      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        resize: jest.fn().mockReturnThis(),
        webp: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue(undefined)
      }
      mockSharp.mockReturnValue(mockSharpInstance as any)

      await optimizeImage('/input.svg', '/output.svg')

      expect(mockSharpInstance.webp).not.toHaveBeenCalled()
    })
  })

  describe('deleteMediaFile', () => {
    it('should delete all related files', async () => {
      mockFs.unlink.mockResolvedValue(undefined)

      await deleteMediaFile('test.jpg')

      expect(mockFs.unlink).toHaveBeenCalledTimes(4)
      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.mediaDir, 'test.jpg')
      )
      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.thumbnailDir, 'small', 'test.jpg')
      )
      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.thumbnailDir, 'medium', 'test.jpg')
      )
      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.thumbnailDir, 'large', 'test.jpg')
      )
    })

    it('should ignore ENOENT errors for missing files', async () => {
      const enoentError = new Error('File not found') as NodeJS.ErrnoException
      enoentError.code = 'ENOENT'
      mockFs.unlink.mockRejectedValue(enoentError)

      // Should not throw
      await expect(deleteMediaFile('test.jpg')).resolves.toBeUndefined()
    })

    it('should log warnings for other errors', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const otherError = new Error('Permission denied')
      mockFs.unlink.mockRejectedValue(otherError)

      await deleteMediaFile('test.jpg')

      expect(consoleWarnSpy).toHaveBeenCalled()
      consoleWarnSpy.mockRestore()
    })
  })

  describe('getMediaUrl', () => {
    it('should return correct media URL', () => {
      const filename = 'test-image.jpg'
      const url = getMediaUrl(filename)

      expect(url).toBe('/uploads/media/test-image.jpg')
    })
  })

  describe('getThumbnailUrls', () => {
    it('should return all thumbnail URLs', () => {
      const filename = 'test-image.jpg'
      const urls = getThumbnailUrls(filename)

      expect(urls).toEqual({
        small: '/uploads/thumbnails/small/test-image.jpg',
        medium: '/uploads/thumbnails/medium/test-image.jpg',
        large: '/uploads/thumbnails/large/test-image.jpg'
      })
    })
  })

  describe('Enhanced Image Processing', () => {
    beforeEach(() => {
      // Reset singleton for enhanced image processing tests
      const ImageProcessingService = require('@/lib/image-processing').ImageProcessingService
      ;(ImageProcessingService as any).instance = null
    })

    describe('getEnhancedImageMetadata', () => {
      it('should extract comprehensive metadata', async () => {
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

        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue(mockMetadata)
        }
        mockSharp.mockReturnValue(mockSharpInstance as any)

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

    describe('optimizeImageEnhanced', () => {
      it('should optimize image with custom options', async () => {
        const mockMetadata = { width: 1920, height: 1080, format: 'jpeg' }
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue(mockMetadata),
          resize: jest.fn().mockReturnThis(),
          webp: jest.fn().mockReturnThis(),
          toFile: jest.fn().mockResolvedValue({
            width: 800,
            height: 600,
            format: 'webp',
            size: 51200,
            channels: 3,
          })
        }
        mockSharp.mockReturnValue(mockSharpInstance as any)

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

    describe('generateResponsiveImages', () => {
      it('should generate responsive variants', async () => {
        const mockMetadata = { width: 1920, height: 1080, format: 'jpeg' }
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue(mockMetadata),
          resize: jest.fn().mockReturnThis(),
          webp: jest.fn().mockReturnThis(),
          toFile: jest.fn().mockResolvedValue({
            width: 800,
            height: 600,
            format: 'webp',
            size: 51200,
            channels: 3,
          })
        }
        mockSharp.mockReturnValue(mockSharpInstance as any)
        mockFs.mkdir.mockResolvedValue(undefined)

        const results = await generateResponsiveImages('/input.jpg', '/output', 'image')

        expect(mockFs.mkdir).toHaveBeenCalledWith('/output', { recursive: true })
        expect(results).toHaveLength(6) // Default responsive breakpoints
        expect(results[0].variant.suffix).toBe('xs')
        expect(results[0].path).toBe('/output/image-xs.webp')
      })
    })

    describe('generateModernFormats', () => {
      it('should generate WebP and AVIF formats', async () => {
        const mockMetadata = { width: 800, height: 600, format: 'jpeg' }
        const mockSharpInstance = {
          metadata: jest.fn().mockResolvedValue(mockMetadata),
          webp: jest.fn().mockReturnThis(),
          avif: jest.fn().mockReturnThis(),
          toFile: jest.fn().mockResolvedValue({
            width: 800,
            height: 600,
            format: 'webp',
            size: 40960,
            channels: 3,
          })
        }
        mockSharp.mockReturnValue(mockSharpInstance as any)
        mockFs.mkdir.mockResolvedValue(undefined)

        const results = await generateModernFormats('/input.jpg', '/output', 'image')

        expect(mockFs.mkdir).toHaveBeenCalledWith('/output', { recursive: true })
        expect(results.webp).toBe('/output/image.webp')
        expect(results.avif).toBe('/output/image.avif')
      })
    })
  })
})