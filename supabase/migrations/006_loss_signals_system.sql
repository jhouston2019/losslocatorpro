-- ============================================================================
-- LOSS SIGNALS SYSTEM MIGRATION
-- ============================================================================
-- Loss Locator Pro aggregates and organizes multi-source loss signals 
-- into confidence-scored loss intelligence.
-- 
-- This migration adds:
-- - loss_signals: Raw signals from multiple sources
-- - loss_clusters: Deduplicated, confidence-scored loss intelligence
-- - loss_cluster_signals: Join table for signal-to-cluster relationships
-- ============================================================================

-- ============================================================================
-- LOSS SIGNALS TABLE
-- ============================================================================
-- Stores raw loss signals from multiple external sources
-- Sources: weather | fire_report | cad | news | declaration
CREATE TABLE IF NOT EXISTS loss_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source attribution
  source_type TEXT NOT NULL CHECK (source_type IN ('weather', 'fire_report', 'cad', 'news', 'declaration')),
  source_name TEXT NOT NULL,  -- e.g., 'NOAA', 'NFIRS', 'PulsePoint', 'RSS Feed Name'
  external_id TEXT,           -- Original ID from source system
  
  -- Event classification
  event_type TEXT NOT NULL CHECK (event_type IN ('fire', 'wind', 'hail', 'flood', 'freeze', 'tornado', 'other')),
  
  -- Temporal data
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reported_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Spatial data
  lat NUMERIC,
  lng NUMERIC,
  geometry JSONB,             -- GeoJSON for point or polygon
  address_text TEXT,
  city TEXT,
  state_code TEXT,
  zip TEXT,
  
  -- Signal quality
  severity_raw NUMERIC,       -- Raw severity from source (0-100)
  confidence_raw NUMERIC CHECK (confidence_raw >= 0 AND confidence_raw <= 1),  -- 0-1 per source
  
  -- Metadata
  raw_data JSONB,             -- Full raw payload for audit trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate ingestion from same source
  UNIQUE(source_type, source_name, external_id)
);

