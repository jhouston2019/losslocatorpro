# Fire Incident Deduplication - SQL Queries

Quick reference SQL queries for analyzing and verifying fire incident deduplication.

---

## Verification Queries

### Check for Duplicate Fire Events

```sql
-- Find potential duplicates by location and time
SELECT 
  e1.id as event1_id,
  e1.source as source1,
  e1.source_event_id as source_event_id1,
  e2.id as event2_id,
  e2.source as source2,
  e2.source_event_id as source_event_id2,
  e1.event_timestamp,
  e1.latitude,
  e1.longitude,
  e1.confidence_score,
  -- Calculate distance in miles using Haversine formula
  (
    3959 * acos(
      cos(radians(e1.latitude)) * 
      cos(radians(e2.latitude)) * 
      cos(radians(e2.longitude) - radians(e1.longitude)) + 
      sin(radians(e1.latitude)) * 
      sin(radians(e2.latitude))
    )
  ) as distance_miles,
  -- Calculate time difference in hours
  ABS(EXTRACT(EPOCH FROM (e1.event_timestamp - e2.event_timestamp)) / 3600) as time_diff_hours
FROM loss_events e1
JOIN loss_events e2 ON e1.id < e2.id
WHERE 
  e1.event_type = 'Fire'
  AND e2.event_type = 'Fire'
  AND e1.latitude IS NOT NULL
  AND e2.latitude IS NOT NULL
  -- Within 0.5 miles
  AND (
    3959 * acos(
      cos(radians(e1.latitude)) * 
      cos(radians(e2.latitude)) * 
      cos(radians(e2.longitude) - radians(e1.longitude)) + 
      sin(radians(e1.latitude)) * 
      sin(radians(e2.latitude))
    )
  ) <= 0.5
  -- Within 2 hours
  AND ABS(EXTRACT(EPOCH FROM (e1.event_timestamp - e2.event_timestamp)) / 3600) <= 2
ORDER BY e1.event_timestamp DESC, distance_miles ASC;
```

### Count Events by Source

```sql
-- Count fire events by source
SELECT 
  source,
  COUNT(*) as total_events,
  COUNT(CASE WHEN confidence_score >= 0.95 THEN 1 END) as corroborated_events,
  COUNT(CASE WHEN confidence_score < 0.95 THEN 1 END) as single_source_events,
  AVG(confidence_score) as avg_confidence,
  MIN(event_timestamp) as earliest_event,
  MAX(event_timestamp) as latest_event
FROM loss_events
WHERE event_type = 'Fire'
GROUP BY source
ORDER BY total_events DESC;
```

### Find Corroborated Events

```sql
-- Find events that have been corroborated (confidence = 0.95)
SELECT 
  id,
  source,
  source_event_id,
  event_timestamp,
  address,
  city,
  state_code,
  latitude,
  longitude,
  confidence_score,
  severity,
  created_at
FROM loss_events
WHERE 
  event_type = 'Fire'
  AND confidence_score >= 0.95
ORDER BY event_timestamp DESC
LIMIT 100;
```

### Check for Missing Coordinates

```sql
-- Find fire events without coordinates (can't be deduplicated by location)
SELECT 
  source,
  COUNT(*) as events_without_coords,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM loss_events WHERE event_type = 'Fire'), 2) as percentage
FROM loss_events
WHERE 
  event_type = 'Fire'
  AND (latitude IS NULL OR longitude IS NULL)
GROUP BY source
ORDER BY events_without_coords DESC;
```

---

## Analysis Queries

### Daily Ingestion Stats

```sql
-- Daily ingestion statistics by source
SELECT 
  DATE(created_at) as ingestion_date,
  source,
  COUNT(*) as events_ingested,
  COUNT(CASE WHEN confidence_score >= 0.95 THEN 1 END) as corroborated,
  AVG(severity) as avg_severity,
  COUNT(CASE WHEN address IS NOT NULL THEN 1 END) as with_address
FROM loss_events
WHERE 
  event_type = 'Fire'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at), source
ORDER BY ingestion_date DESC, source;
```

### Geographic Distribution

```sql
-- Fire events by state
SELECT 
  state_code,
  COUNT(*) as total_fires,
  COUNT(DISTINCT source) as sources_reporting,
  AVG(confidence_score) as avg_confidence,
  AVG(severity) as avg_severity
FROM loss_events
WHERE 
  event_type = 'Fire'
  AND state_code IS NOT NULL
  AND event_timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY state_code
ORDER BY total_fires DESC
LIMIT 20;
```

### Confidence Score Distribution

