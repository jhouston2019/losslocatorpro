# NOAA Live Data Ingestion - Quick Start Guide

## 🚀 5-Minute Setup

### Prerequisites
- Supabase project with Loss Locator Pro database
- Netlify account with site deployed
- Service role key from Supabase

### Step 1: Deploy Database Migration (2 minutes)

```bash
# Option A: Using Supabase CLI
supabase migration up

# Option B: Manual via SQL Editor
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Open supabase/migrations/004_add_ingestion_fields.sql
# 3. Copy and paste contents
# 4. Click "Run"
```

### Step 2: Add Environment Variable (1 minute)

1. Go to Netlify Dashboard
2. Navigate to: Site Settings → Environment Variables
3. Add new variable:
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Your service role key from Supabase
   - **Scopes:** All scopes

**Where to find service role key:**
- Supabase Dashboard → Project Settings → API
- Copy the "service_role" key (NOT the anon key)

### Step 3: Deploy (1 minute)

```bash
git add .
git commit -m "Add NOAA live data ingestion"
git push origin main
```

Netlify will automatically deploy.

### Step 4: Verify (1 minute)

**Check Function is Scheduled:**
1. Netlify Dashboard → Functions
2. Find `ingest-noaa-events`
3. Should show "Scheduled" badge

**Check Data is Flowing:**
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) as noaa_events
FROM loss_events
WHERE source = 'NOAA';
```

Wait 15 minutes, then check again. Count should increase.

**Check UI:**
- Go to `/loss-feed` in your app
- Should see events auto-populating
- Filter by state should work

## ✅ Success Indicators

- ✅ Function shows "Scheduled" in Netlify
- ✅ Events appear in `loss_events` table
- ✅ Loss Feed page shows new events
- ✅ No errors in Netlify function logs

## 🐛 Quick Troubleshooting

**No events appearing?**
```bash
# Check function logs
netlify functions:log ingest-noaa-events

# Test manually
netlify functions:invoke ingest-noaa-events
```

**Function not scheduled?**
- Verify `netlify.toml` has scheduled function config
- Redeploy site
- Check Netlify Functions dashboard

**Database errors?**
- Verify migration 004 was applied
- Check service role key is correct
- Ensure RLS policies allow service role inserts

## 📊 Monitor Ingestion

```sql
-- View recent ingestions
SELECT 
  event_type,
  severity,
  zip,
  state_code,
  created_at
FROM loss_events
WHERE source = 'NOAA'
ORDER BY created_at DESC
LIMIT 20;

-- Daily summary
SELECT 
  DATE(created_at) as date,
  COUNT(*) as events,
  AVG(severity) as avg_severity
FROM loss_events
WHERE source = 'NOAA'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🎯 What Happens Next

Every 15 minutes:
1. Function fetches NOAA severe weather data
2. Normalizes events to Loss Locator format
3. Reverse geocodes to ZIP codes
4. Calculates severity and claim probability
5. Inserts into `loss_events` table
6. UI automatically updates

## 📖 Full Documentation

See `NOAA_INGESTION_DEPLOYMENT.md` for:
- Detailed architecture
- Normalization logic
- Security features
- Monitoring queries
- Advanced troubleshooting

## 🔐 Security Notes

- Service role key bypasses RLS (required for ingestion)
- Never expose service role key to client
- Function runs server-side only
- All operations are logged

---

**That's it!** Your Loss Locator Pro now ingests live severe weather data automatically.







