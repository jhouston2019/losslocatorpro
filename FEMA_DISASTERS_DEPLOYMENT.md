# FEMA Disaster Declarations Integration - Deployment Guide

## 🎯 Overview

FEMA disaster declarations integration provides federal-level disaster context for major events. This adds presidential disaster declarations (hurricanes, wildfires, severe storms, etc.) to complement real-time weather alerts.

---

## ✅ What Was Implemented

### 1. FEMA Disaster Declarations Ingestion Function
**File:** `netlify/functions/ingest-fema-disasters.ts`

**Data Source:** `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries`

**Features:**
- ✅ Fetches disaster declarations from last 90 days
- ✅ Filters by: incidentType, state, declarationDate
- ✅ Maps FEMA incident types to loss_events schema (Fire, Wind, Hail, Freeze)
- ✅ Uses state centroids for geographic coordinates
- ✅ Calculates severity based on declaration type (DR/EM/FM)
- ✅ High claim probability (federal disasters are confirmed events)
- ✅ Deduplicates using source + disaster number
- ✅ Comprehensive error handling and logging

**Supported Incident Types:**
- Fire: Fire, Wildfire
- Wind: Hurricane, Typhoon, Tornado, Severe Storm, Tropical Storm
- Freeze: Freezing, Snow, Severe Ice Storm
- Skipped: Flood, Earthquake, Drought, etc. (not in our event types)

**Declaration Types:**
- **DR (Major Disaster):** Severity 0.90 - Presidential major disaster declaration
- **EM (Emergency):** Severity 0.75 - Presidential emergency declaration
- **FM (Fire Management):** Severity 0.60 - Fire management assistance

### 2. Scheduled Execution
**File:** `netlify.toml`

**Schedule:** Weekly on Sunday at midnight UTC (`0 0 * * 0`)

**Why weekly?** FEMA disasters are infrequent, high-impact events that don't require hourly monitoring.

---

## 📋 Deployment Steps

### Step 1: Verify Environment Variables

The function uses the same Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**No additional API keys required** - FEMA OpenFEMA API is free and public.

### Step 2: Deploy to Netlify

```bash
# Commit changes
git add netlify/functions/ingest-fema-disasters.ts netlify.toml FEMA_DISASTERS_DEPLOYMENT.md
git commit -m "Add FEMA disaster declarations integration"

# Push to repository
git push origin main

# Netlify will automatically deploy
```

### Step 3: Verify Scheduled Function

After deployment:

1. Go to Netlify Dashboard → Functions
2. Look for `ingest-fema-disasters`
3. Check "Scheduled" badge is present
4. View logs to confirm execution

---

## 🔍 Verification

### Database Query

Check if FEMA disasters are being ingested:

```sql
-- Count FEMA disasters
SELECT COUNT(*) FROM loss_events WHERE source = 'FEMA';

-- See breakdown by event type
SELECT 
  event_type,
  COUNT(*) as count,
  MAX(event_timestamp) as latest_event,
  MAX(created_at) as latest_ingestion
FROM loss_events
WHERE source = 'FEMA'
GROUP BY event_type
ORDER BY count DESC;

-- View recent FEMA disasters
SELECT 
  event_type,
  severity,
  claim_probability,
  event_timestamp,
  state_code,
  source_event_id,
  created_at
FROM loss_events
WHERE source = 'FEMA'
ORDER BY event_timestamp DESC
LIMIT 10;

-- View by state
SELECT 
  state_code,
  COUNT(*) as disaster_count,
  MAX(event_timestamp) as latest_disaster
FROM loss_events
WHERE source = 'FEMA'
GROUP BY state_code
ORDER BY disaster_count DESC;
```

### Expected Results

- **Disaster count:** Varies by season (5-50 declarations in 90 days)
- **Event types:** Primarily Wind (hurricanes, storms) and Fire (wildfires)
- **Geographic coverage:** States with recent major disasters
- **Update frequency:** New declarations appear weekly

---

## 🔄 Data Flow

```
FEMA OpenFEMA API
        ↓
Filter: Last 90 days
        ↓
ingest-fema-disasters.ts (Weekly)
        ↓
Parse & Normalize
        ↓
Map to State Centroids
        ↓
Calculate Severity (DR/EM/FM)
        ↓
loss_events table (source = 'FEMA')
        ↓
Dashboard, Loss Feed, Map
```