```sql
-- Distribution of confidence scores
SELECT 
  CASE 
    WHEN confidence_score >= 0.95 THEN '0.95 (Corroborated)'
    WHEN confidence_score >= 0.85 THEN '0.85 (State/NFIRS)'
    WHEN confidence_score >= 0.75 THEN '0.75 (Commercial)'
    ELSE 'Other'
  END as confidence_level,
  COUNT(*) as event_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM loss_events
WHERE event_type = 'Fire'
GROUP BY 
  CASE 
    WHEN confidence_score >= 0.95 THEN '0.95 (Corroborated)'
    WHEN confidence_score >= 0.85 THEN '0.85 (State/NFIRS)'
    WHEN confidence_score >= 0.75 THEN '0.75 (Commercial)'
    ELSE 'Other'
  END
ORDER BY event_count DESC;
```

### Recent High-Confidence Events

```sql
-- Recent high-confidence fire events with full details
SELECT 
  id,
  source,
  event_timestamp,
  address,
  city,
  state_code,
  zip,
  latitude,
  longitude,
  severity,
  confidence_score,
  priority_score,
  status,
  created_at
FROM loss_events
WHERE 
  event_type = 'Fire'
  AND confidence_score >= 0.90
  AND event_timestamp >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY confidence_score DESC, event_timestamp DESC
LIMIT 50;
```

---

## Maintenance Queries

### Find Events to Manually Review

```sql
-- Find fire events that might be duplicates but weren't caught
-- (same address, different coordinates or times)
SELECT 
  e1.id,
  e1.source,
  e1.address,
  e1.event_timestamp,
  e1.latitude,
  e1.longitude,
  e1.confidence_score,
  COUNT(e2.id) as potential_duplicates
FROM loss_events e1
LEFT JOIN loss_events e2 ON 
  e1.id != e2.id
  AND e2.event_type = 'Fire'
  AND LOWER(TRIM(e1.address)) = LOWER(TRIM(e2.address))
  AND e1.address IS NOT NULL
  AND ABS(EXTRACT(EPOCH FROM (e1.event_timestamp - e2.event_timestamp)) / 3600) <= 24
WHERE 
  e1.event_type = 'Fire'
  AND e1.confidence_score < 0.95
GROUP BY e1.id, e1.source, e1.address, e1.event_timestamp, e1.latitude, e1.longitude, e1.confidence_score
HAVING COUNT(e2.id) > 0
ORDER BY potential_duplicates DESC, e1.event_timestamp DESC;
```

### Clean Up Test Data

```sql
-- Remove test fire events (use with caution!)
-- Uncomment to execute
/*
DELETE FROM loss_events
WHERE 
  event_type = 'Fire'
  AND source IN ('fire_commercial', 'fire_state')
  AND created_at >= '2025-12-31'  -- Adjust date as needed
  AND (
    address LIKE '%TEST%'
    OR address LIKE '%DEMO%'
    OR zip = '00000'
  );
*/
```

### Update Confidence Scores Manually

```sql
-- Manually escalate confidence for specific events
-- (if deduplication missed something)
/*
UPDATE loss_events
SET confidence_score = 0.95
WHERE id IN (
  'event-id-1',
  'event-id-2'
);
*/
```

---

## Performance Queries

### Index Usage Analysis

```sql
-- Check if fire deduplication index is being used
EXPLAIN ANALYZE
SELECT id, latitude, longitude, event_timestamp
FROM loss_events
WHERE 
  event_type = 'Fire'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND event_timestamp >= NOW() - INTERVAL '2 hours'
  AND event_timestamp <= NOW() + INTERVAL '2 hours';
```

### Slow Query Identification

```sql
-- Find events with many nearby candidates (slow dedup checks)
SELECT 
  DATE(event_timestamp) as event_date,
  state_code,
  COUNT(*) as events_on_day,
  -- Estimate dedup query complexity
  POWER(COUNT(*), 2) as dedup_comparisons_estimate
FROM loss_events
WHERE 
  event_type = 'Fire'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
GROUP BY DATE(event_timestamp), state_code
HAVING COUNT(*) > 100
ORDER BY dedup_comparisons_estimate DESC;
```

---

## Reporting Queries

### Executive Summary

```sql
-- Fire incident ingestion summary (last 30 days)
WITH stats AS (
  SELECT 
    COUNT(*) as total_events,
    COUNT(DISTINCT source) as unique_sources,
    COUNT(CASE WHEN confidence_score >= 0.95 THEN 1 END) as corroborated,
    COUNT(CASE WHEN confidence_score < 0.95 THEN 1 END) as single_source,
    AVG(confidence_score) as avg_confidence,
    AVG(severity) as avg_severity,
    COUNT(CASE WHEN address IS NOT NULL THEN 1 END) as with_address,
    COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as with_coordinates
  FROM loss_events
  WHERE 
    event_type = 'Fire'
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
  total_events,
  unique_sources,
  corroborated,
  single_source,
  ROUND(100.0 * corroborated / NULLIF(total_events, 0), 2) as corroboration_rate_pct,
  ROUND(avg_confidence::numeric, 3) as avg_confidence,
  ROUND(avg_severity::numeric, 3) as avg_severity,
  ROUND(100.0 * with_address / NULLIF(total_events, 0), 2) as address_coverage_pct,
  ROUND(100.0 * with_coordinates / NULLIF(total_events, 0), 2) as coordinate_coverage_pct
FROM stats;
```

