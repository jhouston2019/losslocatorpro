/**
 * NETLIFY FUNCTION: STAGED ADDRESS RESOLUTION
 * 
 * Event-triggered, on-demand address resolution
 * NO bulk imports - addresses resolved only when needed
 * 
 * Trigger: User action, threshold, or downstream request
 * 
 * WHAT IT DOES:
 * 1. Receives ZIP code + event context
 * 2. Checks if resolution should proceed (thresholds, limits)
 * 3. Resolves addresses using pluggable sources
 * 4. Scores properties with adjusted claim probability
 * 5. Inserts into loss_property_candidates
 * 6. Logs resolution attempt
 * 
 * COMPLIANCE:
 * - No claim of verified damage
 * - No auto-contact
 * - No scraping without explicit trigger
 * - Source tracking for audit
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

interface AddressResolutionRequest {
  zipCode: string;
  eventId?: string;
  triggerType: 'threshold' | 'user_action' | 'downstream_request' | 'manual';
  triggeredBy?: string; // User ID
  resolutionSource?: string;
}

interface PropertyCandidate {
  address: string;
  city?: string;
  propertyType: 'residential' | 'commercial' | 'unknown';
  estimatedClaimProbability: number;
}

interface ResolutionResult {
  success: boolean;
  zipCode: string;
  propertiesFound: number;
  propertiesInserted: number;
  error?: string;
  logId?: string;
}

// ============================================================================
// THRESHOLD CHECKING
// ============================================================================

/**
 * Check if ZIP meets threshold for auto-resolution
 */
async function shouldResolveZip(zipCode: string): Promise<{
  shouldResolve: boolean;
  reason: string;
}> {
  // Get settings
  const { data: settings } = await supabase
    .from('address_resolution_settings')
    .select('*')
    .limit(1)
    .single();
  
  if (!settings) {
    return {
      shouldResolve: false,
      reason: 'No settings found'
    };
  }
  
  // Get ZIP statistics from aggregates
  const { data: zipStats } = await supabase
    .from('loss_geo_aggregates')
    .select('*')
    .eq('zip_code', zipCode);
  
  if (!zipStats || zipStats.length === 0) {
    return {
      shouldResolve: false,
      reason: 'No events found for ZIP'
    };
  }
  
  // Calculate average claim probability
  const avgProbability = zipStats.reduce((sum, row) => sum + (row.claim_probability || 0), 0) / zipStats.length;
  const eventCount = zipStats.length;
  
  // Check thresholds
  if (avgProbability < (settings.auto_resolve_threshold || 0.70)) {
    return {
      shouldResolve: false,
      reason: `Average claim probability ${(avgProbability * 100).toFixed(0)}% below threshold ${((settings.auto_resolve_threshold || 0.70) * 100).toFixed(0)}%`
    };
  }
  
  if (eventCount < (settings.min_event_count || 2)) {
    return {
      shouldResolve: false,
      reason: `Event count ${eventCount} below minimum ${settings.min_event_count || 2}`
    };
  }
  
  // Check if already resolved
  const { data: existingCandidates } = await supabase
    .from('loss_property_candidates')
    .select('id')
    .eq('zip_code', zipCode)
    .limit(1);
  
  if (existingCandidates && existingCandidates.length > 0) {
    return {
      shouldResolve: false,
      reason: 'ZIP already has resolved properties'
    };
  }
  
  return {
    shouldResolve: true,
    reason: `Meets threshold: ${(avgProbability * 100).toFixed(0)}% probability, ${eventCount} events`
  };
}

// ============================================================================
// ADDRESS RESOLUTION SOURCES (PLUGGABLE)
// ============================================================================

/**
 * INTERFACE for address resolution sources
 * Future implementations can add:
 * - County parcel data
 * - Commercial APIs (Melissa Data, SmartyStreets, etc.)
 * - User-uploaded lists
 */
interface AddressResolutionSource {
  name: string;
  resolveAddresses(zipCode: string, eventType?: string): Promise<PropertyCandidate[]>;
}

/**
 * MOCK SOURCE - Replace with real implementation
 * This is a placeholder that demonstrates the interface
 */
class MockAddressSource implements AddressResolutionSource {
  name = 'mock_source';
  
  async resolveAddresses(zipCode: string, eventType?: string): Promise<PropertyCandidate[]> {
    // In production, this would:
    // 1. Query county parcel database
    // 2. Call commercial API
    // 3. Read from uploaded file
    // 4. etc.
    
    console.log(`Mock resolution for ZIP ${zipCode}, event type: ${eventType}`);
    
    // Return empty array - no mock data
    return [];
  }
}

/**
 * PLACEHOLDER SOURCE - For demonstration
 * Shows how to structure real address sources
 */
class CountyParcelSource implements AddressResolutionSource {
  name = 'county_parcels';
  
  async resolveAddresses(zipCode: string, eventType?: string): Promise<PropertyCandidate[]> {
    // Future implementation:
    // 1. Determine county from ZIP
    // 2. Query county parcel API or database
    // 3. Filter by property type if needed
    // 4. Return structured candidates
    
    console.log(`County parcel lookup for ZIP ${zipCode} (not yet implemented)`);
    return [];
  }
}

/**
 * Get the appropriate resolution source
 */
function getResolutionSource(sourceName?: string): AddressResolutionSource {
  // Default to mock for now
  // In production, select based on sourceName and availability
  
  if (sourceName === 'county_parcels') {
    return new CountyParcelSource();
  }
  
  return new MockAddressSource();
}

// ============================================================================
// PROPERTY SCORING
// ============================================================================

