-- ============================================================================
-- MIGRATION 008: ZIP/COUNTY-LEVEL AGGREGATION
-- ============================================================================
-- Adds geographic resolution and aggregation capabilities
-- Converts event intelligence → geographic opportunity clusters
-- No addresses yet - clean, defensible ZIP/county-level data

-- ============================================================================
-- STEP 1: EXTEND loss_events TABLE
-- ============================================================================

-- Add county FIPS code
ALTER TABLE loss_events
ADD COLUMN IF NOT EXISTS county_fips TEXT;

-- Add ZIP codes array (events can span multiple ZIPs)
ALTER TABLE loss_events
ADD COLUMN IF NOT EXISTS zip_codes TEXT[];

-- Add geographic resolution level
DO $$ BEGIN
  CREATE TYPE geo_resolution_level AS ENUM ('state', 'county', 'zip', 'point');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE loss_events
ADD COLUMN IF NOT EXISTS geo_resolution_level geo_resolution_level DEFAULT 'state';

-- Add confidence level (based on source type)
DO $$ BEGIN
  CREATE TYPE confidence_level AS ENUM ('forecast', 'active', 'declared', 'confirmed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE loss_events
ADD COLUMN IF NOT EXISTS confidence_level confidence_level DEFAULT 'active';

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_loss_events_county_fips ON loss_events(county_fips)
  WHERE county_fips IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loss_events_zip_codes ON loss_events USING GIN(zip_codes)
  WHERE zip_codes IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loss_events_geo_resolution ON loss_events(geo_resolution_level);

CREATE INDEX IF NOT EXISTS idx_loss_events_confidence ON loss_events(confidence_level);

-- ============================================================================
-- STEP 2: CREATE loss_geo_aggregates TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS loss_geo_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event reference
  event_id UUID NOT NULL REFERENCES loss_events(id) ON DELETE CASCADE,
  
  -- Geographic identifiers
  state_code TEXT NOT NULL,
  county_fips TEXT,
  zip_code TEXT NOT NULL,
  
  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN ('Hail', 'Wind', 'Fire', 'Freeze')),
  severity_score NUMERIC NOT NULL CHECK (severity_score >= 0 AND severity_score <= 1),
  claim_probability NUMERIC NOT NULL CHECK (claim_probability >= 0 AND claim_probability <= 1),
  
  -- Temporal data
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Confidence and source tracking
  confidence_level confidence_level NOT NULL,
  source TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate aggregates for same event + ZIP
  UNIQUE(event_id, zip_code)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_geo_agg_zip ON loss_geo_aggregates(zip_code);
CREATE INDEX IF NOT EXISTS idx_geo_agg_county ON loss_geo_aggregates(county_fips)
  WHERE county_fips IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_geo_agg_state ON loss_geo_aggregates(state_code);
CREATE INDEX IF NOT EXISTS idx_geo_agg_event_type ON loss_geo_aggregates(event_type);
CREATE INDEX IF NOT EXISTS idx_geo_agg_timestamp ON loss_geo_aggregates(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_geo_agg_confidence ON loss_geo_aggregates(confidence_level);
CREATE INDEX IF NOT EXISTS idx_geo_agg_severity ON loss_geo_aggregates(severity_score DESC);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_geo_agg_zip_event_time ON loss_geo_aggregates(zip_code, event_type, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_geo_agg_county_event_time ON loss_geo_aggregates(county_fips, event_type, event_timestamp DESC)
  WHERE county_fips IS NOT NULL;

-- ============================================================================
-- STEP 3: CREATE ZIP-COUNTY CROSSWALK TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS zip_county_crosswalk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Geographic identifiers
  zip_code TEXT NOT NULL,
  county_fips TEXT NOT NULL,
  state_code TEXT NOT NULL,
  county_name TEXT,
  
  -- Population weight (for multi-county ZIPs)
  residential_ratio NUMERIC DEFAULT 1.0 CHECK (residential_ratio >= 0 AND residential_ratio <= 1),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(zip_code, county_fips)
);

-- Indexes for crosswalk lookups
CREATE INDEX IF NOT EXISTS idx_crosswalk_zip ON zip_county_crosswalk(zip_code);
CREATE INDEX IF NOT EXISTS idx_crosswalk_county ON zip_county_crosswalk(county_fips);
CREATE INDEX IF NOT EXISTS idx_crosswalk_state ON zip_county_crosswalk(state_code);

-- ============================================================================
-- STEP 4: CREATE AGGREGATE VIEW FOR DASHBOARDS
-- ============================================================================

CREATE OR REPLACE VIEW loss_opportunities_by_zip AS
SELECT 
  zip_code,
  state_code,
  county_fips,
  event_type,
  COUNT(DISTINCT event_id) as event_count,
  AVG(severity_score) as avg_severity,
  AVG(claim_probability) as avg_claim_probability,
  MAX(severity_score) as max_severity,
  MAX(claim_probability) as max_claim_probability,
  MAX(event_timestamp) as latest_event,
  MIN(event_timestamp) as earliest_event,
  STRING_AGG(DISTINCT confidence_level::text, ', ') as confidence_levels,
  STRING_AGG(DISTINCT source, ', ') as sources
FROM loss_geo_aggregates
GROUP BY zip_code, state_code, county_fips, event_type;

CREATE OR REPLACE VIEW loss_opportunities_by_county AS
SELECT 
  county_fips,
  state_code,
  event_type,
  COUNT(DISTINCT event_id) as event_count,
  COUNT(DISTINCT zip_code) as zip_count,
  AVG(severity_score) as avg_severity,
  AVG(claim_probability) as avg_claim_probability,
  MAX(severity_score) as max_severity,
  MAX(claim_probability) as max_claim_probability,
  MAX(event_timestamp) as latest_event,
  MIN(event_timestamp) as earliest_event,
  STRING_AGG(DISTINCT confidence_level::text, ', ') as confidence_levels,
  STRING_AGG(DISTINCT source, ', ') as sources
FROM loss_geo_aggregates
WHERE county_fips IS NOT NULL
GROUP BY county_fips, state_code, event_type;

-- ============================================================================
-- STEP 5: UPDATE TRIGGER FOR loss_geo_aggregates
-- ============================================================================

CREATE OR REPLACE FUNCTION update_geo_aggregates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_loss_geo_aggregates_updated_at
  BEFORE UPDATE ON loss_geo_aggregates
  FOR EACH ROW
  EXECUTE FUNCTION update_geo_aggregates_timestamp();

-- ============================================================================
-- STEP 6: RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS
ALTER TABLE loss_geo_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE zip_county_crosswalk ENABLE ROW LEVEL SECURITY;

-- Policies for loss_geo_aggregates
CREATE POLICY "Authenticated users can view geo aggregates" ON loss_geo_aggregates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Ops and Admin can insert geo aggregates" ON loss_geo_aggregates
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ops', 'admin'))
  );

