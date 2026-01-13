-- Loss Locator Pro - Production Hardening Patch
-- Fix 1: Rename property_type_new to property_type
-- This ensures database schema matches application code expectations

-- ============================================================================
-- RENAME COLUMN
-- ============================================================================

-- Rename property_type_new to property_type
ALTER TABLE loss_events
RENAME COLUMN property_type_new TO property_type;

-- Note: The is_commercial computed column automatically updates to reference
-- the renamed column since it's defined as GENERATED ALWAYS AS (property_type = 'commercial')

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the column exists with correct name
-- Run this after migration:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'loss_events' 
-- AND column_name IN ('property_type', 'is_commercial');







