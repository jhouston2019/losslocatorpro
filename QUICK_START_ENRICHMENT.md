# Loss Locator Pro - Enrichment Upgrade Quick Start

## 🚀 Quick Start Guide

### 1. Apply Database Migration (Required)

**Using Supabase Dashboard (Recommended):**

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of:
   ```
   supabase/migrations/001_enrichment_upgrade.sql
   ```
5. Click **Run** or press `Ctrl+Enter`
6. Wait for "Success. No rows returned" message

**Using Supabase CLI (Alternative):**

```bash
cd "D:\Axis\Axis Projects - Projects\Projects - Stage 1\loss locator pro"
supabase db push
```

### 2. Verify Migration

Run this query in Supabase SQL Editor:

```sql
-- Should return 3 rows
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'loss_events' 
AND column_name IN ('state_code', 'property_type_new', 'is_commercial');

-- Should return 2 rows
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('zip_demographics', 'loss_properties');

-- Should return 10 (sample data)
SELECT COUNT(*) FROM zip_demographics;
```

### 3. Deploy Frontend

**Local Development:**
```bash
npm run dev
```

**Production (Netlify):**
```bash
npm run build
netlify deploy --prod
```

### 4. Test New Features

#### Dashboard
1. Navigate to `/dashboard`
2. Look for new "Dashboard Filters" section
3. Test filters:
   - Select a state (NY, CA, IL, FL, TX, WA, MA, GA, AZ, CO)
   - Change property type to "Commercial"
   - Set min income percentile to 90
   - Toggle phone filters
4. Observe metrics update in real-time

#### Loss Feed
1. Navigate to `/loss-feed`
2. New columns visible:
   - State
   - Address
   - Owner
   - Property Type (with badges)
   - Income %ile (with color badges)
   - Phone (with confidence)
3. Test new filters in the filter section
4. Notice phone numbers masked if confidence < 60%

#### Lead Routing
1. Navigate to `/lead-routing`
2. New columns visible:
   - Owner
   - Type (badges)
   - Income %ile (badges)
   - Phone (with confidence)
3. Test new filters:
   - Check "Commercial properties only"
   - Check "Phone number required"
4. Observe filtered results

#### Admin
1. Navigate to `/admin`
2. Scroll to "Threshold settings"
3. New fields visible:
   - Minimum income percentile
   - Minimum phone confidence
4. Scroll to "Enhanced Routing Rules" section
5. New checkboxes visible:
   - Enable residential leads
   - Only route commercial properties
   - Require phone number
6. Update values and click "Save Threshold Settings"

---

## 📊 Sample Data Included

The migration includes sample demographic data for these ZIPs:

| ZIP   | State | City      | Income %ile |
|-------|-------|-----------|-------------|
| 10001 | NY    | New York  | 95          |
| 90210 | CA    | Beverly Hills | 98      |
| 60601 | IL    | Chicago   | 85          |
| 33139 | FL    | Miami Beach | 90        |
| 75201 | TX    | Dallas    | 75          |
| 98101 | WA    | Seattle   | 88          |
| 02108 | MA    | Boston    | 92          |
| 30303 | GA    | Atlanta   | 65          |
| 85001 | AZ    | Phoenix   | 60          |
| 80202 | CO    | Denver    | 82          |

---

## 🧪 Testing Scenarios

### Scenario 1: Filter by High-Income Areas
1. Go to Dashboard
2. Set "Min Income Percentile" to 90
3. Verify only high-income ZIPs show (10001, 90210, 33139, 02108)

### Scenario 2: Commercial Properties Only
1. Go to Lead Routing
2. Check "Commercial properties only"
3. Verify only commercial properties show

### Scenario 3: Phone Required Routing
1. Go to Admin
2. Set "Minimum phone confidence" to 70
3. Check "Require phone number..."
4. Save settings
5. Go to Lead Routing
6. Verify only leads with phone confidence ≥ 70% show

### Scenario 4: State Filtering
1. Go to Loss Feed
2. Select "NY" from State filter
3. Verify only New York losses show

---

## 🔧 Troubleshooting

