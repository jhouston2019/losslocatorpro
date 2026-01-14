-- ============================================================================
-- ADDRESS RESOLUTION VERIFICATION SCRIPT
-- ============================================================================
-- Run these queries to verify staged address resolution is working

-- 1. Check if new tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM loss_property_candidates) as candidate_count,
  (SELECT COUNT(*) FROM address_resolution_log) as log_count
FROM information_schema.tables
WHERE table_name IN ('loss_property_candidates', 'address_resolution_log', 'address_resolution_settings');

-- 2. Check address resolution settings
SELECT 
  auto_resolve_threshold,
  min_event_count,
  max_properties_per_zip,
  enable_auto_resolution,
  enable_user_triggered,
  enable_downstream_triggered
FROM address_resolution_settings;

-- 3. Check ZIP clusters ready for resolution
SELECT 
  zip_code,
  state_code,
  event_type,
  event_count,
  ROUND(avg_claim_probability::numeric, 2) as avg_claim_prob,
  properties_resolved,
  meets_threshold
FROM zip_clusters_ready_for_resolution
WHERE meets_threshold = true
ORDER BY avg_claim_probability DESC
LIMIT 20;

-- 4. Check property candidates by status
SELECT 
  status,
  COUNT(*) as count,
  ROUND(AVG(estimated_claim_probability)::numeric, 2) as avg_probability,
  STRING_AGG(DISTINCT resolution_source, ', ') as sources
FROM loss_property_candidates
GROUP BY status
ORDER BY count DESC;

-- 5. Check property candidates by ZIP
SELECT 
  zip_code,
  state_code,
  COUNT(*) as property_count,
  STRING_AGG(DISTINCT property_type, ', ') as property_types,
  ROUND(AVG(estimated_claim_probability)::numeric, 2) as avg_probability,
  STRING_AGG(DISTINCT resolution_source, ', ') as sources,
  MAX(resolved_at) as latest_resolution
FROM loss_property_candidates
GROUP BY zip_code, state_code
ORDER BY property_count DESC
LIMIT 20;

-- 6. Check property candidates by event
SELECT 
  e.source,
  e.event_type,
  e.state_code,
  COUNT(pc.id) as property_count,
  ROUND(AVG(pc.estimated_claim_probability)::numeric, 2) as avg_probability
FROM loss_events e
LEFT JOIN loss_property_candidates pc ON e.id = pc.event_id
WHERE pc.id IS NOT NULL
GROUP BY e.source, e.event_type, e.state_code
ORDER BY property_count DESC;

-- 7. Check resolution log
SELECT 
  zip_code,
  trigger_type,
  resolution_source,
  properties_found,
  properties_inserted,
  status,
  started_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds,
  error_message
FROM address_resolution_log
ORDER BY started_at DESC
LIMIT 20;

-- 8. Check resolution success rate
SELECT 
  resolution_source,
  trigger_type,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  ROUND(
    COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric / 
    COUNT(*)::numeric * 100, 
    1
  ) as success_rate_pct,
  SUM(properties_inserted) as total_properties_inserted
FROM address_resolution_log
GROUP BY resolution_source, trigger_type
ORDER BY total_attempts DESC;

-- 9. Check property score adjustments
SELECT 
  property_type,
  event_type,
  COUNT(*) as property_count,
  ROUND(AVG(zip_level_probability)::numeric, 3) as avg_zip_prob,
  ROUND(AVG(property_score_adjustment)::numeric, 3) as avg_adjustment,
  ROUND(AVG(estimated_claim_probability)::numeric, 3) as avg_property_prob
FROM loss_property_candidates
WHERE property_score_adjustment IS NOT NULL
GROUP BY property_type, event_type
ORDER BY property_count DESC;

-- 10. Check unreviewed property candidates
SELECT 
  zip_code,
  state_code,
  COUNT(*) as unreviewed_count,
  ROUND(AVG(estimated_claim_probability)::numeric, 2) as avg_probability,
  MAX(resolved_at) as latest_resolution
FROM loss_property_candidates
WHERE status = 'unreviewed'
GROUP BY zip_code, state_code
ORDER BY unreviewed_count DESC
LIMIT 20;

-- 11. Summary statistics
SELECT 
  'Total Property Candidates' as metric,
  COUNT(*) as value
FROM loss_property_candidates
UNION ALL
SELECT 
  'Unreviewed Candidates',
  COUNT(*)
FROM loss_property_candidates
WHERE status = 'unreviewed'
UNION ALL
SELECT 
  'Reviewed Candidates',
  COUNT(*)
FROM loss_property_candidates
WHERE status = 'reviewed'
UNION ALL
SELECT 
  'Qualified Candidates',
  COUNT(*)
FROM loss_property_candidates
WHERE status = 'qualified'
UNION ALL
SELECT 
  'Discarded Candidates',
  COUNT(*)
FROM loss_property_candidates
WHERE status = 'discarded'
UNION ALL
SELECT 
  'Total Resolution Attempts',
  COUNT(*)
FROM address_resolution_log
UNION ALL
SELECT 
  'Successful Resolutions',
  COUNT(*)
FROM address_resolution_log
WHERE status = 'completed'
UNION ALL
SELECT 
  'Failed Resolutions',
  COUNT(*)
FROM address_resolution_log
WHERE status = 'failed'
UNION ALL
SELECT 
  'Unique ZIPs Resolved',
  COUNT(DISTINCT zip_code)
FROM loss_property_candidates;

-- 12. Check for duplicate addresses
SELECT 
  event_id,
  address,
  COUNT(*) as duplicate_count
FROM loss_property_candidates
GROUP BY event_id, address
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
--
-- 1. Tables: All three tables should exist
-- 2. Settings: auto_resolve_threshold = 0.70, enable_auto_resolution = false
-- 3. Ready ZIPs: Shows ZIPs meeting threshold (if any)
-- 4. Status: Most should be 'unreviewed' initially
-- 5. By ZIP: Shows property distribution across ZIPs
-- 6. By Event: Shows which events have properties resolved
-- 7. Resolution Log: Shows resolution attempts and results
-- 8. Success Rate: Should be high (>90%) when sources configured
-- 9. Adjustments: Shows property-level probability adjustments
-- 10. Unreviewed: Shows candidates awaiting review
-- 11. Summary: Overall statistics
-- 12. Duplicates: Should be 0 (unique constraint enforced)
--
-- ============================================================================
