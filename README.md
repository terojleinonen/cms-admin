# Kin Workspace CMS Admin

Content Management System for the Kin Workspace e-commerce platform.

## Features

- **Product Management**: Full CRUD operations for products and categories
- **Order Processing**: Order management and fulfillment tracking
- **User Management**: Admin users with role-based permissions
- **Content Management**: Marketing pages and content editing
- **Analytics Dashboard**: Reports and insights
- **Media Management**: Image and file upload handling

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI, Heroicons
- **Forms**: React Hook Form with Zod validation

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- npm >= 8.0.0

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database connection details

# Set up database
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

The CMS will be available at `http://localhost:3001`.

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database with initial data
npm run db:studio    # Open Prisma Studio
npm run db:reset     # Reset database

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm run test         # Run test suite
npm run test:coverage # Run tests with coverage
```

## Project Structure

```
app/
├── (auth)/              # Authentication routes
├── (dashboard)/         # Protected admin routes
│   ├── products/        # Product management
│   ├── orders/          # Order processing
│   └── analytics/       # Reports and analytics
├── api/                 # API routes
├── components/          # Reusable UI components
├── lib/                 # Utilities and configurations
├── prisma/             # Database schema and migrations
└── types/              # TypeScript type definitions
```

## Database Schema

The CMS uses PostgreSQL with Prisma ORM. Key entities include:

- **Products**: Product catalog with variants and inventory
- **Categories**: Hierarchical category structure
- **Orders**: Order processing and fulfillment
- **Users**: Admin users with role-based permissions
- **Media**: File and image management

## Authentication

The CMS uses NextAuth.js for secure authentication with:

- Session-based authentication
- Role-based access control
- Secure password hashing
- CSRF protection

## API Endpoints

RESTful API endpoints for:

- `/api/products` - Product CRUD operations
- `/api/orders` - Order management
- `/api/users` - User management
- `/api/upload` - File upload handling

## Testing

Comprehensive test suite including:

- Unit tests for components and utilities
- Integration tests for API endpoints
- Database tests with proper cleanup
- Authentication flow testing

## Security

- Input validation with Zod schemas
- SQL injection prevention with Prisma
- XSS protection with proper sanitization
- File upload security with type validation
- Role-based access control

## License

MIT License - see LICENSE file for details.