import { seedNotificationTemplates } from '../app/lib/notification-templates'

async function main() {
  try {
    await seedNotificationTemplates()
    console.log('Notification templates seeded successfully')
    process.exit(0)
  } catch (error) {
    console.error('Error seeding notification templates:', error)
    process.exit(1)
  }
}

main()