# ZIP/County-Level Aggregation - Deployment Guide

## 🎯 Overview

This implementation converts event intelligence into geographic opportunity clusters at ZIP and county levels. No addresses yet - clean, defensible, aggregated data for routing and dashboards.

---

## ✅ What Was Implemented

### 1. Database Schema Extensions
**File:** `supabase/migrations/008_add_geo_aggregation.sql`

**Extended `loss_events` table:**
- ✅ `county_fips` (TEXT) - County FIPS code (5 digits)
- ✅ `zip_codes` (TEXT[]) - Array of affected ZIP codes
- ✅ `geo_resolution_level` (ENUM) - state | county | zip | point
- ✅ `confidence_level` (ENUM) - forecast | active | declared | confirmed

**Created new tables:**
- ✅ `loss_geo_aggregates` - ZIP/county-level opportunity clusters
- ✅ `zip_county_crosswalk` - ZIP to county FIPS mapping

**Created views:**
- ✅ `loss_opportunities_by_zip` - Aggregated opportunities by ZIP
- ✅ `loss_opportunities_by_county` - Aggregated opportunities by county

### 2. Geo Resolution Enrichment Function
**File:** `netlify/functions/enrich-geo-resolution.ts`

**Features:**
- ✅ Resolves events to ZIP codes and counties
- ✅ Uses Census Geocoding API for coordinate → ZIP/county
- ✅ Handles state-level, county-level, and point-level events
- ✅ Populates `loss_geo_aggregates` table
- ✅ Determines confidence level based on source
- ✅ Scheduled daily at 6 AM UTC

### 3. Helper Functions
**SQL Functions:**
- ✅ `populate_geo_aggregates_for_event()` - Creates aggregates for an event
- ✅ Automatic timestamp updates on aggregate changes

---

## 📋 Deployment Steps

### Step 1: Deploy Database Migration

Run the migration in your Supabase project:

```bash
# Option A: Using Supabase CLI
supabase migration up

# Option B: Run directly in Supabase SQL Editor
# Copy contents of supabase/migrations/008_add_geo_aggregation.sql
# Paste and execute in SQL Editor
```

### Step 2: Verify Migration

```sql
-- Check new columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'loss_events'
AND column_name IN ('county_fips', 'zip_codes', 'geo_resolution_level', 'confidence_level');

-- Check new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('loss_geo_aggregates', 'zip_county_crosswalk');
```

### Step 3: Deploy to Netlify

```bash
# Commit changes
git add supabase/migrations/008_add_geo_aggregation.sql netlify/functions/enrich-geo-resolution.ts netlify.toml
git commit -m "Add ZIP and county-level loss aggregation"

# Push to repository
git push origin main

# Netlify will automatically deploy
```

### Step 4: (Optional) Load ZIP-County Crosswalk Data

The crosswalk table enables county → ZIP resolution. You can populate it from:

**Option A: HUD USPS ZIP-County Crosswalk**
- Download: https://www.huduser.gov/portal/datasets/usps_crosswalk.html
- Format: CSV with ZIP, County FIPS, State
- Load into `zip_county_crosswalk` table

**Option B: Census ZIP Code Tabulation Areas**
- Download: https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.html
- Format: CSV with ZCTA to County relationships

**Sample Load Script:**
```sql
-- Example: Load from CSV (adjust path and format)
COPY zip_county_crosswalk (zip_code, county_fips, state_code, county_name)
FROM '/path/to/zip_county_crosswalk.csv'
DELIMITER ','
CSV HEADER;
```

**Note:** Crosswalk is optional. The enrichment function will work without it using Census Geocoding API.

---

## 🔍 Verification

### Check Enrichment Status

```sql
-- Run verification script
\i verify-geo-aggregation.sql

-- Or check key metrics:
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN zip_codes IS NOT NULL THEN 1 END) as with_zips,
  COUNT(CASE WHEN county_fips IS NOT NULL THEN 1 END) as with_county,
  COUNT(CASE WHEN geo_resolution_level IS NOT NULL THEN 1 END) as with_resolution
FROM loss_events;
```

### Expected Results After First Run

- ✅ All events have `geo_resolution_level` populated
- ✅ All events have `confidence_level` populated
- ✅ 80%+ events have `zip_codes` populated
- ✅ 70%+ events have `county_fips` populated
- ✅ `loss_geo_aggregates` has rows (1+ per event per ZIP)

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    EXISTING LOSS EVENTS                      │
│  From: NOAA, NWS, FEMA (with state, coordinates, or ZIP)    │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           ENRICH-GEO-RESOLUTION FUNCTION (Daily)             │
│  - Reverse geocode coordinates → ZIP + County                │
│  - Lookup ZIP → County from crosswalk                        │
│  - Lookup County → ZIPs from crosswalk                       │
│  - Determine geo_resolution_level                            │
│  - Determine confidence_level                                │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              UPDATED LOSS_EVENTS TABLE                       │
│  + county_fips                                               │
│  + zip_codes (array)                                         │
│  + geo_resolution_level                                      │
│  + confidence_level                                          │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            LOSS_GEO_AGGREGATES TABLE                         │
│  One row per event per ZIP code                              │
│  - ZIP-level severity and claim probability                  │
│  - County FIPS for grouping                                  │
│  - Event type, timestamp, confidence                         │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  AGGREGATE VIEWS                             │
│  - loss_opportunities_by_zip                                 │
│  - loss_opportunities_by_county                              │
│  Ready for dashboards and routing                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Schema Details

### loss_events (Extended)

| Column | Type | Description |
|--------|------|-------------|
| county_fips | TEXT | County FIPS code (e.g., "48201" for Harris County, TX) |
| zip_codes | TEXT[] | Array of affected ZIP codes |
| geo_resolution_level | ENUM | Geographic precision: state, county, zip, point |
| confidence_level | ENUM | Data confidence: forecast, active, declared, confirmed |

### loss_geo_aggregates (New)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| event_id | UUID | FK to loss_events |
| state_code | TEXT | Two-letter state code |
| county_fips | TEXT | County FIPS code |
| zip_code | TEXT | ZIP code |
| event_type | TEXT | Hail, Wind, Fire, Freeze |
| severity_score | NUMERIC | 0-1 scale |
| claim_probability | NUMERIC | 0-1 scale |
| event_timestamp | TIMESTAMP | When event occurred |
| confidence_level | ENUM | forecast, active, declared, confirmed |
| source | TEXT | NOAA, NWS, FEMA, etc. |

**Unique Constraint:** (event_id, zip_code) - One aggregate per event per ZIP

### zip_county_crosswalk (New)

| Column | Type | Description |
|--------|------|-------------|
| zip_code | TEXT | ZIP code |
| county_fips | TEXT | County FIPS code |
| state_code | TEXT | Two-letter state code |
| county_name | TEXT | County name |
| residential_ratio | NUMERIC | Population weight (for multi-county ZIPs) |

---

## 🎯 Geo Resolution Logic

### Resolution Levels

**Point (Highest Precision):**
- Event has latitude/longitude coordinates
- Reverse geocoded to ZIP and county
- Example: NOAA storm report at specific location

**ZIP:**
- Event resolved to specific ZIP code(s)
- May have coordinates or ZIP from source
- Example: NWS alert for specific ZIP

**County:**
- Event known at county level
- All ZIPs in county populated
- Example: FEMA disaster for entire county

**State (Lowest Precision):**
- Event only known at state level
- Used as fallback
- Example: State-wide FEMA declaration

### Confidence Levels

**Forecast:**
- NWS alerts and warnings
- Predictive, not yet confirmed
- Example: Tornado Watch

**Active:**
- Real-time reports
- Fire incidents, CAD calls
- Example: Active fire incident

**Declared:**
- Official declarations
- FEMA disasters
- Example: Presidential disaster declaration

**Confirmed:**
- Verified past events
- NOAA storm reports
- Example: Confirmed hail report

---

## 🧮 Claim Probability Adjustment

### ZIP-Level Probability

The system calculates "Probability of claim activity in this ZIP" (not address-level):

```
Base: Event severity (from source)
Adjustments:
  - Event type factor
  - Confidence level factor
  - Geographic spread factor

Output: ZIP-level claim probability (0-1)
```

**Example:**
- Event: Hurricane (severity 0.95)
- Confidence: Declared (FEMA)
- Spans: 50 ZIP codes
- ZIP-level probability: 0.85 (high but distributed)

---

## 📈 Monitoring

### Success Indicators

✅ Enrichment function runs daily without errors  
✅ 80%+ events have ZIP codes populated  
✅ 70%+ events have county FIPS populated  
✅ All events have geo_resolution_level  
✅ All events have confidence_level  
✅ Aggregates created for each event × ZIP combination

### Warning Signs

⚠️ High percentage of events stuck at 'state' resolution  
⚠️ No aggregates created (function not running)  
⚠️ ZIP codes array empty for point-level events  
⚠️ County FIPS missing for events with coordinates

### Netlify Function Logs

```bash
# View enrichment logs
netlify functions:log enrich-geo-resolution

# Expected output:
🗺️ Starting geo resolution enrichment...
📊 Found 45 events to enrich
✅ Enriched NOAA event: 1 ZIPs, point resolution
✅ Enriched NWS event: 15 ZIPs, county resolution
✅ Enriched FEMA event: 50 ZIPs, county resolution
🎉 Geo resolution enrichment complete: { enriched: 45, aggregates_created: 66, errors: 0 }
```

