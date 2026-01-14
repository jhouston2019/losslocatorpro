import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';

// ============================================================================
// STAGED ADDRESS RESOLUTION
// ============================================================================
// Event-triggered, on-demand address resolution
// NO bulk imports - addresses resolved only when needed
// Pluggable architecture for multiple data sources

// ============================================================================
// TYPES
// ============================================================================

interface PropertyCandidate {
  address: string;
  city?: string;
  property_type: 'residential' | 'commercial' | 'unknown';
  latitude?: number;
  longitude?: number;
}

interface AddressResolutionRequest {
  zip_code: string;
  county_fips?: string;
  state_code?: string;
  event_id?: string;
  event_type?: string;
  trigger_type: 'threshold' | 'user_action' | 'downstream_request' | 'manual';
  triggered_by?: string;
  resolution_source?: string;
}

interface AddressResolutionResult {
  success: boolean;
  zip_code: string;
  properties_found: number;
  properties_inserted: number;
  resolution_source: string;
  error?: string;
}

// ============================================================================
// ADDRESS RESOLUTION INTERFACE (PLUGGABLE)
// ============================================================================

/**
 * Abstract interface for address resolution sources
 * Allows future sources: county parcels, commercial APIs, user uploads
 */
interface IAddressResolver {
  name: string;
  resolveAddresses(
    zipCode: string,
    eventType?: string,
    options?: any
  ): Promise<PropertyCandidate[]>;
}

// ============================================================================
// MOCK RESOLVER (PLACEHOLDER FOR REAL SOURCES)
// ============================================================================

/**
 * Mock resolver for demonstration
 * Replace with real sources: county parcels, commercial APIs, etc.
 */
class MockAddressResolver implements IAddressResolver {
  name = 'mock_resolver';
  
  async resolveAddresses(
    zipCode: string,
    eventType?: string
  ): Promise<PropertyCandidate[]> {
    // This is a placeholder - no actual resolution
    // In production, this would call:
    // - County parcel APIs
    // - Commercial property databases
    // - User-uploaded lists
    
    console.log(`Mock resolver: Would resolve addresses for ZIP ${zipCode}`);
    return [];
  }
}

// ============================================================================
// COUNTY PARCELS RESOLVER (TEMPLATE)
// ============================================================================

/**
 * County parcels resolver template
 * Implement based on available county APIs
 */
class CountyParcelsResolver implements IAddressResolver {
  name = 'county_parcels';
  
  async resolveAddresses(
    zipCode: string,
    eventType?: string
  ): Promise<PropertyCandidate[]> {
    // Template for county parcel API integration
    // Example: Texas CAD APIs, California county assessors, etc.
    
    const apiUrl = process.env.COUNTY_PARCELS_API_URL;
    const apiKey = process.env.COUNTY_PARCELS_API_KEY;
    
    if (!apiUrl) {
      console.log('County parcels API not configured');
      return [];
    }
    
    try {
      const response = await fetch(
        `${apiUrl}/parcels?zip=${zipCode}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        console.error(`County parcels API returned ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      
      // Transform API response to PropertyCandidate format
      return data.parcels?.map((parcel: any) => ({
        address: parcel.address,
        city: parcel.city,
        property_type: parcel.property_use === 'commercial' ? 'commercial' : 'residential',
        latitude: parcel.latitude,
        longitude: parcel.longitude,
      })) || [];
      
    } catch (error) {
      console.error('Error fetching county parcels:', error);
      return [];
    }
  }
}

// ============================================================================
// COMMERCIAL API RESOLVER (TEMPLATE)
// ============================================================================

/**
 * Commercial property API resolver template
 * Implement based on available commercial APIs
 */
class CommercialAPIResolver implements IAddressResolver {
  name = 'commercial_api';
  
