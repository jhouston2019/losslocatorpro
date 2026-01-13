import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';

// ============================================================================
// PROPERTY & OWNERSHIP ENRICHMENT
// ============================================================================
// Resolves impacted properties and ownership information for loss events
// Runs hourly via Netlify scheduled functions
// Prioritizes commercial properties

interface ParcelData {
  address: string;
  city?: string;
  state_code?: string;
  zip?: string;
  owner_name?: string;
  owner_type?: 'individual' | 'LLC' | 'Corp' | 'Trust' | 'Other';
  mailing_address?: string;
  property_type?: 'residential' | 'commercial';
  latitude?: number;
  longitude?: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const IMPACT_RADIUS_MILES = 5; // Search radius for impacted properties
const BATCH_SIZE = 50; // Process this many events per run
const COMMERCIAL_PRIORITY = true; // Prioritize commercial properties

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine owner type from owner name
 */
function determineOwnerType(ownerName: string): 'individual' | 'LLC' | 'Corp' | 'Trust' | 'Other' {
  const name = ownerName.toUpperCase();
  
  if (name.includes(' LLC') || name.includes(' L.L.C')) return 'LLC';
  if (name.includes(' CORP') || name.includes(' INC') || name.includes(' CORPORATION')) return 'Corp';
  if (name.includes(' TRUST') || name.includes(' TRUSTEE')) return 'Trust';
  
  // Check for common individual patterns
  const individualPatterns = [
    /^[A-Z]+,\s+[A-Z]+$/,  // LASTNAME, FIRSTNAME
    /^[A-Z]+\s+[A-Z]+$/,    // FIRSTNAME LASTNAME
    /\s+&\s+/,              // PERSON & PERSON
  ];
  
  for (const pattern of individualPatterns) {
    if (pattern.test(name)) return 'individual';
  }
  
  return 'Other';
}

/**
 * Determine property type from address or owner info
 */
function determinePropertyType(address: string, ownerName?: string): 'residential' | 'commercial' {
  const addr = address.toUpperCase();
  const owner = ownerName?.toUpperCase() || '';
  
  // Commercial indicators in address
  const commercialAddressPatterns = [
    /\bSUITE\b/,
    /\bBLDG\b/,
    /\bBUILDING\b/,
    /\bFLOOR\b/,
    /\bPLAZA\b/,
    /\bCENTER\b/,
    /\bMALL\b/,
    /\bOFFICE\b/,
    /\bCOMMERCIAL\b/,
  ];
  
  for (const pattern of commercialAddressPatterns) {
    if (pattern.test(addr)) return 'commercial';
  }
  
  // Commercial indicators in owner name
  if (owner.includes(' LLC') || owner.includes(' CORP') || owner.includes(' INC')) {
    return 'commercial';
  }
  
  return 'residential';
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fetch properties near event location
 * In production, this would call a real property API
 * For now, we'll use a mock implementation that generates realistic data
 */
async function fetchNearbyProperties(
  latitude: number,
  longitude: number,
  zip: string,
  state: string,
  radiusMiles: number
): Promise<ParcelData[]> {
  // TODO: Replace with actual property API call
  // Examples: Regrid, Attom Data, CoreLogic, DataTree
  
  // Mock implementation for demonstration
  // In production, you would call:
  // - County parcel APIs
  // - Commercial property databases
  // - Business registries
  
  console.log(`🔍 Searching for properties near ${latitude},${longitude} (ZIP: ${zip}, State: ${state})`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Generate mock properties
  // In production, this data comes from real APIs
  const mockProperties: ParcelData[] = [];
  
  // Generate 3-10 properties per event
  const propertyCount = Math.floor(Math.random() * 8) + 3;
  
  for (let i = 0; i < propertyCount; i++) {
    const isCommercial = Math.random() > 0.7; // 30% commercial
    
    const streetNumber = Math.floor(Math.random() * 9000) + 1000;
    const streetNames = ['Main St', 'Oak Ave', 'Maple Dr', 'Commerce Blvd', 'Industrial Pkwy', 'Business Center Dr'];
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
    
    const address = `${streetNumber} ${streetName}`;
    
    // Generate realistic owner names
    let ownerName: string;
    let ownerType: 'individual' | 'LLC' | 'Corp' | 'Trust' | 'Other';
    
    if (isCommercial) {
      const companyTypes = ['LLC', 'Corp', 'Inc'];
      const companyNames = ['Summit Properties', 'Apex Holdings', 'Cornerstone Investments', 'Pinnacle Group'];
      ownerName = `${companyNames[Math.floor(Math.random() * companyNames.length)]} ${companyTypes[Math.floor(Math.random() * companyTypes.length)]}`;
      ownerType = ownerName.includes('LLC') ? 'LLC' : 'Corp';
    } else {
      const firstNames = ['John', 'Mary', 'Robert', 'Jennifer', 'Michael', 'Linda'];
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
      ownerName = `${lastNames[Math.floor(Math.random() * lastNames.length)]}, ${firstNames[Math.floor(Math.random() * firstNames.length)]}`;
      ownerType = 'individual';
    }
    
    // Slight coordinate variation
    const propLat = latitude + (Math.random() - 0.5) * 0.05;
    const propLng = longitude + (Math.random() - 0.5) * 0.05;
    
    mockProperties.push({
      address,
      city: 'City Name', // Would come from geocoding
      state_code: state,
      zip,
      owner_name: ownerName,
      owner_type: ownerType,
      mailing_address: `${address}, ${state} ${zip}`,
      property_type: isCommercial ? 'commercial' : 'residential',
      latitude: propLat,
      longitude: propLng,
    });
  }
  
  // Sort commercial properties first if priority is enabled
  if (COMMERCIAL_PRIORITY) {
    mockProperties.sort((a, b) => {
      if (a.property_type === 'commercial' && b.property_type !== 'commercial') return -1;
      if (a.property_type !== 'commercial' && b.property_type === 'commercial') return 1;
      return 0;
    });
  }
  
  console.log(`✅ Found ${mockProperties.length} properties (${mockProperties.filter(p => p.property_type === 'commercial').length} commercial)`);
  
  return mockProperties;
}

// ============================================================================
// MAIN ENRICHMENT LOGIC
// ============================================================================

const handler: Handler = async (event, context) => {
  console.log('🏢 Starting property enrichment...');
  
  const startTime = Date.now();
  let enrichedCount = 0;
  let skippedCount = 0;
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
    
    // Fetch recent loss events without property enrichment
    console.log('📡 Fetching loss events needing enrichment...');
    
    const { data: lossEvents, error: fetchError } = await supabase
      .from('loss_events')
      .select('id, latitude, longitude, zip, state_code, event_type, severity')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: false })
      .limit(BATCH_SIZE);
    
    if (fetchError) {
      throw new Error(`Failed to fetch loss events: ${fetchError.message}`);
    }
    
    if (!lossEvents || lossEvents.length === 0) {
      console.log('✅ No events need enrichment');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No events to enrich',
          enriched: 0,
          skipped: 0,
          errors: 0,
          duration: Date.now() - startTime,
        }),
      };
    }
    
    console.log(`📊 Processing ${lossEvents.length} events...`);
    
    // Process each loss event
    for (const lossEvent of lossEvents) {
      try {
        // Check if this event already has properties
        const { data: existingProps, error: checkError } = await supabase
          .from('loss_properties')
          .select('id')
          .eq('loss_id', lossEvent.id)
          .limit(1);
        
        if (checkError) {
          console.error(`❌ Error checking existing properties for ${lossEvent.id}:`, checkError);
          errorCount++;
          continue;
        }
        
        if (existingProps && existingProps.length > 0) {
          console.log(`⏭️ Event ${lossEvent.id} already has properties, skipping`);
          skippedCount++;
          continue;
        }
        
        // Fetch nearby properties
        const properties = await fetchNearbyProperties(
          lossEvent.latitude!,
          lossEvent.longitude!,
          lossEvent.zip,
          lossEvent.state_code || 'Unknown',
          IMPACT_RADIUS_MILES
        );
        
        if (properties.length === 0) {
          console.log(`⚠️ No properties found for event ${lossEvent.id}`);
          skippedCount++;
          continue;
        }
        
        // Insert properties into loss_properties table
        let insertedForEvent = 0;
        
        for (const property of properties) {
          try {
            const propertyData = {
              loss_id: lossEvent.id,
              address: property.address,
              city: property.city || null,
              state_code: property.state_code || lossEvent.state_code,
              zip: property.zip || lossEvent.zip,
              owner_name: property.owner_name || null,
              owner_type: property.owner_type || null,
              mailing_address: property.mailing_address || null,
              phone_primary: null, // Will be enriched in Phase C
              phone_secondary: null,
              phone_type: null,
              phone_confidence: null,
            };
            
            const { error: insertError } = await supabase
              .from('loss_properties')
              .insert(propertyData);
            
            if (insertError) {
              // Check if it's a duplicate
              if (insertError.code === '23505') {
                console.log(`⏭️ Property already exists: ${property.address}`);
              } else {
                console.error(`❌ Error inserting property:`, insertError);
                errorCount++;
              }
            } else {
              insertedForEvent++;
            }
            
          } catch (propertyError) {
            console.error('Error processing property:', propertyError);
            errorCount++;
          }
        }
        
        if (insertedForEvent > 0) {
          console.log(`✅ Enriched event ${lossEvent.id} with ${insertedForEvent} properties`);
          enrichedCount++;
        }
        
      } catch (eventError) {
        console.error(`Error processing event ${lossEvent.id}:`, eventError);
        errorCount++;
      }
    }
    
    const duration = Date.now() - startTime;
    const summary = {
      success: true,
      enriched: enrichedCount,
      skipped: skippedCount,
      errors: errorCount,
      total: lossEvents.length,
      duration,
    };
    
    console.log('🎉 Property enrichment complete:', summary);
    
    return {
      statusCode: 200,
      body: JSON.stringify(summary),
    };
    
  } catch (error) {
    console.error('❌ Fatal error during property enrichment:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        enriched: enrichedCount,
        skipped: skippedCount,
        errors: errorCount,
        duration: Date.now() - startTime,
      }),
    };
  }
};

// Export as scheduled function (runs hourly)
export { handler };







