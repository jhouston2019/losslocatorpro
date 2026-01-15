/**
 * POPULATE ZIP-COUNTY CROSSWALK
 * 
 * Loads ZIP to county FIPS mapping data
 * 
 * Run with: npx tsx scripts/populate-crosswalk.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// ============================================================================
// SAMPLE CROSSWALK DATA
// ============================================================================

/**
 * Sample ZIP-County mappings for major US cities
 * In production, load from HUD USPS crosswalk or other authoritative source
 */
const SAMPLE_CROSSWALK_DATA = [
  // Los Angeles County, CA
  { zip: '90001', county_fips: '06037', state: 'CA', county_name: 'Los Angeles County' },
  { zip: '90002', county_fips: '06037', state: 'CA', county_name: 'Los Angeles County' },
  { zip: '90210', county_fips: '06037', state: 'CA', county_name: 'Los Angeles County' },
  { zip: '90211', county_fips: '06037', state: 'CA', county_name: 'Los Angeles County' },
  
  // Cook County, IL (Chicago)
  { zip: '60601', county_fips: '17031', state: 'IL', county_name: 'Cook County' },
  { zip: '60602', county_fips: '17031', state: 'IL', county_name: 'Cook County' },
  { zip: '60603', county_fips: '17031', state: 'IL', county_name: 'Cook County' },
  
  // Harris County, TX (Houston)
  { zip: '77001', county_fips: '48201', state: 'TX', county_name: 'Harris County' },
  { zip: '77002', county_fips: '48201', state: 'TX', county_name: 'Harris County' },
  { zip: '77003', county_fips: '48201', state: 'TX', county_name: 'Harris County' },
  
  // Maricopa County, AZ (Phoenix)
  { zip: '85001', county_fips: '04013', state: 'AZ', county_name: 'Maricopa County' },
  { zip: '85002', county_fips: '04013', state: 'AZ', county_name: 'Maricopa County' },
  { zip: '85003', county_fips: '04013', state: 'AZ', county_name: 'Maricopa County' },
  
  // Miami-Dade County, FL
  { zip: '33101', county_fips: '12086', state: 'FL', county_name: 'Miami-Dade County' },
  { zip: '33102', county_fips: '12086', state: 'FL', county_name: 'Miami-Dade County' },
  { zip: '33109', county_fips: '12086', state: 'FL', county_name: 'Miami-Dade County' },
  
  // King County, WA (Seattle)
  { zip: '98101', county_fips: '53033', state: 'WA', county_name: 'King County' },
  { zip: '98102', county_fips: '53033', state: 'WA', county_name: 'King County' },
  { zip: '98103', county_fips: '53033', state: 'WA', county_name: 'King County' },
  
  // New York County, NY (Manhattan)
  { zip: '10001', county_fips: '36061', state: 'NY', county_name: 'New York County' },
  { zip: '10002', county_fips: '36061', state: 'NY', county_name: 'New York County' },
  { zip: '10003', county_fips: '36061', state: 'NY', county_name: 'New York County' },
];

// ============================================================================
// POPULATION FUNCTIONS
// ============================================================================

/**
 * Populate from sample data
 */
async function populateFromSampleData() {
  console.log('📥 Populating crosswalk from sample data...\n');
  
  const records = SAMPLE_CROSSWALK_DATA.map(entry => ({
    zip_code: entry.zip,
    county_fips: entry.county_fips,
    state_code: entry.state,
    county_name: entry.county_name,
    residential_ratio: 1.0
  }));
  
  const { data, error } = await supabase
    .from('zip_county_crosswalk')
    .upsert(records, {
      onConflict: 'zip_code,county_fips',
      ignoreDuplicates: false
    });
  
  if (error) {
    console.error('❌ Error inserting sample data:', error);
    return 0;
  }
  
  console.log(`✅ Inserted ${records.length} sample crosswalk entries`);
  return records.length;
}

/**
 * Populate from existing loss_events data
 */
