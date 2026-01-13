# NOAA Live Data Ingestion - Deployment Guide

## 🎯 Overview

Loss Locator Pro now supports **live severe weather event ingestion** from NOAA feeds. This feature automatically populates the loss events database every 15 minutes with real-time weather data.

## ✅ What Was Implemented

### 1. Database Migration (004_add_ingestion_fields.sql)
- Added `source` field to track data source (e.g., "NOAA")
- Added `source_event_id` for external event tracking
- Added `latitude` and `longitude` for precise coordinates
- Created unique index to prevent duplicate ingestion
- Added indexes for efficient querying

### 2. Schema Updates (schema.sql)
- Updated `loss_events` table definition with new fields
- Added all necessary indexes for ingestion operations

### 3. Ingestion Function (netlify/functions/ingest-noaa-events.ts)
- Fetches NOAA severe weather data every 15 minutes
- Normalizes event types (Hail, Wind, Fire, Freeze)
- Reverse geocodes coordinates to ZIP codes and states
- Calculates severity scores and claim probabilities
- Prevents duplicates using UPSERT logic
- Logs all operations for monitoring

### 4. Scheduled Execution (netlify.toml)
- Configured Netlify scheduled function
- Runs every 15 minutes: `*/15 * * * *`

### 5. TypeScript Types (lib/database.types.ts)
- Updated `loss_events` type definitions
- Added new fields to Row, Insert, and Update types

## 📋 Deployment Steps

### Step 1: Deploy Database Migration

Run the migration in your Supabase project:

```bash
# Option A: Using Supabase CLI
supabase migration up

# Option B: Run directly in Supabase SQL Editor
# Copy contents of supabase/migrations/004_add_ingestion_fields.sql
# Paste and execute in SQL Editor
```

### Step 2: Set Environment Variables

Add the following to your Netlify environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # CRITICAL for ingestion
```

**⚠️ IMPORTANT:** The `SUPABASE_SERVICE_ROLE_KEY` is required for the ingestion function to bypass RLS policies and insert data directly.

### Step 3: Deploy to Netlify

```bash
# Commit all changes
git add .
git commit -m "Add NOAA live data ingestion"

# Push to your repository
git push origin main

# Netlify will automatically deploy
```

### Step 4: Verify Scheduled Function

After deployment:

1. Go to Netlify Dashboard → Functions
2. Look for `ingest-noaa-events`
3. Check "Scheduled" badge is present
4. View logs to confirm execution

## 🔍 Verification Checklist

### Database Verification

```sql
-- 1. Verify new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'loss_events' 
AND column_name IN ('source', 'source_event_id', 'latitude', 'longitude');

-- 2. Verify unique index
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'loss_events' 
AND indexname = 'idx_unique_source_event';

-- 3. Check for ingested events
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN source = 'NOAA' THEN 1 END) as noaa_events,
  MAX(created_at) as last_ingestion
FROM loss_events;

-- 4. View recent NOAA events
SELECT 
  id,
  event_type,
  severity,
  zip,
  state_code,
  source_event_id,
  created_at
FROM loss_events
WHERE source = 'NOAA'
ORDER BY created_at DESC
LIMIT 10;
```

### UI Verification

1. **Loss Feed Page** (`/loss-feed`)
   - Should show auto-populated events
   - Filter by state should work
   - Events should have severity scores

2. **Dashboard** (`/dashboard`)
   - Total events count should increase automatically
   - State distribution should update
   - Recent events should appear

3. **Lead Routing** (`/lead-routing`)
   - Routing queue should auto-populate
   - Admin thresholds should apply
   - High-severity events should be prioritized

### Function Logs

Check Netlify function logs for:

```
✅ Expected log patterns:
🌩️ Starting NOAA severe weather ingestion...
📡 Fetching NOAA data...
📊 Found X events to process
✅ Inserted event: [event_id] (Hail in 12345, TX)
🎉 Ingestion complete: { inserted: X, skipped: Y, errors: 0 }

⚠️ Warning patterns (non-critical):
⚠️ Skipping unknown event type: [type]
⚠️ Could not resolve ZIP for event [id]
⏭️ Skipping duplicate event: [id]

❌ Error patterns (needs attention):
❌ Error inserting event [id]: [error]
❌ Fatal error during ingestion: [error]
```

## 🔧 Manual Testing

### Test the Function Locally

You can test the ingestion function manually:

```bash
# Install Netlify CLI if not already installed
npm install -g netlify-cli

# Run function locally
netlify functions:invoke ingest-noaa-events

