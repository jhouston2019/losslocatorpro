-- Diagnostic query to verify loss_events data and RLS policies

-- 1. Check if data exists
SELECT 
  COUNT(*) as total_events,
  COUNT(DISTINCT state_code) as unique_states,
  COUNT(DISTINCT event_type) as unique_event_types,
  MIN(event_timestamp) as oldest_event,
  MAX(event_timestamp) as newest_event
FROM loss_events 
WHERE source = 'NOAA';

-- 2. Check RLS policies on loss_events
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'loss_events';

-- 3. Sample of actual events
SELECT 
  id,
  event_type,
  event_timestamp,
  state_code,
  zip,
  severity,
  source,
  source_event_id
FROM loss_events 
WHERE source = 'NOAA'
ORDER BY event_timestamp DESC
LIMIT 5;

-- 4. Check if current user can read the table
SELECT 
  auth.uid() as current_user_id,
  COUNT(*) as events_visible_to_me
FROM loss_events
WHERE source = 'NOAA';







