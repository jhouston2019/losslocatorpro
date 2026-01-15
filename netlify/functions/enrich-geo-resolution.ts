/**
 * NETLIFY FUNCTION: GEO ENRICHMENT & RESOLUTION
 * 
 * Resolves loss events to ZIP codes and counties
 * Creates aggregated opportunity clusters at ZIP/county level
 * 
 * Trigger: Scheduled (daily) or manual invocation
 * 
 * WHAT IT DOES:
 * 1. Finds loss_events without geo resolution
 * 2. Resolves to county FIPS and ZIP codes
 * 3. Populates loss_geo_aggregates table
 * 4. Updates loss_events with resolution metadata
 */

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// ============================================================================
// TYPES
// ============================================================================

interface GeoResolutionResult {
  eventId: string;
  countyFips: string | null;
  zipCodes: string[];
  resolutionLevel: 'state' | 'county' | 'zip' | 'point';
  aggregatesCreated: number;
}

interface EnrichmentStats {
  eventsProcessed: number;
  eventsEnriched: number;
  aggregatesCreated: number;
  errors: string[];
}

// ============================================================================
// ZIP-COUNTY CROSSWALK LOOKUP
// ============================================================================

/**
 * Get all ZIP codes for a given county FIPS
 */
async function getZipsForCounty(countyFips: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('zip_county_crosswalk')
    .select('zip_code')
    .eq('county_fips', countyFips);
  
  if (error) {
    console.error('Error fetching ZIPs for county:', error);
    return [];
  }
  
  return data?.map(row => row.zip_code) || [];
}

/**
 * Get county FIPS for a given ZIP code
 */
async function getCountyForZip(zipCode: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('zip_county_crosswalk')
    .select('county_fips')
    .eq('zip_code', zipCode)
    .limit(1)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data.county_fips;
}

// ============================================================================
// GEO RESOLUTION LOGIC
// ============================================================================

/**
 * Resolve a loss event to county and ZIP codes
 */
async function resolveEventGeography(event: any): Promise<GeoResolutionResult> {
  let countyFips: string | null = null;
  let zipCodes: string[] = [];
  let resolutionLevel: 'state' | 'county' | 'zip' | 'point' = 'state';
  
  // STRATEGY 1: Event already has county_fips
  if (event.county_fips) {
    countyFips = event.county_fips;
    zipCodes = await getZipsForCounty(countyFips);
    resolutionLevel = zipCodes.length > 0 ? 'county' : 'state';
  }
  // STRATEGY 2: Event has ZIP code(s)
  else if (event.zip_codes && event.zip_codes.length > 0) {
    zipCodes = event.zip_codes;
    // Try to get county from first ZIP
    countyFips = await getCountyForZip(zipCodes[0]);
    resolutionLevel = 'zip';
  }
  // STRATEGY 3: Event has single ZIP field
  else if (event.zip && event.zip !== '00000') {
    zipCodes = [event.zip];
    countyFips = await getCountyForZip(event.zip);
    resolutionLevel = 'zip';
  }
  // STRATEGY 4: Event has lat/lng - could do reverse geocoding here
  else if (event.latitude && event.longitude) {
    // For now, just mark as point-level without resolution
    // Future: Add reverse geocoding service
    resolutionLevel = 'point';
  }
  
  // Create aggregates for each ZIP
  let aggregatesCreated = 0;
  if (zipCodes.length > 0) {
    aggregatesCreated = await createGeoAggregates(event, countyFips, zipCodes);
  }
  
  return {
    eventId: event.id,
    countyFips,
    zipCodes,
    resolutionLevel,
    aggregatesCreated
  };
}

// ============================================================================
// AGGREGATE CREATION
// ============================================================================

/**
 * Create loss_geo_aggregates entries for an event
 */