  async resolveAddresses(
    zipCode: string,
    eventType?: string
  ): Promise<PropertyCandidate[]> {
    // Template for commercial API integration
    // Examples: Melissa Data, Whitepages Pro, CoreLogic, etc.
    
    const apiUrl = process.env.PROPERTY_API_URL;
    const apiKey = process.env.PROPERTY_API_KEY;
    
    if (!apiUrl) {
      console.log('Commercial property API not configured');
      return [];
    }
    
    try {
      const response = await fetch(
        `${apiUrl}/properties?zip=${zipCode}&type=residential`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        console.error(`Commercial API returned ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      
      // Transform API response to PropertyCandidate format
      return data.properties?.map((prop: any) => ({
        address: prop.full_address,
        city: prop.city,
        property_type: prop.type || 'unknown',
        latitude: prop.lat,
        longitude: prop.lng,
      })) || [];
      
    } catch (error) {
      console.error('Error fetching from commercial API:', error);
      return [];
    }
  }
}

// ============================================================================
// RESOLVER FACTORY
// ============================================================================

/**
 * Get resolver by name
 * Allows pluggable architecture for different sources
 */
function getResolver(source: string): IAddressResolver {
  switch (source) {
    case 'county_parcels':
      return new CountyParcelsResolver();
    case 'commercial_api':
      return new CommercialAPIResolver();
    case 'mock':
    default:
      return new MockAddressResolver();
  }
}

// ============================================================================
// PROPERTY SCORING
// ============================================================================

/**
 * Calculate property-level claim probability
 * Starts with ZIP-level probability and adjusts
 */
function calculatePropertyProbability(
  zipLevelProbability: number,
  propertyType: string,
  eventType: string
): { probability: number; adjustment: number } {
  let adjustment = 0;
  
  // Property type adjustments
  if (propertyType === 'residential') {
    // Residential properties
    if (eventType === 'Hail') adjustment += 0.05; // Roofs more vulnerable
    if (eventType === 'Fire') adjustment += 0.02;
  } else if (propertyType === 'commercial') {
    // Commercial properties
    if (eventType === 'Fire') adjustment += 0.05; // Larger structures
    if (eventType === 'Wind') adjustment += 0.03;
  }
  
  // Apply adjustment (capped at 0.95)
  const probability = Math.min(0.95, zipLevelProbability + adjustment);
  
  return { probability, adjustment };
}

// ============================================================================
// MAIN RESOLUTION LOGIC
// ============================================================================

/**
 * Resolve addresses for a ZIP code
 */
async function resolveAddressesForZIP(
  supabase: any,
  request: AddressResolutionRequest
): Promise<AddressResolutionResult> {
  const { zip_code, event_id, event_type, trigger_type, triggered_by, resolution_source } = request;
  
  // Determine resolution source (use provided or default to first available)
  const source = resolution_source || 'mock';
  const resolver = getResolver(source);
  
  console.log(`Resolving addresses for ZIP ${zip_code} using ${resolver.name}`);
  
  // Create resolution log
  const { data: logData, error: logError } = await supabase.rpc('log_address_resolution', {
    p_zip_code: zip_code,
    p_event_id: event_id || null,
    p_trigger_type: trigger_type,
    p_triggered_by: triggered_by || null,
    p_resolution_source: resolver.name,
  });
  
  if (logError) {
    console.error('Error creating resolution log:', logError);
  }
  
  const logId = logData;
  
  try {
    // Get ZIP-level probability
    const { data: zipStats, error: zipError } = await supabase
      .from('loss_opportunities_by_zip')
      .select('avg_claim_probability, event_type')
      .eq('zip_code', zip_code)
      .maybeSingle();
    
    if (zipError || !zipStats) {
      throw new Error(`Could not find ZIP statistics for ${zip_code}`);
    }
    
    const zipLevelProbability = zipStats.avg_claim_probability;
    const zipEventType = event_type || zipStats.event_type;
    
    // Resolve addresses using selected source
    const properties = await resolver.resolveAddresses(zip_code, zipEventType);
    
    console.log(`Found ${properties.length} properties from ${resolver.name}`);
    
    // Get settings for max properties limit
    const { data: settings } = await supabase
      .from('address_resolution_settings')
      .select('max_properties_per_zip')
      .limit(1)
      .maybeSingle();
    
    const maxProperties = settings?.max_properties_per_zip || 500;
    const limitedProperties = properties.slice(0, maxProperties);
    
    if (properties.length > maxProperties) {
      console.warn(`Limited properties from ${properties.length} to ${maxProperties}`);
    }
    
    // Insert property candidates
    let insertedCount = 0;
    
    for (const property of limitedProperties) {
      try {
        // Calculate property-level probability
        const { probability, adjustment } = calculatePropertyProbability(
          zipLevelProbability,
          property.property_type,
          zipEventType
        );
        
        // Insert property candidate
        const { error: insertError } = await supabase
          .from('loss_property_candidates')
          .insert({
            zip_code,
            county_fips: request.county_fips,
            state_code: request.state_code,
            address: property.address,
            city: property.city,
            property_type: property.property_type,
            resolution_source: resolver.name,
            resolution_trigger: trigger_type,
            event_id: event_id || null,
            event_type: zipEventType,
            estimated_claim_probability: probability,
            zip_level_probability: zipLevelProbability,
            property_score_adjustment: adjustment,
            status: 'unreviewed',
          });
        
        if (insertError) {
          if (insertError.code === '23505') {
            // Duplicate - skip
            continue;
          }
          console.error('Error inserting property:', insertError);
        } else {
          insertedCount++;
        }
        
      } catch (propError) {
        console.error('Error processing property:', propError);
      }
    }
    
    // Complete resolution log
    if (logId) {
      await supabase.rpc('complete_address_resolution', {
        p_log_id: logId,
        p_properties_found: properties.length,
        p_properties_inserted: insertedCount,
        p_error_message: null,
      });
    }
    
    console.log(`✅ Inserted ${insertedCount} property candidates for ZIP ${zip_code}`);
    
    return {
      success: true,
      zip_code,
      properties_found: properties.length,
      properties_inserted: insertedCount,
      resolution_source: resolver.name,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error resolving addresses:', error);
    
    // Complete resolution log with error
    if (logId) {
      await supabase.rpc('complete_address_resolution', {
        p_log_id: logId,
        p_properties_found: 0,
        p_properties_inserted: 0,
        p_error_message: errorMessage,
      });
    }
    
    return {
      success: false,
      zip_code,
      properties_found: 0,
      properties_inserted: 0,
      resolution_source: resolver.name,
      error: errorMessage,
    };
  }
}

// ============================================================================
// NETLIFY FUNCTION HANDLER
// ============================================================================

const handler: Handler = async (event, context) => {
  console.log('🏠 Starting address resolution...');
  
  const startTime = Date.now();
  
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
    
    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {};
    
    const request: AddressResolutionRequest = {
      zip_code: body.zip_code,
      county_fips: body.county_fips,
      state_code: body.state_code,
      event_id: body.event_id,
      event_type: body.event_type,
      trigger_type: body.trigger_type || 'manual',
      triggered_by: body.triggered_by,
      resolution_source: body.resolution_source,
    };
    
    if (!request.zip_code) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'zip_code is required',
        }),
      };
    }
    
    // Resolve addresses
    const result = await resolveAddressesForZIP(supabase, request);
    
    const duration = Date.now() - startTime;
    
    console.log('🎉 Address resolution complete:', {
      ...result,
      duration_ms: duration,
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        ...result,
        duration_ms: duration,
      }),
    };
    
  } catch (error) {
    console.error('❌ Fatal error during address resolution:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      }),
    };
  }
};

// Export function (called via API, not scheduled)
export { handler };
