# NOAA Live Data Ingestion - Deployment Checklist

## 📋 Pre-Deployment Verification

### ✅ Files Created/Modified

- [x] `supabase/migrations/004_add_ingestion_fields.sql` - Database migration
- [x] `supabase/schema.sql` - Updated schema with ingestion fields
- [x] `netlify/functions/ingest-noaa-events.ts` - Ingestion function
- [x] `netlify.toml` - Scheduled function configuration
- [x] `lib/database.types.ts` - Updated TypeScript types
- [x] `NOAA_INGESTION_DEPLOYMENT.md` - Full deployment guide
- [x] `NOAA_QUICK_START.md` - Quick start guide
- [x] `IMPLEMENTATION_SUMMARY.md` - Implementation summary
- [x] `DEPLOYMENT_CHECKLIST.md` - This checklist

### ✅ Code Quality Checks

- [x] No linter errors
- [x] TypeScript types updated
- [x] No breaking changes
- [x] No UI modifications
- [x] No refactoring of existing logic
- [x] Backward compatible

## 🚀 Deployment Steps

### Step 1: Database Migration

**Action:** Deploy migration to Supabase

```bash
# Option A: Using Supabase CLI
supabase migration up

# Option B: Manual via SQL Editor
# 1. Open Supabase Dashboard → SQL Editor
# 2. Copy contents of supabase/migrations/004_add_ingestion_fields.sql
# 3. Paste and execute
```

**Verification:**
```sql
-- Run in Supabase SQL Editor
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'loss_events' 
AND column_name IN ('source', 'source_event_id', 'latitude', 'longitude');

-- Should return 4 rows
```

**Status:** [ ] Complete

---

### Step 2: Environment Variables

**Action:** Add service role key to Netlify

1. Go to Netlify Dashboard
2. Navigate to: Site Settings → Environment Variables
3. Click "Add a variable"
4. Add:
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** [Your service role key from Supabase]
   - **Scopes:** All scopes

**Where to find service role key:**
- Supabase Dashboard → Project Settings → API
- Look for "service_role" key (NOT anon key)
- Copy the entire key

**Verification:**
```bash
# List environment variables
netlify env:list

# Should show:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY (new)
```

**Status:** [ ] Complete

---

### Step 3: Code Deployment

**Action:** Deploy to Netlify

```bash
# Commit all changes
git add .
git commit -m "feat: Add NOAA live data ingestion (Phase 1)"

# Push to repository
git push origin main
```

**Netlify will automatically:**
- Build the application
- Deploy the function
- Configure scheduled execution

**Verification:**
- Check Netlify deploy logs for success
- Verify build completes without errors

**Status:** [ ] Complete

---

### Step 4: Function Verification

**Action:** Verify scheduled function is active

1. Go to Netlify Dashboard → Functions
2. Find `ingest-noaa-events` in the list
3. Verify it shows "Scheduled" badge
4. Click to view details
5. Check schedule: `*/15 * * * *`

**Manual Test (Optional):**
```bash
# Test function manually
netlify functions:invoke ingest-noaa-events

# Expected response:
# {
#   "success": true,
#   "inserted": X,
#   "skipped": Y,
#   "errors": 0,
#   "total": Z,
#   "duration": XXXX
# }
```

**Status:** [ ] Complete

---

### Step 5: Data Verification

**Action:** Verify events are being ingested

**Wait 15-20 minutes after deployment**, then run:

```sql
-- Check for NOAA events
SELECT 
  COUNT(*) as total_events,
  MAX(created_at) as last_ingestion,
  COUNT(DISTINCT state_code) as states_affected
FROM loss_events
WHERE source = 'NOAA';

-- Should show:
-- total_events: > 0
-- last_ingestion: Recent timestamp
-- states_affected: Multiple states
```

**View Recent Events:**
```sql
SELECT 
  id,
  event_type,
  severity,
  zip,
  state_code,
  claim_probability,
  source_event_id,
  created_at
FROM loss_events
WHERE source = 'NOAA'
ORDER BY created_at DESC
LIMIT 10;
```

