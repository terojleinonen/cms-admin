/**
 * Backup Management API
 * Handles backup creation, listing, and management operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { BackupService } from '@/app/lib/backup';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const createBackupSchema = z.object({
  type: z.enum(['database', 'media', 'full']),
  description: z.string().optional()
});

const listBackupsSchema = z.object({
  type: z.enum(['database', 'media', 'full']).optional(),
  limit: z.number().min(1).max(100).optional().default(50)
});

// Initialize backup service
const backupConfig = {
  databaseUrl: process.env.DATABASE_URL!,
  backupDir: process.env.BACKUP_DIR || 'backups',
  mediaDir: process.env.MEDIA_DIR || 'public/uploads',
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
  compressionEnabled: process.env.BACKUP_COMPRESSION === 'true',
  encryptionEnabled: process.env.BACKUP_ENCRYPTION === 'true',
  encryptionKey: process.env.BACKUP_ENCRYPTION_KEY
};

const backupService = new BackupService(prisma, backupConfig);

// POST /api/admin/backup - Create new backup
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createBackupSchema.parse(body);

    let backupId: string;

    switch (validatedData.type) {
      case 'database':
        const dbBackupPath = await backupService.createDatabaseBackup();
        // For individual backups, we need to handle metadata separately
        backupId = 'db_' + Date.now();
        break;
        
      case 'media':
        const mediaBackupPath = await backupService.createMediaBackup();
        backupId = 'media_' + Date.now();
        break;
        
      case 'full':
        backupId = await backupService.createFullBackup(
          session.user.id,
          validatedData.description
        );
        break;
        
      default:
        throw new Error('Invalid backup type');
    }

    return NextResponse.json({
      backupId,
      message: 'Backup created successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Backup creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

// GET /api/admin/backup - List backups
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      type: searchParams.get('type') as 'database' | 'media' | 'full' | undefined,
      limit: parseInt(searchParams.get('limit') || '50')
    };

    const validatedQuery = listBackupsSchema.parse(queryParams);

    const backups = await backupService.listBackups(
      validatedQuery.type,
      validatedQuery.limit
    );

    return NextResponse.json({ backups });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error listing backups:', error);
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/backup - Cleanup old backups
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await backupService.cleanupOldBackups();

    return NextResponse.json({
      message: 'Backup cleanup completed',
      deletedCount: result.deletedCount,
      freedSpace: result.freedSpace
    });

  } catch (error) {
    console.error('Backup cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup backups' },
      { status: 500 }
    );
  }
}