# Kin Workspace CMS

A modern, comprehensive Content Management System built with Next.js 15, TypeScript, and PostgreSQL. Designed for complete independence with no reliance on commercial services.

## 🚀 Features

### Core Content Management
- **Product Management**: Complete CRUD operations with categories, media, and inventory tracking
- **Media Management**: Advanced file upload, processing, and organization with automatic thumbnail generation
- **Category Management**: Hierarchical category structure with drag-and-drop reordering
- **Content Pages**: Rich text editor for creating and managing static content with SEO optimization

### Advanced Capabilities
- **User Management**: Role-based access control with secure authentication
- **Analytics Dashboard**: Comprehensive reporting and performance metrics
- **Search & Filtering**: Powerful full-text search across all content types
- **Workflow Management**: Content approval and publishing workflows with version history
- **API Integration**: RESTful APIs for e-commerce frontend integration

### Enterprise Features
- **Security**: Comprehensive security measures including input validation, CSRF protection, and audit logging
- **Performance**: Optimized queries, caching, and image processing with Redis support
- **Monitoring**: Built-in logging, performance monitoring, and health checks
- **Backup & Recovery**: Automated backup systems with one-click restoration
- **Deployment**: Docker-ready with production deployment scripts

## 🛠 Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with bcrypt password hashing
- **Styling**: Tailwind CSS with Headless UI components
- **File Processing**: Sharp.js for image optimization
- **Search**: MiniSearch for client-side search
- **Caching**: Redis (optional)
- **Testing**: Jest with Testing Library
- **Deployment**: Docker with Nginx reverse proxy

## 📋 Requirements

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL >= 14.0
- Docker (recommended for deployment)

## 🚀 Quick Start

### Development Setup

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
   - Login with seeded admin account (check `prisma/seed.ts` for credentials)

### Production Deployment

#### Docker Deployment (Recommended)

1. **Prepare environment**
   ```bash
   cp .env.production.example .env.production
   # Edit .env.production with your secure settings
   ```

2. **Deploy with one command**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh deploy
   ```

3. **Set up SSL certificates**
   ```bash
   # For Let's Encrypt
   sudo certbot --nginx -d your-domain.com
   
   # Or copy your certificates
   cp your-cert.pem nginx/ssl/cert.pem
   cp your-key.pem nginx/ssl/key.pem
   ```

## 📚 Available Scripts

### Development
```bash
npm run dev          # Start development server on localhost:3001
npm run build        # Build for production
npm run start        # Start production server
```

### Database
```bash
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database with test data
npm run db:studio    # Open Prisma Studio
npm run db:reset     # Reset database (development only)
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript type checking
npm run format       # Format code with Prettier
```

### Testing
```bash
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Deployment
```bash
./scripts/deploy.sh deploy    # Full deployment
./scripts/deploy.sh status    # Check service status
./scripts/deploy.sh logs      # View service logs
./scripts/deploy.sh backup    # Create database backup
./scripts/deploy.sh restart   # Restart services
```

## 📁 Project Structure

```
app/
├── (auth)/              # Authentication routes
├── admin/               # Protected admin routes
│   ├── products/        # Product management
│   ├── categories/      # Category management
│   ├── media/          # Media library
│   ├── pages/          # Content pages
│   ├── users/          # User management
│   ├── analytics/      # Analytics dashboard
│   └── settings/       # System settings
├── api/                 # API endpoints
│   ├── auth/           # Authentication
│   ├── products/       # Product CRUD
│   ├── categories/     # Category management
│   ├── media/          # File upload/management
│   ├── pages/          # Content pages
│   ├── users/          # User management
│   └── admin/          # Admin-only endpoints
├── components/          # Reusable UI components
├── lib/                 # Utilities and configurations
└── types/               # TypeScript definitions

prisma/
├── schema.prisma        # Database schema
├── migrations/          # Database migrations
└── seed.ts             # Database seeding

docs/                    # Comprehensive documentation
├── USER_GUIDE.md       # User documentation
├── DEVELOPER_GUIDE.md  # Technical documentation
├── SETUP_GUIDE.md      # Installation guide
└── MONITORING_GUIDE.md # Monitoring and logging

scripts/                 # Deployment and utility scripts
nginx/                   # Nginx configuration
docker-compose.*.yml     # Docker configurations
```

## 📖 Documentation

### User Documentation
- **[User Guide](docs/USER_GUIDE.md)** - Complete user manual with screenshots and workflows
- **[Setup Guide](docs/SETUP_GUIDE.md)** - Installation, deployment, and configuration