---

## 📊 Comparison: FEMA vs Other Sources

| Feature | NOAA/SPC | NWS Alerts | FEMA Disasters |
|---------|----------|------------|----------------|
| **Data Type** | Storm reports | Warnings/watches | Presidential declarations |
| **Timing** | Historical (7 days) | Real-time | Historical (90 days) |
| **Update Frequency** | Daily | Hourly | Weekly |
| **Geographic Detail** | Point coordinates | County polygons | State-level |
| **Severity** | Moderate-High | Moderate-High | Very High |
| **Event Types** | Hail, Wind, Tornado | Fire, Wind, Freeze | All major disasters |
| **Use Case** | Confirmed events | Early warning | Federal disaster context |

**Together:** Complete intelligence (warnings → events → federal response)

---

## 🎯 Incident Type Mapping

### FEMA Incident Type → loss_events.event_type

**Fire:**
- Fire
- Wildfire

**Wind:**
- Hurricane
- Typhoon
- Tornado
- Severe Storm
- Severe Storm(s)
- Tropical Storm

**Freeze:**
- Freezing
- Snow
- Severe Ice Storm

**Skipped (not in our event types):**
- Flood
- Flooding
- Earthquake
- Drought
- Mudslide
- Landslide
- Dam/Levee Break
- Biological
- Chemical
- Coastal Storm
- Tsunami
- Volcanic Eruption

---

## 🔧 Severity Calculation

### Declaration Type → Severity Score

| Declaration Type | Code | Severity | Meaning |
|-----------------|------|----------|---------|
| Major Disaster | DR | 0.90 | Presidential major disaster declaration |
| Emergency | EM | 0.75 | Presidential emergency declaration |
| Fire Management | FM | 0.60 | Fire management assistance |

### Severity Adjustments

- **Hurricane:** +0.05 (capped at 0.95)
- **Wildfire:** +0.05 (capped at 0.95)

### Claim Probability

```
claim_probability = severity × 0.95
```

**Why 0.95?** FEMA disasters are federally confirmed, high-impact events with very high claim probability.

**Example:**
- Major Disaster (Hurricane): Severity 0.95
- Claim Probability: 0.95 × 0.95 = 0.90 (90%)

---

## 🗺️ Geographic Handling

### State Centroids

FEMA disasters are often state-wide or multi-county events. The function uses **state centroids** (geographic center points) for mapping:

**Example:**
- **Florida (FL):** lat: 27.766279, lng: -81.686783
- **California (CA):** lat: 36.116203, lng: -119.681564
- **Texas (TX):** lat: 31.054487, lng: -97.563461

**Why centroids?**
- FEMA declarations cover large areas (entire states or multiple counties)
- Centroid provides a representative point for mapping
- ZIP code set to '00000' (not ZIP-specific)

### FIPS Codes

FEMA provides FIPS codes for state and county:
- `fipsStateCode` - Two-digit state FIPS
- `fipsCountyCode` - Three-digit county FIPS

**Future enhancement:** Could map FIPS codes to specific county centroids for more precise location.

---

## 🚨 Important Notes

### Deduplication
- Each disaster has a unique disaster number
- Deduplication uses `(source='FEMA', source_event_id='FEMA-{disasterNumber}')`
- Same disaster won't be inserted twice

### Date Handling
- Uses `incidentBeginDate` if available (when disaster started)
- Falls back to `declarationDate` (when declaration was issued)
- Filters last 90 days to capture recent disasters

### ZIP Code
- Set to `'00000'` (placeholder)
- FEMA disasters are state/county level, not ZIP-specific
- State code is always populated

### API Rate Limits
- FEMA OpenFEMA API has no authentication required
- No documented rate limits for reasonable use
- Weekly schedule is well within acceptable use
- Returns up to 1000 records per request

---

## 📈 Monitoring

### Success Indicators

✅ Function runs weekly without errors  
✅ New disasters appear after major events  
✅ Disaster count varies by season (hurricane season, wildfire season)  
✅ State codes populated correctly  
✅ High severity scores (0.75-0.95)

### Warning Signs

⚠️ Function returns 0 disasters for 30+ days (unlikely - always some disasters)  
⚠️ High error count in logs  
⚠️ All disasters have null coordinates (state centroid lookup failing)  
⚠️ Duplicate disaster numbers (deduplication failing)

