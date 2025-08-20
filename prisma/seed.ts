/**
 * Database seed script for Kin Workspace CMS
 * Creates initial data for development and testing
 */

import { PrismaClient, UserRole, ProductStatus, PageStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 12)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@kinworkspace.com' },
    update: {},
    create: {
      email: 'admin@kinworkspace.com',
      passwordHash: adminPasswordHash,
      name: 'Admin User',
      role: UserRole.ADMIN,
      isActive: true,
    },
  })

  console.log('✅ Created admin user:', adminUser.email)

  // Create editor user
  const editorPasswordHash = await bcrypt.hash('editor123', 12)
  const editorUser = await prisma.user.upsert({
    where: { email: 'editor@kinworkspace.com' },
    update: {},
    create: {
      email: 'editor@kinworkspace.com',
      passwordHash: editorPasswordHash,
      name: 'Editor User',
      role: UserRole.EDITOR,
      isActive: true,
    },
  })

  console.log('✅ Created editor user:', editorUser.email)

  // Create root categories
  const furnitureCategory = await prisma.category.upsert({
    where: { slug: 'furniture' },
    update: {},
    create: {
      name: 'Furniture',
      slug: 'furniture',
      description: 'Workspace furniture including desks, chairs, and storage solutions',
      sortOrder: 1,
      isActive: true,
    },
  })

  const lightingCategory = await prisma.category.upsert({
    where: { slug: 'lighting' },
    update: {},
    create: {
      name: 'Lighting',
      slug: 'lighting',
      description: 'Desk lamps, ambient lighting, and task lighting solutions',
      sortOrder: 2,
      isActive: true,
    },
  })

  const accessoriesCategory = await prisma.category.upsert({
    where: { slug: 'accessories' },
    update: {},
    create: {
      name: 'Accessories',
      slug: 'accessories',
      description: 'Workspace accessories and organizational tools',
      sortOrder: 3,
      isActive: true,
    },
  })

  console.log('✅ Created categories')

  // Create subcategories
  const desksCategory = await prisma.category.upsert({
    where: { slug: 'desks' },
    update: {},
    create: {
      name: 'Desks',
      slug: 'desks',
      description: 'Standing desks, traditional desks, and desk accessories',
      parentId: furnitureCategory.id,
      sortOrder: 1,
      isActive: true,
    },
  })

  const chairsCategory = await prisma.category.upsert({
    where: { slug: 'chairs' },
    update: {},
    create: {
      name: 'Chairs',
      slug: 'chairs',
      description: 'Ergonomic office chairs and seating solutions',
      parentId: furnitureCategory.id,
      sortOrder: 2,
      isActive: true,
    },
  })

  console.log('✅ Created subcategories')

  // Create sample products
  const sampleProducts = [
    {
      name: 'Minimalist Standing Desk',
      slug: 'minimalist-standing-desk',
      description: 'A clean, modern standing desk perfect for focused work. Features smooth height adjustment and premium materials.',
      shortDescription: 'Modern standing desk with smooth height adjustment',
      price: 599.99,
      comparePrice: 699.99,
      sku: 'MSD-001',
      inventoryQuantity: 25,
      weight: 45.5,
      dimensions: {
        length: 120,
        width: 60,
        height: 75,
      },
      status: ProductStatus.PUBLISHED,
      featured: true,
      seoTitle: 'Minimalist Standing Desk - Kin Workspace',
      seoDescription: 'Discover our minimalist standing desk designed for modern workspaces. Premium materials, smooth adjustment, and clean design.',
      categoryId: desksCategory.id,
    },
    {
      name: 'Ergonomic Task Chair',
      slug: 'ergonomic-task-chair',
      description: 'Designed for all-day comfort with lumbar support and breathable mesh back. Adjustable height and armrests.',
      shortDescription: 'Comfortable ergonomic chair with lumbar support',
      price: 399.99,
      sku: 'ETC-001',
      inventoryQuantity: 15,
      weight: 18.2,
      dimensions: {
        length: 65,
        width: 65,
        height: 110,
      },
      status: ProductStatus.PUBLISHED,
      featured: true,
      seoTitle: 'Ergonomic Task Chair - Kin Workspace',
      seoDescription: 'Premium ergonomic task chair with lumbar support and breathable mesh. Perfect for long work sessions.',
      categoryId: chairsCategory.id,
    },
    {
      name: 'Adjustable Desk Lamp',
      slug: 'adjustable-desk-lamp',
      description: 'LED desk lamp with adjustable brightness and color temperature. USB charging port included.',
      shortDescription: 'LED desk lamp with adjustable brightness',
      price: 89.99,
      sku: 'ADL-001',
      inventoryQuantity: 50,
      weight: 1.8,
      status: ProductStatus.PUBLISHED,
      featured: false,
      seoTitle: 'Adjustable LED Desk Lamp - Kin Workspace',
      seoDescription: 'Adjustable LED desk lamp with brightness control and USB charging. Perfect task lighting for your workspace.',
      categoryId: lightingCategory.id,
    },
  ]

  for (const productData of sampleProducts) {
    const { categoryId, ...productFields } = productData
    
    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {},
      create: {
        ...productFields,
        createdBy: adminUser.id,
        categories: {
          create: {
            categoryId: categoryId,
          },
        },
      },
    })

    console.log('✅ Created product:', product.name)
  }

  // Create sample pages
  const aboutPage = await prisma.page.upsert({
    where: { slug: 'about' },
    update: {},
    create: {
      title: 'About Kin Workspace',
      slug: 'about',
      content: '<h1>About Kin Workspace</h1><p>We create intentionally designed workspace tools that enhance focus, clarity, and calm for the modern professional.</p>',
      excerpt: 'Learn about our mission to create calm, focused workspaces.',
      status: PageStatus.PUBLISHED,
      template: 'default',
      seoTitle: 'About Us - Kin Workspace',
      seoDescription: 'Discover Kin Workspace\'s mission to create intentionally designed workspace tools for modern professionals.',
      publishedAt: new Date(),
      createdBy: adminUser.id,
    },
  })

  console.log('✅ Created page:', aboutPage.title)

  console.log('🎉 Database seeding completed!')
  console.log('')
  console.log('👤 Test Users:')
  console.log('   Admin: admin@kinworkspace.com / admin123')
  console.log('   Editor: editor@kinworkspace.com / editor123')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })