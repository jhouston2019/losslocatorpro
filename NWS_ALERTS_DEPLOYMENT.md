# NWS Alerts Integration - Deployment Guide

## 🎯 Overview

National Weather Service (NWS) active alerts integration is now complete. This adds real-time weather warnings and watches to complement the existing NOAA Storm Prediction Center reports.

---

## ✅ What Was Implemented

### 1. NWS Alerts Ingestion Function
**File:** `netlify/functions/ingest-nws-alerts.ts`

**Data Source:** `https://api.weather.gov/alerts/active`

**Features:**
- ✅ Fetches active weather alerts from NWS API
- ✅ Parses event type, severity, certainty, onset, expires, areaDesc, geometry
- ✅ Maps NWS alert types to loss_events schema (Fire, Wind, Hail, Freeze)
- ✅ Extracts coordinates from GeoJSON geometry (Point, Polygon, MultiPolygon)
- ✅ Reverse geocodes to ZIP codes using Census API
- ✅ Calculates severity and claim probability from NWS data
- ✅ Deduplicates using source + alert ID
- ✅ Comprehensive error handling and logging

**Supported Alert Types:**
- Fire: Fire Weather Watch, Red Flag Warning, Fire Warning, Extreme Fire Danger
- Wind: High Wind Warning/Watch, Tornado Warning/Watch, Severe Thunderstorm, Hurricane, Tropical Storm
- Hail: Severe Weather Statement
- Freeze: Freeze Warning/Watch, Hard Freeze, Frost Advisory

### 2. Scheduled Execution
**File:** `netlify.toml`

**Schedule:** Every hour (`0 * * * *`)

**Why hourly?** NWS alerts are time-sensitive warnings that need frequent monitoring.

---

## 📋 Deployment Steps

### Step 1: Verify Environment Variables

The function uses the same Supabase credentials as NOAA ingestion:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**No additional API keys required** - NWS API is free and public.

### Step 2: Deploy to Netlify

```bash
# Commit changes
git add netlify/functions/ingest-nws-alerts.ts netlify.toml NWS_ALERTS_DEPLOYMENT.md
git commit -m "Add NWS alerts ingestion"

# Push to repository
git push origin main

# Netlify will automatically deploy
```

### Step 3: Verify Scheduled Function

After deployment:

1. Go to Netlify Dashboard → Functions
2. Look for `ingest-nws-alerts`
3. Check "Scheduled" badge is present
4. View logs to confirm execution

---

## 🔍 Verification

### Database Query

Check if NWS alerts are being ingested:

```sql
-- Count NWS alerts
SELECT COUNT(*) FROM loss_events WHERE source = 'NWS';

-- See breakdown by event type
SELECT 
  event_type,
  COUNT(*) as count,
  MAX(event_timestamp) as latest_event,
  MAX(created_at) as latest_ingestion
FROM loss_events
WHERE source = 'NWS'
GROUP BY event_type
ORDER BY count DESC;

-- View recent NWS alerts
SELECT 
  event_type,
  severity,
  claim_probability,
  event_timestamp,
  state_code,
  zip,
  source_event_id,
  created_at
FROM loss_events
WHERE source = 'NWS'
ORDER BY created_at DESC
LIMIT 10;
```

### Expected Results

- **Active alerts:** Varies by weather conditions (0-100+ alerts)
- **Event types:** Primarily Wind and Fire warnings
- **Geographic coverage:** Nationwide
- **Update frequency:** New alerts appear within 1 hour

---

## 🔄 Data Flow

```
NWS API (api.weather.gov/alerts/active)
        ↓
ingest-nws-alerts.ts (Hourly)
        ↓
Parse & Normalize
        ↓
Extract Coordinates from Geometry
        ↓
Reverse Geocode to ZIP
        ↓
loss_events table (source = 'NWS')
        ↓
Dashboard, Loss Feed, Map
```

---

## 📊 Comparison: NOAA vs NWS

| Feature | NOAA/SPC | NWS Alerts |
|---------|----------|------------|
| **Data Type** | Storm reports (after event) | Warnings/watches (before/during event) |
| **Timing** | Historical (last 7 days) | Real-time active alerts |
| **Update Frequency** | Daily | Hourly |
| **Geographic Detail** | Point coordinates | Polygons (counties/zones) |
| **Event Types** | Hail, Wind, Tornado | Fire, Wind, Hail, Freeze, Hurricane, etc. |
| **Use Case** | Confirmed loss events | Predictive/early warning |

**Together:** Comprehensive weather intelligence (warnings + confirmed events)

---

## 🎯 Event Type Mapping

### NWS Alert → loss_events.event_type

**Fire:**
- Fire Weather Watch
- Red Flag Warning
- Fire Warning
- Extreme Fire Danger

**Wind:**
- High Wind Warning/Watch
- Wind Advisory
- Extreme Wind Warning
- Tornado Warning/Watch
- Severe Thunderstorm Warning/Watch
- Hurricane Warning/Watch
- Tropical Storm Warning/Watch

**Hail:**
- Severe Weather Statement (may include hail)

**Freeze:**
- Freeze Warning/Watch
- Hard Freeze Warning/Watch
- Frost Advisory

**Skipped Alerts:**
Alerts that don't map to loss event types (e.g., Flood Warning, Heat Advisory) are automatically skipped.

---

## 🔧 Severity Calculation

