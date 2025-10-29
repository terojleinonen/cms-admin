import { ImageProcessingService } from './image-processing';

export const PROFILE_PICTURE_CONFIG = {
  sizes: {
    small: { width: 48, height: 48 },
    medium: { width: 96, height: 96 },
    large: { width: 192, height: 192 },
  },
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxSize: 5 * 1024 * 1024, // 5MB
};

export async function fileToBuffer(file: File): Promise<Buffer> {
  const bytes = await file.arrayBuffer();
  return Buffer.from(bytes);
}

export class ProfilePictureService {
  private imageService: ImageProcessingService;

  constructor() {
    this.imageService = ImageProcessingService.getInstance();
  }

  validateFile(file: File) {
    if (!PROFILE_PICTURE_CONFIG.allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Invalid file type' };
    }
    if (file.size > PROFILE_PICTURE_CONFIG.maxSize) {
      return { isValid: false, error: 'File too large' };
    }
    return { isValid: true };
  }

  async deleteProfilePicture(userId: string) {
    // In a real app, this would delete from a file store like S3
    console.log(`Deleting profile picture for user ${userId}`);
    return Promise.resolve();
  }

  async processProfilePicture(
    buffer: Buffer,
    userId: string,
    filename: string
  ) {
    console.log(`Processing profile picture for user ${userId}`);
    // In a real app, this would use the imageProcessingService to resize and save the image
    return Promise.resolve({
      variants: [],
      metadata: {
        originalSize: buffer.length,
        processedSize: buffer.length,
        compressionRatio: 0,
        format: 'jpeg',
      },
    });
  }

  getProfilePictureUrl(userId: string, size: 'small' | 'medium' | 'large') {
    // In a real app, this would return a URL to the image on a CDN
    return `/uploads/avatars/${userId}_${size}.jpg`;
  }

  async hasProfilePicture(userId: string) {
    // In a real app, this would check if the file exists in the file store
    return Promise.resolve(true);
  }

  getDefaultAvatarUrl() {
    return '/default-avatar.png';
  }

  generateInitials(name: string) {
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
  }

  generateAvatarColor(userId: string) {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5'];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }
}

export const profilePictureService = new ProfilePictureService();

// Removed - use formatFileSize from format-utils.ts instead
