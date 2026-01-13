-- Loss Locator Pro - Fix RLS for loss_events table
-- This ensures authenticated users can read loss events in the Loss Feed

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Ensure RLS is enabled on loss_events
ALTER TABLE loss_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES (if any conflicts exist)
-- ============================================================================

DROP POLICY IF EXISTS "read_loss_events" ON loss_events;
DROP POLICY IF EXISTS "manage_loss_events" ON loss_events;
DROP POLICY IF EXISTS "Authenticated users can view loss events" ON loss_events;
DROP POLICY IF EXISTS "Ops and Admin can manage loss events" ON loss_events;

-- ============================================================================
-- CREATE READ-ONLY POLICY FOR AUTHENTICATED USERS
-- ============================================================================

-- Loss Events - Read access for all authenticated users
CREATE POLICY "read_loss_events"
ON loss_events
FOR SELECT
TO authenticated
USING (true);

-- Loss Events - Full access for ops and admin
CREATE POLICY "manage_loss_events"
ON loss_events
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
-- WHERE tablename = 'loss_events';

-- Should show 2 policies (read + manage)







