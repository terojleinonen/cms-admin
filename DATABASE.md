# Database Setup Guide

This guide explains how to set up and manage the PostgreSQL database for the Kin Workspace CMS.

## Prerequisites

- Docker Desktop installed and running
- Node.js 18+ and npm 8+

## Quick Setup

1. **Start the database:**
   ```bash
   npm run db:setup
   ```

   This script will:
   - Start PostgreSQL and Redis containers
   - Wait for the database to be ready
   - Generate the Prisma client
   - Run database migrations
   - Test the connection

2. **Seed the database with sample data:**
   ```bash
   npm run db:seed
   ```

## Manual Setup

If you prefer to set up the database manually:

1. **Start containers:**
   ```bash
   docker-compose up -d
   ```

2. **Generate Prisma client:**
   ```bash
   npm run db:generate
   ```

3. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

4. **Seed database:**
   ```bash
   npm run db:seed
   ```

## Database Management

### Available Scripts

- `npm run db:setup` - Complete database setup
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:reset` - Reset database (⚠️ destroys all data)
- `npm run db:push` - Push schema changes without migrations

### Connection Details

- **Host:** localhost
- **Port:** 5432
- **Database:** kin_workspace_cms
- **Username:** cms_user
- **Password:** secure_password

### Environment Variables

The following environment variables are configured in `.env`:

```env
DATABASE_URL="postgresql://cms_user:secure_password@localhost:5432/kin_workspace_cms"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3001"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="10485760"
REDIS_URL="redis://localhost:6379"
NODE_ENV="development"
```

## Database Schema

The database includes the following main entities:

### Users
- Authentication and user management
- Role-based access control (Admin, Editor, Viewer)
- Password hashing with bcrypt

### Products
- Complete product information
- SKU and inventory management
- SEO fields and status workflow

### Categories
- Hierarchical category structure
- Many-to-many relationship with products

### Media
- File metadata and storage information
- Automatic thumbnail generation
- Organized folder structure

### Pages
- Static content management
- SEO optimization
- Publication workflow

### Content Revisions
- Version history tracking
- Change auditing

## Health Check

Check database connectivity:

```bash
curl http://localhost:3001/api/health
```

## Troubleshooting

### Docker Issues

1. **Docker not running:**
   ```
   Error: Cannot connect to the Docker daemon
   ```
   Solution: Start Docker Desktop

2. **Port conflicts:**
   ```
   Error: Port 5432 is already in use
   ```
   Solution: Stop other PostgreSQL instances or change the port in `docker-compose.yml`

### Database Connection Issues

1. **Connection refused:**
   - Ensure Docker containers are running: `docker-compose ps`
   - Check container logs: `docker-compose logs postgres`

2. **Authentication failed:**
   - Verify credentials in `.env` match `docker-compose.yml`
   - Reset containers: `docker-compose down && docker-compose up -d`

### Migration Issues

1. **Migration conflicts:**
   ```bash
   npm run db:reset  # ⚠️ This will delete all data
   npm run db:migrate
   npm run db:seed
   ```

2. **Schema drift:**
   ```bash
   npm run db:push  # Push schema without creating migration
   ```

## Backup and Restore

### Create Backup

```bash
docker exec kin-workspace-cms-postgres pg_dump -U cms_user kin_workspace_cms > backup.sql
```

### Restore Backup

```bash
docker exec -i kin-workspace-cms-postgres psql -U cms_user kin_workspace_cms < backup.sql
```

## Production Considerations

For production deployment:

1. **Change default passwords** in `docker-compose.yml` and `.env`
2. **Use environment-specific secrets** for `NEXTAUTH_SECRET`
3. **Configure SSL/TLS** for database connections
4. **Set up automated backups**
5. **Monitor database performance** and connections
6. **Use connection pooling** for high-traffic applications

## Sample Data

The seed script creates:

### Test Users
- **Admin:** admin@kinworkspace.com / admin123
- **Editor:** editor@kinworkspace.com / editor123

### Sample Products
- Minimalist Standing Desk
- Ergonomic Task Chair
- Adjustable Desk Lamp

### Categories
- Furniture (Desks, Chairs)
- Lighting
- Accessories

### Sample Pages
- About page with basic content