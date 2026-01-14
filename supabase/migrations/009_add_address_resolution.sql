-- ============================================================================
-- MIGRATION 009: STAGED ADDRESS RESOLUTION
-- ============================================================================
-- Event-triggered, on-demand address resolution
-- NO bulk imports - addresses resolved only when needed
-- Keeps cost and risk under control

-- ============================================================================
-- STEP 1: CREATE loss_property_candidates TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS loss_property_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Geographic context
  zip_code TEXT NOT NULL,
  county_fips TEXT,
  state_code TEXT,
  
  -- Property details
  address TEXT NOT NULL,
  city TEXT,
  property_type TEXT CHECK (property_type IN ('residential', 'commercial', 'unknown')),
  
  -- Resolution metadata
  resolution_source TEXT NOT NULL, -- 'county_parcels', 'commercial_api', 'user_upload', etc.
  resolution_trigger TEXT, -- 'threshold', 'user_action', 'downstream_request'
  
  -- Event association
  event_id UUID REFERENCES loss_events(id) ON DELETE CASCADE,
  event_type TEXT,
  
  -- Scoring
  estimated_claim_probability NUMERIC CHECK (estimated_claim_probability >= 0 AND estimated_claim_probability <= 1),
  zip_level_probability NUMERIC, -- Original ZIP-level probability before adjustment
  property_score_adjustment NUMERIC, -- Adjustment factor applied
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (status IN ('unreviewed', 'reviewed', 'qualified', 'discarded')),
  
  -- Compliance and audit
  resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate addresses per event
  UNIQUE(event_id, address)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_property_candidates_zip ON loss_property_candidates(zip_code);
CREATE INDEX IF NOT EXISTS idx_property_candidates_county ON loss_property_candidates(county_fips)
  WHERE county_fips IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_property_candidates_event ON loss_property_candidates(event_id);
CREATE INDEX IF NOT EXISTS idx_property_candidates_status ON loss_property_candidates(status);
CREATE INDEX IF NOT EXISTS idx_property_candidates_probability ON loss_property_candidates(estimated_claim_probability DESC)
  WHERE estimated_claim_probability IS NOT NULL;

-- Composite indexes for filtering
CREATE INDEX IF NOT EXISTS idx_property_candidates_zip_status ON loss_property_candidates(zip_code, status);
CREATE INDEX IF NOT EXISTS idx_property_candidates_event_status ON loss_property_candidates(event_id, status);

-- ============================================================================
-- STEP 2: CREATE ADDRESS RESOLUTION LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS address_resolution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Resolution context
  zip_code TEXT NOT NULL,
  event_id UUID REFERENCES loss_events(id) ON DELETE CASCADE,
  
  -- Trigger details
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('threshold', 'user_action', 'downstream_request', 'manual')),
  triggered_by UUID REFERENCES auth.users(id),
  
  -- Resolution details
  resolution_source TEXT NOT NULL,
  properties_found INTEGER DEFAULT 0,
  properties_inserted INTEGER DEFAULT 0,
  
  -- Execution metadata
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for resolution log
CREATE INDEX IF NOT EXISTS idx_resolution_log_zip ON address_resolution_log(zip_code);
CREATE INDEX IF NOT EXISTS idx_resolution_log_event ON address_resolution_log(event_id);
CREATE INDEX IF NOT EXISTS idx_resolution_log_trigger ON address_resolution_log(trigger_type);
CREATE INDEX IF NOT EXISTS idx_resolution_log_status ON address_resolution_log(status);
CREATE INDEX IF NOT EXISTS idx_resolution_log_created ON address_resolution_log(created_at DESC);

