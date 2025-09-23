/**
 * Migration script to create permission system tables
 * Run this script to apply the permission system database changes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting permission system database migration...');

  try {
    // Check if tables already exist
    const existingTables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('permission_cache', 'security_events', 'role_change_history')
    `;

    const existingTableNames = existingTables.map(t => t.table_name);

    if (existingTableNames.length > 0) {
      console.log(`⚠️  Found existing tables: ${existingTableNames.join(', ')}`);
      console.log('Tables already exist. Skipping migration.');
      return;
    }

    console.log('📋 Creating permission_cache table...');
    await prisma.$executeRaw`
      CREATE TABLE "permission_cache" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "user_id" UUID NOT NULL,
          "resource" VARCHAR(100) NOT NULL,
          "action" VARCHAR(50) NOT NULL,
          "scope" VARCHAR(50),
          "result" BOOLEAN NOT NULL,
          "expires_at" TIMESTAMP(3) NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "permission_cache_pkey" PRIMARY KEY ("id")
      )
    `;

    console.log('🔒 Creating security_events table...');
    await prisma.$executeRaw`
      CREATE TABLE "security_events" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "type" VARCHAR(50) NOT NULL,
          "severity" VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
          "user_id" UUID,
          "resource" VARCHAR(100),
          "action" VARCHAR(50),
          "ip_address" VARCHAR(45),
          "user_agent" TEXT,
          "details" JSONB,
          "resolved" BOOLEAN NOT NULL DEFAULT false,
          "resolved_at" TIMESTAMP(3),
          "resolved_by" UUID,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
      )
    `;

    console.log('📊 Creating role_change_history table...');
    await prisma.$executeRaw`
      CREATE TABLE "role_change_history" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "user_id" UUID NOT NULL,
          "old_role" VARCHAR(20) NOT NULL,
          "new_role" VARCHAR(20) NOT NULL,
          "changed_by" UUID,
          "reason" TEXT,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "role_change_history_pkey" PRIMARY KEY ("id")
      )
    `;

    console.log('🔍 Creating indexes for permission_cache...');
    await prisma.$executeRaw`CREATE INDEX "permission_cache_user_id_idx" ON "permission_cache"("user_id")`;
    await prisma.$executeRaw`CREATE INDEX "permission_cache_resource_action_idx" ON "permission_cache"("resource", "action")`;
    await prisma.$executeRaw`CREATE INDEX "permission_cache_expires_at_idx" ON "permission_cache"("expires_at")`;
    await prisma.$executeRaw`CREATE UNIQUE INDEX "permission_cache_user_resource_action_scope_key" ON "permission_cache"("user_id", "resource", "action", "scope")`;

    console.log('🔍 Creating indexes for security_events...');
    await prisma.$executeRaw`CREATE INDEX "security_events_type_idx" ON "security_events"("type")`;
    await prisma.$executeRaw`CREATE INDEX "security_events_severity_idx" ON "security_events"("severity")`;
    await prisma.$executeRaw`CREATE INDEX "security_events_user_id_idx" ON "security_events"("user_id")`;
    await prisma.$executeRaw`CREATE INDEX "security_events_created_at_idx" ON "security_events"("created_at")`;
    await prisma.$executeRaw`CREATE INDEX "security_events_resolved_idx" ON "security_events"("resolved")`;

    console.log('🔍 Creating indexes for role_change_history...');
    await prisma.$executeRaw`CREATE INDEX "role_change_history_user_id_idx" ON "role_change_history"("user_id")`;
    await prisma.$executeRaw`CREATE INDEX "role_change_history_changed_by_idx" ON "role_change_history"("changed_by")`;
    await prisma.$executeRaw`CREATE INDEX "role_change_history_created_at_idx" ON "role_change_history"("created_at")`;

    console.log('🔗 Adding foreign key constraints...');
    await prisma.$executeRaw`ALTER TABLE "permission_cache" ADD CONSTRAINT "permission_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`;
    await prisma.$executeRaw`ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`;
    await prisma.$executeRaw`ALTER TABLE "security_events" ADD CONSTRAINT "security_events_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`;
    await prisma.$executeRaw`ALTER TABLE "role_change_history" ADD CONSTRAINT "role_change_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`;
    await prisma.$executeRaw`ALTER TABLE "role_change_history" ADD CONSTRAINT "role_change_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`;

    console.log('✅ Permission system database migration completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('  - permission_cache: Stores cached permission results for performance');
    console.log('  - security_events: Logs security-related events and incidents');
    console.log('  - role_change_history: Tracks all role changes for audit purposes');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('  1. Update your Prisma schema to include the new models');
    console.log('  2. Run `npx prisma generate` to update the Prisma client');
    console.log('  3. Test the permission system functionality');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
main()
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });