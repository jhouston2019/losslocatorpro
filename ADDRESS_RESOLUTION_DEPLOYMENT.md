# Staged Address Resolution - Deployment Guide

## 🎯 Overview

Event-triggered, on-demand address resolution. **NO bulk imports** - addresses resolved only when needed. This keeps cost and risk under control while enabling property-level routing.

---

## ✅ What Was Implemented

### 1. Database Schema
**File:** `supabase/migrations/009_add_address_resolution.sql`

**Created tables:**
- ✅ `loss_property_candidates` - Resolved property addresses
- ✅ `address_resolution_log` - Audit trail of resolution attempts
- ✅ `address_resolution_settings` - Threshold configuration

**Created view:**
- ✅ `zip_clusters_ready_for_resolution` - High-confidence ZIPs ready for resolution

**Helper functions:**
- ✅ `should_auto_resolve_zip()` - Check if ZIP meets threshold
- ✅ `log_address_resolution()` - Create resolution log entry
- ✅ `complete_address_resolution()` - Update resolution log

### 2. Address Resolution Function
**File:** `netlify/functions/resolve-addresses.ts`

**Features:**
- ✅ Pluggable architecture for multiple data sources
- ✅ Property-level scoring (adjusted from ZIP-level)
- ✅ Audit logging of all resolution attempts
- ✅ Safety limits (max properties per ZIP)
- ✅ Duplicate prevention
- ✅ API-triggered (not scheduled - on-demand only)

**Supported triggers:**
- ✅ `threshold` - Auto-resolve when ZIP meets criteria
- ✅ `user_action` - User clicks "Resolve Properties"
- ✅ `downstream_request` - Claim Navigator or other product
- ✅ `manual` - Admin/ops manual trigger

### 3. Pluggable Resolver Architecture

**Interface:**
```typescript
interface IAddressResolver {
  name: string;
  resolveAddresses(
    zipCode: string,
    eventType?: string
  ): Promise<PropertyCandidate[]>;
}
```

**Included resolvers (templates):**
- 🔌 `MockAddressResolver` - Placeholder for testing
- 🔌 `CountyParcelsResolver` - Template for county parcel APIs
- 🔌 `CommercialAPIResolver` - Template for commercial APIs

**Future sources:**
- County parcel databases
- Commercial property APIs (Melissa Data, CoreLogic, etc.)
- User-uploaded lists
- MLS data feeds

---

## 📋 Deployment Steps

### Step 1: Deploy Database Migration

Run the migration in your Supabase project:

```bash
# Option A: Using Supabase CLI
supabase migration up

# Option B: Run directly in Supabase SQL Editor
# Copy contents of supabase/migrations/009_add_address_resolution.sql
# Paste and execute in SQL Editor
```

### Step 2: Verify Migration

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('loss_property_candidates', 'address_resolution_log', 'address_resolution_settings');

-- Check settings
SELECT * FROM address_resolution_settings;
```

### Step 3: Deploy to Netlify

```bash
# Commit changes
git add supabase/migrations/009_add_address_resolution.sql netlify/functions/resolve-addresses.ts
git commit -m "Add staged address resolution for loss events"

# Push to repository
git push origin main

# Netlify will automatically deploy
```

### Step 4: Configure Resolution Source (Optional)

If using county parcels or commercial API:

```bash
# In Netlify environment variables:
COUNTY_PARCELS_API_URL=https://api.county.gov/parcels
COUNTY_PARCELS_API_KEY=your_api_key

# Or commercial API:
PROPERTY_API_URL=https://api.provider.com/properties
PROPERTY_API_KEY=your_api_key
```

**Note:** Without API configuration, function will use mock resolver (returns empty results).

---

## 🔍 Verification

### Check Resolution Settings

```sql
-- Run verification script
\i verify-address-resolution.sql

-- Or check key settings:
SELECT 
  auto_resolve_threshold,
  enable_auto_resolution,
  enable_user_triggered