### Technical Documentation
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Architecture, API reference, and development guidelines
- **[Node.js Migration Guide](docs/NODE_VERSION_MIGRATION_GUIDE.md)** - Node.js 20+ upgrade documentation and troubleshooting
- **[Monitoring Guide](docs/MONITORING_GUIDE.md)** - Logging, monitoring, and troubleshooting

### Quick References
- **[API Documentation](docs/DEVELOPER_GUIDE.md#api-documentation)** - RESTful API endpoints
- **[Database Schema](docs/DEVELOPER_GUIDE.md#database-schema)** - Data models and relationships
- **[Component Architecture](docs/DEVELOPER_GUIDE.md#component-architecture)** - React component structure

## 🔧 Configuration

### Environment Variables

#### Required
```bash
DATABASE_URL="postgresql://user:password@host:port/database"
NEXTAUTH_SECRET="secure-random-string-minimum-32-characters"
NEXTAUTH_URL="https://your-domain.com"
```

#### Optional
```bash
REDIS_URL="redis://localhost:6379"          # Caching
UPLOAD_DIR="./public/uploads"               # File storage
MAX_FILE_SIZE=10485760                      # 10MB upload limit
SMTP_HOST="smtp.example.com"                # Email notifications
LOG_LEVEL="INFO"                            # Logging level
```

### Database Configuration

The CMS uses PostgreSQL with Prisma ORM. The schema includes:
- Users with role-based permissions
- Products with categories and media
- Content pages with SEO fields
- Media files with automatic thumbnails
- Audit logs and version history

### Security Configuration

- Password hashing with bcrypt
- JWT-based authentication
- CSRF protection
- Input validation with Zod
- Rate limiting on API endpoints
- Security headers via middleware

## 🔍 Monitoring & Health Checks

### Health Check Endpoint
```bash
curl https://your-domain.com/api/health
```

### Monitoring Dashboard
Access comprehensive monitoring at `/api/admin/monitoring` (admin only):
- Performance metrics
- Security events
- System statistics
- Error tracking

### Logging
Structured JSON logging with configurable levels:
```bash
LOG_LEVEL=DEBUG  # DEBUG, INFO, WARN, ERROR
```

## 🧪 Testing

### Test Coverage
- Unit tests for utilities and services
- Integration tests for API endpoints
- Component tests for React components
- End-to-end tests for critical workflows

### Running Tests
```bash
npm run test              # Run all tests
npm run test:coverage     # Generate coverage report
npm run test:watch        # Watch mode for development
```

## 🚀 Deployment Options

### 1. Docker Deployment (Recommended)
- Complete containerized setup
- Nginx reverse proxy with SSL
- PostgreSQL and Redis containers
- Automated backup and monitoring
- One-command deployment script

### 2. Manual Deployment
- Traditional server setup
- PM2 process management
- Manual database configuration
- Custom SSL setup

### 3. Cloud Deployment
- Compatible with AWS, GCP, Azure
- Docker container support
- Database service integration
- CDN for media files

## 🔒 Security Features

- **Authentication**: Secure login with session management
- **Authorization**: Role-based access control (Admin, Editor, Viewer)
- **Input Validation**: Server-side validation for all inputs
- **File Security**: MIME type validation and secure file handling
- **API Security**: Rate limiting and CSRF protection
- **Audit Logging**: Comprehensive security event tracking
- **Data Protection**: Encrypted sensitive data storage

## 🎯 Performance Features

- **Database Optimization**: Proper indexing and query optimization
- **Caching**: Redis integration for session and data caching
- **Image Processing**: Automatic optimization and thumbnail generation
- **CDN Ready**: Optimized for content delivery networks
- **Lazy Loading**: Efficient data loading strategies
- **Bundle Optimization**: Code splitting and tree shaking

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Write tests** for your changes
4. **Commit your changes** (`git commit -m 'Add amazing feature'`)
5. **Push to the branch** (`git push origin feature/amazing-feature`)
6. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript strict mode
- Write tests for new features
- Use conventional commit messages
- Update documentation as needed
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Check the comprehensive guides in `/docs`
- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Health Check**: Use `/api/health` endpoint for system status

### Troubleshooting
- **Setup Issues**: See [Setup Guide](docs/SETUP_GUIDE.md#troubleshooting)
- **Performance**: Check [Monitoring Guide](docs/MONITORING_GUIDE.md)
- **Security**: Review security event logs in admin dashboard
- **Database**: Use Prisma Studio for database inspection

### Common Commands
```bash
# Check system status
./scripts/deploy.sh status

# View logs
./scripts/deploy.sh logs

# Create backup
./scripts/deploy.sh backup

# Restart services
./scripts/deploy.sh restart
```

---

**Built with ❤️ for complete content management independence**