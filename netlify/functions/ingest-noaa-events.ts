import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';

// ============================================================================
// NOAA SEVERE WEATHER DATA INGESTION
// ============================================================================
// Fetches live severe weather events from NOAA and ingests them into loss_events
// Runs every 15 minutes via Netlify scheduled functions
// Prevents duplicates using unique source + source_event_id index

interface NOAAEvent {
  id: string;
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    event: string;
    mag?: number; // hail size in inches or wind speed in mph
    time: string; // ISO timestamp
    place?: string;
    updated?: string;
  };
}

interface NOAAFeatureCollection {
  type: string;
  features: NOAAEvent[];
  metadata?: {
    generated: number;
    count: number;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const NOAA_FEED_URL = 'https://www.spc.noaa.gov/climo/reports/today_filtered.json';
// Fallback: Use USGS earthquake API as proxy for severe weather (for testing)
const FALLBACK_FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize event type from NOAA data to our schema
 */
function normalizeEventType(noaaEventType: string): 'Hail' | 'Wind' | 'Fire' | 'Freeze' | null {
  const type = noaaEventType.toLowerCase();
  
  if (type.includes('hail')) return 'Hail';
  if (type.includes('wind') || type.includes('gust')) return 'Wind';
  if (type.includes('fire') || type.includes('wildfire')) return 'Fire';
  if (type.includes('freeze') || type.includes('frost') || type.includes('ice')) return 'Freeze';
  
  // Default severe events to Wind
  if (type.includes('tornado') || type.includes('storm') || type.includes('severe')) return 'Wind';
  
  return null;
}

/**
 * Calculate severity score based on event magnitude
 */
function calculateSeverity(eventType: string, magnitude?: number): number {
  if (!magnitude) return 0.4;
  
  const type = eventType.toLowerCase();
  
  if (type.includes('hail')) {
    // Hail size in inches
    if (magnitude >= 2) return 0.9;
    if (magnitude >= 1) return 0.7;
    if (magnitude >= 0.75) return 0.6;
    return 0.4;
  }
  
  if (type.includes('wind')) {
    // Wind speed in mph
    if (magnitude >= 75) return 0.9;
    if (magnitude >= 60) return 0.7;
    if (magnitude >= 50) return 0.6;
    return 0.4;
  }
  
  // Default for other types
  return 0.5;
}

/**
 * Calculate claim probability from severity
 */
function calculateClaimProbability(severity: number): number {
  return Math.min(0.99, severity * 0.85);
}

/**
 * Reverse geocode coordinates to ZIP code
 * Uses Census Geocoding API (free, no key required)
 */
async function reverseGeocodeToZip(lat: number, lng: number): Promise<{ zip: string; state: string } | null> {
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const result = data?.result?.geographies?.['ZIP Code Tabulation Areas']?.[0];
    
    if (!result) return null;
    
    const zip = result.ZCTA5 || result.GEOID;
    const state = result.STATE || '';
    
    return zip ? { zip, state } : null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Get state code from coordinates using Census API
 */
async function getStateFromCoordinates(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const stateCode = data?.result?.geographies?.States?.[0]?.STUSAB;
    
    return stateCode || null;
  } catch (error) {
    console.error('State lookup error:', error);
    return null;
  }
}

// ============================================================================
// MAIN INGESTION LOGIC
// ============================================================================

const handler: Handler = async (event, context) => {
  console.log('🌩️ Starting NOAA severe weather ingestion...');
  
  const startTime = Date.now();
  let insertedCount = 0;
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
    
    // Fetch NOAA severe weather data
    console.log('📡 Fetching NOAA data...');
    let response: Response;
    
    try {
      response = await fetch(NOAA_FEED_URL, {
        headers: {
          'User-Agent': 'LossLocatorPro/1.0',
        },
      });
    } catch (primaryError) {
      console.warn('Primary NOAA feed unavailable, using fallback:', primaryError);
      response = await fetch(FALLBACK_FEED_URL);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch NOAA data: ${response.status} ${response.statusText}`);
    }
    
    const data: NOAAFeatureCollection = await response.json();
    console.log(`📊 Found ${data.features?.length || 0} events to process`);
    
    if (!data.features || data.features.length === 0) {
      console.log('✅ No new events to ingest');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No new events',
          inserted: 0,
          skipped: 0,
          errors: 0,
          duration: Date.now() - startTime,
        }),
      };
    }
    
    // Process each event
    for (const feature of data.features) {
      try {
        const { id, geometry, properties } = feature;
        
        if (!geometry?.coordinates || !properties?.event) {
          skippedCount++;
          continue;
        }
        
        const [longitude, latitude] = geometry.coordinates;
        const eventType = normalizeEventType(properties.event);
        
        if (!eventType) {
          console.log(`⚠️ Skipping unknown event type: ${properties.event}`);
          skippedCount++;
          continue;
        }
        
        // Reverse geocode to get ZIP and state
        const location = await reverseGeocodeToZip(latitude, longitude);
        
        if (!location?.zip) {
          console.log(`⚠️ Could not resolve ZIP for event ${id} at ${latitude},${longitude}`);
          skippedCount++;
          continue;
        }
        
        // Calculate severity and claim probability
        const severity = calculateSeverity(properties.event, properties.mag);
        const claimProbability = calculateClaimProbability(severity);
        
        // Prepare event data
        const eventData = {
          event_type: eventType,
          severity,
          claim_probability: claimProbability,
          event_timestamp: properties.time || new Date().toISOString(),
          zip: location.zip,
          state_code: location.state || null,
          lat: latitude,
          lng: longitude,
          latitude,
          longitude,
          source: 'NOAA',
          source_event_id: id,
          status: 'Unreviewed' as const,
          property_type: 'residential' as const, // Default to residential
          priority_score: Math.round(severity * 100),
        };
        
        // Insert with UPSERT logic (ignore duplicates)
        const { error } = await supabase
          .from('loss_events')
          .upsert(eventData, {
            onConflict: 'source,source_event_id',
            ignoreDuplicates: true,
          });
        
        if (error) {
          // Check if it's a duplicate error (expected)
          if (error.code === '23505') {
            console.log(`⏭️ Skipping duplicate event: ${id}`);
            skippedCount++;
          } else {
            console.error(`❌ Error inserting event ${id}:`, error);
            errorCount++;
          }
        } else {
          console.log(`✅ Inserted event: ${id} (${eventType} in ${location.zip}, ${location.state})`);
          insertedCount++;
        }
        
      } catch (eventError) {
        console.error('Error processing event:', eventError);
        errorCount++;
      }
    }
    
    const duration = Date.now() - startTime;
    const summary = {
      success: true,
      inserted: insertedCount,
      skipped: skippedCount,
      errors: errorCount,
      total: data.features.length,
      duration,
    };
    
    console.log('🎉 Ingestion complete:', summary);
    
    return {
      statusCode: 200,
      body: JSON.stringify(summary),
    };
    
  } catch (error) {
    console.error('❌ Fatal error during ingestion:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        inserted: insertedCount,
        skipped: skippedCount,
        errors: errorCount,
        duration: Date.now() - startTime,
      }),
    };
  }
};

// Export as scheduled function (runs every 15 minutes)
export { handler };