CREATE POLICY "Ops and Admin can update geo aggregates" ON loss_geo_aggregates
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ops', 'admin'))
  );

-- Policies for zip_county_crosswalk
CREATE POLICY "Authenticated users can view crosswalk" ON zip_county_crosswalk
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Ops and Admin can manage crosswalk" ON zip_county_crosswalk
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ops', 'admin'))
  );

-- ============================================================================
-- STEP 7: HELPER FUNCTION TO POPULATE AGGREGATES
-- ============================================================================

CREATE OR REPLACE FUNCTION populate_geo_aggregates_for_event(event_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  event_record RECORD;
  zip_code_item TEXT;
  inserted_count INTEGER := 0;
BEGIN
  -- Get event details
  SELECT * INTO event_record
  FROM loss_events
  WHERE id = event_uuid;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- If event has zip_codes array, create aggregate for each ZIP
  IF event_record.zip_codes IS NOT NULL AND array_length(event_record.zip_codes, 1) > 0 THEN
    FOREACH zip_code_item IN ARRAY event_record.zip_codes
    LOOP
      INSERT INTO loss_geo_aggregates (
        event_id,
        state_code,
        county_fips,
        zip_code,
        event_type,
        severity_score,
        claim_probability,
        event_timestamp,
        confidence_level,
        source
      ) VALUES (
        event_record.id,
        event_record.state_code,
        event_record.county_fips,
        zip_code_item,
        event_record.event_type,
        event_record.severity,
        event_record.claim_probability,
        event_record.event_timestamp,
        event_record.confidence_level,
        event_record.source
      )
      ON CONFLICT (event_id, zip_code) DO UPDATE SET
        severity_score = EXCLUDED.severity_score,
        claim_probability = EXCLUDED.claim_probability,
        updated_at = NOW();
      
      inserted_count := inserted_count + 1;
    END LOOP;
  
  -- If no zip_codes array but has single ZIP, use that
  ELSIF event_record.zip IS NOT NULL AND event_record.zip != '00000' THEN
    INSERT INTO loss_geo_aggregates (
      event_id,
      state_code,
      county_fips,
      zip_code,
      event_type,
      severity_score,
      claim_probability,
      event_timestamp,
      confidence_level,
      source
    ) VALUES (
      event_record.id,
      event_record.state_code,
      event_record.county_fips,
      event_record.zip,
      event_record.event_type,
      event_record.severity,
      event_record.claim_probability,
      event_record.event_timestamp,
      event_record.confidence_level,
      event_record.source
    )
    ON CONFLICT (event_id, zip_code) DO UPDATE SET
      severity_score = EXCLUDED.severity_score,
      claim_probability = EXCLUDED.claim_probability,
      updated_at = NOW();
    
    inserted_count := 1;
  END IF;
  
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✅ Extended loss_events with county_fips, zip_codes, geo_resolution_level, confidence_level
-- ✅ Created loss_geo_aggregates table for ZIP/county-level opportunities
-- ✅ Created zip_county_crosswalk table for geographic resolution
-- ✅ Created aggregate views for dashboards
-- ✅ Added RLS policies
-- ✅ Created helper function to populate aggregates

COMMENT ON TABLE loss_geo_aggregates IS 'ZIP/county-level opportunity clusters derived from loss events';
COMMENT ON TABLE zip_county_crosswalk IS 'ZIP to county FIPS crosswalk for geographic resolution';
COMMENT ON COLUMN loss_events.county_fips IS 'County FIPS code (5 digits: 2 state + 3 county)';
COMMENT ON COLUMN loss_events.zip_codes IS 'Array of ZIP codes affected by this event';
COMMENT ON COLUMN loss_events.geo_resolution_level IS 'Geographic precision: state, county, zip, or point';
COMMENT ON COLUMN loss_events.confidence_level IS 'Confidence in event data: forecast, active, declared, confirmed';