---

## 🔄 Integration with Existing System

### Before This Implementation

```sql
SELECT 
  event_type,
  state_code,
  zip,
  severity
FROM loss_events
WHERE state_code = 'TX';
```

**Result:** Event-level data, single ZIP per event

### After This Implementation

```sql
-- Option 1: Use aggregate view
SELECT 
  zip_code,
  event_type,
  event_count,
  avg_severity,
  avg_claim_probability
FROM loss_opportunities_by_zip
WHERE state_code = 'TX'
ORDER BY avg_severity DESC;

-- Option 2: Use aggregates table directly
SELECT 
  zip_code,
  COUNT(DISTINCT event_id) as opportunity_count,
  AVG(severity_score) as avg_severity,
  MAX(event_timestamp) as latest_event
FROM loss_geo_aggregates
WHERE state_code = 'TX'
GROUP BY zip_code
ORDER BY opportunity_count DESC;
```

**Result:** ZIP-level opportunity clusters, multiple events per ZIP

---

## 🖥️ UI Updates (Recommended)

### Dashboard Table View

**Before:**
| Event Type | State | ZIP | Severity | Status |
|------------|-------|-----|----------|--------|
| Hail | TX | 75001 | 0.85 | Unreviewed |

**After:**
| ZIP | County | Event Count | Avg Severity | Claim Prob | Latest Event |
|-----|--------|-------------|--------------|------------|--------------|
| 75001 | Dallas | 3 | 0.82 | 0.78 | 2025-01-13 |

**Tooltip:** "ZIP-level opportunity cluster based on 3 active loss events"

### Filters

Add filters for:
- ✅ ZIP code
- ✅ County FIPS
- ✅ Event type
- ✅ Confidence level
- ✅ Geo resolution level

### Sample Query for UI

```sql
-- Get top opportunity ZIPs for dashboard
SELECT 
  z.zip_code,
  z.state_code,
  z.county_fips,
  c.county_name,
  z.event_type,
  z.event_count,
  z.avg_severity,
  z.avg_claim_probability,
  z.latest_event,
  z.confidence_levels
FROM loss_opportunities_by_zip z
LEFT JOIN zip_county_crosswalk c 
  ON z.zip_code = c.zip_code 
  AND z.county_fips = c.county_fips
WHERE z.avg_severity > 0.70
  AND z.latest_event > NOW() - INTERVAL '30 days'
ORDER BY z.avg_severity DESC, z.event_count DESC
LIMIT 100;
```

---

## 🎉 Success Criteria

After 24 hours of operation:

✅ **All events enriched** with geo resolution and confidence  
✅ **ZIP codes populated** for 80%+ of events  
✅ **County FIPS populated** for 70%+ of events  
✅ **Aggregates created** (1-50+ per event depending on scope)  
✅ **Views return data** for dashboard queries  
✅ **No address fields** filled (clean, defensible)  
✅ **Existing events** still visible and functional

---

## 📚 Resources

- **Census Geocoding API:** https://geocoding.geo.census.gov/geocoder/
- **HUD ZIP-County Crosswalk:** https://www.huduser.gov/portal/datasets/usps_crosswalk.html
- **County FIPS Codes:** https://www.census.gov/library/reference/code-lists/ansi.html

---

## 🔮 Future Enhancements

### Priority 1: Load ZIP-County Crosswalk
- Download HUD crosswalk data
- Load into `zip_county_crosswalk` table
- Enables county → ZIP resolution without API calls
- **Impact:** High (faster enrichment, offline capability)
- **Effort:** Low (one-time data load)

### Priority 2: Multi-County Event Handling
- Parse FEMA designated areas (multi-county)
- Create separate aggregates per county
- More precise geographic distribution
- **Impact:** Medium (better FEMA disaster resolution)
- **Effort:** Medium (parsing logic)

### Priority 3: Property Type Distribution
- Add property type mix per ZIP (res vs commercial)
- Adjust claim probability based on property distribution
- **Impact:** Medium (more accurate probabilities)
- **Effort:** Medium (requires property data)

### Priority 4: Historical Aggregation
- Track aggregate changes over time
- Show trending opportunity areas
- Historical claim probability adjustments
- **Impact:** High (predictive insights)
- **Effort:** High (time-series analysis)

---

**Implementation Complete:** January 13, 2026  
**Status:** ✅ READY FOR DEPLOYMENT  
**API Cost:** $0 (Census Geocoding API is free)  
**Maintenance:** Automatic daily enrichment  
**Schedule:** Daily at 6 AM UTC

---

**END OF DEPLOYMENT GUIDE**