### Data Quality Report

```sql
-- Data quality metrics for fire events
SELECT 
  source,
  COUNT(*) as total_events,
  -- Completeness metrics
  ROUND(100.0 * COUNT(CASE WHEN address IS NOT NULL THEN 1 END) / COUNT(*), 2) as address_pct,
  ROUND(100.0 * COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) / COUNT(*), 2) as coords_pct,
  ROUND(100.0 * COUNT(CASE WHEN state_code IS NOT NULL THEN 1 END) / COUNT(*), 2) as state_pct,
  ROUND(100.0 * COUNT(CASE WHEN zip != '00000' THEN 1 END) / COUNT(*), 2) as real_zip_pct,
  -- Quality metrics
  AVG(confidence_score) as avg_confidence,
  AVG(severity) as avg_severity,
  -- Freshness
  MAX(event_timestamp) as latest_event,
  MAX(created_at) as latest_ingestion
FROM loss_events
WHERE event_type = 'Fire'
GROUP BY source
ORDER BY total_events DESC;
```

---

## Troubleshooting Queries

### Find Stuck Events

```sql
-- Find events that should have been corroborated but weren't
SELECT 
  e1.id,
  e1.source,
  e1.event_timestamp,
  e1.latitude,
  e1.longitude,
  e1.confidence_score,
  e2.id as nearby_event_id,
  e2.source as nearby_source,
  (
    3959 * acos(
      cos(radians(e1.latitude)) * 
      cos(radians(e2.latitude)) * 
      cos(radians(e2.longitude) - radians(e1.longitude)) + 
      sin(radians(e1.latitude)) * 
      sin(radians(e2.latitude))
    )
  ) as distance_miles,
  ABS(EXTRACT(EPOCH FROM (e1.event_timestamp - e2.event_timestamp)) / 3600) as time_diff_hours
FROM loss_events e1
JOIN loss_events e2 ON 
  e1.id != e2.id
  AND e1.source != e2.source
WHERE 
  e1.event_type = 'Fire'
  AND e2.event_type = 'Fire'
  AND e1.confidence_score < 0.95
  AND e1.latitude IS NOT NULL
  AND e2.latitude IS NOT NULL
  AND (
    3959 * acos(
      cos(radians(e1.latitude)) * 
      cos(radians(e2.latitude)) * 
      cos(radians(e2.longitude) - radians(e1.longitude)) + 
      sin(radians(e1.latitude)) * 
      sin(radians(e2.latitude))
    )
  ) <= 0.5
  AND ABS(EXTRACT(EPOCH FROM (e1.event_timestamp - e2.event_timestamp)) / 3600) <= 2
ORDER BY e1.event_timestamp DESC;
```

### Check API Response Times

```sql
-- Analyze ingestion timing patterns
SELECT 
  source,
  DATE(created_at) as ingestion_date,
  EXTRACT(HOUR FROM created_at) as ingestion_hour,
  COUNT(*) as events_ingested,
  MIN(created_at) as batch_start,
  MAX(created_at) as batch_end,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as batch_duration_seconds
FROM loss_events
WHERE 
  event_type = 'Fire'
  AND source IN ('fire_commercial', 'fire_state')
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY source, DATE(created_at), EXTRACT(HOUR FROM created_at)
ORDER BY ingestion_date DESC, ingestion_hour DESC;
```

---

## Export Queries

### Export for Analysis

```sql
-- Export fire events to CSV format
COPY (
  SELECT 
    id,
    source,
    source_event_id,
    event_timestamp,
    address,
    city,
    state_code,
    zip,
    latitude,
    longitude,
    severity,
    confidence_score,
    priority_score,
    status,
    created_at
  FROM loss_events
  WHERE 
    event_type = 'Fire'
    AND event_timestamp >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY event_timestamp DESC
) TO '/tmp/fire_events_export.csv' WITH CSV HEADER;
```

---

## Notes

- All distance calculations use the Haversine formula for accuracy
- Time differences are calculated in hours for readability
- Confidence thresholds: 0.75 (commercial), 0.85 (state), 0.95 (corroborated)
- Deduplication thresholds: 0.5 miles, 2 hours

**Usage:** Copy and paste these queries into your Supabase SQL Editor or psql terminal.



