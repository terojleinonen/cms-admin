/**
 * Database Cleanup Utilities
 * Enhanced database cleanup and seeding with proper transaction management
 */

import { PrismaClient } from '@prisma/client'

/**
 * Database cleanup order - must respect foreign key constraints
 */
const CLEANUP_ORDER = [
  'productMedia',
  'productCategory', 
  'contentRevision',
  'backupRestoreLog',
  'backup',
  'apiKey',
  'searchEvent',
  'media',
  'product',
  'page',
  'category',
  'user'
] as const

/**
 * Enhanced Database Cleaner
 * Provides reliable cleanup with proper error handling and recovery
 */
export class DatabaseCleaner {
  private static instance: DatabaseCleaner
  private cleanupHistory: Map<string, Date> = new Map()

  private constructor() {}

  static getInstance(): DatabaseCleaner {
    if (!DatabaseCleaner.instance) {
      DatabaseCleaner.instance = new DatabaseCleaner()
    }
    return DatabaseCleaner.instance
  }

  /**
   * Clean all test data with proper ordering
   */
  async cleanAll(prisma: PrismaClient): Promise<void> {
    const cleanupId = `cleanup-${Date.now()}`
    
    try {
      console.log(`🧹 Starting database cleanup: ${cleanupId}`)
      
      // Use transaction for atomic cleanup
      await prisma.$transaction(async (tx) => {
        for (const table of CLEANUP_ORDER) {
          try {
            const result = await this.cleanTable(tx, table)
            console.log(`  ✅ Cleaned ${table}: ${result.count} records`)
          } catch (error) {
            console.warn(`  ⚠️ Failed to clean ${table}:`, error)
            // Continue with other tables
          }
        }
      })

      this.cleanupHistory.set(cleanupId, new Date())
      console.log(`✅ Database cleanup complete: ${cleanupId}`)
      
    } catch (error) {
      console.error(`❌ Database cleanup failed: ${cleanupId}`, error)
      throw error
    }
  }

  /**
   * Clean specific table
   */
  private async cleanTable(prisma: any, tableName: string): Promise<{ count: number }> {
    switch (tableName) {
      case 'productMedia':
        return await prisma.productMedia.deleteMany({})
      case 'productCategory':
        return await prisma.productCategory.deleteMany({})
      case 'contentRevision':
        return await prisma.contentRevision.deleteMany({})
      case 'backupRestoreLog':
        return await prisma.backupRestoreLog.deleteMany({})
      case 'backup':
        return await prisma.backup.deleteMany({})
      case 'apiKey':
        return await prisma.apiKey.deleteMany({})
      case 'searchEvent':
        return await prisma.searchEvent.deleteMany({})
      case 'media':
        return await prisma.media.deleteMany({})
      case 'product':
        return await prisma.product.deleteMany({})
      case 'page':
        return await prisma.page.deleteMany({})
      case 'category':
        return await prisma.category.deleteMany({})
      case 'user':
        return await prisma.user.deleteMany({})
      default:
        throw new Error(`Unknown table: ${tableName}`)
    }
  }

  /**
   * Clean only test data (based on naming patterns)
   */
  async cleanTestData(prisma: PrismaClient): Promise<void> {
    const cleanupId = `test-cleanup-${Date.now()}`
    
    try {
      console.log(`🧹 Starting test data cleanup: ${cleanupId}`)
      
      await prisma.$transaction(async (tx) => {
        // Clean test users
        await tx.user.deleteMany({
          where: {
            OR: [
              { email: { contains: 'test.com' } },
              { email: { contains: 'integration-test' } },
              { name: { contains: 'Test' } },
              { name: { contains: 'Integration' } }
            ]
          }
        })

        // Clean test categories
        await tx.category.deleteMany({
          where: {
            OR: [
              { name: { contains: 'Test' } },
              { name: { contains: 'Integration' } },
              { slug: { contains: 'test-' } }
            ]
          }
        })

        // Clean test products
        await tx.product.deleteMany({
          where: {
            OR: [
              { name: { contains: 'Test' } },
              { name: { contains: 'Integration' } },
              { slug: { contains: 'test-' } },
              { sku: { contains: 'TEST-' } }
            ]
          }
        })

        // Clean test media
        await tx.media.deleteMany({
          where: {
            OR: [
              { filename: { contains: 'test-' } },
              { originalName: { contains: 'Test' } },
              { folder: 'test-uploads' }
            ]
          }
        })

        // Clean test pages
        await tx.page.deleteMany({
          where: {
            OR: [
              { title: { contains: 'Test' } },
              { slug: { contains: 'test-' } }
            ]
          }
        })
      })

      this.cleanupHistory.set(cleanupId, new Date())
      console.log(`✅ Test data cleanup complete: ${cleanupId}`)
      
    } catch (error) {
      console.error(`❌ Test data cleanup failed: ${cleanupId}`, error)
      throw error
    }
  }

