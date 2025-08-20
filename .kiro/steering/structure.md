# CMS Admin Project Structure & Architecture

## App Router Structure
```
app/
├── (auth)/              # Authentication routes
│   ├── login/
│   └── register/
├── (dashboard)/         # Protected admin routes
│   ├── products/        # Product management
│   ├── categories/      # Category management
│   ├── orders/          # Order processing
│   ├── customers/       # Customer management
│   ├── analytics/       # Reports and analytics
│   └── settings/        # System settings
├── api/                 # API routes
│   ├── auth/           # Authentication endpoints
│   ├── products/       # Product CRUD operations
│   ├── orders/         # Order management
│   └── upload/         # File upload handling
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components
│   ├── forms/          # Form components
│   ├── tables/         # Data table components
│   └── layout/         # Layout components
├── lib/                # Utilities and configurations
│   ├── auth.ts         # NextAuth configuration
│   ├── db.ts           # Database connection
│   ├── validations.ts  # Zod schemas
│   └── utils.ts        # Helper functions
├── prisma/             # Database schema and migrations
│   ├── schema.prisma   # Database models
│   ├── migrations/     # Database migrations
│   └── seed.ts         # Database seeding
└── types/              # TypeScript type definitions
```

## Database Architecture
- **Products:** Product catalog with variants, pricing, inventory
- **Categories:** Hierarchical category structure
- **Orders:** Order processing and fulfillment tracking
- **Users:** Admin users with role-based permissions
- **Media:** File and image management

## Component Patterns
- **Server Components:** Default for data fetching and static content
- **Client Components:** For interactive forms and real-time updates
- **Layout Components:** Consistent admin interface structure
- **Form Components:** Reusable form patterns with validation
- **Table Components:** Data grids with sorting, filtering, pagination

## API Architecture
- **RESTful Endpoints:** Standard CRUD operations
- **Authentication:** Protected routes with role validation
- **File Upload:** Secure file handling with validation
- **Error Handling:** Consistent error responses
- **Validation:** Server-side validation with Zod schemas

## Security Considerations
- **Authentication:** Secure session management
- **Authorization:** Role-based access control
- **Input Validation:** Server-side validation for all inputs
- **File Upload:** Secure file handling with type validation
- **CSRF Protection:** Built-in Next.js CSRF protection