# Loss Events Field Mapping Reference

Quick reference for all ingestion functions.

---

## Canonical Field Mapping

| Logical Field | Column in `loss_events` | Type | Required | Default/Fallback |
|--------------|------------------------|------|----------|------------------|
| `type` | `event_type` | TEXT | ✅ Yes | N/A |
| `occurred_at` | `event_timestamp` | TIMESTAMP | ✅ Yes | N/A |
| `severity` | `severity` | NUMERIC | ✅ Yes | N/A |
| `zip` | `zip` | TEXT | ✅ Yes | `'00000'` |
| `latitude` | `latitude` | NUMERIC | ❌ No | `null` |
| `longitude` | `longitude` | NUMERIC | ❌ No | `null` |
| `lat` (legacy) | `lat` | NUMERIC | ❌ No | `null` |
| `lng` (legacy) | `lng` | NUMERIC | ❌ No | `null` |
| `state` | `state_code` | TEXT | ❌ No | `null` |
| `source` | `source` | TEXT | ✅ Yes | N/A |
| `dedup_id` | `source_event_id` | TEXT | ✅ Yes | N/A |
| `confidence` | `claim_probability` | NUMERIC | ❌ No | Source-specific |
| `priority` | `priority_score` | INTEGER | ❌ No | `Math.round(severity * 100)` |
| `status` | `status` | TEXT | ✅ Yes | `'Unreviewed'` |
| `property_type` | `property_type` | TEXT | ❌ No | `'residential'` |

---

## Event Type Values

Valid values for `event_type` column:

- `'Fire'` - Structure fires, wildfires, fire incidents
- `'Wind'` - High winds, straight-line winds, storms
- `'Hail'` - Hail storms
- `'Freeze'` - Freeze events, ice storms

---

## Source-Specific Mappings

### NOAA Weather (`ingest-noaa-events.ts`)

```typescript
{
  event_type: 'Hail' | 'Wind' | 'Freeze',
  event_timestamp: report.reportTime,
  severity: 0.3 - 0.9,              // Based on hail size or wind speed
  zip: zip || '00000',
  state_code: stateCode,
  latitude: report.lat,
  longitude: report.lon,
  lat: report.lat,
  lng: report.lon,
  source: 'NOAA',
  source_event_id: eventId,
  claim_probability: calculated,    // Based on event severity
  priority_score: Math.round(severity * 100),
  status: 'Unreviewed',
  property_type: 'residential'
}
```

### Fire Incidents (`ingest-fire-incidents.ts`)

```typescript
{
  event_type: 'Fire',
  event_timestamp: incident.incident_date,
  severity: 0.25 | 0.50 | 0.75 | 0.90,  // Based on estimated loss
  zip: incident.zip || '00000',
  state_code: incident.state,
  latitude: incident.latitude,
  longitude: incident.longitude,
  lat: incident.latitude,
  lng: incident.longitude,
  source: 'fire_report:NFIRS_API',
  source_event_id: incident.id,
  claim_probability: 0.65,
  priority_score: Math.round(severity * 100),
  status: 'Unreviewed',
  property_type: 'residential'
}
```

**Severity Scale:**
- < $10k → 0.25
- $10k-50k → 0.50
- $50k-100k → 0.75
- > $100k → 0.90

### CAD Feeds (`ingest-cad-feeds.ts`)

```typescript
{
  event_type: 'Fire',
  event_timestamp: incident.call_time,
  severity: 0.30 - 0.90,            // Based on call type + priority
  zip: incident.zip || '00000',
  state_code: incident.state,
  latitude: incident.latitude,
  longitude: incident.longitude,
  lat: incident.latitude,
  lng: incident.longitude,
  source: 'cad:PulsePoint' | 'cad:Active911' | 'cad:Municipal_CAD',
  source_event_id: incident.id,
  claim_probability: 0.55,
  priority_score: Math.round(severity * 100),
  status: 'Unreviewed',
  property_type: 'residential'
}
```

**Severity Scale:**
- Fire Alarm → 0.30
- Fire (general) → 0.40
- Structure Fire → 0.70
- Working Fire → 0.80
- + High Priority → +0.15 (max 0.90)

### News Feeds (`ingest-news-feeds.ts`)

```typescript
{
  event_type: 'Fire' | 'Wind' | 'Hail' | 'Freeze',
  event_timestamp: article.pubDate,
  severity: 0.40 | 0.50 | 0.80,     // Based on article keywords
  zip: extracted_zip || '00000',
  state_code: extracted_state,
  latitude: geocoded_lat,
  longitude: geocoded_lng,
  lat: geocoded_lat,
  lng: geocoded_lng,
  source: 'news:Local_News_Fire' | 'news:Emergency_News',
  source_event_id: article.id,
  claim_probability: 0.60,
  priority_score: Math.round(severity * 100),
  status: 'Unreviewed',
  property_type: 'residential'
}
```

