-- Loss Locator Pro - Sample Storm Data Seed
-- Populates database with realistic storm events for testing and demo

-- ============================================================================
-- SAMPLE STORM EVENTS (Last 7 Days)
-- ============================================================================
-- This creates realistic storm damage events across multiple states
-- Use this when live NOAA data is unavailable (winter months)

-- Clear existing NOAA test data if any
DELETE FROM loss_events WHERE source = 'NOAA' AND zip = '00000';

-- Insert sample hail events
INSERT INTO loss_events (
  event_type,
  severity,
  claim_probability,
  event_timestamp,
  zip,
  state_code,
  lat,
  lng,
  latitude,
  longitude,
  source,
  source_event_id,
  status,
  property_type,
  priority_score
) VALUES
-- Texas hail storm
('Hail', 0.9, 0.77, NOW() - INTERVAL '1 day', '75001', 'TX', 32.9483, -96.7297, 32.9483, -96.7297, 'NOAA', '20251221-hail-32.9483--96.7297', 'Unreviewed', 'residential', 90),
('Hail', 0.85, 0.72, NOW() - INTERVAL '1 day', '75002', 'TX', 32.9342, -96.6445, 32.9342, -96.6445, 'NOAA', '20251221-hail-32.9342--96.6445', 'Unreviewed', 'residential', 85),
('Hail', 0.8, 0.68, NOW() - INTERVAL '1 day', '75080', 'TX', 33.0151, -96.6989, 33.0151, -96.6989, 'NOAA', '20251221-hail-33.0151--96.6989', 'Unreviewed', 'commercial', 80),

-- Oklahoma wind damage
('Wind', 0.85, 0.72, NOW() - INTERVAL '2 days', '73013', 'OK', 35.5376, -97.4170, 35.5376, -97.4170, 'NOAA', '20251220-wind-35.5376--97.4170', 'Unreviewed', 'residential', 85),
('Wind', 0.9, 0.77, NOW() - INTERVAL '2 days', '73034', 'OK', 35.2226, -97.4395, 35.2226, -97.4395, 'NOAA', '20251220-wind-35.2226--97.4395', 'Unreviewed', 'commercial', 90),
('Wind', 0.75, 0.64, NOW() - INTERVAL '2 days', '73072', 'OK', 35.3495, -97.4781, 35.3495, -97.4781, 'NOAA', '20251220-wind-35.3495--97.4781', 'Unreviewed', 'residential', 75),

-- Kansas severe weather
('Hail', 0.7, 0.60, NOW() - INTERVAL '3 days', '67202', 'KS', 37.6872, -97.3301, 37.6872, -97.3301, 'NOAA', '20251219-hail-37.6872--97.3301', 'Unreviewed', 'residential', 70),
('Wind', 0.8, 0.68, NOW() - INTERVAL '3 days', '67203', 'KS', 37.6922, -97.2864, 37.6922, -97.2864, 'NOAA', '20251219-wind-37.6922--97.2864', 'Unreviewed', 'commercial', 80),

-- Missouri storms
('Hail', 0.75, 0.64, NOW() - INTERVAL '4 days', '64030', 'MO', 38.9108, -94.3816, 38.9108, -94.3816, 'NOAA', '20251218-hail-38.9108--94.3816', 'Unreviewed', 'residential', 75),
('Wind', 0.7, 0.60, NOW() - INTERVAL '4 days', '64050', 'MO', 39.0997, -94.4155, 39.0997, -94.4155, 'NOAA', '20251218-wind-39.0997--94.4155', 'Unreviewed', 'residential', 70),

-- Arkansas severe weather
('Hail', 0.85, 0.72, NOW() - INTERVAL '5 days', '72201', 'AR', 34.7465, -92.2896, 34.7465, -92.2896, 'NOAA', '20251217-hail-34.7465--92.2896', 'Unreviewed', 'commercial', 85),
('Wind', 0.8, 0.68, NOW() - INTERVAL '5 days', '72202', 'AR', 34.7520, -92.2743, 34.7520, -92.2743, 'NOAA', '20251217-wind-34.7520--92.2743', 'Unreviewed', 'residential', 80),

-- Louisiana storms
('Wind', 0.9, 0.77, NOW() - INTERVAL '6 days', '70001', 'LA', 29.9546, -90.1258, 29.9546, -90.1258, 'NOAA', '20251216-wind-29.9546--90.1258', 'Unreviewed', 'residential', 90),
('Hail', 0.75, 0.64, NOW() - INTERVAL '6 days', '70002', 'LA', 30.0171, -90.1145, 30.0171, -90.1145, 'NOAA', '20251216-hail-30.0171--90.1145', 'Unreviewed', 'commercial', 75),

-- Mississippi severe weather
('Hail', 0.8, 0.68, NOW() - INTERVAL '7 days', '39201', 'MS', 32.2988, -90.1848, 32.2988, -90.1848, 'NOAA', '20251215-hail-32.2988--90.1848', 'Unreviewed', 'residential', 80),
('Wind', 0.85, 0.72, NOW() - INTERVAL '7 days', '39202', 'MS', 32.3157, -90.1773, 32.3157, -90.1773, 'NOAA', '20251215-wind-32.3157--90.1773', 'Unreviewed', 'commercial', 85),

-- Tennessee storms
('Hail', 0.7, 0.60, NOW() - INTERVAL '1 day', '37201', 'TN', 36.1627, -86.7816, 36.1627, -86.7816, 'NOAA', '20251221-hail-36.1627--86.7816', 'Unreviewed', 'residential', 70),
('Wind', 0.75, 0.64, NOW() - INTERVAL '2 days', '37203', 'TN', 36.1540, -86.7836, 36.1540, -86.7836, 'NOAA', '20251220-wind-36.1540--86.7836', 'Unreviewed', 'commercial', 75),

-- Alabama severe weather
('Hail', 0.85, 0.72, NOW() - INTERVAL '3 days', '35201', 'AL', 33.5207, -86.8025, 33.5207, -86.8025, 'NOAA', '20251219-hail-33.5207--86.8025', 'Unreviewed', 'residential', 85),
('Wind', 0.9, 0.77, NOW() - INTERVAL '4 days', '35203', 'AL', 33.5185, -86.8104, 33.5185, -86.8104, 'NOAA', '20251218-wind-33.5185--86.8104', 'Unreviewed', 'commercial', 90);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check inserted events
SELECT 
  COUNT(*) as total_events,
  COUNT(DISTINCT state_code) as states_affected,
  COUNT(CASE WHEN event_type = 'Hail' THEN 1 END) as hail_events,
  COUNT(CASE WHEN event_type = 'Wind' THEN 1 END) as wind_events,
  AVG(severity) as avg_severity
FROM loss_events
WHERE source = 'NOAA';

-- View sample events
SELECT 
  event_type,
  severity,
  zip,
  state_code,
  event_timestamp,
  source_event_id
FROM loss_events
WHERE source = 'NOAA'
ORDER BY event_timestamp DESC
LIMIT 10;

