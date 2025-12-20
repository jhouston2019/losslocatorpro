# Canonical Database Type Import Path

## Date
December 18, 2025

## Purpose
Enforce a single canonical import path for the `Database` type across the entire codebase to ensure consistency and prevent type mismatches.

## Canonical Path

**All imports of `Database` and related types MUST use:**

```typescript
import type { Database } from '@/lib/database.types';
```

## Changes Applied

### Files Updated

#### 1. `lib/supabaseClient.ts`
**Before:**
```typescript
import type { Database } from './database.types';
```

**After:**
```typescript
import type { Database } from '@/lib/database.types';
```

#### 2. `lib/data.ts`
**Before:**
```typescript
import type {
  LossEvent,
  Property,
  RoutingQueueEntry,
  AdminSettings,
  TimelineEntry,
  Database,
} from './database.types';
```

**After:**
```typescript
import type {
  LossEvent,
  Property,
  RoutingQueueEntry,
  AdminSettings,
  TimelineEntry,
  Database,
} from '@/lib/database.types';
```

#### 3. `lib/auth.ts`
**Before:**
```typescript
import type { Database } from './database.types';
```

**After:**
```typescript
import type { Database } from '@/lib/database.types';
```

### Files Already Using Canonical Path

The following files were already using the correct canonical path:

- ✅ `app/components/Map.tsx`
- ✅ `app/(internal)/dashboard/page.tsx`
- ✅ `app/(internal)/loss-feed/page.tsx`
- ✅ `app/(internal)/lead-routing/page.tsx`
- ✅ `app/(internal)/admin/page.tsx`
- ✅ `app/(internal)/property/[id]/page.tsx`

## Benefits

### 1. Consistency
- Single import path across entire codebase
- No confusion about which path to use
- Easier code reviews

### 2. Type Safety
- Ensures all files reference the same `Database` type
- Prevents potential type mismatches from different import paths
- TypeScript can better optimize type checking

### 3. Maintainability
- If the file location changes, only the path alias needs updating
- Easier to refactor and reorganize code
- Clear convention for new developers

### 4. IDE Support
- Better autocomplete suggestions
- Consistent "Go to Definition" behavior
- Improved refactoring tools

## Import Path Comparison

### ❌ Deprecated Paths (Do Not Use)

```typescript
// Relative import - DO NOT USE
import type { Database } from './database.types';

// Alternative alias - DO NOT USE
import type { Database } from '@/lib/supabase.types';

// Direct relative - DO NOT USE
import type { Database } from '../lib/database.types';
```

### ✅ Canonical Path (Always Use)

```typescript
// Absolute import with path alias - ALWAYS USE
import type { Database } from '@/lib/database.types';
```

## Path Alias Configuration

The `@` alias is configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

This maps `@/lib/database.types` to `./lib/database.types` from the project root.

## Usage Examples

### Importing Database Type

```typescript
import type { Database } from '@/lib/database.types';

// Use for type derivation
type LossEventUpdate = Database['public']['Tables']['loss_events']['Update'];
```

### Importing Table Types

```typescript
import type { LossEvent, Property } from '@/lib/database.types';

// Use directly
function processLossEvent(event: LossEvent) {
  // ...
}
```

### Creating Typed Client

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

## Verification

### Check All Imports
```bash
# Should return only '@/lib/database.types'
grep -r "from.*database.types" --include="*.ts" --include="*.tsx"
```

### Expected Results
All imports should use the canonical path:
```
lib/supabaseClient.ts:import type { Database } from '@/lib/database.types';
lib/data.ts:} from '@/lib/database.types';
lib/auth.ts:import type { Database } from '@/lib/database.types';
app/components/Map.tsx:import type { LossEvent } from "@/lib/database.types";
app/(internal)/dashboard/page.tsx:import type { LossEvent } from '@/lib/database.types';
...
```

## Future Guidelines

### For New Files

When creating new files that need database types:

1. ✅ **Always use the canonical path:**
   ```typescript
   import type { Database } from '@/lib/database.types';
   ```

2. ✅ **Import specific types when needed:**
   ```typescript
   import type { LossEvent, Property } from '@/lib/database.types';
   ```

3. ❌ **Never use relative imports:**
   ```typescript
   // BAD - Don't do this
   import type { Database } from './database.types';
   import type { Database } from '../lib/database.types';
   ```

### For Code Reviews

Check that all new imports follow the canonical path pattern:
- ✅ All imports use `@/lib/database.types`
- ❌ No relative imports to `database.types`
- ❌ No alternative paths or aliases

## Type Safety Chain

With canonical imports, the type flow is clear and consistent:

```
lib/database.types.ts (source of truth)
    ↓
@/lib/database.types (canonical import path)
    ↓
lib/supabaseClient.ts (createClient<Database>)
    ↓
lib/data.ts (type derivations)
    ↓
app/ components (usage)
```

## Constraints Maintained

- ✅ TypeScript strict mode enabled
- ✅ No runtime behavior changes
- ✅ No type safety degradation
- ✅ All linter checks pass
- ✅ Backward compatible (path alias resolution)

## Summary

### Before
- Mixed import paths (relative and absolute)
- Inconsistent across lib/ and app/ directories
- Potential for confusion

### After
- Single canonical path: `@/lib/database.types`
- Consistent across entire codebase
- Clear convention for all developers

### Files Modified
- ✅ `lib/supabaseClient.ts`
- ✅ `lib/data.ts`
- ✅ `lib/auth.ts`

### Files Already Correct
- ✅ All `app/` directory files

---

**Status**: ✅ COMPLETE
**Canonical Path**: `@/lib/database.types`
**Consistency**: 100% across codebase
**Type Safety**: Fully maintained


