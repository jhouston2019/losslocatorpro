import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';

// ============================================================================
// GEO RESOLUTION ENRICHMENT
// ============================================================================
// Resolves loss events to ZIP codes and counties
// Creates geographic opportunity clusters
// Runs daily after ingestion functions

// ============================================================================
// TYPES
// ============================================================================

interface LossEvent {
  id: string;
  state_code: string | null;
  county_fips: string | null;
  zip: string;
  zip_codes: string[] | null;
  latitude: number | null;
  longitude: number | null;
  event_type: string;
  severity: number;
  claim_probability: number | null;
  event_timestamp: string;
  confidence_level: string | null;
  source: string | null;
  geo_resolution_level: string | null;
}

interface ZIPCountyCrosswalk {
  zip_code: string;
  county_fips: string;
  state_code: string;
  county_name: string | null;
  residential_ratio: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Batch size for processing events
const BATCH_SIZE = 100;

// ============================================================================
// GEO RESOLUTION LOGIC
// ============================================================================

/**
 * Resolve coordinates to ZIP code using Census Geocoding API
 */
async function reverseGeocodeToZip(lat: number, lng: number): Promise<{ zip: string; county_fips: string; state: string } | null> {
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    // Get ZIP code
    const zipResult = data?.result?.geographies?.['ZIP Code Tabulation Areas']?.[0];
    const zip = zipResult?.ZCTA5 || zipResult?.GEOID;
    
    // Get county FIPS
    const countyResult = data?.result?.geographies?.['Counties']?.[0];
    const stateFips = countyResult?.STATE || '';
    const countyFips = countyResult?.COUNTY || '';
    const fullCountyFips = stateFips && countyFips ? `${stateFips}${countyFips}` : '';
    
    // Get state code
    const stateResult = data?.result?.geographies?.States?.[0];
    const stateCode = stateResult?.STUSAB || '';
    
    if (!zip) return null;
    
    return {
      zip,
      county_fips: fullCountyFips,
      state: stateCode,
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Get all ZIPs in a county from crosswalk table
 */
async function getZIPsForCounty(supabase: any, countyFips: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('zip_county_crosswalk')
    .select('zip_code')
    .eq('county_fips', countyFips);
  
  if (error || !data) {
    console.error('Error fetching ZIPs for county:', error);
    return [];
  }
  
  return data.map((row: any) => row.zip_code);
}

/**
 * Get county FIPS for a ZIP code from crosswalk table
 */
async function getCountyForZIP(supabase: any, zipCode: string): Promise<{ county_fips: string; state_code: string } | null> {
  const { data, error } = await supabase
    .from('zip_county_crosswalk')
    .select('county_fips, state_code')
    .eq('zip_code', zipCode)
    .limit(1)
    .maybeSingle();
  
  if (error || !data) {
    return null;
  }
  
  return {
    county_fips: data.county_fips,
    state_code: data.state_code,
  };
}

/**
 * Determine confidence level based on source
 */
function determineConfidenceLevel(source: string | null): 'forecast' | 'active' | 'declared' | 'confirmed' {
  if (!source) return 'active';
  
  const sourceLower = source.toLowerCase();
  
  // NWS alerts are forecasts/warnings
  if (sourceLower === 'nws') return 'forecast';
  
  // FEMA disasters are declared
  if (sourceLower === 'fema') return 'declared';
  
  // NOAA storm reports are confirmed
  if (sourceLower === 'noaa') return 'confirmed';
  
  // Fire reports are active
  if (sourceLower.includes('fire')) return 'active';
  
  return 'active';
}

/**
 * Determine geo resolution level
 */
function determineGeoResolutionLevel(
  hasCoordinates: boolean,
  hasZIP: boolean,
  hasCounty: boolean
): 'state' | 'county' | 'zip' | 'point' {
  if (hasCoordinates) return 'point';
  if (hasZIP) return 'zip';
  if (hasCounty) return 'county';
  return 'state';
}

/**
 * Enrich a single event with geo resolution
 */
async function enrichEvent(supabase: any, event: LossEvent): Promise<{
  county_fips: string | null;
  zip_codes: string[];
  geo_resolution_level: 'state' | 'county' | 'zip' | 'point';
  confidence_level: 'forecast' | 'active' | 'declared' | 'confirmed';
}> {
  let countyFips = event.county_fips;
  let zipCodes: string[] = [];
  
  // If event already has zip_codes array, use it
  if (event.zip_codes && event.zip_codes.length > 0) {
    zipCodes = event.zip_codes;
  }
  // If event has coordinates, reverse geocode
  else if (event.latitude && event.longitude) {
    const geoResult = await reverseGeocodeToZip(event.latitude, event.longitude);
    if (geoResult) {
      zipCodes = [geoResult.zip];
      if (!countyFips) countyFips = geoResult.county_fips;
    }
  }
  // If event has single ZIP, use it
  else if (event.zip && event.zip !== '00000') {
    zipCodes = [event.zip];
    
    // Try to get county from crosswalk
    if (!countyFips) {
      const countyResult = await getCountyForZIP(supabase, event.zip);
      if (countyResult) {
        countyFips = countyResult.county_fips;
      }
    }
  }
  // If event has county but no ZIP, get all ZIPs in county
  else if (countyFips) {
    const countyZIPs = await getZIPsForCounty(supabase, countyFips);
    if (countyZIPs.length > 0) {
      zipCodes = countyZIPs;
    }
  }
  
  // Determine resolution level
  const geoResolutionLevel = determineGeoResolutionLevel(
    !!(event.latitude && event.longitude),
    zipCodes.length > 0,
    !!countyFips
  );
  
  // Determine confidence level
  const confidenceLevel = determineConfidenceLevel(event.source);
  
  return {
    county_fips: countyFips,
    zip_codes: zipCodes,
    geo_resolution_level: geoResolutionLevel,
    confidence_level: confidenceLevel,
  };
}

/**
 * Populate geo aggregates for an event
 */
async function populateGeoAggregates(supabase: any, eventId: string): Promise<number> {
  const { data, error } = await supabase.rpc('populate_geo_aggregates_for_event', {
    event_uuid: eventId,
  });
  
  if (error) {
    console.error(`Error populating aggregates for ${eventId}:`, error);
    return 0;
  }
  
  return data || 0;
}

// ============================================================================
// MAIN ENRICHMENT LOGIC
// ============================================================================

const handler: Handler = async (event, context) => {
  console.log('🗺️ Starting geo resolution enrichment...');
  
  const startTime = Date.now();
  let enrichedCount = 0;
  let aggregatesCreated = 0;
  let errorCount = 0;
  
  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    // Fetch events that need geo enrichment
    // Priority: events without zip_codes or county_fips
    const { data: events, error: fetchError } = await supabase
      .from('loss_events')
      .select('*')
      .or('zip_codes.is.null,county_fips.is.null,geo_resolution_level.is.null')
      .order('created_at', { ascending: false })
      .limit(BATCH_SIZE);
    
    if (fetchError) {
      throw new Error(`Error fetching events: ${fetchError.message}`);
    }
    
    if (!events || events.length === 0) {
      console.log('✅ No events need geo enrichment');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No events need enrichment',
          enriched: 0,
          aggregates_created: 0,
          errors: 0,
          duration: Date.now() - startTime,
        }),
      };
    }
    