**Status:** [ ] Complete

---

### Step 6: UI Verification

**Action:** Verify UI displays ingested data

**Loss Feed Page (`/loss-feed`):**
- [ ] Events are visible
- [ ] State filter works
- [ ] Severity scores display
- [ ] Timestamps are correct
- [ ] No UI errors

**Dashboard (`/dashboard`):**
- [ ] Total events count updated
- [ ] State distribution shows data
- [ ] Recent events appear
- [ ] Charts/metrics update

**Lead Routing (`/lead-routing`):**
- [ ] Routing queue populates
- [ ] High-severity events prioritized
- [ ] Admin thresholds apply

**Status:** [ ] Complete

---

### Step 7: Function Logs Review

**Action:** Check function execution logs

```bash
# View function logs
netlify functions:log ingest-noaa-events

# Or via Netlify Dashboard:
# Functions → ingest-noaa-events → Logs
```

**Look for:**
- ✅ `🌩️ Starting NOAA severe weather ingestion...`
- ✅ `📡 Fetching NOAA data...`
- ✅ `📊 Found X events to process`
- ✅ `✅ Inserted event: [id]...`
- ✅ `🎉 Ingestion complete: { inserted: X, skipped: Y, errors: 0 }`

**Red flags:**
- ❌ `❌ Fatal error during ingestion`
- ❌ `Failed to fetch NOAA data`
- ❌ High error counts

**Status:** [ ] Complete

---

## 🧪 Post-Deployment Testing

### Test 1: Duplicate Prevention

**Action:** Verify duplicates are prevented

```sql
-- Check for duplicate source_event_ids
SELECT source_event_id, COUNT(*) as count
FROM loss_events
WHERE source = 'NOAA'
GROUP BY source_event_id
HAVING COUNT(*) > 1;

-- Should return 0 rows (no duplicates)
```

**Status:** [ ] Pass

---

### Test 2: Data Quality

**Action:** Verify data quality

```sql
-- Check for required fields
SELECT 
  COUNT(*) as total,
  COUNT(zip) as with_zip,
  COUNT(state_code) as with_state,
  COUNT(severity) as with_severity,
  COUNT(claim_probability) as with_probability
FROM loss_events
WHERE source = 'NOAA';

-- All counts should be equal (no nulls in required fields)
```

**Status:** [ ] Pass

---

### Test 3: Severity Calculation

**Action:** Verify severity scores are reasonable

```sql
-- Check severity distribution
SELECT 
  CASE 
    WHEN severity >= 0.8 THEN 'High (0.8-1.0)'
    WHEN severity >= 0.6 THEN 'Medium (0.6-0.8)'
    WHEN severity >= 0.4 THEN 'Low (0.4-0.6)'
    ELSE 'Very Low (<0.4)'
  END as severity_range,
  COUNT(*) as count,
  ROUND(AVG(claim_probability)::numeric, 2) as avg_claim_prob
FROM loss_events
WHERE source = 'NOAA'
GROUP BY severity_range
ORDER BY severity_range;

-- Should show reasonable distribution
```

**Status:** [ ] Pass

---

### Test 4: Geographic Coverage

**Action:** Verify geographic data is correct

```sql
-- Check state coverage
SELECT 
  state_code,
  COUNT(*) as events,
  AVG(severity) as avg_severity
FROM loss_events
WHERE source = 'NOAA'
GROUP BY state_code
ORDER BY events DESC
LIMIT 10;

-- Should show multiple states with events
```

**Status:** [ ] Pass

---

### Test 5: Scheduled Execution

**Action:** Verify function runs every 15 minutes

**Wait 30 minutes**, then check:

```sql
-- Check ingestion timestamps
SELECT 
  DATE_TRUNC('minute', created_at) as ingestion_time,
  COUNT(*) as events_ingested
FROM loss_events
WHERE source = 'NOAA'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY ingestion_time DESC;

-- Should show multiple ingestion times ~15 minutes apart
```

