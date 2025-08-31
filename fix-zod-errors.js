const fs = require('fs');
const path = require('path');

// List of files that need fixing
const files = [
  'app/api/analytics/export/route.ts',
  'app/api/analytics/route.ts',
  'app/api/admin/backup/route.ts',
  'app/api/admin/backup/restore/route.ts',
  'app/api/admin/security/events/route.ts',
  'app/api/admin/security/alerts/route.ts',
  'app/api/admin/audit-logs/stats/route.ts',
  'app/api/admin/audit-logs/route.ts',
  'app/api/admin/audit-logs/retention/route.ts',
  'app/api/pages/[id]/preview/route.ts',
  'app/api/pages/[id]/route.ts',
  'app/api/pages/route.ts',
  'app/api/pages/preview/route.ts',
  'app/api/users/[id]/notification-preferences/route.ts',
  'app/api/users/[id]/sessions/route.ts',
  'app/api/users/[id]/security/monitoring/route.ts',
  'app/api/search/route.ts',
  'app/api/search/analytics/route.ts',
  'app/api/search/suggestions/route.ts',
  'app/api/auth/password-reset/verify/route.ts',
  'app/api/auth/token/route.ts'
];

files.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace error.errors with error.issues
      content = content.replace(/error\.errors/g, 'error.issues');
      
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${filePath}`);
    } else {
      console.log(`File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('All Zod error fixes completed!');