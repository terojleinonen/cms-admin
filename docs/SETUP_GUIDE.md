# Kin Workspace CMS - Setup Guide

## Table of Contents
1. [Development Setup](#development-setup)
2. [Production Deployment](#production-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [SSL Configuration](#ssl-configuration)
6. [Troubleshooting](#troubleshooting)

## Development Setup

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL >= 14.0 (or Docker)
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kin-workspace-cms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start PostgreSQL (using Docker)**
   ```bash
   docker run --name postgres-cms \
     -e POSTGRES_DB=kin_workspace_cms \
     -e POSTGRES_USER=cms_user \
     -e POSTGRES_PASSWORD=dev_password \
     -p 5432:5432 \
     -v postgres_data:/var/lib/postgresql/data \
     -d postgres:16
   ```

5. **Set up the database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Access the CMS**
   - Open http://localhost:3001
   - Login with seeded admin account (check seed.ts for credentials)

### Development Environment Variables

Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL="postgresql://cms_user:dev_password@localhost:5432/kin_workspace_cms"

# Authentication
NEXTAUTH_SECRET="dev-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3001"

# File Upload
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE=10485760

# Optional: Redis for caching
REDIS_URL="redis://localhost:6379"

# Development settings
NODE_ENV="development"
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database with test data
npm run db:studio    # Open Prisma Studio
npm run db:reset     # Reset database (dev only)

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript type checking
npm run format       # Format code with Prettier

# Testing
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

## Production Deployment

### Option 1: Docker Deployment (Recommended)

1. **Prepare the server**
   ```bash
   # Install Docker and Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Clone and configure**
   ```bash
   git clone <repository-url>
   cd kin-workspace-cms
   
   # Create production environment file
   cp .env.production.example .env.production
   # Edit .env.production with your settings
   ```

3. **Deploy using the deployment script**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh deploy
   ```

4. **Set up SSL certificates**
   ```bash
   # Create SSL directory
   mkdir -p nginx/ssl
   
   # Copy your SSL certificates
   cp your-cert.pem nginx/ssl/cert.pem
   cp your-key.pem nginx/ssl/key.pem
   
   # Or generate self-signed certificates for testing
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout nginx/ssl/key.pem \
     -out nginx/ssl/cert.pem
   ```

### Option 2: Manual Deployment

1. **Prepare the server**
   ```bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PostgreSQL
   sudo apt-get install postgresql postgresql-contrib
   
   # Install PM2 for process management
   npm install -g pm2
   ```

2. **Set up the database**
   ```bash
   sudo -u postgres createuser --interactive cms_user
   sudo -u postgres createdb kin_workspace_cms -O cms_user
   ```

3. **Deploy the application**
   ```bash
   git clone <repository-url>
   cd kin-workspace-cms
   npm install
   npm run build
   
   # Set up environment
   cp .env.production.example .env.production
   # Edit .env.production
   
   # Run migrations
   npx prisma migrate deploy
   
   # Start with PM2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

## Environment Configuration

### Required Environment Variables

```bash
# Database (Required)
DATABASE_URL="postgresql://user:password@host:port/database"

# Authentication (Required)
NEXTAUTH_SECRET="secure-random-string-minimum-32-characters"
NEXTAUTH_URL="https://your-domain.com"

# File Upload (Required)
UPLOAD_DIR="/path/to/uploads"
MAX_FILE_SIZE=10485760  # 10MB in bytes
```

### Optional Environment Variables

```bash
# Redis Caching
REDIS_URL="redis://localhost:6379"

# Email Notifications
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-email@example.com"
SMTP_PASS="your-password"
SMTP_FROM="noreply@your-domain.com"

# Security
CSRF_SECRET="another-secure-random-string"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
LOG_LEVEL="info"  # debug, info, warn, error

# Backup
BACKUP_RETENTION_DAYS=30
```

### Environment-Specific Settings

#### Development
```bash
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3001
DATABASE_URL=postgresql://cms_user:dev_password@localhost:5432/kin_workspace_cms
```

#### Staging
```bash
NODE_ENV=production
NEXTAUTH_URL=https://staging.your-domain.com
DATABASE_URL=postgresql://cms_user:staging_password@staging-db:5432/kin_workspace_cms
```

#### Production
```bash
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
DATABASE_URL=postgresql://cms_user:secure_password@prod-db:5432/kin_workspace_cms
```

## Database Setup

### PostgreSQL Installation

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS (using Homebrew)
```bash
brew install postgresql
brew services start postgresql
```

#### Docker (Recommended for development)
```bash
docker run --name postgres-cms \
  -e POSTGRES_DB=kin_workspace_cms \
  -e POSTGRES_USER=cms_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -d postgres:16
```

### Database Configuration

1. **Create database and user**
   ```sql
   -- Connect as postgres superuser
   sudo -u postgres psql
   
   -- Create user
   CREATE USER cms_user WITH PASSWORD 'your_secure_password';
   
   -- Create database
   CREATE DATABASE kin_workspace_cms OWNER cms_user;
   
   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE kin_workspace_cms TO cms_user;
   ```

2. **Configure PostgreSQL**
   ```bash
   # Edit postgresql.conf
   sudo nano /etc/postgresql/14/main/postgresql.conf
   
   # Uncomment and modify:
   listen_addresses = 'localhost'
   port = 5432
   max_connections = 100
   shared_buffers = 256MB
   
   # Edit pg_hba.conf for authentication
   sudo nano /etc/postgresql/14/main/pg_hba.conf
   
   # Add line for local connections:
   local   kin_workspace_cms   cms_user                md5
   host    kin_workspace_cms   cms_user   127.0.0.1/32 md5
   ```

3. **Restart PostgreSQL**
   ```bash
   sudo systemctl restart postgresql
   ```

### Database Migrations

```bash
# Generate migration from schema changes
npx prisma migrate dev --name migration_name

# Deploy migrations to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# View migration status
npx prisma migrate status
```

## SSL Configuration

### Option 1: Let's Encrypt (Recommended)

1. **Install Certbot**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Obtain certificates**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Auto-renewal**
   ```bash
   sudo crontab -e
   # Add line:
   0 12 * * * /usr/bin/certbot renew --quiet
   ```

### Option 2: Self-Signed Certificates (Development)

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

### Option 3: Custom Certificates

```bash
# Copy your certificates to the SSL directory
cp your-certificate.crt nginx/ssl/cert.pem
cp your-private-key.key nginx/ssl/key.pem

# Set proper permissions
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
```

## Troubleshooting

### Node.js Version Issues

#### Engine Compatibility Warnings
If you see engine compatibility warnings during npm install:

```bash
# Check your Node.js version
node --version  # Should be v20.0.0 or higher

# Check your npm version
npm --version   # Should be v10.0.0 or higher

# If using older versions, upgrade Node.js
# Using Node Version Manager (nvm)
nvm install 20
nvm use 20

# Or download from nodejs.org
```

#### Dependency Installation Issues
If npm install fails with peer dependency conflicts:

```bash
# Use legacy peer deps flag for Next.js 15 + NextAuth compatibility
npm install --legacy-peer-deps

# Or for CI environments
npm ci --legacy-peer-deps
```

#### Docker Build Issues with Node.js 20+
If Docker builds fail:

```bash
# Ensure Dockerfile uses Node.js 20+ base image
# Check that Dockerfile contains:
FROM node:20-alpine

# Ensure npm ci uses legacy peer deps
RUN npm ci --legacy-peer-deps --omit=dev

# Check for legacy ENV format issues
# Use: ENV NODE_ENV=production
# Not: ENV NODE_ENV production
```

### Common Issues

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U cms_user -d kin_workspace_cms

# Check logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

#### Permission Issues
```bash
# Fix file permissions
sudo chown -R www-data:www-data /path/to/uploads
sudo chmod -R 755 /path/to/uploads

# Fix database permissions
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE kin_workspace_cms TO cms_user;"
```

#### Docker Issues
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f cms-app

# Restart services
docker-compose restart

# Clean up
docker system prune -f
```

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Test SSL configuration
openssl s_client -connect your-domain.com:443

# Nginx configuration test
nginx -t
```

### Performance Issues

#### Database Optimization
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze table statistics
ANALYZE;

-- Reindex if needed
REINDEX DATABASE kin_workspace_cms;
```

#### Application Optimization
```bash
# Check memory usage
free -h
htop

# Check disk space
df -h

# Monitor application logs
tail -f /var/log/cms/application.log
```

### Getting Help

1. **Check logs**
   - Application logs: `docker-compose logs cms-app`
   - Database logs: `docker-compose logs postgres`
   - Nginx logs: `docker-compose logs nginx`

2. **Verify configuration**
   - Environment variables: `docker-compose config`
   - Database connection: `npm run db:studio`
   - Health check: `curl http://localhost:3001/api/health`

3. **Common commands**
   ```bash
   # Restart all services
   ./scripts/deploy.sh restart
   
   # Check service status
   ./scripts/deploy.sh status
   
   # View real-time logs
   ./scripts/deploy.sh logs
   
   # Create database backup
   ./scripts/deploy.sh backup
   ```

For additional support, please refer to the troubleshooting section in the user guide or contact the development team.