**Status:** [ ] Pass

---

## 🎯 Success Criteria

All items below must be ✅ to consider deployment successful:

### Database
- [ ] Migration 004 applied successfully
- [ ] New columns exist in loss_events table
- [ ] Unique index prevents duplicates
- [ ] No database errors

### Function
- [ ] Function deployed to Netlify
- [ ] Shows "Scheduled" badge
- [ ] Executes every 15 minutes
- [ ] Logs show successful execution
- [ ] No fatal errors in logs

### Data
- [ ] Events are being ingested
- [ ] No duplicate events
- [ ] ZIP codes are populated
- [ ] State codes are populated
- [ ] Severity scores are reasonable
- [ ] Claim probabilities are calculated

### UI
- [ ] Loss Feed shows new events
- [ ] State filters work correctly
- [ ] Dashboard updates automatically
- [ ] Routing queue populates
- [ ] No UI errors or regressions

### System
- [ ] No breaking changes
- [ ] Existing functionality intact
- [ ] Performance is acceptable
- [ ] No security issues

## 🐛 Troubleshooting

### Issue: Migration Fails

**Symptoms:** SQL errors when running migration

**Solutions:**
1. Check if columns already exist
2. Verify Supabase connection
3. Check for conflicting indexes
4. Review migration syntax

**Recovery:**
```sql
-- Check existing columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'loss_events';

-- If columns exist, migration may have already run
```

---

### Issue: Function Not Scheduled

**Symptoms:** No "Scheduled" badge in Netlify

**Solutions:**
1. Verify netlify.toml syntax
2. Check function name matches
3. Redeploy site
4. Check Netlify build logs

**Recovery:**
```bash
# Redeploy
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

---

### Issue: No Events Ingested

**Symptoms:** Zero events in database after 30 minutes

**Solutions:**
1. Check function logs for errors
2. Verify service role key is set
3. Test NOAA feed accessibility
4. Check database permissions

**Recovery:**
```bash
# Test function manually
netlify functions:invoke ingest-noaa-events

# Check logs
netlify functions:log ingest-noaa-events
```

---

### Issue: Duplicate Events

**Symptoms:** Same event appears multiple times

**Solutions:**
1. Verify unique index exists
2. Check index definition
3. Review UPSERT logic

**Recovery:**
```sql
-- Check for unique index
SELECT * FROM pg_indexes 
WHERE tablename = 'loss_events' 
AND indexname = 'idx_unique_source_event';

-- If missing, create it
CREATE UNIQUE INDEX idx_unique_source_event 
ON loss_events (source, source_event_id)
WHERE source IS NOT NULL AND source_event_id IS NOT NULL;
```

---

## 📞 Support Resources

### Documentation
- `NOAA_QUICK_START.md` - Quick setup guide
- `NOAA_INGESTION_DEPLOYMENT.md` - Full deployment guide
- `IMPLEMENTATION_SUMMARY.md` - Technical details

### Monitoring Queries
See `NOAA_INGESTION_DEPLOYMENT.md` section "Monitoring"

### Logs
```bash
# Netlify function logs
netlify functions:log ingest-noaa-events

# Netlify deploy logs
netlify deploy:log
```

### Database Console
- Supabase Dashboard → SQL Editor
- Run verification queries
- Check table structure

---

## ✅ Final Sign-Off

**Deployment Date:** _________________

**Deployed By:** _________________

**All Tests Passed:** [ ] Yes [ ] No

**Production Ready:** [ ] Yes [ ] No

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**Congratulations!** 🎉

Your Loss Locator Pro now automatically ingests live severe weather data from NOAA every 15 minutes. The system is production-ready and requires no manual intervention.

**Next Steps:**
- Monitor function logs for first 24 hours
- Review data quality daily for first week
- Plan Phase 2: Property enrichment APIs
- Consider additional data sources

---

**Version:** 1.0.0  
**Phase:** 1 - Live Data Ingestion  
**Status:** Ready for Production

