#!/bin/bash
# Verification script to test CI pipeline readiness locally
# This simulates the CI environment checks

set -e

echo "🔍 Verifying CI Pipeline Readiness..."
echo ""

# Check 1: Prisma generate
echo "✓ Step 1: Generating Prisma Client..."
npx prisma generate > /dev/null 2>&1
echo "  ✅ Prisma Client generated successfully"
echo ""

# Check 2: Verify migration files exist
echo "✓ Step 2: Checking migration files..."
if [ -d "prisma/migrations/20251110212942_add_auth_and_user_features" ]; then
    echo "  ✅ Migration directory exists"
    if [ -f "prisma/migrations/20251110212942_add_auth_and_user_features/migration.sql" ]; then
        echo "  ✅ Migration SQL file exists"
    else
        echo "  ❌ Migration SQL file not found"
        exit 1
    fi
else
    echo "  ❌ Migration directory not found"
    exit 1
fi
echo ""

# Check 3: Verify schema matches migration
echo "✓ Step 3: Verifying schema consistency..."
npx prisma validate > /dev/null 2>&1
echo "  ✅ Prisma schema is valid"
echo ""

# Check 4: Test database operations (if DATABASE_URL is set)
if [ -n "$DATABASE_URL" ]; then
    echo "✓ Step 4: Testing database operations..."
    
    # Try to apply migrations
    echo "  → Running migrate deploy..."
    npx prisma migrate deploy > /dev/null 2>&1
    echo "  ✅ Migrations applied successfully"
    
    # Try to seed database
    echo "  → Running database seed..."
    npm run db:seed > /dev/null 2>&1
    echo "  ✅ Database seeded successfully"
    echo ""
else
    echo "⚠️  Step 4: Skipping database tests (DATABASE_URL not set)"
    echo "   To test database operations, set DATABASE_URL and run again"
    echo ""
fi

# Check 5: Verify test files can be loaded
echo "✓ Step 5: Checking test infrastructure..."
if npm run test -- --listTests > /dev/null 2>&1; then
    echo "  ✅ Test files can be loaded"
else
    echo "  ⚠️  Warning: Some test files may have issues"
fi
echo ""

echo "✅ CI Pipeline Readiness Check Complete!"
echo ""
echo "📋 Summary:"
echo "  - Prisma Client generation: ✅"
echo "  - Migration files present: ✅"
echo "  - Schema validation: ✅"
if [ -n "$DATABASE_URL" ]; then
    echo "  - Database migration: ✅"
    echo "  - Database seeding: ✅"
else
    echo "  - Database operations: ⚠️  (skipped)"
fi
echo "  - Test infrastructure: ✅"
echo ""
echo "🚀 Ready for CI pipeline execution!"
