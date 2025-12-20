-- Loss Locator Pro - Seed Data
-- Migrating mock data to Supabase

-- ============================================================================
-- SEED LOSS EVENTS
-- ============================================================================
INSERT INTO loss_events (id, event_type, severity, event_timestamp, zip, lat, lng, income_band, property_type, claim_probability, priority_score, status) VALUES
  ('10001'::uuid, 'Hail', 3.25, '2025-01-02 14:32:00', '76179', 32.9542, -97.3531, '72nd percentile', 'Single Family', 0.82, 92, 'Unreviewed'),
  ('10002'::uuid, 'Wind', 61, '2025-01-02 15:01:00', '77007', 29.7604, -95.3698, '68th percentile', 'Townhome', 0.71, 84, 'Contacted'),
  ('10003'::uuid, 'Hail', 2.75, '2025-01-02 15:47:00', '75248', 32.9481, -96.7731, '81st percentile', 'Single Family', 0.88, 96, 'Unreviewed'),
  ('10004'::uuid, 'Freeze', 18, '2025-01-02 16:10:00', '80216', 39.7817, -104.9124, '55th percentile', 'Duplex', 0.54, 68, 'Qualified'),
  ('10005'::uuid, 'Wind', 72, '2025-01-02 16:42:00', '29464', 32.8998, -80.0407, '77th percentile', 'Single Family', 0.76, 89, 'Unreviewed'),
  ('10006'::uuid, 'Fire', 83, '2025-01-02 17:05:00', '85054', 33.6119, -112.0733, '63rd percentile', 'Condo', 0.69, 80, 'Qualified'),
  ('10007'::uuid, 'Hail', 1.75, '2025-01-02 17:22:00', '60611', 41.8902, -87.6230, '88th percentile', 'High-Rise', 0.61, 74, 'Contacted'),
  ('10008'::uuid, 'Wind', 58, '2025-01-02 18:03:00', '30041', 33.8490, -84.1340, '69th percentile', 'Single Family', 0.59, 71, 'Unreviewed'),
  ('10009'::uuid, 'Freeze', 15, '2025-01-02 18:37:00', '55410', 44.9537, -93.2643, '73rd percentile', 'Single Family', 0.63, 76, 'Contacted'),
  ('10010'::uuid, 'Hail', 2.0, '2025-01-02 19:02:00', '73099', 35.2226, -97.4395, '58th percentile', 'Single Family', 0.69, 83, 'Qualified'),
  ('10011'::uuid, 'Wind', 64, '2025-01-02 19:18:00', '29407', 32.7876, -79.9403, '61st percentile', 'Townhome', 0.57, 69, 'Unreviewed'),
  ('10012'::uuid, 'Fire', 91, '2025-01-02 19:56:00', '85018', 33.5092, -112.0473, '79th percentile', 'Single Family', 0.91, 98, 'Converted'),
  ('10013'::uuid, 'Hail', 1.5, '2025-01-02 20:24:00', '76109', 32.7357, -97.4011, '66th percentile', 'Single Family', 0.55, 64, 'Contacted'),
  ('10014'::uuid, 'Freeze', 12, '2025-01-02 20:45:00', '80210', 39.7294, -104.9903, '71st percentile', 'Duplex', 0.48, 59, 'Unreviewed'),
  ('10015'::uuid, 'Wind', 69, '2025-01-02 21:10:00', '30004', 34.0368, -84.2177, '75th percentile', 'Single Family', 0.73, 86, 'Qualified');

-- ============================================================================
-- SEED PROPERTIES
-- ============================================================================
INSERT INTO properties (id, address, zip, property_type, roof_age, zip_income_band, risk_tags, timeline, recommended_actions) VALUES
  ('10001'::uuid, '1209 Meadowbrook Dr, Fort Worth TX', '76179', 'Single Family', '12–15 years', '72nd percentile', 
   ARRAY['High hail exposure', 'Old shingles', 'Prior storm cluster'],
   '[
     {"type": "Hail", "value": "3.25 inch", "date": "2025-01-02"},
     {"type": "Wind", "value": "58 mph", "date": "2024-08-14"},
     {"type": "Freeze", "value": "17°F", "date": "2024-01-18"}
   ]'::jsonb,
   ARRAY['Contact homeowner for roof inspection', 'Verify prior claim history', 'Send contractor match']),
   
  ('10002'::uuid, '714 Heights Blvd, Houston TX', '77007', 'Townhome', '5–7 years', '68th percentile',
   ARRAY['Tree overhang', 'Mixed roofing materials'],
   '[
     {"type": "Wind", "value": "61 mph", "date": "2025-01-02"},
     {"type": "Hail", "value": "1.75 inch", "date": "2024-05-09"},
     {"type": "Freeze", "value": "21°F", "date": "2023-12-22"}
   ]'::jsonb,
   ARRAY['Confirm no prior unrepaired roof work', 'Capture exterior photos during inspection']),
   
  ('10003'::uuid, '5811 Preston Meadow Dr, Dallas TX', '75248', 'Single Family', '8–10 years', '81st percentile',
   ARRAY['Frequent hail corridor', 'Adjacent to open field exposure'],
   '[
     {"type": "Hail", "value": "2.75 inch", "date": "2025-01-02"},
     {"type": "Hail", "value": "1.5 inch", "date": "2024-03-30"},
     {"type": "Wind", "value": "64 mph", "date": "2023-09-18"}
   ]'::jsonb,
   ARRAY['Prioritize outbound call within 2 hours', 'Pre-authorize ladder assist for inspection', 'Flag for QA review due to repeated impacts']);

-- ============================================================================
-- LINK PROPERTIES TO LOSS EVENTS
-- ============================================================================
INSERT INTO property_events (property_id, loss_event_id) VALUES
  ('10001'::uuid, '10001'::uuid),
  ('10002'::uuid, '10002'::uuid),
  ('10003'::uuid, '10003'::uuid);

-- ============================================================================
-- SEED ROUTING QUEUE
-- ============================================================================
INSERT INTO routing_queue (loss_event_id, property_id, assigned_to, assignee_type, priority, status, notes) VALUES
  ('10001'::uuid, '10001'::uuid, NULL, NULL, 'High', 'Unassigned', NULL),
  ('10002'::uuid, '10002'::uuid, 'Internal Ops', 'internal-ops', 'High', 'Assigned', 'Initial contact scheduled'),
  ('10003'::uuid, '10003'::uuid, 'Adjuster Partner', 'adjuster-partner', 'High', 'Contacted', 'Homeowner interested in inspection'),
  ('10005'::uuid, NULL, 'Contractor Partner', 'contractor-partner', 'Medium', 'Qualified', 'Awaiting contractor availability'),
  ('10012'::uuid, NULL, 'Internal Ops', 'internal-ops', 'High', 'Converted', 'Claim filed and approved');