# Or test via HTTP endpoint (after deployment)
curl https://your-site.netlify.app/.netlify/functions/ingest-noaa-events
```

### Expected Response

```json
{
  "success": true,
  "inserted": 15,
  "skipped": 3,
  "errors": 0,
  "total": 18,
  "duration": 4523
}
```

## 📊 Data Flow

```
NOAA Feed (every 15 min)
    ↓
Netlify Scheduled Function
    ↓
Normalize Event Data
    ↓
Reverse Geocode (ZIP + State)
    ↓
Calculate Severity & Probability
    ↓
UPSERT to loss_events
    ↓
Existing UI Auto-Updates
```

## 🛡️ Security Features

1. **Service Role Key**: Function uses service role to bypass RLS
2. **No Client Exposure**: Ingestion runs server-side only
3. **Duplicate Prevention**: Unique index prevents double-ingestion
4. **Error Handling**: Graceful failures, continues processing
5. **Logging**: All operations logged for audit trail

## 🔄 Normalization Logic

### Event Type Mapping
```typescript
NOAA Event → Loss Locator Event Type
- "hail" → Hail
- "wind", "gust", "tornado" → Wind
- "fire", "wildfire" → Fire
- "freeze", "frost", "ice" → Freeze
```

### Severity Calculation

**Hail Events:**
- Size ≥ 2 inches → 0.9 severity
- Size ≥ 1 inch → 0.7 severity
- Size ≥ 0.75 inch → 0.6 severity
- Default → 0.4 severity

**Wind Events:**
- Speed ≥ 75 mph → 0.9 severity
- Speed ≥ 60 mph → 0.7 severity
- Speed ≥ 50 mph → 0.6 severity
- Default → 0.4 severity

**Claim Probability:**
```
claim_probability = severity × 0.85
```

## 🐛 Troubleshooting

### Issue: No Events Being Ingested

**Check:**
1. Function is deployed and scheduled
2. Environment variables are set correctly
3. NOAA feed is accessible
4. Database migration was applied

**Solution:**
```bash
# Check function logs
netlify functions:log ingest-noaa-events

# Verify environment variables
netlify env:list

# Test function manually
netlify functions:invoke ingest-noaa-events
```

### Issue: Duplicate Events

**Check:**
```sql
-- Verify unique index exists
SELECT * FROM pg_indexes 
WHERE tablename = 'loss_events' 
AND indexname = 'idx_unique_source_event';
```

**Solution:**
If index is missing, run migration 004 again.

### Issue: Missing ZIP Codes

**Cause:** Reverse geocoding API may be rate-limited or unavailable

**Solution:**
- Function will skip events without ZIP codes
- Check logs for geocoding errors
- Events will be retried on next run if they're still in NOAA feed

### Issue: Function Timeout

**Cause:** Processing too many events at once

**Solution:**
- Function has 10-second default timeout
- Netlify Pro allows up to 26 seconds
- Consider batching if needed (future enhancement)

## 📈 Monitoring

### Key Metrics to Track

1. **Ingestion Rate**: Events inserted per run
2. **Skip Rate**: Events skipped (duplicates or invalid)
3. **Error Rate**: Failed insertions
4. **Execution Time**: Function duration
5. **Data Freshness**: Time since last ingestion

### Recommended Monitoring Query

```sql
-- Daily ingestion summary
SELECT 
  DATE(created_at) as date,
  COUNT(*) as events_ingested,
  COUNT(DISTINCT state_code) as states_affected,
  AVG(severity) as avg_severity,
  COUNT(CASE WHEN event_type = 'Hail' THEN 1 END) as hail_events,
  COUNT(CASE WHEN event_type = 'Wind' THEN 1 END) as wind_events
FROM loss_events
WHERE source = 'NOAA'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 7;
```

## 🚀 Next Steps (Future Enhancements)

- [ ] Add more weather data sources (NWS, Weather.gov)
- [ ] Implement property enrichment APIs
- [ ] Add ML-based severity prediction
- [ ] Create admin dashboard for ingestion monitoring
- [ ] Add webhook notifications for high-severity events
- [ ] Implement data retention policies

## ✅ Success Criteria

Your implementation is successful when:

1. ✅ Loss Feed auto-populates with new events
2. ✅ State filters work correctly
3. ✅ No duplicate events in database
4. ✅ Admin thresholds apply automatically
5. ✅ Routing queue fills without manual input
6. ✅ System remains stable under repeated runs
7. ✅ No UI changes were required
8. ✅ Existing logic remains unmodified

## 📞 Support

If you encounter issues:

1. Check Netlify function logs
2. Verify database migration status
3. Review environment variables
4. Test function manually
5. Check NOAA feed accessibility

---

**Deployment Date:** December 22, 2025  
**Version:** 1.0.0  
**Status:** ✅ Ready for Production