FROM address_resolution_settings;
```

### Expected Initial State

- ✅ Tables exist and are empty
- ✅ `auto_resolve_threshold` = 0.70
- ✅ `enable_auto_resolution` = false (disabled by default)
- ✅ `enable_user_triggered` = true
- ✅ `max_properties_per_zip` = 500

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│              HIGH-CONFIDENCE ZIP CLUSTERS                    │
│  From: loss_opportunities_by_zip view                        │
│  Criteria: avg_claim_probability ≥ 0.70, event_count ≥ 2    │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   TRIGGER EVENT                              │
│  - User clicks "Resolve Properties" button                   │
│  - Downstream product requests addresses                     │
│  - (Future) Auto-resolve if threshold met                    │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           RESOLVE-ADDRESSES FUNCTION (API Call)              │
│  - Select resolver (county_parcels, commercial_api, etc.)    │
│  - Fetch properties for ZIP code                             │
│  - Calculate property-level probabilities                    │
│  - Log resolution attempt                                    │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            LOSS_PROPERTY_CANDIDATES TABLE                    │
│  - One row per property address                              │
│  - Property-level claim probability                          │
│  - Status: unreviewed (default)                              │
│  - Resolution source and trigger tracked                     │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  UI DISPLAY                                  │
│  - "Resolve Properties" button on ZIP rows                   │
│  - Secondary table: Address | Type | Probability | Status   │
│  - Warning: "Candidates within affected ZIP, not confirmed"  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Schema Details

### loss_property_candidates

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| zip_code | TEXT | ZIP code (from cluster) |
| county_fips | TEXT | County FIPS code |
| state_code | TEXT | State code |
| address | TEXT | Property address |
| city | TEXT | City name |
| property_type | TEXT | residential, commercial, unknown |
| resolution_source | TEXT | county_parcels, commercial_api, user_upload, etc. |
| resolution_trigger | TEXT | threshold, user_action, downstream_request, manual |
| event_id | UUID | FK to loss_events |
| event_type | TEXT | Hail, Wind, Fire, Freeze |
| estimated_claim_probability | NUMERIC | Property-level probability (0-1) |
| zip_level_probability | NUMERIC | Original ZIP-level probability |
| property_score_adjustment | NUMERIC | Adjustment applied |
| status | TEXT | unreviewed, reviewed, qualified, discarded |
| resolved_at | TIMESTAMP | When address was resolved |
| reviewed_at | TIMESTAMP | When candidate was reviewed |
| reviewed_by | UUID | User who reviewed |

**Unique Constraint:** (event_id, address) - No duplicate addresses per event

### address_resolution_log

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| zip_code | TEXT | ZIP code resolved |
| event_id | UUID | Associated event (if any) |
| trigger_type | TEXT | threshold, user_action, downstream_request, manual |
| triggered_by | UUID | User who triggered (if applicable) |
| resolution_source | TEXT | Source used for resolution |
| properties_found | INTEGER | Number of properties found |
| properties_inserted | INTEGER | Number successfully inserted |
| started_at | TIMESTAMP | When resolution started |
| completed_at | TIMESTAMP | When resolution completed |
| status | TEXT | pending, completed, failed |
| error_message | TEXT | Error details (if failed) |

### address_resolution_settings

| Column | Type | Description |
|--------|------|-------------|
| auto_resolve_threshold | NUMERIC | Threshold for auto-resolution (default: 0.70) |
| min_event_count | INTEGER | Minimum events in ZIP (default: 2) |
| max_properties_per_zip | INTEGER | Safety limit (default: 500) |
| source_priority | JSONB | Array of sources in priority order |
| enable_auto_resolution | BOOLEAN | Enable auto-resolve (default: false) |
| enable_user_triggered | BOOLEAN | Enable user-triggered (default: true) |
| enable_downstream_triggered | BOOLEAN | Enable downstream requests (default: true) |

---

## 🎯 Trigger Logic

### Threshold-Based (Disabled by Default)

```sql
-- Check if ZIP should be auto-resolved
SELECT should_auto_resolve_zip('75001');