async function populateFromExistingEvents() {
  console.log('📥 Populating crosswalk from existing loss_events...\n');
  
  // Get distinct ZIP/county combinations from loss_events
  const { data: events, error: eventsError } = await supabase
    .from('loss_events')
    .select('zip, county_fips, state_code')
    .not('zip', 'is', null)
    .not('county_fips', 'is', null)
    .not('state_code', 'is', null);
  
  if (eventsError) {
    console.error('❌ Error fetching events:', eventsError);
    return 0;
  }
  
  if (!events || events.length === 0) {
    console.log('⚠️  No events with ZIP and county data found');
    return 0;
  }
  
  // Deduplicate
  const uniqueCombos = new Map<string, any>();
  events.forEach(event => {
    const key = `${event.zip}-${event.county_fips}`;
    if (!uniqueCombos.has(key)) {
      uniqueCombos.set(key, {
        zip_code: event.zip,
        county_fips: event.county_fips,
        state_code: event.state_code,
        residential_ratio: 1.0
      });
    }
  });
  
  const records = Array.from(uniqueCombos.values());
  
  console.log(`Found ${records.length} unique ZIP-county combinations`);
  
  // Insert in batches of 100
  let inserted = 0;
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    
    const { error } = await supabase
      .from('zip_county_crosswalk')
      .upsert(batch, {
        onConflict: 'zip_code,county_fips',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error(`❌ Error inserting batch ${i / 100 + 1}:`, error);
    } else {
      inserted += batch.length;
      console.log(`✅ Inserted batch ${i / 100 + 1}: ${batch.length} records`);
    }
  }
  
  return inserted;
}

/**
 * Show current crosswalk statistics
 */
async function showStatistics() {
  console.log('\n📊 Crosswalk Statistics:\n');
  
  const { count: totalCount } = await supabase
    .from('zip_county_crosswalk')
    .select('*', { count: 'exact', head: true });
  
  const { data: byState } = await supabase
    .from('zip_county_crosswalk')
    .select('state_code');
  
  const stateCounts: Record<string, number> = {};
  byState?.forEach(row => {
    stateCounts[row.state_code] = (stateCounts[row.state_code] || 0) + 1;
  });
  
  console.log(`Total entries: ${totalCount || 0}`);
  console.log('\nBy state:');
  Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([state, count]) => {
      console.log(`  ${state}: ${count}`);
    });
  
  // Sample entries
  const { data: samples } = await supabase
    .from('zip_county_crosswalk')
    .select('*')
    .limit(5);
  
  if (samples && samples.length > 0) {
    console.log('\nSample entries:');
    samples.forEach(entry => {
      console.log(`  ${entry.zip_code} → ${entry.county_fips} (${entry.state_code}) - ${entry.county_name || 'N/A'}`);
    });
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  console.log('🗺️  ZIP-County Crosswalk Population Tool\n');
  console.log('=' .repeat(60));
  
  // Check if crosswalk already has data
  const { count: existingCount } = await supabase
    .from('zip_county_crosswalk')
    .select('*', { count: 'exact', head: true });
  
  if (existingCount && existingCount > 0) {
    console.log(`\n⚠️  Crosswalk already has ${existingCount} entries`);
    console.log('This will add/update entries, not replace them.\n');
  }
  
  // Populate from both sources
  let totalInserted = 0;
  
  // 1. Sample data
  const sampleCount = await populateFromSampleData();
  totalInserted += sampleCount;
  
  // 2. Existing events
  const eventCount = await populateFromExistingEvents();
  totalInserted += eventCount;
  
  // Show statistics
  await showStatistics();
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Population complete: ${totalInserted} entries added/updated`);
  console.log('='.repeat(60));
  
  console.log('\n📝 Next steps:');
  console.log('1. Run geo enrichment: curl -X GET "https://your-site.netlify.app/.netlify/functions/enrich-geo-resolution"');
  console.log('2. Verify aggregates: npx tsx verify-geo-aggregation.ts');
  console.log('3. Check UI: Navigate to /geo-opportunities');
  
  console.log('\n💡 To load full HUD crosswalk:');
  console.log('1. Download from: https://www.huduser.gov/portal/datasets/usps_crosswalk.html');
  console.log('2. Import via SQL: COPY zip_county_crosswalk (zip_code, county_fips, state_code, residential_ratio) FROM \'/path/to/file.csv\' CSV HEADER;');
}

// Run
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Population failed:', error);
    process.exit(1);
  });
