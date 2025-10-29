# Codebase Simplification Design

## Overview

Based on comprehensive analysis of the Kin Workspace CMS codebase, this design outlines a systematic approach to reduce complexity while maintaining core functionality. The current codebase shows signs of over-engineering in several areas: extensive testing infrastructure (120+ test files), complex permission systems with multiple abstraction layers, and dependencies that could be replaced with simpler native implementations.

**Key Findings:**
- **Testing Infrastructure**: 40% of codebase is testing-related with significant overlap
- **Dependencies**: 15+ packages that could be simplified or removed
- **Database Schema**: 25+ tables with complex relationships, some potentially unused
- **Permission System**: Multi-layered RBAC with caching, monitoring, and audit trails that may exceed current needs

## Architecture

### Current State Analysis

**Dependency Complexity:**
- UI Components: @headlessui/react, @heroicons/react (heavily used but could be simplified)
- Search: minisearch (could use database-native search)
- Authentication: otplib, qrcode (2FA features may be over-engineered)
- Caching: Redis (optional, falls back to memory)
- Testing: jest-mock-extended, extensive performance/security test suites

**Code Complexity Hotspots:**
1. Permission system with 5+ abstraction layers
2. Audit logging with comprehensive event tracking
3. Security monitoring with real-time alerting
4. Performance monitoring with detailed metrics
5. Testing infrastructure with specialized categories

### Target Architecture

**Simplified Dependency Stack:**
- Core: Next.js, React, TypeScript, Prisma, NextAuth
- UI: Tailwind CSS + minimal custom components (replace Headless UI)
- Database: PostgreSQL with native search capabilities
- Authentication: NextAuth with optional 2FA (simplified)
- Caching: In-memory with optional Redis for production
- Testing: Jest with consolidated test structure

## Components and Interfaces

### 1. Dependency Reduction Strategy

**Phase 1: UI Simplification**
- Replace @headlessui/react components with custom Tailwind implementations
- Consolidate @heroicons/react usage to essential icons only
- Create lightweight modal, dropdown, and form components

**Phase 2: Feature Simplification**
- Replace minisearch with PostgreSQL full-text search
- Simplify 2FA implementation (remove QR code generation, use backup codes only)
- Remove Redis dependency for development/small deployments

**Phase 3: Infrastructure Simplification**
- Consolidate testing categories (remove performance/security specialized tests)
- Simplify permission system to basic role-based checks
- Reduce audit logging to essential security events only

### 2. Database Schema Optimization

**Tables to Evaluate for Removal:**
- `PermissionCache` - Replace with in-memory caching
- `SecurityEvent` - Simplify to basic audit logging
- `RoleChangeHistory` - Merge with audit logs
- `ApiUsageLog` - Remove unless actively monitored
- `BackupRestoreLog` - Simplify backup system
- `SearchEvent` - Remove analytics tracking

**Simplified Core Schema:**
- Users, Sessions, AuditLog (essential security)
- Products, Categories, Media (core business)
- Pages, ContentRevision (content management)
- Notifications (simplified)

### 3. Permission System Redesign

**Current Complexity:**
- Resource-action-scope model
- Multi-layer caching
- Performance monitoring
- Comprehensive audit trails

**Simplified Approach:**
- Role-based permissions (Admin, Editor, Viewer)
- Simple permission checks without caching
- Basic audit logging for security events
- Remove performance monitoring overhead

## Data Models

### Simplified Permission Model

```typescript
// Before: Complex resource-action-scope model
interface Permission {
  resource: string;
  action: string;
  scope?: string;
}

// After: Simple role-based model
type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

const ROLE_PERMISSIONS = {
  ADMIN: ['*'], // All permissions
  EDITOR: ['products:*', 'categories:*', 'media:*', 'pages:*'],
  VIEWER: ['products:read', 'categories:read', 'media:read', 'pages:read']
};
```

### Simplified Database Schema

**Remove Complex Tables:**
- PermissionCache → In-memory Map
- SecurityEvent → Simplified AuditLog
- ApiUsageLog → Remove unless needed
- BackupRestoreLog → Simplify backup process

**Consolidate Related Tables:**
- RoleChangeHistory → Merge with AuditLog
- SearchEvent → Remove analytics
- NotificationTemplate → Hardcode templates

## Error Handling

### Simplified Error Strategy

**Current State:** Complex error categorization with specialized handlers
**Target State:** Standard HTTP errors with basic logging

```typescript
// Simplified error handling
class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
  }
}
```

## Testing Strategy

### Consolidated Test Structure

**Current:** 120+ test files across 9 categories
**Target:** 40-50 focused test files across 3 categories

**New Structure:**
```
__tests__/
├── unit/           # Core business logic tests
├── integration/    # API and database tests  
└── e2e/           # Critical user workflows
```

**Remove Specialized Testing:**
- Performance tests (use production monitoring instead)
- Security penetration tests (use external tools)
- Regression test automation (manual QA process)

### Testing Dependencies to Remove

- `jest-mock-extended` → Use native Jest mocking
- Performance test runners → Remove specialized tooling
- Security test automation → Simplify to basic validation

## Implementation Phases

### Phase 1: Dependency Audit (Week 1)
1. Analyze actual usage of each dependency
2. Identify replacement strategies
3. Create migration plan for UI components

### Phase 2: UI Simplification (Week 2-3)
1. Replace Headless UI components with custom implementations
2. Consolidate icon usage
3. Remove unused UI dependencies

### Phase 3: Feature Simplification (Week 4-5)
1. Replace minisearch with database search
2. Simplify 2FA implementation
3. Remove Redis requirement for basic deployments

### Phase 4: Infrastructure Cleanup (Week 6-7)
1. Consolidate test structure
2. Simplify permission system
3. Reduce audit logging complexity

### Phase 5: Database Optimization (Week 8)
1. Remove unused tables
2. Simplify relationships
3. Update migrations

## Risk Assessment

**Low Risk:**
- UI component replacement (gradual migration possible)
- Test consolidation (maintains coverage)
- Dependency removal (fallback options available)

**Medium Risk:**
- Permission system simplification (requires careful testing)
- Database schema changes (needs migration strategy)

**High Risk:**
- Removing audit/security features (compliance considerations)

## Success Metrics

**Quantitative Goals:**
- Reduce dependencies from 45+ to 25-30
- Reduce test files from 120+ to 40-50
- Reduce database tables from 25+ to 15-18
- Improve build time by 30-40%
- Reduce bundle size by 20-25%

**Qualitative Goals:**
- Improved developer onboarding experience
- Reduced maintenance overhead
- Clearer code architecture
- Better long-term sustainability