-- ============================================================================
-- FEMA DISASTER DECLARATIONS VERIFICATION SCRIPT
-- ============================================================================
-- Run these queries to verify FEMA ingestion is working correctly

-- 1. Check if FEMA disasters exist
SELECT 
  'FEMA Disasters Count' as metric,
  COUNT(*) as value
FROM loss_events
WHERE source = 'FEMA';

-- 2. Breakdown by event type
SELECT 
  event_type,
  COUNT(*) as count,
  ROUND(AVG(severity)::numeric, 2) as avg_severity,
  ROUND(AVG(claim_probability)::numeric, 2) as avg_claim_prob,
  MAX(event_timestamp) as latest_event,
  MAX(created_at) as latest_ingestion
FROM loss_events
WHERE source = 'FEMA'
GROUP BY event_type
ORDER BY count DESC;

-- 3. Breakdown by state
SELECT 
  state_code,
  COUNT(*) as disaster_count,
  STRING_AGG(DISTINCT event_type, ', ') as event_types,
  MAX(event_timestamp) as latest_disaster,
  ROUND(AVG(severity)::numeric, 2) as avg_severity
FROM loss_events
WHERE source = 'FEMA'
GROUP BY state_code
ORDER BY disaster_count DESC
LIMIT 20;

-- 4. Recent FEMA disasters (last 10)
SELECT 
  source_event_id,
  event_type,
  severity,
  claim_probability,
  event_timestamp,
  state_code,
  created_at
FROM loss_events
WHERE source = 'FEMA'
ORDER BY event_timestamp DESC
LIMIT 10;

-- 5. Severity distribution
SELECT 
  CASE 
    WHEN severity >= 0.90 THEN 'Very High (0.90+)'
    WHEN severity >= 0.75 THEN 'High (0.75-0.89)'
    WHEN severity >= 0.60 THEN 'Moderate (0.60-0.74)'
    ELSE 'Low (<0.60)'
  END as severity_range,
  COUNT(*) as count,
  ROUND(AVG(claim_probability)::numeric, 2) as avg_claim_prob
FROM loss_events
WHERE source = 'FEMA'
GROUP BY severity_range
ORDER BY MIN(severity) DESC;

-- 6. Compare all federal sources
SELECT 
  source,
  COUNT(*) as event_count,
  ROUND(AVG(severity)::numeric, 2) as avg_severity,
  ROUND(AVG(claim_probability)::numeric, 2) as avg_claim_prob,
  MAX(created_at) as latest_ingestion,
  STRING_AGG(DISTINCT event_type, ', ') as event_types
FROM loss_events
WHERE source IN ('NOAA', 'NWS', 'FEMA')
GROUP BY source
ORDER BY event_count DESC;

-- 7. Timeline of FEMA disasters (by month)
SELECT 
  TO_CHAR(event_timestamp, 'YYYY-MM') as month,
  COUNT(*) as disaster_count,
  STRING_AGG(DISTINCT state_code, ', ') as states_affected,
  STRING_AGG(DISTINCT event_type, ', ') as event_types
FROM loss_events
WHERE source = 'FEMA'
GROUP BY TO_CHAR(event_timestamp, 'YYYY-MM')
ORDER BY month DESC
LIMIT 12;

-- 8. Check for duplicates (should be 0)
SELECT 
  source_event_id,
  COUNT(*) as duplicate_count
FROM loss_events
WHERE source = 'FEMA'
GROUP BY source_event_id
HAVING COUNT(*) > 1;

-- 9. Verify coordinates (state centroids)
SELECT 
  state_code,
  COUNT(*) as count,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as with_coords,
  ROUND(AVG(latitude)::numeric, 2) as avg_lat,
  ROUND(AVG(longitude)::numeric, 2) as avg_lng
FROM loss_events
WHERE source = 'FEMA'
GROUP BY state_code
ORDER BY count DESC
LIMIT 10;

-- 10. Most recent ingestion summary
SELECT 
  MAX(created_at) as last_ingestion_time,
  COUNT(*) as total_fema_events,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as events_last_7_days,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as events_last_30_days
FROM loss_events
WHERE source = 'FEMA';

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- 
-- 1. Count: 10-50 disasters (varies by season)
-- 2. Event types: Primarily Wind (hurricanes, storms) and Fire (wildfires)
-- 3. States: Multiple states, concentrated in disaster-prone areas (FL, CA, TX, etc.)
-- 4. Recent disasters: Should show disasters from last 90 days
-- 5. Severity: Mostly High (0.75-0.89) and Very High (0.90+)
-- 6. Sources: FEMA should have highest avg_severity (0.85+)
-- 7. Timeline: Seasonal patterns (hurricane season, wildfire season)
-- 8. Duplicates: Should be 0 (no duplicate disaster numbers)
-- 9. Coordinates: 100% should have coordinates (state centroids)
-- 10. Ingestion: Last ingestion within 7 days (weekly schedule)
--
-- ============================================================================
