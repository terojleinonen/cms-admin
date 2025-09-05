#!/usr/bin/env node

/**
 * Performance optimization script
 * Analyzes and optimizes database queries, indexes, and application performance
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs').promises
const path = require('path')

const prisma = new PrismaClient()

class PerformanceOptimizer {
  constructor() {
    this.results = {
      database: {
        indexesCreated: [],
        queriesOptimized: [],
        suggestions: []
      },
      frontend: {
        bundleSize: 0,
        optimizations: []
      },
      api: {
        slowEndpoints: [],
        optimizations: []
      }
    }
  }

  /**
   * Run complete performance optimization
   */
  async optimize() {
    console.log('🚀 Starting performance optimization...\n')

    try {
      await this.optimizeDatabase()
      await this.analyzeBundleSize()
      await this.optimizeImages()
      await this.generateReport()
    } catch (error) {
      console.error('❌ Optimization failed:', error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  }

  /**
   * Optimize database performance
   */
  async optimizeDatabase() {
    console.log('📊 Optimizing database performance...')

    try {
      // Check if indexes exist and create missing ones
      const indexesToCreate = [
        {
          name: 'idx_products_status',
          table: 'products',
          columns: ['status'],
          reason: 'Frequently filtered by product status'
        },
        {
          name: 'idx_products_featured',
          table: 'products',
          columns: ['featured'],
          reason: 'Featured products filtering'
        },
        {
          name: 'idx_products_name_search',
          table: 'products',
          columns: ['name'],
          reason: 'Product name search optimization'
        },
        {
          name: 'idx_product_categories_product',
          table: 'product_categories',
          columns: ['product_id'],
          reason: 'Product category lookups'
        },
        {
          name: 'idx_product_categories_category',
          table: 'product_categories',
          columns: ['category_id'],
          reason: 'Category product lookups'
        },
        {
          name: 'idx_users_email',
          table: 'users',
          columns: ['email'],
          reason: 'User authentication queries'
        },
        {
          name: 'idx_users_role',
          table: 'users',
          columns: ['role'],
          reason: 'Role-based access queries'
        },
        {
          name: 'idx_audit_logs_user_action',
          table: 'audit_logs',
          columns: ['user_id', 'action'],
          reason: 'User activity tracking'
        }
      ]

      for (const index of indexesToCreate) {
        try {
          const indexExists = await this.checkIndexExists(index.name)
          
          if (!indexExists) {
            await this.createIndex(index)
            this.results.database.indexesCreated.push(index)
            console.log(`  ✅ Created index: ${index.name}`)
          } else {
            console.log(`  ⏭️  Index already exists: ${index.name}`)
          }
        } catch (_error) {
          console.log(`  ⚠️  Failed to create index ${index.name}: ${_error.message}`)
        }
      }

      // Analyze table statistics
      await this.analyzeTableStats()

      // Update table statistics
      await this.updateTableStats()

      console.log('  ✅ Database optimization completed\n')
    } catch (_error) {
      console.error('  ❌ Database optimization failed:', _error.message)
    }
  }

  /**
   * Check if index exists
   */
  async checkIndexExists(indexName) {
    try {
      const result = await prisma.$queryRaw`
        SELECT indexname 
        FROM pg_indexes 
        WHERE indexname = ${indexName}
      `
      return result.length > 0
    } catch {
      return false
    }
  }

  /**
   * Create database index
   */
  async createIndex(index) {
    const columnList = index.columns.join(', ')
    const sql = `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${index.name} ON "${index.table}" (${columnList})`
    
    try {
      await prisma.$executeRawUnsafe(sql)
    } catch {
      // If concurrent creation fails, try without CONCURRENTLY
      const fallbackSql = `CREATE INDEX IF NOT EXISTS ${index.name} ON "${index.table}" (${columnList})`
      await prisma.$executeRawUnsafe(fallbackSql)
    }
  }

  /**
   * Analyze table statistics
   */
  async analyzeTableStats() {
    try {
      const tables = ['products', 'categories', 'users', 'pages', 'media']
      
      for (const table of tables) {
        const stats = await prisma.$queryRaw`
          SELECT 
            schemaname,
            tablename,
            attname,
            n_distinct,
            correlation
          FROM pg_stats 
          WHERE tablename = ${table}
          ORDER BY n_distinct DESC
        `

        if (stats.length > 0) {
          console.log(`  📈 ${table} table statistics:`)
          stats.slice(0, 3).forEach(stat => {
            console.log(`    - ${stat.attname}: ${stat.n_distinct} distinct values`)
          })
        }
      }
    } catch (_error) {
      console.log('  ⚠️  Could not analyze table statistics:', _error.message)
    }
  }

  /**
   * Update table statistics
   */
  async updateTableStats() {
    try {
      const tables = ['products', 'categories', 'users', 'pages', 'media']
      
      for (const table of tables) {
        await prisma.$executeRawUnsafe(`ANALYZE "${table}"`)
      }
      
      console.log('  ✅ Updated table statistics')
    } catch (_error) {
      console.log('  ⚠️  Could not update table statistics:', _error.message)
    }
  }

  /**
   * Analyze bundle size
   */
  async analyzeBundleSize() {
    console.log('📦 Analyzing bundle size...')

    try {
      const nextDir = path.join(process.cwd(), '.next')
      const buildManifest = path.join(nextDir, 'build-manifest.json')
      
      try {
        const manifestContent = await fs.readFile(buildManifest, 'utf8')
        const manifest = JSON.parse(manifestContent)
        
        // Calculate total bundle size
        let totalSize = 0
        const bundleInfo = []

        for (const [page, files] of Object.entries(manifest.pages)) {
          let pageSize = 0
          
          for (const file of files) {
            try {
              const filePath = path.join(nextDir, 'static', file)
              const stats = await fs.stat(filePath)
              pageSize += stats.size
            } catch {
              // File might not exist or be accessible
            }
          }
          
          if (pageSize > 0) {
            bundleInfo.push({ page, size: pageSize })
            totalSize += pageSize
          }
        }

        this.results.frontend.bundleSize = totalSize
        
        console.log(`  📊 Total bundle size: ${this.formatBytes(totalSize)}`)
        
        // Show largest bundles
        const largestBundles = bundleInfo
          .sort((a, b) => b.size - a.size)
          .slice(0, 5)
        
        if (largestBundles.length > 0) {
          console.log('  📈 Largest page bundles:')
          largestBundles.forEach(bundle => {
            console.log(`    - ${bundle.page}: ${this.formatBytes(bundle.size)}`)
          })
        }

        // Provide optimization suggestions
        if (totalSize > 1024 * 1024) { // > 1MB
          this.results.frontend.optimizations.push('Consider code splitting for large bundles')
        }
        if (totalSize > 2 * 1024 * 1024) { // > 2MB
          this.results.frontend.optimizations.push('Bundle size is large - implement lazy loading')
        }

      } catch {
        console.log('  ⚠️  Could not analyze bundle size - run npm run build first')
      }

      console.log('  ✅ Bundle analysis completed\n')
    } catch (_error) {
      console.error('  ❌ Bundle analysis failed:', _error.message)
    }
  }

  /**
   * Optimize images
   */
  async optimizeImages() {
    console.log('🖼️  Analyzing image optimization...')

    try {
      const publicDir = path.join(process.cwd(), 'public')
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
      
      const images = await this.findFiles(publicDir, imageExtensions)
      let totalImageSize = 0
      const largeImages = []

      for (const imagePath of images) {
        try {
          const stats = await fs.stat(imagePath)
          totalImageSize += stats.size
          
          if (stats.size > 500 * 1024) { // > 500KB
            largeImages.push({
              path: path.relative(publicDir, imagePath),
              size: stats.size
            })
          }
        } catch {
          // Skip inaccessible files
        }
      }

      console.log(`  📊 Total image size: ${this.formatBytes(totalImageSize)}`)
      console.log(`  📸 Found ${images.length} images`)

      if (largeImages.length > 0) {
        console.log('  ⚠️  Large images found (>500KB):')
        largeImages.slice(0, 5).forEach(img => {
          console.log(`    - ${img.path}: ${this.formatBytes(img.size)}`)
        })
        this.results.frontend.optimizations.push('Optimize large images with Next.js Image component')
      }

      console.log('  ✅ Image analysis completed\n')
    } catch (_error) {
      console.error('  ❌ Image analysis failed:', _error.message)
    }
  }

  /**
   * Find files with specific extensions
   */
  async findFiles(dir, extensions) {
    const files = []
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        if (entry.isDirectory()) {
          const subFiles = await this.findFiles(fullPath, extensions)
          files.push(...subFiles)
        } else if (extensions.some(ext => entry.name.toLowerCase().endsWith(ext))) {
          files.push(fullPath)
        }
      }
    } catch {
      // Directory might not exist or be accessible
    }
    
    return files
  }

  /**
   * Generate optimization report
   */
  async generateReport() {
    console.log('📋 Generating optimization report...')

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        indexesCreated: this.results.database.indexesCreated.length,
        bundleSize: this.formatBytes(this.results.frontend.bundleSize),
        optimizationSuggestions: [
          ...this.results.database.suggestions,
          ...this.results.frontend.optimizations,
          ...this.results.api.optimizations
        ]
      },
      details: this.results
    }

    const reportPath = path.join(process.cwd(), 'performance-optimization-report.json')
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))

    console.log(`  ✅ Report saved to: ${reportPath}`)
    
    // Display summary
    console.log('\n📊 Optimization Summary:')
    console.log(`  • Database indexes created: ${report.summary.indexesCreated}`)
    console.log(`  • Bundle size: ${report.summary.bundleSize}`)
    console.log(`  • Optimization suggestions: ${report.summary.optimizationSuggestions.length}`)

    if (report.summary.optimizationSuggestions.length > 0) {
      console.log('\n💡 Optimization Suggestions:')
      report.summary.optimizationSuggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`)
      })
    }

    console.log('\n🎉 Performance optimization completed!')
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'optimize'

  const optimizer = new PerformanceOptimizer()

  switch (command) {
    case 'optimize':
      await optimizer.optimize()
      break
    case 'database':
      await optimizer.optimizeDatabase()
      break
    case 'bundle':
      await optimizer.analyzeBundleSize()
      break
    case 'images':
      await optimizer.optimizeImages()
      break
    default:
      console.log('Usage: node scripts/performance-optimization.js [optimize|database|bundle|images]')
      process.exit(1)
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
}

module.exports = { PerformanceOptimizer }