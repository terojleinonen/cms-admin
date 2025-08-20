-- Initialize the CMS database with required extensions
-- This script runs automatically when the PostgreSQL container starts

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance
-- These will be created after tables are set up via Prisma migrations

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'CMS Database initialized successfully with extensions';
END $$;