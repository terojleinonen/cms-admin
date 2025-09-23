/**
 * Cleanup script for permission cache
 * Removes expired cache entries and provides cache statistics
 */

import { PrismaClient } from '@prisma/client';
import { PermissionCacheDB } from '../app/lib/permission-db';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting permission cache cleanup...');

  try {
    // Get cache statistics before cleanup
    console.log('📊 Getting cache statistics...');
    const statsBefore = await PermissionCacheDB.getStats();
    
    console.log('📋 Cache Statistics (Before Cleanup):');
    console.log(`  Total entries: ${statsBefore.totalEntries}`);
    console.log(`  Expired entries: ${statsBefore.expiredEntries}`);
    console.log(`  Top users by cache entries:`);
    statsBefore.userCounts.slice(0, 5).forEach((user, index) => {
      console.log(`    ${index + 1}. User ${user.userId}: ${user.count} entries`);
    });

    if (statsBefore.expiredEntries === 0) {
      console.log('✅ No expired entries found. Cache is clean!');
      return;
    }

    // Clean up expired entries
    console.log(`🗑️  Removing ${statsBefore.expiredEntries} expired entries...`);
    const removedCount = await PermissionCacheDB.clearExpired();
    
    console.log(`✅ Successfully removed ${removedCount} expired cache entries`);

    // Get statistics after cleanup
    const statsAfter = await PermissionCacheDB.getStats();
    
    console.log('📋 Cache Statistics (After Cleanup):');
    console.log(`  Total entries: ${statsAfter.totalEntries}`);
    console.log(`  Expired entries: ${statsAfter.expiredEntries}`);
    
    const savedSpace = statsBefore.totalEntries - statsAfter.totalEntries;
    if (savedSpace > 0) {
      const percentageSaved = ((savedSpace / statsBefore.totalEntries) * 100).toFixed(1);
      console.log(`💾 Space saved: ${savedSpace} entries (${percentageSaved}%)`);
    }

    console.log('');
    console.log('🔧 Recommendations:');
    
    if (statsAfter.totalEntries > 10000) {
      console.log('  - Consider reducing cache TTL to manage memory usage');
    }
    
    if (statsBefore.expiredEntries > statsBefore.totalEntries * 0.3) {
      console.log('  - High percentage of expired entries detected');
      console.log('  - Consider running cleanup more frequently');
    }
    
    if (statsAfter.totalEntries > 0) {
      console.log('  - Schedule regular cache cleanup (recommended: hourly)');
      console.log('  - Monitor cache hit rates to optimize TTL settings');
    }

  } catch (error) {
    console.error('❌ Cache cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Command line options
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose'),
  force: args.includes('--force')
};

if (options.dryRun) {
  console.log('🔍 Running in dry-run mode (no changes will be made)');
}

// Run the cleanup
main()
  .catch((error) => {
    console.error('Cleanup error:', error);
    process.exit(1);
  });