-- Indexes for signal queries and clustering
CREATE INDEX IF NOT EXISTS idx_loss_signals_source_type ON loss_signals(source_type);
CREATE INDEX IF NOT EXISTS idx_loss_signals_event_type ON loss_signals(event_type);
CREATE INDEX IF NOT EXISTS idx_loss_signals_occurred_at ON loss_signals(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_loss_signals_coordinates ON loss_signals(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loss_signals_state ON loss_signals(state_code) WHERE state_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loss_signals_zip ON loss_signals(zip) WHERE zip IS NOT NULL;

-- ============================================================================
-- LOSS CLUSTERS TABLE
-- ============================================================================
-- Deduplicated, confidence-scored loss intelligence derived from signals
CREATE TABLE IF NOT EXISTS loss_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event classification
  event_type TEXT NOT NULL CHECK (event_type IN ('fire', 'wind', 'hail', 'flood', 'freeze', 'tornado', 'other')),
  
  -- Spatial data (centroid of contributing signals)
  center_lat NUMERIC NOT NULL,
  center_lng NUMERIC NOT NULL,
  geometry JSONB,             -- GeoJSON polygon representing cluster extent
  address_text TEXT,
  city TEXT,
  state_code TEXT,
  zip TEXT,
  
  -- Temporal window
  time_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  time_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Confidence scoring
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  verification_status TEXT NOT NULL CHECK (verification_status IN ('probable', 'reported', 'confirmed')),
  
  -- Signal composition
  signal_count INTEGER NOT NULL DEFAULT 1,
  source_types TEXT[],        -- Array of contributing source types
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for cluster queries
CREATE INDEX IF NOT EXISTS idx_loss_clusters_event_type ON loss_clusters(event_type);
CREATE INDEX IF NOT EXISTS idx_loss_clusters_time_window ON loss_clusters(time_window_start DESC, time_window_end DESC);
CREATE INDEX IF NOT EXISTS idx_loss_clusters_coordinates ON loss_clusters(center_lat, center_lng);
CREATE INDEX IF NOT EXISTS idx_loss_clusters_confidence ON loss_clusters(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_loss_clusters_verification ON loss_clusters(verification_status);
CREATE INDEX IF NOT EXISTS idx_loss_clusters_state ON loss_clusters(state_code) WHERE state_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loss_clusters_zip ON loss_clusters(zip) WHERE zip IS NOT NULL;

-- ============================================================================
-- LOSS CLUSTER SIGNALS (JOIN TABLE)
-- ============================================================================
-- Links signals to their parent clusters
CREATE TABLE IF NOT EXISTS loss_cluster_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES loss_clusters(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES loss_signals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure each signal only belongs to one cluster
  UNIQUE(signal_id)
);

-- Indexes for join queries
CREATE INDEX IF NOT EXISTS idx_loss_cluster_signals_cluster ON loss_cluster_signals(cluster_id);
CREATE INDEX IF NOT EXISTS idx_loss_cluster_signals_signal ON loss_cluster_signals(signal_id);

-- ============================================================================
-- INGESTION LOG TABLE
-- ============================================================================
-- Tracks ingestion runs for monitoring and debugging
CREATE TABLE IF NOT EXISTS loss_signal_ingestion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
  signals_ingested INTEGER DEFAULT 0,
  signals_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_log_source ON loss_signal_ingestion_log(source_type, source_name);
CREATE INDEX IF NOT EXISTS idx_ingestion_log_started ON loss_signal_ingestion_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_log_status ON loss_signal_ingestion_log(status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE loss_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE loss_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE loss_cluster_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE loss_signal_ingestion_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all signals and clusters
CREATE POLICY "Authenticated users can view loss signals" ON loss_signals
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view loss clusters" ON loss_clusters
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view cluster signals" ON loss_cluster_signals
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view ingestion log" ON loss_signal_ingestion_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- Service role (ingestion functions) can insert/update
CREATE POLICY "Service role can manage loss signals" ON loss_signals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage loss clusters" ON loss_clusters
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage cluster signals" ON loss_cluster_signals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage ingestion log" ON loss_signal_ingestion_log
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on loss_clusters
CREATE TRIGGER update_loss_clusters_updated_at BEFORE UPDATE ON loss_clusters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate distance between two points (Haversine formula)
-- Used for spatial clustering
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 NUMERIC, 
  lng1 NUMERIC, 
  lat2 NUMERIC, 
  lng2 NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  r NUMERIC := 6371; -- Earth radius in km
  dlat NUMERIC;
  dlng NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlng/2) * sin(dlng/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get verification status from confidence score
CREATE OR REPLACE FUNCTION get_verification_status(confidence_score INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF confidence_score < 60 THEN
    RETURN 'probable';
  ELSIF confidence_score < 86 THEN
    RETURN 'reported';
  ELSE
    RETURN 'confirmed';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE loss_signals IS 'Raw loss signals from multiple external sources (weather, fire reports, CAD, news, declarations)';
COMMENT ON TABLE loss_clusters IS 'Deduplicated, confidence-scored loss intelligence derived from multiple signals';
COMMENT ON TABLE loss_cluster_signals IS 'Join table linking signals to their parent clusters';
COMMENT ON TABLE loss_signal_ingestion_log IS 'Audit log of ingestion runs for monitoring and debugging';

COMMENT ON COLUMN loss_signals.source_type IS 'Type of source: weather | fire_report | cad | news | declaration';
COMMENT ON COLUMN loss_signals.confidence_raw IS 'Source-specific confidence score (0-1)';
COMMENT ON COLUMN loss_clusters.confidence_score IS 'Composite confidence score (0-100) based on signal composition';
COMMENT ON COLUMN loss_clusters.verification_status IS 'probable (<60) | reported (60-85) | confirmed (>85)';







