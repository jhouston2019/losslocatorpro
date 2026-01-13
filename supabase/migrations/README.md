# Loss Locator Pro - Database Migrations

## Migration 001: Intelligence & Enrichment Upgrade

**File:** `001_enrichment_upgrade.sql`

### Overview
This migration adds comprehensive intelligence and enrichment capabilities to Loss Locator Pro, including:
- State-by-state loss filtering
- ZIP code income demographics
- Property ownership information
- Phone number enrichment with confidence scoring
- Enhanced routing rules

### Changes

#### 1. Extended `loss_events` Table
- Added `state_code` column for state filtering
- Added `property_type_new` column with CHECK constraint ('residential', 'commercial')
- Added `is_commercial` computed column (GENERATED ALWAYS AS)
- Added indexes for efficient filtering

#### 2. New `zip_demographics` Table
- Stores ZIP code demographic data
- Fields: zip, state_code, median_household_income, per_capita_income, income_percentile, population
- Includes RLS policies for secure access
- Sample data included for testing

#### 3. New `loss_properties` Table
- Stores detailed property information per loss event
- Address information: address, city, state_code, zip
- Ownership information: owner_name, owner_type, mailing_address
- Phone enrichment: phone_primary, phone_secondary, phone_type, phone_confidence
- Foreign key to loss_events with CASCADE delete
- Includes RLS policies for secure access

#### 4. Extended `admin_settings` Table
- Added `min_income_percentile` (0-100)
- Added `min_phone_confidence` (0-100)
- Added `enable_residential_leads` (boolean)
- Added `phone_required_routing` (boolean)
- Added `commercial_only_routing` (boolean)

### How to Apply

#### Option 1: Using Supabase CLI
```bash
supabase db push
```

#### Option 2: Manual Application
1. Log into your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `001_enrichment_upgrade.sql`
4. Execute the migration

#### Option 3: Using psql
```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/001_enrichment_upgrade.sql
```

### Verification

After applying the migration, verify the changes:

```sql
-- Check new columns in loss_events
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'loss_events' 
  AND column_name IN ('state_code', 'property_type_new', 'is_commercial');

-- Check new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('zip_demographics', 'loss_properties');

-- Check admin_settings columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admin_settings' 
  AND column_name IN ('min_income_percentile', 'min_phone_confidence', 
                       'enable_residential_leads', 'phone_required_routing', 
                       'commercial_only_routing');

-- Verify sample data
SELECT COUNT(*) FROM zip_demographics;
```

### Rollback

If you need to rollback this migration:

```sql
-- Remove new columns from loss_events
ALTER TABLE loss_events DROP COLUMN IF EXISTS is_commercial;
ALTER TABLE loss_events DROP COLUMN IF EXISTS property_type_new;
ALTER TABLE loss_events DROP COLUMN IF EXISTS state_code;

-- Drop new tables
DROP TABLE IF EXISTS loss_properties CASCADE;
DROP TABLE IF EXISTS zip_demographics CASCADE;

-- Remove new columns from admin_settings
ALTER TABLE admin_settings DROP COLUMN IF EXISTS commercial_only_routing;
ALTER TABLE admin_settings DROP COLUMN IF EXISTS phone_required_routing;
ALTER TABLE admin_settings DROP COLUMN IF EXISTS enable_residential_leads;
ALTER TABLE admin_settings DROP COLUMN IF EXISTS min_phone_confidence;
ALTER TABLE admin_settings DROP COLUMN IF EXISTS min_income_percentile;

-- Drop indexes
DROP INDEX IF EXISTS idx_loss_events_is_commercial;
DROP INDEX IF EXISTS idx_loss_events_property_type;
DROP INDEX IF EXISTS idx_loss_events_state_code;
```

### Data Population

The migration includes sample ZIP demographic data for 10 major US cities. To add more demographic data:

```sql
INSERT INTO zip_demographics (zip, state_code, median_household_income, per_capita_income, income_percentile, population)
VALUES
  ('YOUR_ZIP', 'STATE', median_income, per_capita, percentile, population)
ON CONFLICT (zip) DO UPDATE SET
  state_code = EXCLUDED.state_code,
  median_household_income = EXCLUDED.median_household_income,
  per_capita_income = EXCLUDED.per_capita_income,
  income_percentile = EXCLUDED.income_percentile,
  population = EXCLUDED.population,
  updated_at = NOW();
```

### Notes

- The `property_type` column in `loss_events` is kept for backward compatibility
- The new `property_type_new` column uses proper constraints
- Phone numbers with confidence < 60% are masked in the UI for privacy
- All new tables have Row Level Security (RLS) enabled
- Triggers are in place to automatically update `updated_at` timestamps

### Support

For issues or questions about this migration, refer to:
- Main schema: `supabase/schema.sql`
- Type definitions: `lib/database.types.ts`
- Data access layer: `lib/data.ts`







