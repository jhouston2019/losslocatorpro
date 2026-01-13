# Netlify Function Scheduling Guide

## 🎯 Current Status

Your functions are deployed and working, but **Netlify scheduled functions require a paid plan** (Pro or higher).

## 💡 **Options for Running Functions**

### **Option 1: External Cron Service (FREE)**

Use a free external service to trigger your functions on schedule:

#### **Using cron-job.org (Recommended)**

1. Go to https://cron-job.org (free account)
2. Create a new cron job for each function:

**Job 1: ingest-noaa-events (Every 15 minutes)**
- URL: `https://losslocatorpro.netlify.app/.netlify/functions/ingest-noaa-events`
- Schedule: `*/15 * * * *`
- Method: GET or POST

**Job 2: enrich-properties (Every hour)**
- URL: `https://losslocatorpro.netlify.app/.netlify/functions/enrich-properties`
- Schedule: `0 * * * *`

**Job 3: enrich-phones (Every 2 hours)**
- URL: `https://losslocatorpro.netlify.app/.netlify/functions/enrich-phones`
- Schedule: `0 */2 * * *`

#### **Using EasyCron (Alternative)**
- https://www.easycron.com (free tier: 100 executions/day)
- Similar setup to cron-job.org

#### **Using GitHub Actions (FREE)**

Create `.github/workflows/trigger-functions.yml`:

```yaml
name: Trigger Netlify Functions

on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes

jobs:
  trigger-ingest:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger NOAA Ingestion
        run: curl -X POST https://losslocatorpro.netlify.app/.netlify/functions/ingest-noaa-events
  
  trigger-properties:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 * * * *'
    steps:
      - name: Trigger Property Enrichment
        run: curl -X POST https://losslocatorpro.netlify.app/.netlify/functions/enrich-properties
  
  trigger-phones:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 */2 * * *'
    steps:
      - name: Trigger Phone Enrichment
        run: curl -X POST https://losslocatorpro.netlify.app/.netlify/functions/enrich-phones
```

---

### **Option 2: Upgrade to Netlify Pro**

Netlify Pro includes native scheduled functions:
- Cost: $19/month per member
- Native scheduling via `netlify.toml`
- No external dependencies
- Better logging and monitoring

---

### **Option 3: Manual Triggers (Testing)**

For now, you can manually trigger functions:

#### **Via Browser:**
Visit these URLs to trigger manually:
- https://losslocatorpro.netlify.app/.netlify/functions/ingest-noaa-events
- https://losslocatorpro.netlify.app/.netlify/functions/enrich-properties
- https://losslocatorpro.netlify.app/.netlify/functions/enrich-phones

#### **Via Command Line:**
```bash
# Trigger NOAA ingestion
curl https://losslocatorpro.netlify.app/.netlify/functions/ingest-noaa-events

# Trigger property enrichment
curl https://losslocatorpro.netlify.app/.netlify/functions/enrich-properties

# Trigger phone enrichment
curl https://losslocatorpro.netlify.app/.netlify/functions/enrich-phones
```

---

## 🚀 **Recommended Approach**

**For immediate FREE solution:**
1. Use **cron-job.org** (easiest, no code changes)
2. Set up 3 cron jobs pointing to your function URLs
3. Functions will run on schedule automatically

**For production:**
1. Consider Netlify Pro if budget allows
2. Or continue with external cron service (works great!)

---

## ✅ **Test Functions Now**

Before setting up scheduling, test that functions work:

```bash
# Test NOAA ingestion
curl https://losslocatorpro.netlify.app/.netlify/functions/ingest-noaa-events

# Check database for results
# Should see events with source='NOAA'
```

---

## 📊 **Verify in Database**

After triggering the first function:

```sql
SELECT 
  id,
  event_type,
  severity,
  zip,
  state_code,
  source,
  created_at
FROM loss_events
WHERE source = 'NOAA'
ORDER BY created_at DESC
LIMIT 10;
```

---

**Next Steps:**
1. Test functions manually (click URLs above)
2. Verify data appears in database
3. Set up cron-job.org for automatic scheduling
4. Monitor function logs in Netlify dashboard