**Severity Scale:**
- Severe keywords (destroyed, total loss) → 0.80
- Default → 0.50
- Moderate keywords (damaged, minor) → 0.40

---

## Deduplication Pattern

All sources use the same pattern:

```typescript
const { error } = await supabase
  .from('loss_events')
  .upsert(eventData, {
    onConflict: 'source,source_event_id',
    ignoreDuplicates: true
  });

if (error) {
  if (error.code === '23505') {
    // Duplicate - skip
    skippedCount++;
  } else {
    // Real error - log it
    errors.push(error.message);
  }
} else {
  // Success
  insertedCount++;
}
```

---

## Source Naming Convention

Format: `{source_type}:{source_name}`

| Source Type | Example Values |
|------------|----------------|
| NOAA | `'NOAA'` |
| Fire Reports | `'fire_report:NFIRS_API'` |
| CAD | `'cad:PulsePoint'`, `'cad:Active911'`, `'cad:Municipal_CAD'` |
| News | `'news:Local_News_Fire'`, `'news:Emergency_News'` |

---

## Required vs Optional Fields

### Always Required
- `event_type`
- `event_timestamp`
- `severity`
- `zip` (use `'00000'` if unavailable)
- `source`
- `source_event_id`
- `status` (always `'Unreviewed'`)

### Optional (can be null)
- `latitude` / `longitude` / `lat` / `lng`
- `state_code`
- `claim_probability` (but recommended)
- `priority_score` (but recommended)
- `property_type` (defaults to `'residential'`)

---

## Coordinate Fields

**Best Practice:** Populate both new and legacy coordinate fields

```typescript
latitude: coords,    // Preferred
longitude: coords,   // Preferred
lat: coords,         // Legacy (for backward compatibility)
lng: coords,         // Legacy (for backward compatibility)
```

---

## TypeScript Type Reference

```typescript
interface LossEventInsert {
  // Required
  event_type: 'Fire' | 'Wind' | 'Hail' | 'Freeze';
  event_timestamp: string;  // ISO 8601 timestamp
  severity: number;         // 0-1 scale
  zip: string;
  source: string;
  source_event_id: string;
  status: 'Unreviewed' | 'Contacted' | 'Qualified' | 'Converted';
  
  // Optional
  state_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;
  claim_probability?: number | null;  // 0-1 scale
  priority_score?: number | null;     // 0-100 scale
  property_type?: 'residential' | 'commercial' | null;
  income_band?: string | null;
}
```

---

## Quick Checklist for New Ingestion Functions

When adding a new ingestion source:

- [ ] Use `loss_events` table
- [ ] Map to canonical event types: `'Fire'`, `'Wind'`, `'Hail'`, `'Freeze'`
- [ ] Normalize severity to 0-1 scale
- [ ] Use `'00000'` as ZIP fallback
- [ ] Populate both `latitude`/`longitude` AND `lat`/`lng`
- [ ] Format source as `{type}:{name}`
- [ ] Use unique `source_event_id` for deduplication
- [ ] Set `status` to `'Unreviewed'`
- [ ] Set `property_type` to `'residential'` (default)
- [ ] Calculate `priority_score` as `Math.round(severity * 100)`
- [ ] Use `upsert` with `onConflict: 'source,source_event_id'`
- [ ] Handle duplicate error code `'23505'`

---

## Example Implementation

```typescript
async function ingestNewSource(data: SourceData[]): Promise<void> {
  for (const item of data) {
    const eventData = {
      // Required fields
      event_type: mapToEventType(item.type),
      event_timestamp: new Date(item.date).toISOString(),
      severity: normalizeSeverity(item.severity),
      zip: item.zip || '00000',
      source: `new_source:${item.provider}`,
      source_event_id: item.id,
      status: 'Unreviewed' as const,
      
      // Optional fields
      state_code: item.state || null,
      latitude: item.lat || null,
      longitude: item.lng || null,
      lat: item.lat || null,
      lng: item.lng || null,
      claim_probability: 0.50,
      priority_score: Math.round(normalizeSeverity(item.severity) * 100),
      property_type: 'residential' as const
    };
    
    const { error } = await supabase
      .from('loss_events')
      .upsert(eventData, {
        onConflict: 'source,source_event_id',
        ignoreDuplicates: true
      });
    
    if (error && error.code !== '23505') {
      console.error('Insert error:', error);
    }
  }
}
```

---

**Last Updated:** December 31, 2025  
**Applies To:** All ingestion functions targeting `loss_events` table



