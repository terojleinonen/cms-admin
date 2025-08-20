/**
 * Media utilities for file processing and management
 * Handles image processing, thumbnail generation, and file validation
 */

import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'
import { z } from 'zod'

// Supported image formats
export const SUPPORTED_IMAGE_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'svg'] as const
export const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/svg+xml'
] as const

// File size limits (in bytes)
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_IMAGE_DIMENSION = 4000 // 4000px

// Thumbnail sizes
export const THUMBNAIL_SIZES = {
  small: { width: 150, height: 150 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 },
} as const

// Upload directory configuration
export const UPLOAD_CONFIG = {
  baseDir: process.env.UPLOAD_DIR || './public/uploads',
  mediaDir: 'media',
  thumbnailDir: 'thumbnails',
} as const

// File validation schema
export const fileValidationSchema = z.object({
  name: z.string().min(1, 'Filename is required'),
  size: z.number().max(MAX_FILE_SIZE, `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`),
  type: z.string().refine(
    (value) => SUPPORTED_MIME_TYPES.includes(value as any),
    { message: `Unsupported file type. Supported formats: ${SUPPORTED_IMAGE_FORMATS.join(', ')}` }
  ),
})

export type FileValidation = z.infer<typeof fileValidationSchema>

/**
 * Ensures upload directories exist
 */
export async function ensureUploadDirectories(): Promise<void> {
  const dirs = [
    UPLOAD_CONFIG.baseDir,
    path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.mediaDir),
    path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.thumbnailDir),
    path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.thumbnailDir, 'small'),
    path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.thumbnailDir, 'medium'),
    path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.thumbnailDir, 'large'),
  ]

  for (const dir of dirs) {
    try {
      await fs.access(dir)
    } catch {
      await fs.mkdir(dir, { recursive: true })
    }
  }
}

/**
 * Generates a unique filename to prevent conflicts
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = path.extname(originalName).toLowerCase()
  const nameWithoutExt = path.basename(originalName, ext)
  
  // Sanitize filename
  const sanitizedName = nameWithoutExt
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
  
  return `${sanitizedName}-${timestamp}-${random}${ext}`
}

/**
 * Validates uploaded file
 */
export function validateFile(file: { name: string; size: number; type: string }): FileValidation {
  return fileValidationSchema.parse(file)
}

/**
 * Gets image metadata using Sharp
 */
export async function getImageMetadata(filePath: string) {
  try {
    const metadata = await sharp(filePath).metadata()
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: metadata.size || 0,
    }
  } catch (error) {
    throw new Error(`Failed to read image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generates thumbnails for an image
 */
export async function generateThumbnails(
  originalPath: string,
  filename: string
): Promise<{ small: string; medium: string; large: string }> {
  const thumbnailPaths = {
    small: path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.thumbnailDir, 'small', filename),
    medium: path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.thumbnailDir, 'medium', filename),
    large: path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.thumbnailDir, 'large', filename),
  }

  try {
    // Generate small thumbnail
    await sharp(originalPath)
      .resize(THUMBNAIL_SIZES.small.width, THUMBNAIL_SIZES.small.height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 85 })
      .toFile(thumbnailPaths.small)

    // Generate medium thumbnail
    await sharp(originalPath)
      .resize(THUMBNAIL_SIZES.medium.width, THUMBNAIL_SIZES.medium.height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 90 })
      .toFile(thumbnailPaths.medium)

    // Generate large thumbnail
    await sharp(originalPath)
      .resize(THUMBNAIL_SIZES.large.width, THUMBNAIL_SIZES.large.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 95 })
      .toFile(thumbnailPaths.large)

    return {
      small: `/uploads/thumbnails/small/${filename}`,
      medium: `/uploads/thumbnails/medium/${filename}`,
      large: `/uploads/thumbnails/large/${filename}`,
    }
  } catch (error) {
    throw new Error(`Failed to generate thumbnails: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Optimizes an image for web delivery
 */
export async function optimizeImage(inputPath: string, outputPath: string): Promise<void> {
  try {
    const metadata = await sharp(inputPath).metadata()
    
    let pipeline = sharp(inputPath)

    // Resize if image is too large
    if (metadata.width && metadata.width > MAX_IMAGE_DIMENSION) {
      pipeline = pipeline.resize(MAX_IMAGE_DIMENSION, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    }

    // Convert to WebP for better compression (except SVG)
    if (metadata.format !== 'svg') {
      pipeline = pipeline.webp({ quality: 85 })
    }

    await pipeline.toFile(outputPath)
  } catch (error) {
    throw new Error(`Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Deletes a media file and its thumbnails
 */
export async function deleteMediaFile(filename: string): Promise<void> {
  const filesToDelete = [
    path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.mediaDir, filename),
    path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.thumbnailDir, 'small', filename),
    path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.thumbnailDir, 'medium', filename),
    path.join(UPLOAD_CONFIG.baseDir, UPLOAD_CONFIG.thumbnailDir, 'large', filename),
  ]

  for (const filePath of filesToDelete) {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      // Ignore errors if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`Failed to delete file ${filePath}:`, error)
      }
    }
  }
}

/**
 * Gets the public URL for a media file
 */
export function getMediaUrl(filename: string): string {
  return `/uploads/media/${filename}`
}

/**
 * Gets the public URLs for thumbnails
 */
export function getThumbnailUrls(filename: string) {
  return {
    small: `/uploads/thumbnails/small/${filename}`,
    medium: `/uploads/thumbnails/medium/${filename}`,
    large: `/uploads/thumbnails/large/${filename}`,
  }
}