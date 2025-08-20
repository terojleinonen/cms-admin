#!/bin/bash

# Kin Workspace CMS Database Setup Script
# This script sets up the PostgreSQL database for the CMS

set -e

echo "🚀 Setting up Kin Workspace CMS Database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    echo "   You can download Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Navigate to the CMS directory
cd "$(dirname "$0")/.."

echo "📦 Starting PostgreSQL and Redis containers..."

# Start the database containers
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout=60
counter=0

while ! docker exec kin-workspace-cms-postgres pg_isready -U cms_user -d kin_workspace_cms > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo "❌ PostgreSQL failed to start within $timeout seconds"
        docker-compose logs postgres
        exit 1
    fi
    
    echo "   Waiting for PostgreSQL... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

echo "✅ PostgreSQL is ready!"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name init

# Check database connection
echo "🔍 Testing database connection..."
if npx prisma db pull > /dev/null 2>&1; then
    echo "✅ Database connection successful!"
else
    echo "❌ Database connection failed!"
    exit 1
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "📋 Connection Details:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: kin_workspace_cms"
echo "   Username: cms_user"
echo "   Password: secure_password"
echo ""
echo "🔧 Useful Commands:"
echo "   View database: npx prisma studio"
echo "   Reset database: npx prisma migrate reset"
echo "   Stop containers: docker-compose down"
echo ""