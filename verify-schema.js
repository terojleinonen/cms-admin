const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifySchema() {
  console.log('🔍 Verifying database structure...\n');

  try {
    // Check User table columns by querying a user
    const users = await prisma.user.findMany({ take: 1 });
    if (users.length > 0) {
      const user = users[0];
      console.log('✅ User table columns verified:');
      console.log('   - id:', typeof user.id);
      console.log('   - email:', typeof user.email);
      console.log('   - name:', typeof user.name);
      console.log('   - role:', typeof user.role);
      console.log('   - profilePicture:', typeof user.profilePicture);
      console.log('   - emailVerified:', typeof user.emailVerified);
      console.log('   - twoFactorSecret:', typeof user.twoFactorSecret);
      console.log('   - twoFactorEnabled:', typeof user.twoFactorEnabled);
      console.log('   - lastLoginAt:', typeof user.lastLoginAt);
      console.log('   - createdAt:', typeof user.createdAt);
      console.log('   - updatedAt:', typeof user.updatedAt);
    }

    // Check new tables exist by counting records
    console.log('\n✅ New tables verified:');
    
    const userPrefsCount = await prisma.userPreferences.count();
    console.log('   - UserPreferences table exists (count:', userPrefsCount + ')');
    
    const auditLogCount = await prisma.auditLog.count();
    console.log('   - AuditLog table exists (count:', auditLogCount + ')');
    
    const sessionCount = await prisma.session.count();
    console.log('   - Session table exists (count:', sessionCount + ')');
    
    const backupCodeCount = await prisma.backupCode.count();
    console.log('   - BackupCode table exists (count:', backupCodeCount + ')');
    
    const passwordResetCount = await prisma.passwordResetToken.count();
    console.log('   - PasswordResetToken table exists (count:', passwordResetCount + ')');
    
    const notificationCount = await prisma.notification.count();
    console.log('   - Notification table exists (count:', notificationCount + ')');
    
    const emailLogCount = await prisma.emailLog.count();
    console.log('   - EmailLog table exists (count:', emailLogCount + ')');

    // Check seeded data
    console.log('\n✅ Seeded data verified:');
    const totalUsers = await prisma.user.count();
    console.log('   - Users:', totalUsers);
    
    const totalCategories = await prisma.category.count();
    console.log('   - Categories:', totalCategories);
    
    const totalProducts = await prisma.product.count();
    console.log('   - Products:', totalProducts);
    
    const totalPages = await prisma.page.count();
    console.log('   - Pages:', totalPages);

    console.log('\n🎉 Database structure verification complete!');
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifySchema();
