-- Loss Locator Pro - Production Hardening Patch
-- Fix 3: Ensure RLS policies are properly configured for enrichment tables
-- This ensures authenticated users can read enrichment data

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Ensure RLS is enabled (idempotent - safe to run multiple times)
ALTER TABLE zip_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE loss_properties ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES (if any conflicts exist)
-- ============================================================================

-- Drop and recreate to ensure clean state
DROP POLICY IF EXISTS "Authenticated users can view zip demographics" ON zip_demographics;
DROP POLICY IF EXISTS "Ops and Admin can manage zip demographics" ON zip_demographics;
DROP POLICY IF EXISTS "Authenticated users can view loss properties" ON loss_properties;
DROP POLICY IF EXISTS "Ops and Admin can manage loss properties" ON loss_properties;

-- ============================================================================
-- CREATE READ-ONLY POLICIES FOR AUTHENTICATED USERS
-- ============================================================================

-- ZIP Demographics - Read access for all authenticated users
CREATE POLICY "read_zip_demographics"
ON zip_demographics
FOR SELECT
TO authenticated
USING (true);

-- ZIP Demographics - Full access for ops and admin
CREATE POLICY "manage_zip_demographics"
ON zip_demographics
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('ops', 'admin')
  )
);

-- Loss Properties - Read access for all authenticated users
CREATE POLICY "read_loss_properties"
ON loss_properties
FOR SELECT
TO authenticated
USING (true);

-- Loss Properties - Full access for ops and admin
CREATE POLICY "manage_loss_properties"
ON loss_properties
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('ops', 'admin')
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After running this migration, verify with:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('zip_demographics', 'loss_properties');

-- Should show 4 policies total (2 per table)

