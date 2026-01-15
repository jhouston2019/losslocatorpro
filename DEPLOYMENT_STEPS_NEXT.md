# NEXT STEPS: DEPLOYMENT & VERIFICATION

**Status:** Implementation Complete ✅ | Ready for Deployment 🚀

---

## 🎯 IMMEDIATE ACTION ITEMS

### 1. Deploy Database Migrations (15 minutes)

**Option A: Via Supabase Dashboard (Recommended)**
```
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Open and run: supabase/migrations/008_add_geo_aggregation.sql
4. Open and run: supabase/migrations/009_add_address_resolution.sql
5. Verify tables were created
```

**Option B: Via Supabase CLI**
```bash
# If you have Supabase CLI installed
supabase db push

# Or via psql
psql $DATABASE_URL -f supabase/migrations/008_add_geo_aggregation.sql
psql $DATABASE_URL -f supabase/migrations/009_add_address_resolution.sql
```

**What This Creates:**
- ✅ 5 new tables (loss_geo_aggregates, loss_property_candidates, etc.)
- ✅ 2 aggregate views (loss_opportunities_by_zip, loss_opportunities_by_county)
- ✅ Helper functions for geo resolution
- ✅ RLS policies for security
- ✅ Indexes for performance

---

### 2. Verify Installation (5 minutes)

```bash
# Run verification scripts
npx tsx verify-geo-aggregation.ts
npx tsx verify-address-resolution.ts
```

**Expected Output:**
- All tests should pass ✅
- Tables should exist
- Views should be queryable
- Functions should be callable

---

### 3. Populate ZIP-County Crosswalk (10 minutes)

**Option A: Use Sample Data (Quick Test)**
```bash
npx tsx scripts/populate-crosswalk.ts
```
This loads sample data for major US cities.

**Option B: Import Full HUD Crosswalk (Production)**
```
1. Download: https://www.huduser.gov/portal/datasets/usps_crosswalk.html
2. Import via SQL:
   COPY zip_county_crosswalk (zip_code, county_fips, state_code, residential_ratio)
   FROM '/path/to/crosswalk.csv' CSV HEADER;
```

**Option C: From Existing Data**
```sql
INSERT INTO zip_county_crosswalk (zip_code, county_fips, state_code)
SELECT DISTINCT zip, county_fips, state_code
FROM loss_events
WHERE zip IS NOT NULL AND county_fips IS NOT NULL
ON CONFLICT (zip_code, county_fips) DO NOTHING;
```

---

### 4. Run Initial Geo Enrichment (10 minutes)

**After deploying Netlify functions:**
```bash
# Enrich first 100 events
curl -X GET "https://your-site.netlify.app/.netlify/functions/enrich-geo-resolution?limit=100"
```

**Or via SQL:**
```sql
-- Populate aggregates for existing events
SELECT populate_geo_aggregates_for_event(id)
FROM loss_events
WHERE geo_resolution_level IS NULL
LIMIT 100;
```

**What This Does:**
- Resolves events to counties and ZIPs
- Creates geo aggregates
- Updates loss_events with resolution metadata

---

### 5. Test the UI (5 minutes)

```
1. Navigate to: /geo-opportunities
2. You should see ZIP-level opportunity clusters
3. Try filtering by state, event type, probability
4. Click "Resolve Properties" on a high-confidence ZIP
5. Verify compliance language is displayed
```

---

## 📋 DEPLOYMENT CHECKLIST

### Database
- [ ] Run migration 008_add_geo_aggregation.sql
- [ ] Run migration 009_add_address_resolution.sql
- [ ] Verify tables exist (run verification script)
- [ ] Populate zip_county_crosswalk

### Netlify Functions
- [ ] Functions are already in repo (auto-deploy on push)
- [ ] Verify environment variables are set:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
- [ ] Test enrich-geo-resolution endpoint
- [ ] Test resolve-addresses endpoint

### Frontend
- [ ] Already deployed (pushed to GitHub)
- [ ] Verify /geo-opportunities page loads
- [ ] Test filters and sorting
- [ ] Test "Resolve Properties" button

### Data Population
- [ ] Populate crosswalk data
- [ ] Run initial geo enrichment
- [ ] Verify aggregates are created
- [ ] Check aggregate views have data

### Verification
- [ ] Run verify-geo-aggregation.ts ✅
- [ ] Run verify-address-resolution.ts ✅
- [ ] Check Supabase logs for errors
- [ ] Check Netlify function logs

---

## 🔧 CONFIGURATION

### Resolution Settings

After deployment, configure thresholds:

```sql
-- View current settings
SELECT * FROM address_resolution_settings;

-- Update if needed
UPDATE address_resolution_settings
SET 
  auto_resolve_threshold = 0.70,  -- 70% claim probability
  min_event_count = 2,             -- At least 2 events
  enable_auto_resolution = false,  -- Keep manual for now
  enable_user_triggered = true;
```

---

## 🐛 TROUBLESHOOTING

### Issue: Migrations fail

**Check:**
- Are you connected to the right database?
- Do you have admin permissions?
- Are there conflicting table names?

**Fix:**
```sql
-- Check if tables already exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'loss_%';
```

### Issue: No aggregates created

**Check:**
```sql
-- Do events have geo data?
SELECT COUNT(*) FROM loss_events WHERE zip IS NOT NULL;

-- Is crosswalk populated?
SELECT COUNT(*) FROM zip_county_crosswalk;
```

**Fix:**
- Populate crosswalk first
- Then run geo enrichment

### Issue: Netlify functions not working

**Check:**
- Environment variables set in Netlify dashboard
- Function logs in Netlify dashboard
- CORS settings if calling from frontend

---

## 📊 MONITORING QUERIES

### Check Geo Aggregates
```sql
-- Total aggregates
SELECT COUNT(*) FROM loss_geo_aggregates;

-- By ZIP
SELECT zip_code, COUNT(*) as event_count, AVG(claim_probability) as avg_prob
FROM loss_geo_aggregates
GROUP BY zip_code
ORDER BY avg_prob DESC
LIMIT 10;

-- High-confidence ZIPs
SELECT * FROM zip_clusters_ready_for_resolution
WHERE meets_threshold = true;
```

### Check Property Candidates
```sql
-- Total candidates
SELECT COUNT(*) FROM loss_property_candidates;

-- By status
SELECT status, COUNT(*) FROM loss_property_candidates GROUP BY status;

-- Recent resolutions
SELECT * FROM address_resolution_log ORDER BY created_at DESC LIMIT 10;
```

---

## 🎉 SUCCESS CRITERIA

You'll know it's working when:

1. ✅ Verification scripts pass
2. ✅ `/geo-opportunities` page loads with data
3. ✅ ZIP clusters appear in table
4. ✅ Filters work correctly
5. ✅ "Resolve Properties" button triggers resolution
6. ✅ Resolution logs show attempts
7. ✅ Compliance warnings are visible

---

## 📚 DOCUMENTATION REFERENCE

- **Full Guide:** `GEO_AGGREGATION_AND_ADDRESS_RESOLUTION_COMPLETE.md`
- **Quick Start:** `QUICK_START_GEO_AGGREGATION.md`
- **This File:** `DEPLOYMENT_STEPS_NEXT.md`

---

## 🚀 READY TO DEPLOY?

**Start with Step 1:** Deploy the database migrations via Supabase Dashboard.

**Need help?** All commands and SQL are provided above. Just copy and paste!

**Questions?** Check the troubleshooting section or the full documentation.

---

**Last Updated:** January 15, 2026  
**Implementation Status:** Complete ✅  
**Deployment Status:** Pending 🚀
