-- Loss Locator Pro - Supabase Schema
-- Internal production database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('ops', 'admin', 'viewer')) DEFAULT 'ops',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- LOSS EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS loss_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('Hail', 'Wind', 'Fire', 'Freeze')),
  severity NUMERIC NOT NULL,
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  zip TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  income_band TEXT,
  state_code TEXT,
  property_type TEXT CHECK (property_type IN ('residential', 'commercial')),
  is_commercial BOOLEAN GENERATED ALWAYS AS (property_type = 'commercial') STORED,
  claim_probability NUMERIC CHECK (claim_probability >= 0 AND claim_probability <= 1),
  priority_score INTEGER CHECK (priority_score >= 0 AND priority_score <= 100),
  status TEXT NOT NULL DEFAULT 'Unreviewed' CHECK (status IN ('Unreviewed', 'Contacted', 'Qualified', 'Converted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_loss_events_timestamp ON loss_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_loss_events_status ON loss_events(status);
CREATE INDEX IF NOT EXISTS idx_loss_events_zip ON loss_events(zip);
CREATE INDEX IF NOT EXISTS idx_loss_events_priority ON loss_events(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_loss_events_state_code ON loss_events(state_code);
CREATE INDEX IF NOT EXISTS idx_loss_events_property_type ON loss_events(property_type_new);
CREATE INDEX IF NOT EXISTS idx_loss_events_is_commercial ON loss_events(is_commercial);

-- ============================================================================
-- PROPERTIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  zip TEXT NOT NULL,
  property_type TEXT,
  roof_age TEXT,
  zip_income_band TEXT,
  risk_tags TEXT[],
  timeline JSONB DEFAULT '[]'::jsonb,
  recommended_actions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for property lookups
CREATE INDEX IF NOT EXISTS idx_properties_zip ON properties(zip);

-- ============================================================================
-- PROPERTY EVENTS (Junction table for property-event relationship)
-- ============================================================================
CREATE TABLE IF NOT EXISTS property_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  loss_event_id UUID REFERENCES loss_events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, loss_event_id)
);

-- ============================================================================
-- ROUTING QUEUE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS routing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loss_event_id UUID REFERENCES loss_events(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  assigned_to TEXT,
  assignee_type TEXT CHECK (assignee_type IN ('internal-ops', 'adjuster-partner', 'contractor-partner')),
  priority TEXT CHECK (priority IN ('High', 'Medium', 'Low')) DEFAULT 'High',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Unassigned' CHECK (status IN ('Unassigned', 'Assigned', 'Contacted', 'Qualified', 'Converted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for routing queries
CREATE INDEX IF NOT EXISTS idx_routing_queue_status ON routing_queue(status);
CREATE INDEX IF NOT EXISTS idx_routing_queue_loss_event ON routing_queue(loss_event_id);

-- ============================================================================
-- ZIP DEMOGRAPHICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS zip_demographics (
  zip TEXT PRIMARY KEY,
  state_code TEXT NOT NULL,
  median_household_income INTEGER,
  per_capita_income INTEGER,
  income_percentile INTEGER CHECK (income_percentile >= 0 AND income_percentile <= 100),
  population INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zip_demographics_state ON zip_demographics(state_code);
CREATE INDEX IF NOT EXISTS idx_zip_demographics_income_percentile ON zip_demographics(income_percentile DESC);

-- ============================================================================
-- LOSS PROPERTIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS loss_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loss_id UUID REFERENCES loss_events(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT,
  state_code TEXT,
  zip TEXT,
  owner_name TEXT,
  owner_type TEXT CHECK (owner_type IN ('individual', 'LLC', 'Corp', 'Trust', 'Other')),
  mailing_address TEXT,
  phone_primary TEXT,
  phone_secondary TEXT,
  phone_type TEXT CHECK (phone_type IN ('mobile', 'landline', 'voip', 'unknown')),
  phone_confidence INTEGER CHECK (phone_confidence >= 0 AND phone_confidence <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loss_properties_loss_id ON loss_properties(loss_id);
CREATE INDEX IF NOT EXISTS idx_loss_properties_state ON loss_properties(state_code);
CREATE INDEX IF NOT EXISTS idx_loss_properties_zip ON loss_properties(zip);
CREATE INDEX IF NOT EXISTS idx_loss_properties_phone_confidence ON loss_properties(phone_confidence DESC);

-- ============================================================================
-- ADMIN SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_severity INTEGER DEFAULT 75,
  min_claim_probability NUMERIC DEFAULT 0.70,
  auto_create_lead BOOLEAN DEFAULT true,
  nightly_export BOOLEAN DEFAULT false,
  min_income_percentile INTEGER DEFAULT 0 CHECK (min_income_percentile >= 0 AND min_income_percentile <= 100),
  min_phone_confidence INTEGER DEFAULT 0 CHECK (min_phone_confidence >= 0 AND min_phone_confidence <= 100),
  enable_residential_leads BOOLEAN DEFAULT true,
  phone_required_routing BOOLEAN DEFAULT false,
  commercial_only_routing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default admin settings
INSERT INTO admin_settings (min_severity, min_claim_probability, auto_create_lead, nightly_export)
VALUES (75, 0.70, true, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE loss_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE zip_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE loss_properties ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Loss events policies
CREATE POLICY "Authenticated users can view loss events" ON loss_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Ops and Admin can insert loss events" ON loss_events
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ops', 'admin'))
  );

CREATE POLICY "Ops and Admin can update loss events" ON loss_events
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ops', 'admin'))
  );

-- Properties policies
CREATE POLICY "Authenticated users can view properties" ON properties
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Ops and Admin can insert properties" ON properties
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ops', 'admin'))
  );

CREATE POLICY "Ops and Admin can update properties" ON properties
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ops', 'admin'))
  );

-- Property events policies
CREATE POLICY "Authenticated users can view property events" ON property_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Ops and Admin can manage property events" ON property_events
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ops', 'admin'))
  );

-- Routing queue policies
CREATE POLICY "Authenticated users can view routing queue" ON routing_queue
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Ops and Admin can manage routing queue" ON routing_queue
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ops', 'admin'))
  );

-- Admin settings policies
CREATE POLICY "Authenticated users can view admin settings" ON admin_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can update admin settings" ON admin_settings
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ZIP demographics policies
CREATE POLICY "Authenticated users can view zip demographics" ON zip_demographics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Ops and Admin can manage zip demographics" ON zip_demographics
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ops', 'admin'))
  );

-- Loss properties policies
CREATE POLICY "Authenticated users can view loss properties" ON loss_properties
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Ops and Admin can manage loss properties" ON loss_properties
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ops', 'admin'))
  );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_loss_events_updated_at BEFORE UPDATE ON loss_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routing_queue_updated_at BEFORE UPDATE ON routing_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON admin_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zip_demographics_updated_at BEFORE UPDATE ON zip_demographics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loss_properties_updated_at BEFORE UPDATE ON loss_properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create user record on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'ops');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new auth users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();



