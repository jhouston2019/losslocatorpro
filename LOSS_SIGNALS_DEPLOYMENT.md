# LOSS SIGNALS SYSTEM - DEPLOYMENT GUIDE

## Quick Start

This guide will help you deploy the multi-source loss signal ingestion system to production.

## Prerequisites

- Existing Loss Locator Pro deployment on Netlify
- Supabase project with admin access
- Access to Netlify environment variables

## Step 1: Database Migration

Run the schema migration to create the new tables.

### Option A: Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/006_loss_signals_system.sql`
3. Copy and paste the entire file
4. Click "Run"
5. Verify tables created:
   - loss_signals
   - loss_clusters
   - loss_cluster_signals
   - loss_signal_ingestion_log

### Option B: Command Line

```bash
psql $DATABASE_URL < supabase/migrations/006_loss_signals_system.sql
```

### Verification

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'loss_%';

-- Should return:
-- loss_events (existing)
-- loss_properties (existing)
-- loss_signals (new)
-- loss_clusters (new)
-- loss_cluster_signals (new)
-- loss_signal_ingestion_log (new)
```

## Step 2: Install Dependencies

```bash
npm install
```

This will install `rss-parser` for news feed ingestion.

## Step 3: Configure Environment Variables

### Required Variables (Netlify Dashboard)

Go to Netlify → Site Settings → Environment Variables

Add the following:

```
CRON_SECRET=<generate-random-secret>
```

Generate a random secret:
```bash
openssl rand -hex 32
```

### Optional API Credentials

Configure as sources become available:

**Fire Incident Feeds**:
```
FIRE_INCIDENT_API_URL=https://api.example.com/fire-incidents
FIRE_INCIDENT_API_KEY=your_api_key_here
```

**CAD Feeds**:
```
PULSEPOINT_API_URL=https://api.pulsepoint.org/v1
PULSEPOINT_API_KEY=your_api_key_here

ACTIVE911_API_URL=https://api.active911.com/v1
ACTIVE911_API_KEY=your_api_key_here

MUNICIPAL_CAD_API_URL=https://cad.yourcity.gov/api
MUNICIPAL_CAD_API_KEY=your_api_key_here
```

**News Feeds** (RSS URLs, no authentication typically required):
```
NEWS_RSS_FEED_1=https://news.example.com/emergency/rss
NEWS_RSS_FEED_2=https://local.news.com/fire-incidents/feed
```

**Geocoding** (for news article location extraction):
```
GEOCODING_API_URL=https://maps.googleapis.com/maps/api/geocode/json
GEOCODING_API_KEY=your_google_maps_api_key
```

## Step 4: Deploy to Netlify

### Automatic Deployment

```bash
git add .
git commit -m "Add multi-source loss signal ingestion system"
git push origin main
```

Netlify will automatically:
1. Build the Next.js application
2. Deploy the new Netlify Functions
3. Set up scheduled function execution

### Verify Deployment

1. Go to Netlify Dashboard → Functions
2. Verify these functions are deployed:
   - ingest-fire-incidents
   - ingest-cad-feeds
   - ingest-news-feeds
   - cluster-loss-signals
3. Check "Scheduled Functions" section
4. Verify cron schedules are active

## Step 5: Test Ingestion Functions

### Manual Test (Before Waiting for Scheduled Run)

Test each function individually:

```bash
# Test fire incident ingestion
curl -X POST https://your-site.netlify.app/.netlify/functions/ingest-fire-incidents \
  -H "Authorization: Bearer $CRON_SECRET"

# Test CAD feed ingestion
curl -X POST https://your-site.netlify.app/.netlify/functions/ingest-cad-feeds \
  -H "Authorization: Bearer $CRON_SECRET"

# Test news feed ingestion
curl -X POST https://your-site.netlify.app/.netlify/functions/ingest-news-feeds \
  -H "Authorization: Bearer $CRON_SECRET"

# Test clustering engine
curl -X POST https://your-site.netlify.app/.netlify/functions/cluster-loss-signals \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Check Results

```sql
-- Check ingestion logs
SELECT * FROM loss_signal_ingestion_log
ORDER BY started_at DESC
LIMIT 10;

-- Check signals ingested
SELECT source_type, COUNT(*) as count
FROM loss_signals
GROUP BY source_type;

-- Check clusters created
SELECT verification_status, COUNT(*) as count
FROM loss_clusters
GROUP BY verification_status;
```

## Step 6: Monitor First Scheduled Run

The first scheduled run will occur at:
- 01:00 UTC - Fire incidents
- 02:00 UTC - CAD feeds
- 03:00 UTC - News feeds
- 04:00 UTC - Clustering

### Monitor in Netlify

1. Go to Netlify Dashboard → Functions
2. Click on each function
3. View "Recent invocations"
4. Check logs for errors

### Monitor in Database

```sql
-- Check today's ingestion runs
SELECT 
  source_type,
  source_name,
  status,
  signals_ingested,
  signals_skipped,
  error_message
FROM loss_signal_ingestion_log
WHERE started_at > CURRENT_DATE
ORDER BY started_at DESC;
```