    console.log(`📊 Found ${events.length} events to enrich`);
    
    // Process each event
    for (const evt of events) {
      try {
        // Enrich event with geo resolution
        const enrichment = await enrichEvent(supabase, evt as any);
        
        // Update event with enrichment data
        const { error: updateError } = await supabase
          .from('loss_events')
          .update({
            county_fips: enrichment.county_fips,
            zip_codes: enrichment.zip_codes,
            geo_resolution_level: enrichment.geo_resolution_level,
            confidence_level: enrichment.confidence_level,
          })
          .eq('id', evt.id);
        
        if (updateError) {
          console.error(`❌ Error updating event ${evt.id}:`, updateError);
          errorCount++;
          continue;
        }
        
        enrichedCount++;
        
        // Populate geo aggregates
        const aggregateCount = await populateGeoAggregates(supabase, evt.id);
        aggregatesCreated += aggregateCount;
        
        console.log(`✅ Enriched ${evt.source || 'unknown'} event: ${enrichment.zip_codes.length} ZIPs, ${enrichment.geo_resolution_level} resolution`);
        
      } catch (eventError) {
        console.error(`Error processing event ${evt.id}:`, eventError);
        errorCount++;
      }
    }
    
    const duration = Date.now() - startTime;
    const summary = {
      success: true,
      events_processed: events.length,
      enriched: enrichedCount,
      aggregates_created: aggregatesCreated,
      errors: errorCount,
      duration_ms: duration,
    };
    
    console.log('🎉 Geo resolution enrichment complete:', summary);
    
    return {
      statusCode: 200,
      body: JSON.stringify(summary),
    };
    
  } catch (error) {
    console.error('❌ Fatal error during enrichment:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        enriched: enrichedCount,
        aggregates_created: aggregatesCreated,
        errors: errorCount,
        duration: Date.now() - startTime,
      }),
    };
  }
};

// Export as scheduled function (runs daily after ingestion)
export { handler };
