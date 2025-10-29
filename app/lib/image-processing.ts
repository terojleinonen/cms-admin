/**
 * Enhanced Image Processing Services
 * Provides comprehensive image optimization, format conversion, metadata extraction,
 * responsive variants generation, and CDN integration capabilities
 */

import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'
import { z } from 'zod'

// Enhanced image processing types
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export interface ImageProcessingOptions {
  width?: number
  height?: number
  format?: ImageFormat
  quality?: number
  progressive?: boolean
  lossless?: boolean
  effort?: number // 0-6 for WebP, 0-9 for AVIF
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  position?: string
  background?: string
  blur?: number
  sharpen?: boolean
  grayscale?: boolean
}

export interface ResponsiveImageVariant {
  width: number
  height?: number
  format: ImageFormat
  quality: number
  suffix: string
}

export interface ImageMetadataExtended {
  width: number
  height: number
  format: string
  size: number
  density?: number
  hasAlpha?: boolean
  orientation?: number
  colorSpace?: string
  channels?: number
  exif?: Record<string, unknown>
  icc?: Buffer
  iptc?: Buffer
  xmp?: string
}

export interface CDNConfig {
  baseUrl: string
  transformationParams?: Record<string, string>
  cacheTTL?: number
  enableWebP?: boolean
  enableAVIF?: boolean
}

// Responsive breakpoints configuration
export const RESPONSIVE_BREAKPOINTS: ResponsiveImageVariant[] = [
  { width: 320, format: 'webp', quality: 75, suffix: 'xs' },
  { width: 480, format: 'webp', quality: 80, suffix: 'sm' },
  { width: 768, format: 'webp', quality: 85, suffix: 'md' },
  { width: 1024, format: 'webp', quality: 85, suffix: 'lg' },
  { width: 1280, format: 'webp', quality: 90, suffix: 'xl' },
  { width: 1920, format: 'webp', quality: 90, suffix: '2xl' },
]

// Image format optimization settings
export const FORMAT_SETTINGS = {
  jpeg: { quality: 85, progressive: true, mozjpeg: true },
  png: { quality: 90, compressionLevel: 8, adaptiveFiltering: true },
  webp: { quality: 85, effort: 4, nearLossless: false },
  avif: { quality: 80, effort: 4, chromaSubsampling: '4:2:0' },
} as const

/**
 * Enhanced Image Processing Service
 * Provides comprehensive image processing capabilities including optimization,
 * format conversion, metadata extraction, and responsive variants generation
 */
export class ImageProcessingService {
  private static instance: ImageProcessingService | null = null
  private cdnConfig?: CDNConfig

  private constructor(cdnConfig?: CDNConfig) {
    this.cdnConfig = cdnConfig
  }

  static getInstance(cdnConfig?: CDNConfig): ImageProcessingService {
    if (!ImageProcessingService.instance) {
      ImageProcessingService.instance = new ImageProcessingService(cdnConfig)
    }
    return ImageProcessingService.instance
  }