### NWS Severity → loss_events.severity (0-1 scale)

| NWS Severity | Severity Score | Meaning |
|--------------|----------------|---------|
| Extreme | 0.95 | Extraordinary threat to life/property |
| Severe | 0.80 | Significant threat to life/property |
| Moderate | 0.60 | Possible threat to life/property |
| Minor | 0.40 | Minimal threat to life/property |
| Unknown | 0.50 | Default |

### Claim Probability Calculation

```
claim_probability = (severity_score × 0.7) + (certainty_score × 0.3)
```

**Certainty Scores:**
- Observed: 0.95
- Likely: 0.85
- Possible: 0.65
- Unlikely: 0.40
- Unknown: 0.50

**Example:**
- Severe Thunderstorm Warning (Severe + Likely)
- Severity: 0.80, Certainty: 0.85
- Claim Probability: (0.80 × 0.7) + (0.85 × 0.3) = 0.815 (81.5%)

---

## 🚨 Important Notes

### Deduplication
- Each alert has a unique ID from NWS
- Deduplication uses `(source='NWS', source_event_id=alert.id)`
- Same alert won't be inserted twice even if function runs multiple times

### Geometry Handling
- **Point:** Uses coordinates directly
- **Polygon:** Calculates centroid (center point)
- **MultiPolygon:** Uses centroid of first polygon
- **No geometry:** Skips coordinate extraction, uses areaDesc for location

### ZIP Code Fallback
- If geocoding fails: Uses `'00000'` placeholder
- State code: Parsed from areaDesc (e.g., "Tarrant, TX" → "TX")

### API Rate Limits
- NWS API has no authentication required
- No documented rate limits for reasonable use
- Hourly schedule is well within acceptable use

---

## 📈 Monitoring

### Success Indicators

✅ Function runs every hour without errors  
✅ New alerts appear in database within 1 hour  
✅ Alert count varies based on weather activity  
✅ Coordinates extracted for most alerts  
✅ ZIP codes populated for most events

### Warning Signs

⚠️ Function consistently returns 0 alerts (unlikely - usually some alerts active)  
⚠️ High error count in logs  
⚠️ No new alerts for 24+ hours (check NWS API status)  
⚠️ All alerts have '00000' ZIP (geocoding failing)

### Netlify Function Logs

```bash
# View recent logs
netlify functions:log ingest-nws-alerts

# Expected output:
🚨 Starting NWS alerts ingestion...
📡 Fetching active alerts from https://api.weather.gov/alerts/active
📊 Retrieved 47 active alerts
✅ High Wind Warning (Severe) in Tarrant, TX
✅ Fire Weather Watch (Moderate) in Los Angeles, CA
...
🎉 NWS alerts ingestion complete: { alerts_fetched: 47, inserted: 23, skipped: 24, errors: 0 }
```

---

## 🔄 Integration with Existing System

### Multi-Source Intelligence

Now you have **three federal weather sources**:

1. **NOAA/SPC Storm Reports** (source='NOAA')
   - Historical confirmed events
   - Last 7 days
   - Daily updates

2. **NWS Active Alerts** (source='NWS')
   - Real-time warnings/watches
   - Active alerts only
   - Hourly updates

3. **Ready for NFIRS** (source='fire_state')
   - Fire incident reports
   - Awaiting API credentials

### Dashboard Display

All sources appear in the same `loss_events` table:

```sql
-- View all sources
SELECT 
  source,
  COUNT(*) as count,
  MAX(created_at) as latest_ingestion
FROM loss_events
GROUP BY source
ORDER BY count DESC;
```

**Expected output:**
```
source    | count | latest_ingestion
----------|-------|------------------
NWS       | 47    | 2025-01-13 14:00:00
NOAA      | 20    | 2025-01-13 00:00:00
```

---

## 🎉 Success Criteria

After 24 hours of operation, you should see:

✅ **NWS alerts in database** (typically 20-100 active alerts nationwide)  
✅ **Hourly ingestion logs** (24 successful runs per day)  
✅ **Geographic coverage** (alerts from multiple states)  
✅ **Event type variety** (Wind, Fire, Freeze warnings)  
✅ **No duplicate alerts** (same alert ID not inserted twice)

---

## 📚 Resources

- **NWS API Documentation:** https://www.weather.gov/documentation/services-web-api
- **Alert Types:** https://www.weather.gov/lwx/WarningsDefined
- **GeoJSON Spec:** https://geojson.org/

---

## 🔮 Future Enhancements

### Potential Improvements

1. **Alert Expiration Tracking**
   - Store `expires` timestamp
   - Auto-update status when alert expires
   - Show "active" vs "expired" in UI

2. **Polygon Display**
   - Store full GeoJSON geometry
   - Display alert polygons on map
   - Show affected area boundaries

3. **Alert History**
   - Track when alerts are issued/updated/expired
   - Build historical alert database
   - Analyze alert patterns

4. **Enhanced Filtering**
   - Filter by urgency (Immediate, Expected, Future)
   - Filter by response type (Shelter, Evacuate, Prepare)
   - Priority scoring based on urgency + severity

---

**Implementation Complete:** January 13, 2026  
**Status:** ✅ READY FOR DEPLOYMENT  
**API Cost:** $0 (free public API)  
**Maintenance:** None required (self-contained)

---

**END OF DEPLOYMENT GUIDE**
