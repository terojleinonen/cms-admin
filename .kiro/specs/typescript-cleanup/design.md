# TypeScript Cleanup Design Document

## Overview

This design document outlines a systematic approach to fix all TypeScript errors in the CMS codebase. The cleanup will be organized into logical phases, addressing the most critical issues first and ensuring no new functionality is added during the process.

## Architecture

### Error Classification System

The 1006 TypeScript errors have been categorized into the following priority groups:

1. **Critical Infrastructure Errors** (Priority 1)
   - Missing Prisma model references (permissionCache, securityEvent, etc.)
   - Database connection and client initialization issues
   - Core module import/export problems

2. **Authentication & Session Errors** (Priority 2)
   - NextAuth configuration and callback typing
   - Session and token type definitions
   - Auth import/export inconsistencies

3. **API Route & Validation Errors** (Priority 3)
   - Request/response type mismatches
   - Zod schema configuration issues
   - Middleware typing problems

4. **Component & Hook Errors** (Priority 4)
   - React component prop typing
   - Hook parameter and return type issues
   - Event handler typing

5. **Utility & Helper Errors** (Priority 5)
   - Type assertion and conversion issues
   - Generic type parameter problems
   - Import/export type declarations

## Components and Interfaces

### 1. Database Layer Fixes

**Prisma Client Issues:**
- Remove references to non-existent models: `permissionCache`, `securityEvent`, `roleChangeHistory`, `notificationTemplate`, `searchEvent`
- Fix database field mismatches (e.g., `timestamp` field in AuditLog)
- Correct Prisma client import and initialization patterns

**Database Connection:**
- Standardize database client exports from `app/lib/db.ts`
- Fix circular dependency issues in database modules
- Ensure proper Prisma client lifecycle management

### 2. Authentication System Fixes

**NextAuth Configuration:**
- Properly type callback functions (`jwt`, `session`)
- Fix session strategy type declaration
- Correct auth module exports and imports

**Session Management:**
- Define proper interfaces for session and token objects
- Fix authentication state typing throughout components
- Resolve auth import inconsistencies

### 3. API Route Standardization

**Request/Response Typing:**
- Implement consistent Next.js API route handler types
- Fix Zod schema configurations for validation
- Standardize error response structures

**Middleware Integration:**
- Correct middleware function signatures
- Fix permission checking type safety
- Resolve API route protection typing

### 4. Component Type Safety

**React Component Fixes:**
- Define proper TypeScript interfaces for all component props
- Fix React hook type parameters and return types
- Correct event handler and callback typing

**UI Component Library:**
- Standardize component export/import patterns
- Fix generic component type definitions
- Resolve component composition typing issues

### 5. Utility Function Cleanup

**Type Utilities:**
- Remove unnecessary type assertions and `any` usage
- Implement proper generic type constraints
- Fix utility function parameter and return typing

**Module Organization:**
- Consolidate duplicate type definitions
- Standardize import/export patterns
- Remove unused or redundant utility functions

## Data Models

### Core Type Definitions

```typescript
// Database Models (based on actual Prisma schema)
interface DatabaseModels {
  User: PrismaUser;
  Category: PrismaCategory;
  Product: PrismaProduct;
  Media: PrismaMedia;
  Page: PrismaPage;
  AuditLog: PrismaAuditLog;
  Session: PrismaSession;
  // Remove non-existent models
}

// Authentication Types
interface AuthTypes {
  SessionData: {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
  };
  TokenData: {
    sub: string;
    email: string;
    role: UserRole;
  };
}

// API Types
interface APITypes {
  RequestHandler<T = any>: (
    req: NextRequest,
    context: { params: T }
  ) => Promise<Response>;
  
  ErrorResponse: {
    error: string;
    message: string;
    statusCode: number;
  };
}
```

### Validation Schema Fixes

- Fix Zod schema configurations for proper type inference
- Correct record type definitions with proper key-value typing
- Remove invalid schema options and configurations

## Error Handling

### Systematic Error Resolution

1. **Database Model Cleanup**
   - Remove all references to non-existent Prisma models
   - Replace with actual database operations or remove functionality
   - Update import statements to use correct database client

2. **Type Safety Enforcement**
   - Replace all `any` types with proper TypeScript interfaces
   - Add proper type guards for runtime type checking
   - Implement generic type constraints where appropriate

3. **Import/Export Standardization**
   - Fix all module import/export inconsistencies
   - Use proper TypeScript import syntax for types
   - Resolve circular dependency issues

4. **Configuration Fixes**
   - Correct Zod schema configurations
   - Fix NextAuth callback typing
   - Update API route handler signatures

## Testing Strategy

### Validation Approach

1. **Incremental Compilation Checks**
   - Run TypeScript compiler after each major fix category
   - Ensure no new errors are introduced during cleanup
   - Validate that existing functionality remains intact

2. **Type Safety Verification**
   - Scan for remaining `any` types after cleanup
   - Verify proper type inference in critical paths
   - Test runtime type safety with existing test suite

3. **Build Process Validation**
   - Ensure successful Next.js build after all fixes
   - Verify Prisma client generation works correctly
   - Confirm all API routes compile and type-check properly

### Testing Phases

- **Phase 1**: Database layer compilation check
- **Phase 2**: Authentication system type validation
- **Phase 3**: API route handler verification
- **Phase 4**: Component and hook type checking
- **Phase 5**: Full application build and type safety audit

## Implementation Strategy

### Phase-Based Approach

1. **Infrastructure Phase** (Database & Core)
   - Fix Prisma client issues and non-existent model references
   - Standardize database connection patterns
   - Resolve core module import/export problems

2. **Authentication Phase**
   - Fix NextAuth configuration and callback typing
   - Resolve session and token type definitions
   - Standardize auth module exports

3. **API Layer Phase**
   - Fix API route handler typing
   - Correct Zod schema configurations
   - Resolve middleware and validation issues

4. **Component Phase**
   - Fix React component and hook typing
   - Resolve prop interface definitions
   - Correct event handler typing

5. **Cleanup Phase**
   - Remove remaining `any` types
   - Consolidate duplicate type definitions
   - Final compilation and build verification

### Quality Assurance

- Each phase must pass TypeScript compilation before proceeding
- No new functionality will be added during cleanup
- Existing functionality must remain intact
- All changes will be focused on type safety and error resolution