  /**
   * Extract comprehensive image metadata including EXIF data
   */
  async extractMetadata(imagePath: string): Promise<ImageMetadataExtended> {
    try {
      const image = sharp(imagePath)
      const metadata = await image.metadata()
      
      // Extract EXIF data if available
      let exifData: Record<string, unknown> = {}
      if (metadata.exif) {
        try {
          // Parse EXIF data from buffer
          exifData = this.parseExifData(metadata.exif as any)
        } catch (error) {
          console.warn('Failed to parse EXIF data:', error)
        }
      }

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: metadata.size || 0,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        colorSpace: metadata.space,
        channels: metadata.channels,
        exif: exifData,
        icc: metadata.icc,
        iptc: metadata.iptc,
        xmp: metadata.xmp?.toString(),
      }
    } catch (error) {
      throw new Error(`Failed to extract image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse EXIF data from buffer
   */
  private parseExifData(exifBuffer: Buffer): Record<string, unknown> {
    // Basic EXIF parsing - in production, you might want to use a dedicated EXIF library
    const exifData: Record<string, unknown> = {}
    
    try {
      // This is a simplified EXIF parser
      // For production use, consider using libraries like 'exif-parser' or 'piexifjs'
      const dataView = new DataView(exifBuffer.buffer)
      
      // Check for EXIF header
      if (dataView.getUint16(0) === 0xFFE1) {
        exifData.hasExif = true
        exifData.size = dataView.getUint16(2)
      }
      
      return exifData
    } catch (error) {
      return { parseError: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Optimize image with advanced compression settings
   */
  async optimizeImage(
    inputPath: string,
    outputPath: string,
    options: ImageProcessingOptions = {}
  ): Promise<ImageMetadataExtended> {
    try {
      const image = sharp(inputPath)
      const metadata = await image.metadata()
      
      let pipeline = image

      // Apply transformations
      if (options.width || options.height) {
        pipeline = pipeline.resize(options.width, options.height, {
          fit: options.fit || 'inside',
          position: options.position || 'center',
          background: options.background || { r: 255, g: 255, b: 255, alpha: 1 },
          withoutEnlargement: true,
        })
      }

      // Apply filters
      if (options.blur) {
        pipeline = pipeline.blur(options.blur)
      }

      if (options.sharpen) {
        pipeline = pipeline.sharpen()
      }

      if (options.grayscale) {
        pipeline = pipeline.grayscale()
      }

      // Apply format-specific optimizations
      const format = options.format || this.getOptimalFormat(metadata.format || 'jpeg')

      switch (format) {
        case 'jpeg':
          const jpegSettings = FORMAT_SETTINGS.jpeg;
          pipeline = pipeline.jpeg({
            quality: options.quality || jpegSettings.quality,
            progressive: options.progressive ?? jpegSettings.progressive,
            mozjpeg: jpegSettings.mozjpeg,
          })
          break

        case 'png':
          const pngSettings = FORMAT_SETTINGS.png;
          pipeline = pipeline.png({
            quality: options.quality || pngSettings.quality,
            compressionLevel: pngSettings.compressionLevel,
            adaptiveFiltering: pngSettings.adaptiveFiltering,
          })
          break

        case 'webp':
          const webpSettings = FORMAT_SETTINGS.webp;
          pipeline = pipeline.webp({
            quality: options.quality || webpSettings.quality,
            effort: options.effort || webpSettings.effort,
            lossless: options.lossless || webpSettings.nearLossless,
          })
          break

        case 'avif':
          const avifSettings = FORMAT_SETTINGS.avif;
          pipeline = pipeline.avif({
            quality: options.quality || avifSettings.quality,
            effort: options.effort || avifSettings.effort,
            chromaSubsampling: avifSettings.chromaSubsampling,
          })
          break
      }

      // Process and save the image
      const processedInfo = await pipeline.toFile(outputPath)
      
      // Return metadata of processed image
      return {
        width: processedInfo.width,
        height: processedInfo.height,
        format: processedInfo.format,
        size: processedInfo.size,
        channels: processedInfo.channels,
      }
    } catch (error) {
      throw new Error(`Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate responsive image variants for different screen sizes
   */
  async generateResponsiveVariants(
    inputPath: string,
    outputDir: string,
    baseFilename: string,
    variants: ResponsiveImageVariant[] = RESPONSIVE_BREAKPOINTS
  ): Promise<Array<{ variant: ResponsiveImageVariant; path: string; metadata: ImageMetadataExtended }>> {
    const results: Array<{ variant: ResponsiveImageVariant; path: string; metadata: ImageMetadataExtended }> = []

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true })

    for (const variant of variants) {
      const ext = variant.format === 'jpeg' ? 'jpg' : variant.format
      const filename = `${baseFilename}-${variant.suffix}.${ext}`
      const outputPath = path.join(outputDir, filename)

      try {
        const metadata = await this.optimizeImage(inputPath, outputPath, {
          width: variant.width,
          height: variant.height,
          format: variant.format,
          quality: variant.quality,
          fit: 'inside',
        })

        results.push({
          variant,
          path: outputPath,
          metadata,
        })
      } catch (error) {
        console.warn(`Failed to generate variant ${variant.suffix}:`, error)
      }
    }

    return results
  }

  /**
   * Convert image to different formats with optimization
   */
  async convertFormat(
    inputPath: string,
    outputPath: string,
    targetFormat: 'jpeg' | 'png' | 'webp' | 'avif',
    options: ImageProcessingOptions = {}
  ): Promise<ImageMetadataExtended> {
    return this.optimizeImage(inputPath, outputPath, {
      ...options,
      format: targetFormat,
    })
  }

