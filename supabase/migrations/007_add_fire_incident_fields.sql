-- Loss Locator Pro - Fire Incident Integration Fields
-- Migration 007: Add fields for commercial and state/NFIRS fire incident ingestion
-- This enables address storage, confidence scoring, and raw payload audit trail

-- ============================================================================
-- ADD FIRE INCIDENT FIELDS TO LOSS_EVENTS
-- ============================================================================

ALTER TABLE loss_events
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
ADD COLUMN IF NOT EXISTS raw_payload JSONB;

-- ============================================================================
-- CREATE INDEXES FOR FIRE INCIDENT QUERIES
-- ============================================================================

-- Index for address-based queries
CREATE INDEX IF NOT EXISTS idx_loss_events_address ON loss_events(address)
WHERE address IS NOT NULL;

-- Index for confidence scoring
CREATE INDEX IF NOT EXISTS idx_loss_events_confidence ON loss_events(confidence_score DESC)
WHERE confidence_score IS NOT NULL;

-- Composite index for fire event deduplication by location and time
CREATE INDEX IF NOT EXISTS idx_loss_events_fire_dedup 
ON loss_events(event_type, latitude, longitude, event_timestamp)
WHERE event_type = 'Fire' AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN loss_events.address IS 'Full street address of the incident (if available)';
COMMENT ON COLUMN loss_events.confidence_score IS 'Confidence score 0-1, escalates when multiple sources corroborate';
COMMENT ON COLUMN loss_events.raw_payload IS 'Full raw JSON payload from source for audit trail';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After running this migration, verify with:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'loss_events' 
--   AND column_name IN ('address', 'confidence_score', 'raw_payload');