### Issue: No states showing in dropdown
**Solution:** Run this query to verify demographic data:
```sql
SELECT DISTINCT state_code FROM zip_demographics ORDER BY state_code;
```
Should return 10 states. If empty, re-run the migration.

### Issue: Phone numbers not showing
**Solution:** Loss properties need to be created. Sample query:
```sql
INSERT INTO loss_properties (loss_id, address, city, state_code, zip, owner_name, phone_primary, phone_confidence)
SELECT 
  id,
  '123 Main St',
  'New York',
  'NY',
  zip,
  'John Doe',
  '555-123-4567',
  85
FROM loss_events
LIMIT 5;
```

### Issue: TypeScript errors
**Solution:** Restart the dev server:
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Issue: Filters not working
**Solution:** 
1. Check browser console for errors
2. Verify migration was applied successfully
3. Clear browser cache and reload

---

## 📝 Adding More Data

### Add More ZIP Demographics

```sql
INSERT INTO zip_demographics (zip, state_code, median_household_income, per_capita_income, income_percentile, population)
VALUES
  ('YOUR_ZIP', 'STATE', 75000, 50000, 70, 25000)
ON CONFLICT (zip) DO UPDATE SET
  median_household_income = EXCLUDED.median_household_income,
  per_capita_income = EXCLUDED.per_capita_income,
  income_percentile = EXCLUDED.income_percentile,
  population = EXCLUDED.population,
  updated_at = NOW();
```

### Add Loss Property Data

```sql
INSERT INTO loss_properties (
  loss_id, 
  address, 
  city, 
  state_code, 
  zip, 
  owner_name, 
  owner_type,
  phone_primary, 
  phone_confidence
)
VALUES (
  'LOSS_EVENT_UUID',
  '456 Oak Avenue',
  'Los Angeles',
  'CA',
  '90001',
  'Jane Smith',
  'individual',
  '555-987-6543',
  92
);
```

### Update Loss Event with State and Property Type

```sql
UPDATE loss_events
SET 
  state_code = 'CA',
  property_type_new = 'residential'
WHERE zip = '90001';
```

---

## 🎯 Key Features Summary

### Dashboard
- **5 new filters:** State, Property Type, Income Percentile, Has Phone, Phone Confidence
- **Real-time updates:** Metrics recalculate on filter change
- **Smart defaults:** All filters default to "All" (no filtering)

### Loss Feed
- **7 new columns:** State, Address, Owner, Property Type, Income %ile, Phone, Phone Confidence
- **9 total filters:** Including all new enrichment filters
- **Privacy protection:** Phone numbers masked if confidence < 60%
- **Visual indicators:** Color-coded badges for income and property type

### Lead Routing
- **Enhanced display:** Shows owner, property type, income, phone
- **Smart filtering:** Commercial-only and phone-required options
- **Priority scoring:** Includes enrichment factors
- **Async loading:** Enrichment data loaded efficiently

### Admin
- **5 new settings:** Income threshold, phone confidence, residential toggle, commercial-only, phone-required
- **Unified save:** All settings save together
- **Clear labels:** Descriptive text for each setting

---

## ✅ Success Indicators

You'll know the upgrade is working when:

1. ✅ Dashboard shows new filter section with 5 filters
2. ✅ State dropdown shows 10 states (NY, CA, IL, FL, TX, WA, MA, GA, AZ, CO)
3. ✅ Loss Feed shows 12 columns (was 10)
4. ✅ Lead Routing shows enrichment data (owner, phone, income)
5. ✅ Admin shows "Enhanced Routing Rules" section
6. ✅ No TypeScript or console errors
7. ✅ All pages load without breaking

---

## 📞 Support

If you encounter issues:

1. Check `ENRICHMENT_UPGRADE_SUMMARY.md` for detailed documentation
2. Review `supabase/migrations/README.md` for migration details
3. Check browser console for JavaScript errors
4. Verify migration was applied successfully in Supabase

---

## 🎉 You're Ready!

Your Loss Locator Pro now has full intelligence and enrichment capabilities. Start by applying the migration, then explore the new features in each section of the app.

Happy routing! 🚀