  /**
   * Verify database is clean
   */
  async verifyClean(prisma: PrismaClient): Promise<boolean> {
    try {
      const counts = await Promise.all([
        prisma.user.count(),
        prisma.category.count(),
        prisma.product.count(),
        prisma.media.count(),
        prisma.page.count()
      ])

      const totalRecords = counts.reduce((sum, count) => sum + count, 0)
      
      if (totalRecords === 0) {
        console.log('✅ Database is clean')
        return true
      } else {
        console.warn(`⚠️ Database not clean: ${totalRecords} records remaining`)
        return false
      }
    } catch (error) {
      console.error('❌ Failed to verify database cleanliness:', error)
      return false
    }
  }

  /**
   * Get cleanup history
   */
  getCleanupHistory(): Map<string, Date> {
    return new Map(this.cleanupHistory)
  }

  /**
   * Reset cleanup history
   */
  resetHistory(): void {
    this.cleanupHistory.clear()
  }
}

/**
 * Enhanced Database Seeder
 * Provides consistent test data seeding with relationships
 */
export class DatabaseSeeder {
  private static instance: DatabaseSeeder
  private seedHistory: Map<string, any> = new Map()

  private constructor() {}

  static getInstance(): DatabaseSeeder {
    if (!DatabaseSeeder.instance) {
      DatabaseSeeder.instance = new DatabaseSeeder()
    }
    return DatabaseSeeder.instance
  }