### Netlify Function Logs

```bash
# View recent logs
netlify functions:log ingest-fema-disasters

# Expected output:
🏛️ Starting FEMA disaster declarations ingestion...
📡 Fetching FEMA declarations since 2025-10-15
📊 Retrieved 23 disaster declarations
✅ DR 4789: Hurricane in FL (0.95)
✅ DR 4790: Wildfire in CA (0.95)
✅ EM 3567: Severe Storm in TX (0.75)
...
🎉 FEMA disaster declarations ingestion complete: { declarations_fetched: 23, inserted: 15, skipped: 8, errors: 0 }
```

---

## 🔄 Integration with Existing System

### Multi-Source Federal Intelligence

Now you have **four federal sources**:

1. **NOAA/SPC Storm Reports** (source='NOAA')
   - Confirmed storm events
   - Last 7 days
   - Daily updates
   - Point-level detail

2. **NWS Active Alerts** (source='NWS')
   - Real-time warnings
   - Active alerts
   - Hourly updates
   - County-level detail

3. **FEMA Disasters** (source='FEMA')
   - Presidential declarations
   - Last 90 days
   - Weekly updates
   - State-level context

4. **NFIRS Fire Incidents** (source='fire_state')
   - Fire incident reports
   - Awaiting API credentials
   - Daily updates (when active)
   - Address-level detail

### Dashboard Display

All sources appear in the same `loss_events` table:

```sql
-- View all federal sources
SELECT 
  source,
  COUNT(*) as count,
  AVG(severity) as avg_severity,
  MAX(created_at) as latest_ingestion
FROM loss_events
WHERE source IN ('NOAA', 'NWS', 'FEMA')
GROUP BY source
ORDER BY count DESC;
```

**Expected output:**
```
source | count | avg_severity | latest_ingestion
-------|-------|--------------|------------------
NWS    | 47    | 0.72         | 2025-01-13 14:00:00
NOAA   | 20    | 0.65         | 2025-01-13 00:00:00
FEMA   | 15    | 0.88         | 2025-01-13 00:00:00
```

---

## 🎉 Success Criteria

After first run, you should see:

✅ **FEMA disasters in database** (typically 10-30 in last 90 days)  
✅ **High severity scores** (0.75-0.95 range)  
✅ **Recent major disasters** (hurricanes, wildfires, severe storms)  
✅ **Multiple states** (disasters from various locations)  
✅ **No duplicate disasters** (same disaster number not inserted twice)

---

## 📚 Resources

- **FEMA OpenFEMA API:** https://www.fema.gov/about/openfema/api
- **Disaster Declarations:** https://www.fema.gov/disaster/declarations
- **API Documentation:** https://www.fema.gov/about/openfema/data-sets

---

## 🔮 Future Enhancements

### Potential Improvements

1. **County-Level Precision**
   - Map FIPS county codes to county centroids
   - More precise location than state centroid
   - Show affected counties on map

2. **Disaster Details**
   - Store `declarationTitle` and `designatedArea`
   - Show disaster description in UI
   - Link to FEMA disaster page

3. **Multi-County Disasters**
   - Parse designated areas (can be multiple counties)
   - Create multiple events for multi-county disasters
   - More accurate geographic coverage

4. **Historical Analysis**
   - Track disaster patterns by state
   - Identify high-risk areas
   - Seasonal trend analysis

5. **Real-Time Alerts**
   - Monitor for new declarations
   - Alert when new disaster declared in target states
   - Push notifications for major disasters

---

## 🧪 Manual Test

To test the function immediately (without waiting for weekly schedule):

### Option 1: Netlify Dashboard
1. Go to Netlify Dashboard → Functions
2. Find `ingest-fema-disasters`
3. Click "Trigger function"
4. View logs for results

### Option 2: Local Test
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run function locally
netlify functions:invoke ingest-fema-disasters
```

### Option 3: Direct API Test
```bash
# Test FEMA API directly
curl "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?\$filter=declarationDate ge '2024-10-01'&\$top=10"
```

---

**Implementation Complete:** January 13, 2026  
**Status:** ✅ READY FOR DEPLOYMENT  
**API Cost:** $0 (free public API)  
**Maintenance:** None required (self-contained)  
**Schedule:** Weekly (Sunday midnight UTC)

---

**END OF DEPLOYMENT GUIDE**
