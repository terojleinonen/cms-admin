# Import Path Mapping Guide

## Correct Import Patterns

### Use absolute imports with @ prefix:
```typescript
// ✅ Correct
import { prisma } from '@/lib/db'
import Button from '@/components/ui/Button'
import { UserRole } from '@prisma/client'

// ❌ Avoid relative imports
import { prisma } from '../../app/lib/db'
import Button from '../../../app/components/ui/Button'
```

### Path Mappings:
- `@/*` → `./app/*`
- `@/lib/*` → `./app/lib/*`
- `@/components/*` → `./app/components/*`
- `@/api/*` → `./app/api/*`

### Common Import Paths:
```typescript
// Database
import { prisma } from '@/lib/db'
import { prisma } from '@/lib/prisma'

// Auth
import { authOptions } from '@/lib/auth-config'
import { hashPassword } from '@/lib/auth-utils'

// Components
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

// Types
import { UserRole } from '@prisma/client'
import type { User } from '@/lib/types'
```

## Manual Fix Instructions

1. Replace relative imports with absolute imports
2. Use consistent path prefixes
3. Update test files to use new paths
4. Run `npm run type-check` to verify