  /**
   * Seed complete test dataset
   */
  async seedAll(prisma: PrismaClient): Promise<any> {
    const seedId = `seed-${Date.now()}`
    
    try {
      console.log(`🌱 Starting database seeding: ${seedId}`)
      
      const seedData = await prisma.$transaction(async (tx) => {
        // Create users
        const adminUser = await tx.user.create({
          data: {
            email: 'admin@integration-test.com',
            name: 'Integration Admin',
            role: 'ADMIN',
            isActive: true,
            passwordHash: 'test-hash-admin',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        const editorUser = await tx.user.create({
          data: {
            email: 'editor@integration-test.com',
            name: 'Integration Editor',
            role: 'EDITOR',
            isActive: true,
            passwordHash: 'test-hash-editor',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        const viewerUser = await tx.user.create({
          data: {
            email: 'viewer@integration-test.com',
            name: 'Integration Viewer',
            role: 'VIEWER',
            isActive: true,
            passwordHash: 'test-hash-viewer',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        // Create categories
        const parentCategory = await tx.category.create({
          data: {
            name: 'Electronics',
            slug: 'electronics',
            description: 'Electronic products',
            parentId: null,
            sortOrder: 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        const childCategory = await tx.category.create({
          data: {
            name: 'Laptops',
            slug: 'laptops',
            description: 'Laptop computers',
            parentId: parentCategory.id,
            sortOrder: 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        // Create media
        const media1 = await tx.media.create({
          data: {
            filename: 'laptop-image-1.jpg',
            originalName: 'Laptop Image 1.jpg',
            mimeType: 'image/jpeg',
            fileSize: 1024000,
            width: 800,
            height: 600,
            altText: 'Laptop product image',
            folder: 'products',
            createdBy: adminUser.id,
            createdAt: new Date()
          }
        })

        const media2 = await tx.media.create({
          data: {
            filename: 'laptop-image-2.jpg',
            originalName: 'Laptop Image 2.jpg',
            mimeType: 'image/jpeg',
            fileSize: 1536000,
            width: 1200,
            height: 900,
            altText: 'Laptop product image 2',
            folder: 'products',
            createdBy: adminUser.id,
            createdAt: new Date()
          }
        })

        // Create products
        const product1 = await tx.product.create({
          data: {
            name: 'Test Laptop Pro',
            slug: 'test-laptop-pro',
            description: 'High-performance laptop for testing',
            shortDescription: 'Test laptop',
            price: 1299.99,
            comparePrice: 1499.99,
            sku: 'TEST-LAPTOP-001',
            inventoryQuantity: 10,
            weight: 2.5,
            dimensions: undefined,
            status: 'PUBLISHED',
            featured: true,
            seoTitle: 'Test Laptop Pro - High Performance',
            seoDescription: 'Professional laptop for testing purposes',
            createdBy: adminUser.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        const product2 = await tx.product.create({
          data: {
            name: 'Test Laptop Basic',
            slug: 'test-laptop-basic',
            description: 'Basic laptop for testing',
            shortDescription: 'Basic test laptop',
            price: 699.99,
            comparePrice: null,
            sku: 'TEST-LAPTOP-002',
            inventoryQuantity: 5,
            weight: 2.0,
            dimensions: undefined,
            status: 'DRAFT',
            featured: false,
            seoTitle: null,
            seoDescription: null,
            createdBy: editorUser.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        // Create relationships
        await tx.productCategory.create({
          data: {
            productId: product1.id,
            categoryId: childCategory.id
          }
        })

        await tx.productCategory.create({
          data: {
            productId: product2.id,
            categoryId: childCategory.id
          }
        })

        await tx.productMedia.create({
          data: {
            productId: product1.id,
            mediaId: media1.id,
            sortOrder: 0,
            isPrimary: true
          }
        })

        await tx.productMedia.create({
          data: {
            productId: product1.id,
            mediaId: media2.id,
            sortOrder: 1,
            isPrimary: false
          }
        })

        // Create pages
        const page1 = await tx.page.create({
          data: {
            title: 'Test Home Page',
            slug: 'test-home',
            content: '<h1>Welcome to Test Site</h1><p>This is a test page.</p>',
            excerpt: 'Test home page',
            status: 'PUBLISHED',
            template: 'home',
            seoTitle: 'Test Home - Welcome',
            seoDescription: 'Welcome to our test site',
            publishedAt: new Date(),
            createdBy: adminUser.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        return {
          users: {
            admin: adminUser,
            editor: editorUser,
            viewer: viewerUser
          },
          categories: {
            parent: parentCategory,
            child: childCategory
          },
          media: {
            image1: media1,
            image2: media2
          },
          products: {
            pro: product1,
            basic: product2
          },
          pages: {
            home: page1
          }
        }
      })

      this.seedHistory.set(seedId, seedData)
      console.log(`✅ Database seeding complete: ${seedId}`)
      
      return seedData
      
    } catch (error) {
      console.error(`❌ Database seeding failed: ${seedId}`, error)
      throw error
    }
  }

  /**
   * Seed minimal test data
   */
  async seedMinimal(prisma: PrismaClient): Promise<any> {
    const seedId = `minimal-seed-${Date.now()}`
    
    try {
      console.log(`🌱 Starting minimal database seeding: ${seedId}`)
      
      const seedData = await prisma.$transaction(async (tx) => {
        // Create one admin user
        const adminUser = await tx.user.create({
          data: {
            email: 'admin@test.com',
            name: 'Test Admin',
            role: 'ADMIN',
            isActive: true,
            passwordHash: 'test-hash',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        // Create one category
        const category = await tx.category.create({
          data: {
            name: 'Test Category',
            slug: 'test-category',
            description: 'Test category',
            parentId: null,
            sortOrder: 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        return {
          users: { admin: adminUser },
          categories: { main: category }
        }
      })

      this.seedHistory.set(seedId, seedData)
      console.log(`✅ Minimal database seeding complete: ${seedId}`)
      
      return seedData
      
    } catch (error) {
      console.error(`❌ Minimal database seeding failed: ${seedId}`, error)
      throw error
    }
  }

  /**
   * Get seed history
   */
  getSeedHistory(): Map<string, any> {
    return new Map(this.seedHistory)
  }

  /**
   * Get latest seed data
   */
  getLatestSeedData(): any {
    const entries = Array.from(this.seedHistory.entries())
    if (entries.length === 0) {
      return null
    }
    return entries[entries.length - 1][1]
  }

  /**
   * Reset seed history
   */
  resetHistory(): void {
    this.seedHistory.clear()
  }
}

// Export singleton instances
export const databaseCleaner = DatabaseCleaner.getInstance()
export const databaseSeeder = DatabaseSeeder.getInstance()

// Convenience functions
export const cleanDatabase = (prisma: PrismaClient) => databaseCleaner.cleanAll(prisma)
export const cleanTestData = (prisma: PrismaClient) => databaseCleaner.cleanTestData(prisma)
export const seedDatabase = (prisma: PrismaClient) => databaseSeeder.seedAll(prisma)
export const seedMinimalDatabase = (prisma: PrismaClient) => databaseSeeder.seedMinimal(prisma)
export const verifyDatabaseClean = (prisma: PrismaClient) => databaseCleaner.verifyClean(prisma)