/**
 * Calculate property-level claim probability
 * Starts with ZIP-level probability and adjusts
 */
function calculatePropertyClaimProbability(
  zipLevelProbability: number,
  propertyType: string,
  eventType: string
): number {
  let probability = zipLevelProbability;
  
  // Property type adjustments
  if (propertyType === 'commercial') {
    probability *= 1.15; // Commercial more likely to file
  } else if (propertyType === 'residential') {
    probability *= 1.0; // Baseline
  }
  
  // Event type adjustments
  const eventMultipliers: Record<string, number> = {
    'Fire': 1.2,
    'Hail': 1.1,
    'Wind': 1.05,
    'Freeze': 0.95
  };
  
  probability *= eventMultipliers[eventType] || 1.0;
  
  // Cap at 0.95
  return Math.min(probability, 0.95);
}

// ============================================================================
// MAIN RESOLUTION PROCESS
// ============================================================================

/**
 * Resolve addresses for a ZIP code
 */
async function resolveAddressesForZip(
  request: AddressResolutionRequest
): Promise<ResolutionResult> {
  const { zipCode, eventId, triggerType, triggeredBy, resolutionSource } = request;
  
  // Log the resolution attempt
  const { data: logEntry, error: logError } = await supabase
    .from('address_resolution_log')
    .insert({
      zip_code: zipCode,
      event_id: eventId,
      trigger_type: triggerType,
      triggered_by: triggeredBy,
      resolution_source: resolutionSource || 'mock_source',
      status: 'pending'
    })
    .select()
    .single();
  
  if (logError || !logEntry) {
    return {
      success: false,
      zipCode,
      propertiesFound: 0,
      propertiesInserted: 0,
      error: 'Failed to create resolution log'
    };
  }
  
  try {
    // Get ZIP-level statistics for scoring
    const { data: zipAggregates } = await supabase
      .from('loss_geo_aggregates')
      .select('*')
      .eq('zip_code', zipCode);
    
    if (!zipAggregates || zipAggregates.length === 0) {
      await supabase
        .from('address_resolution_log')
        .update({
          status: 'failed',
          error_message: 'No aggregates found for ZIP',
          completed_at: new Date().toISOString()
        })
        .eq('id', logEntry.id);
      
      return {
        success: false,
        zipCode,
        propertiesFound: 0,
        propertiesInserted: 0,
        error: 'No aggregates found for ZIP',
        logId: logEntry.id
      };
    }
    
    // Calculate average ZIP-level probability
    const avgZipProbability = zipAggregates.reduce((sum, row) => 
      sum + (row.claim_probability || 0), 0) / zipAggregates.length;
    
    // Get most recent event type for context
    const recentAggregate = zipAggregates.sort((a, b) => 
      new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime()
    )[0];
    
    // Resolve addresses using selected source
    const source = getResolutionSource(resolutionSource);
    const candidates = await source.resolveAddresses(zipCode, recentAggregate.event_type);
    
    console.log(`Found ${candidates.length} property candidates for ZIP ${zipCode}`);
    
    // Insert candidates into database
    let insertedCount = 0;
    if (candidates.length > 0) {
      const candidateRecords = candidates.map(candidate => {
        const propertyProbability = calculatePropertyClaimProbability(
          avgZipProbability,
          candidate.propertyType,
          recentAggregate.event_type
        );
        
        return {
          zip_code: zipCode,
          county_fips: recentAggregate.county_fips,
          state_code: recentAggregate.state_code,
          address: candidate.address,
          city: candidate.city,
          property_type: candidate.propertyType,
          resolution_source: source.name,
          resolution_trigger: triggerType,
          event_id: eventId,
          event_type: recentAggregate.event_type,
          estimated_claim_probability: propertyProbability,
          zip_level_probability: avgZipProbability,
          property_score_adjustment: propertyProbability - avgZipProbability,
          status: 'unreviewed'
        };
      });
      
      const { data: inserted, error: insertError } = await supabase
        .from('loss_property_candidates')
        .insert(candidateRecords)
        .select();
      
      if (insertError) {
        console.error('Error inserting candidates:', insertError);
      } else {
        insertedCount = inserted?.length || 0;
      }
    }
    
    // Update resolution log
    await supabase
      .from('address_resolution_log')
      .update({
        properties_found: candidates.length,
        properties_inserted: insertedCount,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', logEntry.id);
    
    return {
      success: true,
      zipCode,
      propertiesFound: candidates.length,
      propertiesInserted: insertedCount,
      logId: logEntry.id
    };
  } catch (error) {
    // Log the error
    await supabase
      .from('address_resolution_log')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', logEntry.id);
    
    return {
      success: false,
      zipCode,
      propertiesFound: 0,
      propertiesInserted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      logId: logEntry.id
    };
  }
}

// ============================================================================
// NETLIFY HANDLER
// ============================================================================

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  console.log('Address resolution function invoked');
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const request: AddressResolutionRequest = JSON.parse(event.body || '{}');
    
    // Validate request
    if (!request.zipCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required field: zipCode' })
      };
    }
    
    if (!request.triggerType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required field: triggerType' })
      };
    }
    
    // Check if resolution should proceed (unless manual override)
    if (request.triggerType === 'threshold') {
      const check = await shouldResolveZip(request.zipCode);
      if (!check.shouldResolve) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: false,
            reason: check.reason,
            zipCode: request.zipCode
          })
        };
      }
    }
    
    // Perform resolution
    const result = await resolveAddressesForZip(request);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...result,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Address resolution failed:', error);
    
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
