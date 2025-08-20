/**
 * Data Migration Script
 * Migrates mock e-commerce data to CMS database
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Mock data from e-commerce frontend
const mockCategories = [
  { name: 'Desks', slug: 'desks', description: 'Premium workspace desks designed for productivity and comfort' },
  { name: 'Accessories', slug: 'accessories', description: 'Essential workspace accessories to enhance your productivity' },
  { name: 'Lighting', slug: 'lighting', description: 'Professional lighting solutions for optimal workspace illumination' },
  { name: 'Seating', slug: 'seating', description: 'Ergonomic seating solutions for comfortable work sessions' }
]

const mockProducts = [
  {
    name: 'Minimal Oak Desk',
    slug: 'minimal-oak-desk',
    description: 'A premium quality desk designed for calm and productivity. Crafted from sustainable oak wood with a minimalist design that complements any modern workspace.',
    shortDescription: 'Premium oak desk with minimalist design',
    price: 89.00,
    comparePrice: 120.00,
    sku: 'DES-001',
    inventoryQuantity: 15,
    category: 'Desks',
    featured: true,
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Standing Desk Converter',
    slug: 'standing-desk-converter',
    description: 'Transform any desk into a standing workstation with this adjustable converter. Features smooth height adjustment and spacious surface for monitor and keyboard.',
    shortDescription: 'Adjustable standing desk converter',
    price: 104.00,
    comparePrice: 140.00,
    sku: 'DES-002',
    inventoryQuantity: 25,
    category: 'Desks',
    featured: true,
    imageUrl: 'https://images.unsplash.com/photo-1541558869434-2840d308329a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Executive L-Shaped Desk',
    slug: 'executive-l-shaped-desk',
    description: 'Spacious L-shaped desk perfect for executives and professionals who need ample workspace. Features built-in cable management and premium finish.',
    shortDescription: 'Spacious L-shaped executive desk',
    price: 119.00,
    sku: 'DES-003',
    inventoryQuantity: 8,
    category: 'Desks',
    featured: false,
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Ceramic Desk Organizer',
    slug: 'ceramic-desk-organizer',
    description: 'Keep your workspace tidy with this elegant ceramic organizer. Multiple compartments for pens, paper clips, and small office supplies.',
    shortDescription: 'Elegant ceramic desk organizer',
    price: 29.00,
    sku: 'ACC-001',
    inventoryQuantity: 50,
    category: 'Accessories',
    featured: false,
    imageUrl: 'https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Bamboo Monitor Stand',
    slug: 'bamboo-monitor-stand',
    description: 'Elevate your monitor to the perfect viewing height with this sustainable bamboo stand. Features storage space underneath for keyboard and accessories.',
    shortDescription: 'Sustainable bamboo monitor stand',
    price: 45.00,
    sku: 'ACC-002',
    inventoryQuantity: 30,
    category: 'Accessories',
    featured: true,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Warm LED Desk Lamp',
    slug: 'warm-led-desk-lamp',
    description: 'Professional LED desk lamp with adjustable brightness and color temperature. Perfect for reducing eye strain during long work sessions.',
    shortDescription: 'Adjustable LED desk lamp',
    price: 65.00,
    sku: 'LIG-001',
    inventoryQuantity: 20,
    category: 'Lighting',
    featured: true,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Ergonomic Task Chair',
    slug: 'ergonomic-task-chair',
    description: 'Comfortable ergonomic chair designed for long work sessions. Features adjustable height, lumbar support, and breathable mesh back.',
    shortDescription: 'Ergonomic office chair with lumbar support',
    price: 189.00,
    comparePrice: 250.00,
    sku: 'SEA-001',
    inventoryQuantity: 12,
    category: 'Seating',
    featured: true,
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  }
]

async function main() {
  console.log('🚀 Starting data migration...')

  try {
    // Create admin user
    console.log('👤 Creating admin user...')
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@kinworkspace.com' },
      update: {},
      create: {
        email: 'admin@kinworkspace.com',
        passwordHash: await bcrypt.hash('admin123', 12),
        name: 'Admin User',
        role: 'ADMIN',
        isActive: true
      }
    })
    console.log('✅ Admin user created:', adminUser.email)

    // Create categories
    console.log('📁 Creating categories...')
    const categoryMap = new Map()
    
    for (const categoryData of mockCategories) {
      const category = await prisma.category.upsert({
        where: { slug: categoryData.slug },
        update: {
          name: categoryData.name,
          description: categoryData.description
        },
        create: {
          name: categoryData.name,
          slug: categoryData.slug,
          description: categoryData.description,
          isActive: true,
          sortOrder: mockCategories.indexOf(categoryData)
        }
      })
      categoryMap.set(categoryData.name, category.id)
      console.log('✅ Category created:', category.name)
    }

    // Create products
    console.log('📦 Creating products...')
    
    for (const productData of mockProducts) {
      const categoryId = categoryMap.get(productData.category)
      
      if (!categoryId) {
        console.warn(`⚠️ Category not found for product: ${productData.name}`)
        continue
      }

      // Create product
      const product = await prisma.product.upsert({
        where: { slug: productData.slug },
        update: {
          name: productData.name,
          description: productData.description,
          shortDescription: productData.shortDescription,
          price: productData.price,
          comparePrice: productData.comparePrice,
          sku: productData.sku,
          inventoryQuantity: productData.inventoryQuantity,
          featured: productData.featured,
          status: 'PUBLISHED'
        },
        create: {
          name: productData.name,
          slug: productData.slug,
          description: productData.description,
          shortDescription: productData.shortDescription,
          price: productData.price,
          comparePrice: productData.comparePrice,
          sku: productData.sku,
          inventoryQuantity: productData.inventoryQuantity,
          featured: productData.featured,
          status: 'PUBLISHED',
          createdBy: adminUser.id
        }
      })

      // Link product to category
      await prisma.productCategory.upsert({
        where: {
          productId_categoryId: {
            productId: product.id,
            categoryId: categoryId
          }
        },
        update: {},
        create: {
          productId: product.id,
          categoryId: categoryId
        }
      })

      console.log('✅ Product created:', product.name)
    }

    console.log('🎉 Data migration completed successfully!')
    console.log(`📊 Summary:`)
    console.log(`   - Categories: ${mockCategories.length}`)
    console.log(`   - Products: ${mockProducts.length}`)
    console.log(`   - Admin user: admin@kinworkspace.com / admin123`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })