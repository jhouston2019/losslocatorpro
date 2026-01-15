# QUICK START: GEO AGGREGATION & ADDRESS RESOLUTION

**5-Minute Setup Guide**

---

## 🚀 IMMEDIATE STEPS

### 1. Deploy Database Migrations

```bash
# Connect to your Supabase project
psql $DATABASE_URL -f supabase/migrations/008_add_geo_aggregation.sql
psql $DATABASE_URL -f supabase/migrations/009_add_address_resolution.sql
```

**Or via Supabase Dashboard:**
1. Go to SQL Editor
2. Copy contents of `008_add_geo_aggregation.sql`
3. Run
4. Copy contents of `009_add_address_resolution.sql`
5. Run

### 2. Verify Installation

```bash
# Install tsx if needed
npm install -D tsx

# Run verification scripts
npx tsx verify-geo-aggregation.ts
npx tsx verify-address-resolution.ts
```

Expected output: All tests should pass ✅

### 3. Populate ZIP-County Crosswalk

**Option A: From existing data**
```sql
INSERT INTO zip_county_crosswalk (zip_code, county_fips, state_code)
SELECT DISTINCT zip, county_fips, state_code
FROM loss_events
WHERE zip IS NOT NULL 
  AND county_fips IS NOT NULL
  AND state_code IS NOT NULL
ON CONFLICT (zip_code, county_fips) DO NOTHING;
```

**Option B: Import HUD crosswalk**
Download from: https://www.huduser.gov/portal/datasets/usps_crosswalk.html

```sql
COPY zip_county_crosswalk (zip_code, county_fips, state_code, residential_ratio)
FROM '/path/to/crosswalk.csv' CSV HEADER;
```

### 4. Run Initial Geo Enrichment

**Via Netlify Function (after deploy):**
```bash
curl -X GET "https://your-site.netlify.app/.netlify/functions/enrich-geo-resolution?limit=100"
```

**Or via SQL:**
```sql
SELECT populate_geo_aggregates_for_event(id)
FROM loss_events
WHERE geo_resolution_level IS NULL
LIMIT 100;
```

### 5. Test the UI

1. Navigate to `/geo-opportunities`
2. You should see ZIP-level opportunity clusters
3. Click "Resolve Properties" on a high-confidence ZIP
4. Property candidates should appear (if source is configured)

---

## 📊 WHAT YOU GET

### New Page: Geo Opportunities

**URL:** `/geo-opportunities`

**Features:**
- ZIP-level opportunity clusters
- Filter by state, event type, probability
- "Resolve Properties" button per ZIP
- Property candidates display
- Compliance-safe language

### New Data Tables

1. **loss_geo_aggregates** - ZIP/county clusters
2. **loss_property_candidates** - Resolved addresses
3. **zip_county_crosswalk** - Geographic mapping
4. **address_resolution_log** - Audit trail
5. **address_resolution_settings** - Configuration

### New Functions

1. **enrich-geo-resolution** - Netlify function for geo enrichment
2. **resolve-addresses** - Netlify function for address resolution

### New Data Layers

1. **lib/geoAggregatesData.ts** - Query geo aggregates
2. **lib/propertyCandidatesData.ts** - Manage property candidates

---

## ⚙️ CONFIGURATION

### Resolution Settings

```sql
-- View current settings
SELECT * FROM address_resolution_settings;

-- Update thresholds
UPDATE address_resolution_settings
SET 
  auto_resolve_threshold = 0.70,  -- 70% claim probability
  min_event_count = 2,             -- At least 2 events
  max_properties_per_zip = 500,   -- Safety limit
  enable_auto_resolution = false,  -- Manual only (recommended)
  enable_user_triggered = true,    -- Allow user clicks
  enable_downstream_triggered = true;
```

### Scheduled Enrichment (Optional)

Add to `netlify.toml`:

```toml
[[plugins]]
  package = "@netlify/plugin-scheduled-functions"

[functions."enrich-geo-resolution"]
  schedule = "0 2 * * *"  # Daily at 2 AM
```

---

## 🔍 MONITORING

### Check Geo Aggregates

```sql
-- Total aggregates
SELECT COUNT(*) FROM loss_geo_aggregates;

-- By ZIP
SELECT 
  zip_code,
  COUNT(*) as event_count,
  AVG(claim_probability) as avg_prob
FROM loss_geo_aggregates
GROUP BY zip_code
ORDER BY avg_prob DESC
LIMIT 10;

-- High-confidence ZIPs
SELECT * FROM zip_clusters_ready_for_resolution
WHERE meets_threshold = true
LIMIT 10;
```

### Check Property Candidates

```sql
-- Total candidates
SELECT COUNT(*) FROM loss_property_candidates;

-- By status
SELECT status, COUNT(*) 
FROM loss_property_candidates
GROUP BY status;

-- Recent resolutions
SELECT * FROM address_resolution_log
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔧 COMMON TASKS

### Manually Trigger Geo Enrichment

```bash
curl -X GET "https://your-site.netlify.app/.netlify/functions/enrich-geo-resolution?limit=100"
```

### Manually Resolve a ZIP

```bash
curl -X POST "https://your-site.netlify.app/.netlify/functions/resolve-addresses" \
  -H "Content-Type: application/json" \
  -d '{
    "zipCode": "90210",
    "triggerType": "manual",
    "resolutionSource": "mock_source"
  }'
```

### Update Candidate Status

```sql
UPDATE loss_property_candidates
SET 
  status = 'reviewed',
  reviewed_at = NOW(),
  reviewed_by = 'user-uuid'
WHERE id = 'candidate-uuid';
```

### View Resolution History

```sql
SELECT 
  zip_code,
  trigger_type,
  properties_inserted,
  status,
  created_at
FROM address_resolution_log
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🐛 TROUBLESHOOTING

### No aggregates appearing?

1. Check if events have geo data:
   ```sql
   SELECT COUNT(*) FROM loss_events WHERE zip IS NOT NULL;
   ```

2. Check if crosswalk is populated:
   ```sql
   SELECT COUNT(*) FROM zip_county_crosswalk;
   ```

3. Run enrichment manually:
   ```bash
   curl -X GET "https://your-site.netlify.app/.netlify/functions/enrich-geo-resolution"
   ```

### Resolution fails?

1. Check logs:
   ```sql
   SELECT * FROM address_resolution_log WHERE status = 'failed' ORDER BY created_at DESC;
   ```

2. Check settings:
   ```sql
   SELECT * FROM address_resolution_settings;
   ```

3. Verify threshold:
   ```sql
   SELECT * FROM zip_clusters_ready_for_resolution WHERE meets_threshold = true;
   ```

### No ZIPs ready for resolution?

1. Lower threshold:
   ```sql
   UPDATE address_resolution_settings SET auto_resolve_threshold = 0.50;
   ```

2. Check aggregate probabilities:
   ```sql
   SELECT zip_code, AVG(claim_probability) as avg_prob
   FROM loss_geo_aggregates
   GROUP BY zip_code
   ORDER BY avg_prob DESC;
   ```

---

## 📚 NEXT STEPS

### Implement Real Address Source

Replace `MockAddressSource` in `netlify/functions/resolve-addresses.ts`:

```typescript
class RealAddressSource implements AddressResolutionSource {
  name = 'your_source';
  
  async resolveAddresses(zipCode: string, eventType?: string) {
    // 1. Call your address API
    const response = await fetch(`https://api.example.com/addresses?zip=${zipCode}`);
    const addresses = await response.json();
    
    // 2. Transform to PropertyCandidate[]
    return addresses.map(addr => ({
      address: addr.street,
      city: addr.city,
      propertyType: addr.type,
      estimatedClaimProbability: 0.5 // Will be adjusted by system
    }));
  }
}
```

### Add Dashboard Widgets

Use the stats functions:

```typescript
import { getGeoAggregateStats } from '@/lib/geoAggregatesData';
import { getCandidateStats } from '@/lib/propertyCandidatesData';

const geoStats = await getGeoAggregateStats(7); // Last 7 days
const candidateStats = await getCandidateStats();
```

### Enable Auto-Resolution (Optional)

```sql
UPDATE address_resolution_settings
SET enable_auto_resolution = true;
```

Then run a scheduled job to check for qualifying ZIPs.

---

## ✅ SUCCESS CRITERIA

You'll know it's working when:

1. ✅ Verification scripts pass
2. ✅ `/geo-opportunities` page loads
3. ✅ ZIP clusters appear in table
4. ✅ "Resolve Properties" button works
5. ✅ Resolution logs show attempts
6. ✅ Property candidates appear after resolution

---

## 📞 SUPPORT

For issues or questions:

1. Check `GEO_AGGREGATION_AND_ADDRESS_RESOLUTION_COMPLETE.md` for full details
2. Run verification scripts to diagnose
3. Check Supabase logs for errors
4. Review Netlify function logs

---

**That's it! You're ready to use ZIP/county aggregation and staged address resolution.**
