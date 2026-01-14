-- ============================================================================
-- GEO AGGREGATION VERIFICATION SCRIPT
-- ============================================================================
-- Run these queries to verify ZIP/county-level aggregation is working

-- 1. Check if new columns exist in loss_events
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'loss_events'
AND column_name IN ('county_fips', 'zip_codes', 'geo_resolution_level', 'confidence_level')
ORDER BY column_name;

-- 2. Check loss_geo_aggregates table exists
SELECT 
  table_name,
  (SELECT COUNT(*) FROM loss_geo_aggregates) as row_count
FROM information_schema.tables
WHERE table_name = 'loss_geo_aggregates';

-- 3. Check geo resolution levels distribution
SELECT 
  geo_resolution_level,
  COUNT(*) as event_count,
  ROUND(AVG(severity)::numeric, 2) as avg_severity
FROM loss_events
WHERE geo_resolution_level IS NOT NULL
GROUP BY geo_resolution_level
ORDER BY event_count DESC;

-- 4. Check confidence levels distribution
SELECT 
  confidence_level,
  COUNT(*) as event_count,
  STRING_AGG(DISTINCT source, ', ') as sources
FROM loss_events
WHERE confidence_level IS NOT NULL
GROUP BY confidence_level
ORDER BY event_count DESC;

-- 5. Check events with ZIP codes populated
SELECT 
  source,
  COUNT(*) as total_events,
  COUNT(CASE WHEN zip_codes IS NOT NULL AND array_length(zip_codes, 1) > 0 THEN 1 END) as with_zip_codes,
  COUNT(CASE WHEN county_fips IS NOT NULL THEN 1 END) as with_county,
  ROUND(
    COUNT(CASE WHEN zip_codes IS NOT NULL AND array_length(zip_codes, 1) > 0 THEN 1 END)::numeric / 
    COUNT(*)::numeric * 100, 
    1
  ) as zip_coverage_pct
FROM loss_events
WHERE source IN ('NOAA', 'NWS', 'FEMA')
GROUP BY source
ORDER BY total_events DESC;

-- 6. Check geo aggregates by ZIP
SELECT 
  zip_code,
  state_code,
  COUNT(DISTINCT event_id) as event_count,
  STRING_AGG(DISTINCT event_type, ', ') as event_types,
  ROUND(AVG(severity_score)::numeric, 2) as avg_severity,
  ROUND(AVG(claim_probability)::numeric, 2) as avg_claim_prob,
  MAX(event_timestamp) as latest_event
FROM loss_geo_aggregates
GROUP BY zip_code, state_code
ORDER BY event_count DESC
LIMIT 20;

-- 7. Check geo aggregates by county
SELECT 
  county_fips,
  state_code,
  COUNT(DISTINCT event_id) as event_count,
  COUNT(DISTINCT zip_code) as zip_count,
  STRING_AGG(DISTINCT event_type, ', ') as event_types,
  ROUND(AVG(severity_score)::numeric, 2) as avg_severity,
  MAX(event_timestamp) as latest_event
FROM loss_geo_aggregates
WHERE county_fips IS NOT NULL
GROUP BY county_fips, state_code
ORDER BY event_count DESC
LIMIT 20;

-- 8. Check aggregate views
SELECT * FROM loss_opportunities_by_zip
ORDER BY event_count DESC
LIMIT 10;

SELECT * FROM loss_opportunities_by_county
ORDER BY event_count DESC
LIMIT 10;

-- 9. Check for events needing enrichment
SELECT 
  source,
  COUNT(*) as needs_enrichment
FROM loss_events
WHERE zip_codes IS NULL 
   OR county_fips IS NULL 
   OR geo_resolution_level IS NULL
GROUP BY source
ORDER BY needs_enrichment DESC;

-- 10. Summary statistics
SELECT 
  'Total Events' as metric,
  COUNT(*) as value
FROM loss_events
UNION ALL
SELECT 
  'Events with ZIP Codes',
  COUNT(*)
FROM loss_events
WHERE zip_codes IS NOT NULL AND array_length(zip_codes, 1) > 0
UNION ALL
SELECT 
  'Events with County FIPS',
  COUNT(*)
FROM loss_events
WHERE county_fips IS NOT NULL
UNION ALL
SELECT 
  'Total Geo Aggregates',
  COUNT(*)
FROM loss_geo_aggregates
UNION ALL
SELECT 
  'Unique ZIPs in Aggregates',
  COUNT(DISTINCT zip_code)
FROM loss_geo_aggregates
UNION ALL
SELECT 
  'Unique Counties in Aggregates',
  COUNT(DISTINCT county_fips)
FROM loss_geo_aggregates
WHERE county_fips IS NOT NULL;

-- 11. Check multi-ZIP events
SELECT 
  id,
  source,
  event_type,
  state_code,
  array_length(zip_codes, 1) as zip_count,
  zip_codes,
  geo_resolution_level
FROM loss_events
WHERE zip_codes IS NOT NULL 
  AND array_length(zip_codes, 1) > 1
ORDER BY array_length(zip_codes, 1) DESC
LIMIT 10;

-- 12. Check crosswalk table (if populated)
SELECT 
  state_code,
  COUNT(DISTINCT zip_code) as zip_count,
  COUNT(DISTINCT county_fips) as county_count
FROM zip_county_crosswalk
GROUP BY state_code
ORDER BY zip_count DESC
LIMIT 10;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
--
-- 1. Columns: Should show county_fips, zip_codes, geo_resolution_level, confidence_level
-- 2. Table: loss_geo_aggregates should exist with row_count > 0
-- 3. Geo Resolution: Distribution across state, county, zip, point levels
-- 4. Confidence: Distribution across forecast, active, declared, confirmed
-- 5. ZIP Coverage: 80%+ of events should have zip_codes populated
-- 6. ZIP Aggregates: Multiple events per ZIP in active areas
-- 7. County Aggregates: Multiple ZIPs per county
-- 8. Views: Should return data from aggregate views
-- 9. Needs Enrichment: Should be 0 or very low after enrichment runs
-- 10. Summary: Shows overall coverage statistics
-- 11. Multi-ZIP: Shows events spanning multiple ZIP codes
-- 12. Crosswalk: Shows ZIP-county mappings (if loaded)
--
-- ============================================================================
