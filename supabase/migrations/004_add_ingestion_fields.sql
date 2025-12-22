-- Loss Locator Pro - NOAA Ingestion Fields
-- Migration 004: Add fields for live data ingestion from NOAA severe weather feeds
-- This enables duplicate detection and source tracking for automated event ingestion

-- ============================================================================
-- ADD INGESTION TRACKING FIELDS TO LOSS_EVENTS
-- ============================================================================

ALTER TABLE loss_events
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS source_event_id TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Note: event_type and event_timestamp already exist in the schema
-- latitude/longitude are added as separate fields from lat/lng for precision

-- ============================================================================
-- CREATE UNIQUE INDEX FOR DUPLICATE PREVENTION
-- ============================================================================

-- Prevent duplicate ingestion of the same event from the same source
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_source_event
ON loss_events (source, source_event_id)
WHERE source IS NOT NULL AND source_event_id IS NOT NULL;

-- ============================================================================
-- ADD INDEXES FOR INGESTION QUERIES
-- ============================================================================

-- Index for source-based queries
CREATE INDEX IF NOT EXISTS idx_loss_events_source ON loss_events(source)
WHERE source IS NOT NULL;

-- Index for geospatial queries (if needed in future)
CREATE INDEX IF NOT EXISTS idx_loss_events_coordinates ON loss_events(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After running this migration, verify with:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'loss_events' 
-- AND column_name IN ('source', 'source_event_id', 'latitude', 'longitude');

-- Verify unique index:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'loss_events' 
-- AND indexname = 'idx_unique_source_event';

