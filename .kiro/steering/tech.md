# CMS Technology Stack & Development Guidelines

## Core Technologies
- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript (strict mode enabled)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js
- **Styling:** Tailwind CSS
- **UI Components:** Headless UI, Heroicons
- **File Upload:** Next.js file handling with cloud storage

## Build System & Commands
```bash
# Development
npm run dev          # Start development server on localhost:3001

# Database
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database with initial data
npm run db:studio    # Open Prisma Studio

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm run test         # Run test suite
```

## Key Dependencies
- **Database:** @prisma/client, prisma
- **Auth:** next-auth
- **UI/UX:** @headlessui/react, @heroicons/react
- **Forms:** react-hook-form, @hookform/resolvers, zod
- **Styling:** tailwindcss, autoprefixer, postcss
- **Dev Tools:** prettier, eslint-config-next

## Configuration Files
- `prisma/schema.prisma` - Database schema and models
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Admin-specific design system
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables for database and auth

## Requirements
- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- npm >= 8.0.0
- Environment variables for database connection