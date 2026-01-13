# Corrected Migration Steps - Deploy Now

## ✅ The Issue

Migration 2 tries to rename `property_type_new` to `property_type`, but that column doesn't exist because Migration 1 already created it with the correct name `property_type`.

## 🚀 Solution: Skip Migration 2

You only need to run **Migration 1** and **Migration 3**.

---

## Step 1: Run Migration 1 (Main Enrichment)

**Copy and paste this into Supabase SQL Editor:**

```sql
-- Loss Locator Pro - Intelligence & Enrichment Upgrade Migration
-- This migration adds state filtering, income demographics, property details,
-- ownership information, and phone enrichment capabilities

-- ============================================================================
-- STEP 1: Extend loss_events table
-- ============================================================================

-- Add state_code column
ALTER TABLE loss_events
ADD COLUMN IF NOT EXISTS state_code TEXT;

-- Add property_type with constraint (correct name from the start)
ALTER TABLE loss_events
ADD COLUMN IF NOT EXISTS property_type TEXT CHECK (property_type IN ('residential', 'commercial'));

-- Add is_commercial computed column
ALTER TABLE loss_events
ADD COLUMN IF NOT EXISTS is_commercial BOOLEAN GENERATED ALWAYS AS (property_type = 'commercial') STORED;

-- Create index for state filtering
CREATE INDEX IF NOT EXISTS idx_loss_events_state_code ON loss_events(state_code);

-- Create index for property type filtering
CREATE INDEX IF NOT EXISTS idx_loss_events_property_type ON loss_events(property_type);

-- Create index for is_commercial filtering
CREATE INDEX IF NOT EXISTS idx_loss_events_is_commercial ON loss_events(is_commercial);

-- ============================================================================
-- STEP 2: Create ZIP Demographics Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS zip_demographics (
  zip TEXT PRIMARY KEY,
  state_code TEXT NOT NULL,
  median_household_income INTEGER,
  per_capita_income INTEGER,
  income_percentile INTEGER CHECK (income_percentile >= 0 AND income_percentile <= 100),
  population INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_zip_demographics_state ON zip_demographics(state_code);
CREATE INDEX IF NOT EXISTS idx_zip_demographics_income_percentile ON zip_demographics(income_percentile DESC);

-- Enable RLS on zip_demographics
ALTER TABLE zip_demographics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create Property & Ownership Table (loss_properties)
-- ============================================================================

CREATE TABLE IF NOT EXISTS loss_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loss_id UUID REFERENCES loss_events(id) ON DELETE CASCADE,

  -- Address information
  address TEXT NOT NULL,
  city TEXT,
  state_code TEXT,
  zip TEXT,

  -- Ownership information
  owner_name TEXT,
  owner_type TEXT CHECK (owner_type IN ('individual', 'LLC', 'Corp', 'Trust', 'Other')),
  mailing_address TEXT,

  -- Phone enrichment
  phone_primary TEXT,
  phone_secondary TEXT,
  phone_type TEXT CHECK (phone_type IN ('mobile', 'landline', 'voip', 'unknown')),
  phone_confidence INTEGER CHECK (phone_confidence >= 0 AND phone_confidence <= 100),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_loss_properties_loss_id ON loss_properties(loss_id);
CREATE INDEX IF NOT EXISTS idx_loss_properties_state ON loss_properties(state_code);
CREATE INDEX IF NOT EXISTS idx_loss_properties_zip ON loss_properties(zip);
CREATE INDEX IF NOT EXISTS idx_loss_properties_phone_confidence ON loss_properties(phone_confidence DESC);

-- Enable RLS on loss_properties
ALTER TABLE loss_properties ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at on zip_demographics
CREATE TRIGGER update_zip_demographics_updated_at BEFORE UPDATE ON zip_demographics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on loss_properties
CREATE TRIGGER update_loss_properties_updated_at BEFORE UPDATE ON loss_properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 4: Extend admin_settings for new thresholds
-- ============================================================================

-- Add new admin settings columns
ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS min_income_percentile INTEGER DEFAULT 0 CHECK (min_income_percentile >= 0 AND min_income_percentile <= 100);

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS min_phone_confidence INTEGER DEFAULT 0 CHECK (min_phone_confidence >= 0 AND min_phone_confidence <= 100);

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS enable_residential_leads BOOLEAN DEFAULT true;

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS phone_required_routing BOOLEAN DEFAULT false;

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS commercial_only_routing BOOLEAN DEFAULT false;

-- ============================================================================
-- STEP 5: Sample data for ZIP demographics (for testing)
-- ============================================================================

-- Insert sample ZIP demographics data
INSERT INTO zip_demographics (zip, state_code, median_household_income, per_capita_income, income_percentile, population)
VALUES
  ('10001', 'NY', 120000, 85000, 95, 25000),
  ('90210', 'CA', 150000, 105000, 98, 35000),
  ('60601', 'IL', 95000, 68000, 85, 45000),
  ('33139', 'FL', 110000, 78000, 90, 30000),
  ('75201', 'TX', 88000, 62000, 75, 40000),
  ('98101', 'WA', 105000, 75000, 88, 38000),
  ('02108', 'MA', 115000, 82000, 92, 32000),
  ('30303', 'GA', 78000, 55000, 65, 42000),
  ('85001', 'AZ', 72000, 51000, 60, 48000),
  ('80202', 'CO', 98000, 70000, 82, 36000)
ON CONFLICT (zip) DO UPDATE SET
  state_code = EXCLUDED.state_code,
  median_household_income = EXCLUDED.median_household_income,
  per_capita_income = EXCLUDED.per_capita_income,
  income_percentile = EXCLUDED.income_percentile,
  population = EXCLUDED.population,
  updated_at = NOW();

-- ============================================================================
-- STEP 6: Update existing admin_settings record with new defaults
-- ============================================================================

UPDATE admin_settings
SET
  min_income_percentile = 0,
  min_phone_confidence = 0,
  enable_residential_leads = true,
  phone_required_routing = false,
  commercial_only_routing = false
WHERE min_income_percentile IS NULL;
```

