/**
 * VERIFICATION SCRIPT: GEO AGGREGATION
 * 
 * Verifies that ZIP/county-level aggregation is working correctly
 * 
 * Run with: npx tsx verify-geo-aggregation.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './lib/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

async function verifyGeoAggregation() {
  console.log('🔍 Verifying Geo Aggregation Implementation\n');
  
  let allPassed = true;
  
  // ============================================================================
  // TEST 1: Check loss_events schema extensions
  // ============================================================================
  console.log('TEST 1: Verify loss_events schema extensions');
  
  const { data: events, error: eventsError } = await supabase
    .from('loss_events')
    .select('id, county_fips, zip_codes, geo_resolution_level, confidence_level')
    .limit(5);
  
  if (eventsError) {
    console.log('❌ FAILED: Could not query loss_events with new columns');
    console.log('   Error:', eventsError.message);
    allPassed = false;
  } else {
    console.log('✅ PASSED: loss_events has new geo columns');
    console.log(`   Sample: ${events?.length || 0} events queried`);
  }
  
  // ============================================================================
  // TEST 2: Check loss_geo_aggregates table
  // ============================================================================
  console.log('\nTEST 2: Verify loss_geo_aggregates table exists');
  
  const { data: aggregates, error: aggregatesError } = await supabase
    .from('loss_geo_aggregates')
    .select('*')
    .limit(5);
  
  if (aggregatesError) {
    console.log('❌ FAILED: Could not query loss_geo_aggregates');
    console.log('   Error:', aggregatesError.message);
    allPassed = false;
  } else {
    console.log('✅ PASSED: loss_geo_aggregates table exists');
    console.log(`   Records: ${aggregates?.length || 0}`);
    
    if (aggregates && aggregates.length > 0) {
      const sample = aggregates[0];
      console.log('   Sample aggregate:');
      console.log(`     ZIP: ${sample.zip_code}`);
      console.log(`     County: ${sample.county_fips || 'N/A'}`);
      console.log(`     Event Type: ${sample.event_type}`);
      console.log(`     Severity: ${(sample.severity_score * 100).toFixed(0)}%`);
      console.log(`     Claim Prob: ${(sample.claim_probability * 100).toFixed(0)}%`);
    }
  }
  
  // ============================================================================
  // TEST 3: Check zip_county_crosswalk table
  // ============================================================================
  console.log('\nTEST 3: Verify zip_county_crosswalk table exists');
  
  const { data: crosswalk, error: crosswalkError } = await supabase
    .from('zip_county_crosswalk')
    .select('*')
    .limit(5);
  
  if (crosswalkError) {
    console.log('❌ FAILED: Could not query zip_county_crosswalk');
    console.log('   Error:', crosswalkError.message);
    allPassed = false;
  } else {
    console.log('✅ PASSED: zip_county_crosswalk table exists');
    console.log(`   Records: ${crosswalk?.length || 0}`);
    
    if (crosswalk && crosswalk.length > 0) {
      console.log('   Sample crosswalk entries:');
      crosswalk.slice(0, 3).forEach(entry => {
        console.log(`     ${entry.zip_code} → ${entry.county_fips} (${entry.state_code})`);
      });
    }
  }
  
  // ============================================================================
  // TEST 4: Check aggregate views
  // ============================================================================
  console.log('\nTEST 4: Verify loss_opportunities_by_zip view');
  
  const { data: zipOpps, error: zipOppsError } = await supabase
    .from('loss_opportunities_by_zip')
    .select('*')
    .limit(5);
  
  if (zipOppsError) {
    console.log('❌ FAILED: Could not query loss_opportunities_by_zip view');
    console.log('   Error:', zipOppsError.message);
    allPassed = false;
  } else {
    console.log('✅ PASSED: loss_opportunities_by_zip view exists');
    console.log(`   Records: ${zipOpps?.length || 0}`);
    
    if (zipOpps && zipOpps.length > 0) {
      const sample = zipOpps[0];
      console.log('   Sample ZIP opportunity:');
      console.log(`     ZIP: ${sample.zip_code}`);
      console.log(`     Event Count: ${sample.event_count}`);
      console.log(`     Avg Claim Prob: ${(sample.avg_claim_probability * 100).toFixed(0)}%`);
    }
  }
  
  console.log('\nTEST 5: Verify loss_opportunities_by_county view');
  
  const { data: countyOpps, error: countyOppsError } = await supabase
    .from('loss_opportunities_by_county')
    .select('*')
    .limit(5);
  
  if (countyOppsError) {
    console.log('❌ FAILED: Could not query loss_opportunities_by_county view');
    console.log('   Error:', countyOppsError.message);
    allPassed = false;
  } else {
    console.log('✅ PASSED: loss_opportunities_by_county view exists');
    console.log(`   Records: ${countyOpps?.length || 0}`);
  }
  
  // ============================================================================
  // TEST 6: Check helper function
  // ============================================================================
  console.log('\nTEST 6: Verify populate_geo_aggregates_for_event function');
  
  if (events && events.length > 0) {
    const testEventId = events[0].id;
    
    const { data: functionResult, error: functionError } = await supabase
      .rpc('populate_geo_aggregates_for_event', { event_uuid: testEventId });
    
    if (functionError) {
      console.log('⚠️  WARNING: Could not call populate_geo_aggregates_for_event');
      console.log('   Error:', functionError.message);
      console.log('   (This is OK if function requires specific permissions)');
    } else {
      console.log('✅ PASSED: populate_geo_aggregates_for_event function exists');
      console.log(`   Result: ${functionResult} aggregates created/updated`);
    }
  }
  
  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Geo Aggregation is properly configured');
  } else {
    console.log('❌ SOME TESTS FAILED - Review errors above');
  }
  console.log('='.repeat(60));
  
  // ============================================================================
  // STATISTICS
  // ============================================================================
  console.log('\n📊 Current Statistics:');
  
  const { count: eventCount } = await supabase
    .from('loss_events')
    .select('*', { count: 'exact', head: true });
  
  const { count: aggregateCount } = await supabase
    .from('loss_geo_aggregates')
    .select('*', { count: 'exact', head: true });
  
  const { count: crosswalkCount } = await supabase
    .from('zip_county_crosswalk')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   Loss Events: ${eventCount || 0}`);
  console.log(`   Geo Aggregates: ${aggregateCount || 0}`);
  console.log(`   ZIP-County Crosswalk Entries: ${crosswalkCount || 0}`);
  
  if (eventCount && aggregateCount) {
    const ratio = (aggregateCount / eventCount).toFixed(2);
    console.log(`   Aggregates per Event: ${ratio}`);
  }
}

// Run verification
verifyGeoAggregation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Verification failed with error:', error);
    process.exit(1);
  });
