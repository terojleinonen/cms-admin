const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    // Check if any admin user exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email)
      return
    }

    // Create default admin user
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123'
    const hashedPassword = await bcrypt.hash(defaultPassword, 12)
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@kinworkspace.com',
        passwordHash: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN',
        isActive: true,
      }
    })

    console.log('Created admin user:', admin.email)
    console.log('Password: [REDACTED - Check ADMIN_DEFAULT_PASSWORD env var]')
    console.log('Please change the password after first login!')
    
  } catch (error) {
    console.error('Error creating admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()