**Click "Run"** ✅

---

## Step 2: Skip Migration 2 ⏭️

**DO NOT RUN Migration 2** - it's not needed since `property_type` is already correctly named.

---

## Step 3: Run Migration 3 (RLS Policies)

**Copy and paste this into Supabase SQL Editor:**

```sql
-- Loss Locator Pro - Production Hardening Patch
-- Fix 3: Ensure RLS policies are properly configured for enrichment tables

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE zip_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE loss_properties ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES (if any conflicts exist)
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view zip demographics" ON zip_demographics;
DROP POLICY IF EXISTS "Ops and Admin can manage zip demographics" ON zip_demographics;
DROP POLICY IF EXISTS "Authenticated users can view loss properties" ON loss_properties;
DROP POLICY IF EXISTS "Ops and Admin can manage loss properties" ON loss_properties;
DROP POLICY IF EXISTS "read_zip_demographics" ON zip_demographics;
DROP POLICY IF EXISTS "manage_zip_demographics" ON zip_demographics;
DROP POLICY IF EXISTS "read_loss_properties" ON loss_properties;
DROP POLICY IF EXISTS "manage_loss_properties" ON loss_properties;

-- ============================================================================
-- CREATE READ-ONLY POLICIES FOR AUTHENTICATED USERS
-- ============================================================================

-- ZIP Demographics - Read access for all authenticated users
CREATE POLICY "read_zip_demographics"
ON zip_demographics
FOR SELECT
TO authenticated
USING (true);

-- ZIP Demographics - Full access for ops and admin
CREATE POLICY "manage_zip_demographics"
ON zip_demographics
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('ops', 'admin')
  )
);

-- Loss Properties - Read access for all authenticated users
CREATE POLICY "read_loss_properties"
ON loss_properties
FOR SELECT
TO authenticated
USING (true);

-- Loss Properties - Full access for ops and admin
CREATE POLICY "manage_loss_properties"
ON loss_properties
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('ops', 'admin')
  )
);
```

**Click "Run"** ✅

---

## Step 4: Verify Everything Worked

**Run this verification query:**

```sql
-- Verify all changes were applied correctly

-- 1. Check property_type column exists (NOT property_type_new)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'loss_events' 
  AND column_name IN ('state_code', 'property_type', 'is_commercial')
ORDER BY column_name;
-- Expected: 3 rows (is_commercial, property_type, state_code)

-- 2. Check new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('zip_demographics', 'loss_properties')
ORDER BY table_name;
-- Expected: 2 rows (loss_properties, zip_demographics)

-- 3. Check sample data was inserted
SELECT COUNT(*) as zip_count FROM zip_demographics;
-- Expected: 10

-- 4. Check RLS policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('zip_demographics', 'loss_properties')
ORDER BY tablename, policyname;
-- Expected: 4 rows (2 per table)

-- 5. Check admin_settings columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'admin_settings' 
  AND column_name IN ('min_income_percentile', 'min_phone_confidence', 
                       'enable_residential_leads', 'phone_required_routing', 
                       'commercial_only_routing')
ORDER BY column_name;
-- Expected: 5 rows
```

---

## ✅ Expected Results

If everything worked correctly, you should see:

1. **3 columns** in loss_events: `is_commercial`, `property_type`, `state_code`
2. **2 new tables**: `loss_properties`, `zip_demographics`
3. **10 ZIP codes** in sample data
4. **4 RLS policies**: 2 for each enrichment table
5. **5 new columns** in admin_settings

---

## 🎉 Done!

Your database is now fully upgraded with enrichment capabilities!

**Next step:** Test your application - the Dashboard, Loss Feed, and Lead Routing should all show the new enrichment features.