-- ============================================================================
-- STEP 3: CREATE RESOLUTION THRESHOLD SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS address_resolution_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Threshold configuration
  auto_resolve_threshold NUMERIC DEFAULT 0.70 CHECK (auto_resolve_threshold >= 0 AND auto_resolve_threshold <= 1),
  min_event_count INTEGER DEFAULT 2, -- Minimum events in ZIP to trigger
  max_properties_per_zip INTEGER DEFAULT 500, -- Safety limit
  
  -- Source priority (JSON array of sources in priority order)
  source_priority JSONB DEFAULT '["county_parcels", "commercial_api", "user_upload"]'::jsonb,
  
  -- Feature flags
  enable_auto_resolution BOOLEAN DEFAULT false, -- Disabled by default
  enable_user_triggered BOOLEAN DEFAULT true,
  enable_downstream_triggered BOOLEAN DEFAULT true,
  
  -- Metadata
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO address_resolution_settings (
  auto_resolve_threshold,
  min_event_count,
  max_properties_per_zip,
  enable_auto_resolution,
  enable_user_triggered,
  enable_downstream_triggered
) VALUES (
  0.70,
  2,
  500,
  false,
  true,
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 4: CREATE VIEW FOR HIGH-CONFIDENCE ZIP CLUSTERS
-- ============================================================================

CREATE OR REPLACE VIEW zip_clusters_ready_for_resolution AS
SELECT 
  z.zip_code,
  z.state_code,
  z.county_fips,
  z.event_type,
  z.event_count,
  z.avg_claim_probability,
  z.max_claim_probability,
  z.latest_event,
  -- Check if already resolved
  COALESCE(pc.property_count, 0) as properties_resolved,
  -- Check if meets threshold
  CASE 
    WHEN z.avg_claim_probability >= (SELECT auto_resolve_threshold FROM address_resolution_settings LIMIT 1)
    AND z.event_count >= (SELECT min_event_count FROM address_resolution_settings LIMIT 1)
    THEN true
    ELSE false
  END as meets_threshold
FROM loss_opportunities_by_zip z
LEFT JOIN (
  SELECT 
    zip_code,
    COUNT(*) as property_count
  FROM loss_property_candidates
  WHERE status != 'discarded'
  GROUP BY zip_code
) pc ON z.zip_code = pc.zip_code
WHERE z.avg_claim_probability > 0.50; -- Only show meaningful clusters

-- ============================================================================
-- STEP 5: HELPER FUNCTIONS
-- ============================================================================

-- Function to check if ZIP should be auto-resolved
CREATE OR REPLACE FUNCTION should_auto_resolve_zip(p_zip_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_settings RECORD;
  v_zip_stats RECORD;
BEGIN
  -- Get settings
  SELECT * INTO v_settings FROM address_resolution_settings LIMIT 1;
  
  -- If auto-resolution disabled, return false
  IF NOT v_settings.enable_auto_resolution THEN
    RETURN false;
  END IF;
  
  -- Get ZIP statistics
  SELECT 
    avg_claim_probability,
    event_count
  INTO v_zip_stats
  FROM loss_opportunities_by_zip
  WHERE zip_code = p_zip_code;
  
  -- Check if not found
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check thresholds
  IF v_zip_stats.avg_claim_probability >= v_settings.auto_resolve_threshold
     AND v_zip_stats.event_count >= v_settings.min_event_count THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to log resolution attempt
CREATE OR REPLACE FUNCTION log_address_resolution(
  p_zip_code TEXT,
  p_event_id UUID,
  p_trigger_type TEXT,
  p_triggered_by UUID,
  p_resolution_source TEXT
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO address_resolution_log (
    zip_code,
    event_id,
    trigger_type,
    triggered_by,
    resolution_source,
    status
  ) VALUES (
    p_zip_code,
    p_event_id,
    p_trigger_type,
    p_triggered_by,
    p_resolution_source,
    'pending'
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete resolution log
CREATE OR REPLACE FUNCTION complete_address_resolution(
  p_log_id UUID,
  p_properties_found INTEGER,
  p_properties_inserted INTEGER,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE address_resolution_log
  SET 
    properties_found = p_properties_found,
    properties_inserted = p_properties_inserted,
    completed_at = NOW(),
    status = CASE WHEN p_error_message IS NULL THEN 'completed' ELSE 'failed' END,
    error_message = p_error_message
  WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: UPDATE TRIGGER FOR loss_property_candidates
-- ============================================================================

CREATE OR REPLACE FUNCTION update_property_candidates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_loss_property_candidates_updated_at
  BEFORE UPDATE ON loss_property_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_property_candidates_timestamp();

-- ============================================================================
-- STEP 7: RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE loss_property_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE address_resolution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE address_resolution_settings ENABLE ROW LEVEL SECURITY;

-- Policies for loss_property_candidates
CREATE POLICY "Authenticated users can view property candidates" ON loss_property_candidates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Ops and Admin can insert property candidates" ON loss_property_candidates
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ops', 'admin'))
  );

CREATE POLICY "Ops and Admin can update property candidates" ON loss_property_candidates
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ops', 'admin'))
  );

-- Policies for address_resolution_log
CREATE POLICY "Authenticated users can view resolution log" ON address_resolution_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Ops and Admin can manage resolution log" ON address_resolution_log
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ops', 'admin'))
  );

-- Policies for address_resolution_settings
CREATE POLICY "Authenticated users can view settings" ON address_resolution_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can update settings" ON address_resolution_settings
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✅ Created loss_property_candidates table for staged address resolution
-- ✅ Created address_resolution_log for audit trail
-- ✅ Created address_resolution_settings for threshold configuration
-- ✅ Created view for high-confidence ZIP clusters ready for resolution
-- ✅ Created helper functions for resolution logic
-- ✅ Added RLS policies for security
-- ✅ NO auto-scraping - addresses resolved only on trigger

COMMENT ON TABLE loss_property_candidates IS 'Property addresses resolved on-demand from high-confidence ZIP clusters';
COMMENT ON TABLE address_resolution_log IS 'Audit log of address resolution attempts and results';
COMMENT ON TABLE address_resolution_settings IS 'Configuration for address resolution thresholds and triggers';
COMMENT ON COLUMN loss_property_candidates.resolution_source IS 'Source of address data: county_parcels, commercial_api, user_upload, etc.';
COMMENT ON COLUMN loss_property_candidates.resolution_trigger IS 'What triggered resolution: threshold, user_action, downstream_request';
COMMENT ON COLUMN loss_property_candidates.estimated_claim_probability IS 'Property-level probability (adjusted from ZIP-level)';
COMMENT ON COLUMN loss_property_candidates.status IS 'Review status: unreviewed, reviewed, qualified, discarded';