  /**
   * Generate modern format alternatives (WebP and AVIF)
   */
  async generateModernFormats(
    inputPath: string,
    outputDir: string,
    baseFilename: string
  ): Promise<{ webp?: string; avif?: string }> {
    const results: { webp?: string; avif?: string } = {}

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true })

    try {
      // Generate WebP version
      const webpPath = path.join(outputDir, `${baseFilename}.webp`)
      await this.convertFormat(inputPath, webpPath, 'webp', { quality: 85 })
      results.webp = webpPath
    } catch (error) {
      console.warn('Failed to generate WebP format:', error)
    }

    try {
      // Generate AVIF version
      const avifPath = path.join(outputDir, `${baseFilename}.avif`)
      await this.convertFormat(inputPath, avifPath, 'avif', { quality: 80 })
      results.avif = avifPath
    } catch (error) {
      console.warn('Failed to generate AVIF format:', error)
    }

    return results
  }

  /**
   * Get optimal format based on input format and browser support
   */
  private getOptimalFormat(inputFormat: string): 'jpeg' | 'png' | 'webp' | 'avif' {
    return 'jpeg';
  }

  /**
   * Generate CDN-optimized URLs with transformation parameters
   */
  generateCDNUrl(
    imagePath: string,
    transformations: ImageProcessingOptions = {}
  ): string {
    if (!this.cdnConfig) {
      return imagePath
    }

    const params = new URLSearchParams()
    
    if (transformations.width) params.set('w', transformations.width.toString())
    if (transformations.height) params.set('h', transformations.height.toString())
    if (transformations.quality) params.set('q', transformations.quality.toString())
    if (transformations.format) params.set('f', transformations.format)
    if (transformations.fit) params.set('fit', transformations.fit)

    // Add custom CDN parameters
    if (this.cdnConfig.transformationParams) {
      Object.entries(this.cdnConfig.transformationParams).forEach(([key, value]) => {
        params.set(key, value)
      })
    }

    const queryString = params.toString()
    const separator = this.cdnConfig.baseUrl.includes('?') ? '&' : '?'
    
    return `${this.cdnConfig.baseUrl}${imagePath}${queryString ? separator + queryString : ''}`
  }

  /**
   * Generate picture element with responsive sources
   */
  generatePictureElement(
    imagePath: string,
    alt: string,
    variants: ResponsiveImageVariant[] = RESPONSIVE_BREAKPOINTS,
    className?: string
  ): string {
    const sources = variants.map(variant => {
      const srcset = this.generateCDNUrl(imagePath, {
        width: variant.width,
        format: variant.format,
        quality: variant.quality,
      })
      
      return `<source media="(max-width: ${variant.width}px)" srcset="${srcset}" type="image/${variant.format}">`
    }).join('\n    ')

    const fallbackSrc = this.generateCDNUrl(imagePath, { format: 'jpeg', quality: 85 })

    return `<picture${className ? ` class="${className}"` : ''}>
    ${sources}
    <img src="${fallbackSrc}" alt="${alt}" loading="lazy" decoding="async">
</picture>`
  }

  /**
   * Batch process multiple images
   */
  async batchProcess(
    inputPaths: string[],
    outputDir: string,
    options: ImageProcessingOptions = {}
  ): Promise<Array<{ input: string; output: string; metadata: ImageMetadataExtended }>> {
    const results: Array<{ input: string; output: string; metadata: ImageMetadataExtended }> = []

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true })

    // Process images in parallel with concurrency limit
    const concurrency = 3
    const chunks = []
    for (let i = 0; i < inputPaths.length; i += concurrency) {
      chunks.push(inputPaths.slice(i, i + concurrency))
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(async (inputPath) => {
          const filename = path.basename(inputPath, path.extname(inputPath))
          const ext = options.format === 'jpeg' ? 'jpg' : (options.format || 'webp')
          const outputPath = path.join(outputDir, `${filename}.${ext}`)

          const metadata = await this.optimizeImage(inputPath, outputPath, options)
          
          return {
            input: inputPath,
            output: outputPath,
            metadata,
          }
        })
      )

      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.error(`Failed to process ${chunk[index]}:`, result.reason)
        }
      })
    }

    return results
  }

  /**
   * Clean up processed images and variants
   */
  async cleanup(basePath: string, variants: string[] = []): Promise<void> {
    const filesToDelete = [basePath, ...variants]

    await Promise.allSettled(
      filesToDelete.map(async (filePath) => {
        try {
          await fs.unlink(filePath)
        } catch (error) {
          // Ignore ENOENT errors
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.warn(`Failed to delete ${filePath}:`, error)
          }
        }
      })
    )
  }
}

/**
 * Image Processing Utility Functions
 */

/**
 * Validate image processing options
 */
export const imageProcessingOptionsSchema = z.object({
  width: z.number().positive().max(4000).optional(),
  height: z.number().positive().max(4000).optional(),
  format: z.enum(['jpeg', 'png', 'webp', 'avif']).optional(),
  quality: z.number().min(1).max(100).optional(),
  progressive: z.boolean().optional(),
  lossless: z.boolean().optional(),
  effort: z.number().min(0).max(9).optional(),
  fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional(),
  position: z.string().optional(),
  background: z.string().optional(),
  blur: z.number().min(0.3).max(1000).optional(),
  sharpen: z.boolean().optional(),
  grayscale: z.boolean().optional(),
})

export type ValidatedImageProcessingOptions = z.infer<typeof imageProcessingOptionsSchema>

// Removed - use formatFileSize from format-utils.ts instead

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  return Math.round(((originalSize - compressedSize) / originalSize) * 100)
}

/**
 * Get image aspect ratio
 */
export function getAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
  const divisor = gcd(width, height)
  return `${width / divisor}:${height / divisor}`
}

// Export singleton instance
export const imageProcessingService = ImageProcessingService.getInstance()