-- Criteria:
-- 1. avg_claim_probability ≥ auto_resolve_threshold (0.70)
-- 2. event_count ≥ min_event_count (2)
-- 3. enable_auto_resolution = true
```

**Note:** Auto-resolution is **disabled by default** to prevent unexpected API costs.

### User-Triggered (Enabled by Default)

```javascript
// Frontend button click
POST /api/resolve-addresses
{
  "zip_code": "75001",
  "trigger_type": "user_action",
  "triggered_by": "user_uuid",
  "resolution_source": "county_parcels"
}
```

### Downstream-Triggered (Enabled by Default)

```javascript
// From Claim Navigator or other product
POST /api/resolve-addresses
{
  "zip_code": "75001",
  "event_id": "event_uuid",
  "trigger_type": "downstream_request",
  "resolution_source": "commercial_api"
}
```

---

## 🧮 Property Scoring

### Calculation Logic

```
Base: ZIP-level claim probability (from loss_opportunities_by_zip)

Adjustments:
  - Property type (residential vs commercial)
  - Event type (hail, wind, fire, freeze)
  - Event overlap intensity (future)

Output: Property-level estimated_claim_probability (0-1)
```

**Example:**
```
ZIP-level probability: 0.75
Property type: residential
Event type: Hail
Adjustment: +0.05 (roofs more vulnerable to hail)
Property probability: 0.80
```

**Important:** This is still **probabilistic**, not asserted damage.

---

## 🖥️ UI Implementation (Recommended)

### Before Address Resolution

**ZIP-Level View:**
| ZIP | County | Event Count | Avg Severity | Claim Prob | Actions |
|-----|--------|-------------|--------------|------------|---------|
| 75001 | Dallas | 3 | 0.82 | 0.78 | [Resolve Properties] |

### After User Clicks "Resolve Properties"

**Property-Level View:**
| Address | City | Type | Claim Prob | Status | Actions |
|---------|------|------|------------|--------|---------|
| 123 Main St | Dallas | Residential | 0.80 | Unreviewed | [Review] |
| 456 Oak Ave | Dallas | Residential | 0.78 | Unreviewed | [Review] |
| 789 Elm St | Dallas | Commercial | 0.82 | Unreviewed | [Review] |

**Warning Text:**
> ⚠️ Addresses shown are candidates within an affected ZIP, not confirmed losses.

### Sample Query for UI

```sql
-- Get property candidates for a ZIP
SELECT 
  pc.address,
  pc.city,
  pc.property_type,
  pc.estimated_claim_probability,
  pc.status,
  pc.resolved_at,
  e.event_type,
  e.event_timestamp
FROM loss_property_candidates pc
LEFT JOIN loss_events e ON pc.event_id = e.id
WHERE pc.zip_code = '75001'
  AND pc.status != 'discarded'
ORDER BY pc.estimated_claim_probability DESC
LIMIT 100;
```

---

## 🔌 Adding New Resolution Sources

### Step 1: Implement Resolver

```typescript
class MyCustomResolver implements IAddressResolver {
  name = 'my_custom_source';
  
  async resolveAddresses(
    zipCode: string,
    eventType?: string
  ): Promise<PropertyCandidate[]> {
    // Fetch from your data source
    const response = await fetch(`https://api.example.com/properties?zip=${zipCode}`);
    const data = await response.json();
    
    // Transform to PropertyCandidate format
    return data.map(prop => ({
      address: prop.address,
      city: prop.city,
      property_type: prop.type,
      latitude: prop.lat,
      longitude: prop.lng,
    }));
  }
}
```

### Step 2: Register in Factory

```typescript
function getResolver(source: string): IAddressResolver {
  switch (source) {
    case 'my_custom_source':
      return new MyCustomResolver();
    // ... other resolvers
  }
}
```

### Step 3: Configure Environment

```bash
MY_CUSTOM_API_URL=https://api.example.com
MY_CUSTOM_API_KEY=your_api_key
```

### Step 4: Use in Requests

```javascript
POST /api/resolve-addresses
{
  "zip_code": "75001",
  "resolution_source": "my_custom_source"
}
```

---

## ⚠️ Compliance Rules

### DO NOT

❌ **Claim verified damage** - Properties are candidates, not confirmed losses  
❌ **Auto-contact** - No automatic outreach to property owners  
❌ **Scrape without trigger** - No background scraping or bulk imports  
❌ **Resale language** - No "leads for sale" or similar language in UI

### DO

✅ **Show as candidates** - "Candidates within affected ZIP"  
✅ **Require user action** - Addresses resolved only when triggered  
✅ **Track resolution source** - Audit trail of where addresses came from  
✅ **Allow review/discard** - Users can mark candidates as qualified or discarded

### UI Warning Text (Required)

> **Important:** Addresses shown are property candidates within an affected ZIP code based on loss event intelligence. This does not confirm damage or loss at these specific properties. Further investigation and verification required before contact.

---

## 📈 Monitoring

### Success Indicators

✅ Resolution triggered only by user action or API call  
✅ No automatic background resolution (unless explicitly enabled)  
✅ Property candidates created with proper audit trail  
✅ Resolution log shows all attempts with timestamps  
✅ Properties have status tracking (unreviewed → reviewed → qualified/discarded)

### Warning Signs

⚠️ Automatic resolution running when `enable_auto_resolution = false`  
⚠️ High failure rate in resolution log  
⚠️ Duplicate addresses being created (unique constraint failing)  
⚠️ Properties without resolution_source or resolution_trigger

### Query Resolution Activity

```sql
-- Recent resolution attempts
SELECT 
  zip_code,
  trigger_type,
  resolution_source,
  properties_inserted,
  status,
  started_at