## Step 7: Verify Data Quality

### Check Signal Quality

```sql
-- Signals by source and date
SELECT 
  source_type,
  DATE(created_at) as date,
  COUNT(*) as signal_count,
  AVG(severity_raw) as avg_severity,
  AVG(confidence_raw) as avg_confidence
FROM loss_signals
GROUP BY source_type, DATE(created_at)
ORDER BY date DESC, source_type;
```

### Check Cluster Quality

```sql
-- Clusters by verification status
SELECT 
  verification_status,
  COUNT(*) as cluster_count,
  AVG(signal_count) as avg_signals,
  AVG(confidence_score) as avg_confidence,
  SUM(CASE WHEN ARRAY_LENGTH(source_types, 1) > 1 THEN 1 ELSE 0 END) as multi_source_count
FROM loss_clusters
WHERE created_at > CURRENT_DATE - INTERVAL '7 days'
GROUP BY verification_status;
```

### Check for Duplicates

```sql
-- Should return 0 - each signal should be in at most one cluster
SELECT signal_id, COUNT(*) as cluster_count
FROM loss_cluster_signals
GROUP BY signal_id
HAVING COUNT(*) > 1;
```

## Step 8: Update TypeScript Types (If Needed)

If you make schema changes, regenerate types:

```bash
npx supabase gen types typescript --project-id your-project-id > lib/database.types.ts
```

## Troubleshooting

### No Signals Ingested

**Problem**: Ingestion logs show 0 signals ingested.

**Solutions**:
1. Check API credentials are set correctly
2. Verify API endpoints are accessible
3. Check API rate limits
4. Review function logs for detailed errors
5. Test API endpoints manually with curl

### Clustering Not Working

**Problem**: Signals ingested but no clusters created.

**Solutions**:
1. Verify clustering function ran AFTER ingestion
2. Check if signals have valid lat/lng coordinates
3. Review suppression rules (low confidence + low severity)
4. Check clustering thresholds (5km, 24h)

### Incorrect Confidence Scores

**Problem**: Clusters showing wrong verification status.

**Solutions**:
1. Verify source_type values in loss_signals
2. Check confidence calculation logic
3. Review signal composition (weather vs non-weather)
4. Ensure verification status thresholds are correct

### Function Timeout

**Problem**: Function exceeds 5-minute timeout.

**Solutions**:
1. Reduce batch size (limit API queries)
2. Add pagination to API calls
3. Split large ingestion into multiple runs
4. Increase Netlify function timeout (paid plans)

## Phased Rollout Strategy

### Phase 1: Weather Only (Current)

- Existing NOAA weather ingestion
- No changes to current system

### Phase 2: Add Fire Reports

1. Configure fire incident API credentials
2. Enable fire incident ingestion
3. Monitor for 1 week
4. Verify clustering works correctly

### Phase 3: Add CAD Feeds

1. Configure CAD API credentials
2. Enable CAD feed ingestion
3. Monitor for 1 week
4. Verify multi-source clustering

### Phase 4: Add News Feeds

1. Configure RSS feed URLs
2. Enable news feed ingestion
3. Monitor for 1 week
4. Verify NLP extraction quality

### Phase 5: Full Production

- All sources active
- Monitoring dashboards set up
- Alert thresholds configured
- Documentation complete

## Monitoring Dashboard (Recommended)

Create a monitoring view in Supabase:

```sql
CREATE OR REPLACE VIEW loss_signals_health AS
SELECT 
  source_type,
  source_name,
  DATE(started_at) as date,
  COUNT(*) as runs,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes,
  SUM(signals_ingested) as total_ingested,
  SUM(signals_skipped) as total_skipped
FROM loss_signal_ingestion_log
WHERE started_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY source_type, source_name, DATE(started_at)
ORDER BY date DESC, source_type;
```

Query the view:
```sql
SELECT * FROM loss_signals_health;
```

## Rollback Plan

If issues arise, you can disable ingestion without affecting existing system:

### Disable Scheduled Functions

In `netlify.toml`, comment out the scheduled functions:

```toml
# [[functions]]
#   name = "ingest-fire-incidents"
#   schedule = "0 1 * * *"
```

Redeploy to disable.

### Preserve Data

The new tables are separate from existing tables. Existing functionality is unaffected.

### Re-enable

Uncomment the functions and redeploy when ready.

## Support Contacts

- Database issues: Check Supabase logs
- Function issues: Check Netlify function logs
- API issues: Contact API provider support

## Next Steps

1. ✅ Deploy schema migration
2. ✅ Install dependencies
3. ✅ Configure environment variables
4. ✅ Deploy to Netlify
5. ✅ Test functions manually
6. ✅ Monitor first scheduled run
7. ✅ Verify data quality
8. ⏭️ Integrate with UI (see LOSS_SIGNALS_SYSTEM.md)
9. ⏭️ Set up monitoring alerts
10. ⏭️ Document operational procedures

---

**Remember**: This system augments existing weather ingestion. It does not replace or modify existing loss_events functionality.