async function createGeoAggregates(
  event: any,
  countyFips: string | null,
  zipCodes: string[]
): Promise<number> {
  const aggregates = zipCodes.map(zipCode => ({
    event_id: event.id,
    state_code: event.state_code,
    county_fips: countyFips,
    zip_code: zipCode,
    event_type: event.event_type,
    severity_score: event.severity / 100, // Convert to 0-1 scale
    claim_probability: event.claim_probability || 0.5,
    event_timestamp: event.event_timestamp,
    confidence_level: event.confidence_level || 'active',
    source: event.source
  }));
  
  const { data, error } = await supabase
    .from('loss_geo_aggregates')
    .upsert(aggregates, {
      onConflict: 'event_id,zip_code',
      ignoreDuplicates: false
    });
  
  if (error) {
    console.error('Error creating geo aggregates:', error);
    return 0;
  }
  
  return aggregates.length;
}

// ============================================================================
// CLAIM PROBABILITY ADJUSTMENT
// ============================================================================

/**
 * Calculate ZIP-level claim probability
 * Adjusts base event severity by event type and property distribution
 */
function calculateZipClaimProbability(
  eventSeverity: number,
  eventType: string,
  propertyType?: string
): number {
  let baseProbability = eventSeverity / 100;
  
  // Event type multipliers
  const eventMultipliers: Record<string, number> = {
    'Hail': 1.2,      // High claim rate
    'Wind': 1.1,      // Moderate-high claim rate
    'Fire': 1.3,      // Very high claim rate
    'Freeze': 0.9     // Lower claim rate
  };
  
  const multiplier = eventMultipliers[eventType] || 1.0;
  baseProbability *= multiplier;
  
  // Property type adjustment
  if (propertyType === 'commercial') {
    baseProbability *= 1.15; // Commercial properties more likely to file
  }
  
  // Cap at 0.95 (never 100% certain)
  return Math.min(baseProbability, 0.95);
}

// ============================================================================
// MAIN ENRICHMENT PROCESS
// ============================================================================

/**
 * Process events that need geo enrichment
 */
async function enrichEvents(limit: number = 100): Promise<EnrichmentStats> {
  const stats: EnrichmentStats = {
    eventsProcessed: 0,
    eventsEnriched: 0,
    aggregatesCreated: 0,
    errors: []
  };
  
  // Find events without geo resolution
  const { data: events, error: fetchError } = await supabase
    .from('loss_events')
    .select('*')
    .or('geo_resolution_level.is.null,geo_resolution_level.eq.state')
    .limit(limit);
  
  if (fetchError) {
    stats.errors.push(`Failed to fetch events: ${fetchError.message}`);
    return stats;
  }
  
  if (!events || events.length === 0) {
    console.log('No events need geo enrichment');
    return stats;
  }
  
  console.log(`Processing ${events.length} events for geo enrichment`);
  
  // Process each event
  for (const event of events) {
    try {
      stats.eventsProcessed++;
      
      const result = await resolveEventGeography(event);
      
      // Update event with resolution metadata
      if (result.zipCodes.length > 0 || result.countyFips) {
        const { error: updateError } = await supabase
          .from('loss_events')
          .update({
            county_fips: result.countyFips,
            zip_codes: result.zipCodes.length > 0 ? result.zipCodes : null,
            geo_resolution_level: result.resolutionLevel,
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id);
        
        if (updateError) {
          stats.errors.push(`Failed to update event ${event.id}: ${updateError.message}`);
        } else {
          stats.eventsEnriched++;
          stats.aggregatesCreated += result.aggregatesCreated;
        }
      }
    } catch (err) {
      const error = err as Error;
      stats.errors.push(`Error processing event ${event.id}: ${error.message}`);
    }
  }
  
  return stats;
}

// ============================================================================
// NETLIFY HANDLER
// ============================================================================

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  console.log('Starting geo enrichment process');
  
  try {
    // Parse query parameters
    const limit = parseInt(event.queryStringParameters?.limit || '100');
    
    // Run enrichment
    const stats = await enrichEvents(limit);
    
    console.log('Geo enrichment complete:', stats);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Geo enrichment failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    };
  }
};
