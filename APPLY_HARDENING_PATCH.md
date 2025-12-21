# Apply Production Hardening Patch - Quick Guide

## ⚡ Quick Start (5 Minutes)

### Step 1: Apply Migrations

**Open Supabase Dashboard → SQL Editor**

Run these two migrations in order:

#### Migration 1: Fix Column Name
```sql
-- Copy from: supabase/migrations/002_fix_property_type_column.sql
ALTER TABLE loss_events
RENAME COLUMN property_type_new TO property_type;
```
✅ Wait for "Success. No rows returned"

#### Migration 2: Fix RLS Policies
```sql
-- Copy from: supabase/migrations/003_ensure_rls_policies.sql

-- Enable RLS
ALTER TABLE zip_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE loss_properties ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view zip demographics" ON zip_demographics;
DROP POLICY IF EXISTS "Ops and Admin can manage zip demographics" ON zip_demographics;
DROP POLICY IF EXISTS "Authenticated users can view loss properties" ON loss_properties;
DROP POLICY IF EXISTS "Ops and Admin can manage loss properties" ON loss_properties;

-- Create read policies
CREATE POLICY "read_zip_demographics"
ON zip_demographics FOR SELECT TO authenticated USING (true);

CREATE POLICY "read_loss_properties"
ON loss_properties FOR SELECT TO authenticated USING (true);

-- Create manage policies
CREATE POLICY "manage_zip_demographics"
ON zip_demographics FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ops', 'admin')));

CREATE POLICY "manage_loss_properties"
ON loss_properties FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ops', 'admin')));
```
✅ Wait for "Success. No rows returned"

---

### Step 2: Verify Migrations

Run this verification query:

```sql
-- Should return 'property_type' (NOT 'property_type_new')
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'loss_events' AND column_name = 'property_type';

-- Should return 4 policies
SELECT COUNT(*) FROM pg_policies 
WHERE tablename IN ('zip_demographics', 'loss_properties');
```

Expected results:
- First query: Returns `property_type`
- Second query: Returns `4`

---

### Step 3: Deploy Frontend

```bash
npm run build
netlify deploy --prod
```

---

### Step 4: Test in Production

1. **Login** to your Loss Locator Pro
2. **Navigate to Loss Feed** (`/loss-feed`)
3. **Verify:**
   - All loss events display
   - No permission errors in console
   - Filters work correctly
   - Missing enrichment data shows as "—"

---

## ✅ Success Indicators

You'll know the patch worked when:

1. ✅ No TypeScript errors
2. ✅ No "permission denied" errors in browser console
3. ✅ All loss events display in Loss Feed
4. ✅ Dashboard metrics show correct counts
5. ✅ Filters work without dropping records

---

## 🐛 If Something Goes Wrong

### Error: "column property_type_new does not exist"
**Fix:** Migration 1 didn't apply. Re-run it.

### Error: "permission denied for table zip_demographics"
**Fix:** Migration 2 didn't apply. Re-run it.

### Error: TypeScript errors
**Fix:** Restart dev server:
```bash
# Stop server (Ctrl+C)
npm run dev
```

---

## 📋 What Was Fixed

1. **Column Name Mismatch** - Database now uses `property_type` (not `property_type_new`)
2. **Safe Joins** - Loss events never dropped (LEFT JOINs verified)
3. **RLS Policies** - Authenticated users can read enrichment data

---

## 🚀 That's It!

Your Loss Locator Pro is now production-hardened and ready to deploy.

For detailed information, see `PRODUCTION_HARDENING_PATCH.md`.

