# Loss Events Table Consolidation Plan

## Executive Decision

✅ **`loss_events` is the canonical table for ALL loss intelligence**
- `loss_signals` is experimental/supporting only
- All ingestion functions will target `loss_events`
- No database schema changes required at this stage

---

## Field Mapping Strategy

### Canonical Field Mapping (Code-Level)

| Logical Field | Actual Column in `loss_events` | Notes |
|--------------|-------------------------------|-------|
| `type` | `event_type` | Existing column, values: 'Hail', 'Wind', 'Fire', 'Freeze' |
| `occurred_at` | `event_timestamp` | Existing column, TIMESTAMP WITH TIME ZONE |
| `latitude` | `latitude` | Preferred coordinate field |
| `longitude` | `longitude` | Preferred coordinate field |
| `zip` | `zip` | Existing column, TEXT |
| `severity` | `severity` | Existing column, NUMERIC |
| `source` | `source` | Existing column for source tracking |
| `dedup_id` | `source_event_id` | Existing column for duplicate prevention |
| `state` | `state_code` | Existing column |
| `confidence` | `claim_probability` | Repurpose existing column (0-1 scale) |
| `raw_payload` | *(not stored)* | Omit for now, add later if needed |
| `address` | *(not stored)* | Omit for now, add later if needed |

### Legacy Fields (Maintain for Backward Compatibility)
- `lat` / `lng` - Keep populated alongside `latitude`/`longitude`
- `priority_score` - Calculate from severity
- `status` - Default to 'Unreviewed'
- `property_type` - Default to 'residential'

---

## Current State Analysis

### ✅ Already Using `loss_events`
1. **`ingest-noaa-events.ts`** - NOAA severe weather ingestion
   - Correctly uses `event_type`, `event_timestamp`, `latitude`, `longitude`
   - Properly implements deduplication with `source` + `source_event_id`

### ⚠️ Currently Using `loss_signals` (Need Migration)
1. **`ingest-fire-incidents.ts`** - NFIRS fire incident ingestion
2. **`ingest-cad-feeds.ts`** - Municipal CAD fire call ingestion  
3. **`ingest-news-feeds.ts`** - RSS news article ingestion

---

## Implementation Tasks

### Task 1: Update Fire Incidents Ingestion ✅
**File:** `netlify/functions/ingest-fire-incidents.ts`

**Changes Required:**
- Change target table from `loss_signals` → `loss_events`
- Update field mapping in `normalizeFireIncident()`:
  - `source_type` → `source` (combine source_type + source_name)
  - `event_type` → `event_type` (map to: 'Fire', 'Wind', 'Hail', 'Freeze')
  - `occurred_at` → `event_timestamp`
  - `lat`/`lng` → `latitude`/`longitude` (also populate legacy `lat`/`lng`)
  - `severity_raw` → `severity` (normalize to 0-1 scale)
  - `confidence_raw` → `claim_probability`
  - `external_id` → `source_event_id`
  - Drop: `source_name`, `reported_at`, `geometry`, `address_text`, `city`, `raw_data`

### Task 2: Update CAD Feeds Ingestion ✅
**File:** `netlify/functions/ingest-cad-feeds.ts`

**Changes Required:**
- Change target table from `loss_signals` → `loss_events`
- Update field mapping in `normalizeCADIncident()`:
  - Same mapping as fire incidents
  - All CAD events are 'Fire' type

### Task 3: Update News Feeds Ingestion ✅
**File:** `netlify/functions/ingest-news-feeds.ts`

**Changes Required:**
- Change target table from `loss_signals` → `loss_events`
- Update field mapping in normalization function
- Map extracted event types to canonical types

### Task 4: Add Required Fields to All Ingestions ✅
Ensure all ingestion functions populate:
- `zip` (required) - use '00000' as placeholder if unavailable
- `status` = 'Unreviewed'
- `property_type` = 'residential'
- `priority_score` = calculated from severity

---

## Event Type Mapping

### Standardized Event Types in `loss_events`
- `'Fire'` - Structure fires, wildfires, fire incidents
- `'Wind'` - High winds, straight-line winds, thunderstorm winds
- `'Hail'` - Hail storms
- `'Freeze'` - Freeze events, ice storms

### Source-Specific Mappings

**Fire Sources (NFIRS, CAD):**
- All incidents → `'Fire'`

**NOAA Weather:**
- Hail reports → `'Hail'`
- Wind reports → `'Wind'`
- Tornado → `'Wind'`
- Freeze → `'Freeze'`

**News Feeds:**
- Fire-related → `'Fire'`
- Storm/wind → `'Wind'`
- Hail → `'Hail'`
- Default → `'Fire'` (most news articles are about fires)

---

## Severity Normalization

All sources should normalize severity to **0-1 scale** for the `severity` column:

### Fire Incidents (NFIRS)
```
Estimated Loss:
- < $10k   → 0.25
- $10k-50k → 0.50
- $50k-100k → 0.75
- > $100k  → 0.90
```

### CAD Feeds
```
Call Type:
- Alarm          → 0.30
- Fire (general) → 0.40
- Structure Fire → 0.70
- Working Fire   → 0.80
+ Priority adjustment: +0.15 for high priority
```

### NOAA Weather (Already Implemented)
```
Hail: size-based (0.3 - 0.9)
Wind: speed-based (0.3 - 0.9)
```

### News Feeds
```
Based on article content analysis
Default: 0.50 (moderate)
```

---

## Deduplication Strategy

All sources use the same pattern:
```typescript
const { error } = await supabase
  .from('loss_events')
  .upsert(eventData, {
    onConflict: 'source,source_event_id',
    ignoreDuplicates: true
  });
```

**Unique constraint:** `(source, source_event_id)`
- Prevents same event from same source being inserted twice
- Different sources can report the same real-world event (handled by clustering later)

---

## Testing Checklist

After implementation:
- [ ] Run each ingestion function
- [ ] Verify data appears in `loss_events` table
- [ ] Confirm no duplicate entries
- [ ] Check field mappings are correct
- [ ] Verify event types are valid
- [ ] Confirm severity values are 0-1 scale
- [ ] Test with missing optional fields (zip, coordinates)

---

## Future Enhancements (Not in Scope)

1. Add `address` TEXT column to `loss_events`
2. Add `raw_payload` JSONB column for full audit trail
3. Add `confidence_score` column (separate from claim_probability)
4. Migrate historical data from `loss_signals` to `loss_events`
5. Deprecate/archive `loss_signals` table

---

## Success Criteria

✅ All ingestion functions write to `loss_events`
✅ No code references `loss_signals` for ingestion
✅ Field mappings are consistent across all sources
✅ Deduplication works correctly
✅ Data quality maintained (no data loss)
✅ Existing NOAA ingestion continues to work