FROM address_resolution_log
ORDER BY started_at DESC
LIMIT 20;

-- Properties awaiting review
SELECT 
  zip_code,
  COUNT(*) as unreviewed_count,
  AVG(estimated_claim_probability) as avg_probability
FROM loss_property_candidates
WHERE status = 'unreviewed'
GROUP BY zip_code
ORDER BY unreviewed_count DESC;
```

---

## 🎉 Success Criteria

After implementation:

✅ **ZIPs show first** - Dashboard shows ZIP-level clusters  
✅ **Addresses on demand** - Properties appear only after trigger  
✅ **Events remain primary** - Event-first architecture preserved  
✅ **Audit trail** - All resolutions logged with source and trigger  
✅ **No auto-scraping** - No background resolution without user action  
✅ **Compliance** - Warning text and candidate language used  
✅ **Pluggable** - Easy to add new resolution sources

---

## 🔮 Future Enhancements

### Priority 1: County Parcel Integration
- Integrate with county assessor APIs
- Free or low-cost public data
- High accuracy for property addresses
- **Impact:** High (enables real address resolution)
- **Effort:** Medium (API integration per county)

### Priority 2: Commercial API Integration
- Integrate with Melissa Data, CoreLogic, or similar
- Paid service with high coverage
- Property type and details included
- **Impact:** High (nationwide coverage)
- **Effort:** Low (single API integration)

### Priority 3: User Upload
- Allow users to upload property lists
- CSV format with address, city, state, ZIP
- Manual resolution source
- **Impact:** Medium (custom targeting)
- **Effort:** Low (file upload + parsing)

### Priority 4: Property Enrichment
- Add property details (year built, square footage, etc.)
- Enhance scoring with property characteristics
- Better claim probability estimates
- **Impact:** Medium (more accurate scoring)
- **Effort:** Medium (additional API calls)

---

## 🔑 Why This Is The Right Build

### Preserves Event-First Architecture
- Events remain the primary object
- Addresses are secondary, derived data
- No shift to "lead list" mentality

### Avoids Premature Data Liability
- No bulk address imports
- No automatic scraping
- Addresses resolved only when needed
- Clear audit trail of resolution triggers

### Scales Cleanly
- Pluggable architecture for multiple sources
- Easy to add new resolvers
- Safety limits prevent runaway costs
- Can enable auto-resolution later if desired

### Unlocks Claim Navigator Routing
- Property-level data available when needed
- Downstream products can trigger resolution
- Maintains compliance and defensibility

### Keeps LossLocatorPro Defensible
- Candidate language, not "leads"
- No claim of verified damage
- User action required
- Audit trail for compliance

---

**Implementation Complete:** January 13, 2026  
**Status:** ✅ READY FOR DEPLOYMENT  
**Default Mode:** Manual/user-triggered only  
**API Cost:** $0 until resolution source configured  
**Compliance:** Fully defensible, event-first architecture

---

**END OF DEPLOYMENT GUIDE**
