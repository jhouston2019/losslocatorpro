import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';

// ============================================================================
// NOAA SEVERE WEATHER DATA INGESTION
// ============================================================================
// Fetches live severe weather events from NOAA and ingests them into loss_events
// Runs every 15 minutes via Netlify scheduled functions
// Prevents duplicates using unique source + source_event_id index

// Weather.gov API Alert structure
interface WeatherAlert {
  id: string;
  type: string;
  geometry: {
    type: string;
    coordinates: number[][][] | [number, number] | null;
  } | null;
  properties: {
    '@id': string;
    id: string;
    areaDesc: string;
    geocode: {
      SAME?: string[];
      UGC?: string[];
    };
    affectedZones: string[];
    sent: string;
    effective: string;
    onset: string | null;
    expires: string;
    ends: string | null;
    status: string;
    messageType: string;
    category: string;
    severity: string;
    certainty: string;
    urgency: string;
    event: string; // "Severe Thunderstorm Warning", "Tornado Warning", etc.
    headline: string;
    description: string;
    instruction: string | null;
    response: string;
  };
}

interface WeatherAPIResponse {
  '@context': any;
  type: string;
  features: WeatherAlert[];
  title: string;
  updated: string;
}

// Legacy structure for fallback
interface NOAAEvent {
  id: string;
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    event: string;
    mag?: number;
    time: string;
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

// NOAA Weather.gov API - Active severe weather alerts
const NOAA_WEATHER_API = 'https://api.weather.gov/alerts/active?status=actual&message_type=alert&severity=severe,extreme';
// Fallback: Use USGS earthquake API if weather API is down
const FALLBACK_FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
// Use real weather data
const USE_FALLBACK = false;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize event type from Weather.gov alert to our schema
 */
function normalizeEventType(weatherEventType: string): 'Hail' | 'Wind' | 'Fire' | 'Freeze' | null {
  const type = weatherEventType.toLowerCase();
  
  // Hail events
  if (type.includes('hail')) return 'Hail';
  
  // Wind events
  if (type.includes('wind') || type.includes('gust') || type.includes('tornado') || 
      type.includes('hurricane') || type.includes('tropical storm')) return 'Wind';
  
  // Severe thunderstorms (often include hail/wind)
  if (type.includes('severe thunderstorm') || type.includes('severe weather')) return 'Wind';
  
  // Fire events
  if (type.includes('fire') || type.includes('red flag')) return 'Fire';
  
  // Freeze events
  if (type.includes('freeze') || type.includes('frost') || type.includes('ice') || 
      type.includes('winter storm') || type.includes('blizzard')) return 'Freeze';
  
  // Ignore non-severe events
  return null;
}

/**
 * Calculate severity score based on Weather.gov severity and event type
 */
function calculateSeverity(eventType: string, weatherSeverity?: string, urgency?: string): number {
  // Base severity from Weather.gov classification
  let baseSeverity = 0.5;
  
  if (weatherSeverity) {
    const sev = weatherSeverity.toLowerCase();
    if (sev === 'extreme') baseSeverity = 0.95;
    else if (sev === 'severe') baseSeverity = 0.8;
    else if (sev === 'moderate') baseSeverity = 0.6;
    else if (sev === 'minor') baseSeverity = 0.4;
  }
  
  // Adjust based on urgency
  if (urgency) {
    const urg = urgency.toLowerCase();
    if (urg === 'immediate') baseSeverity = Math.min(1.0, baseSeverity * 1.1);
    else if (urg === 'expected') baseSeverity = Math.min(1.0, baseSeverity * 1.0);
    else if (urg === 'future') baseSeverity = baseSeverity * 0.9;
  }
  
  // Adjust based on event type
  const type = eventType.toLowerCase();
  if (type.includes('tornado') || type.includes('hurricane')) {
    baseSeverity = Math.min(1.0, baseSeverity * 1.2);
  } else if (type.includes('hail')) {
    baseSeverity = Math.min(1.0, baseSeverity * 1.1);
  }
  
  return Math.max(0.3, Math.min(1.0, baseSeverity));
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

/**
 * Extract center coordinates from Weather.gov alert geometry
 */
function extractCoordinates(geometry: WeatherAlert['geometry']): [number, number] | null {
  if (!geometry || !geometry.coordinates) return null;
  
  try {
    const coords = geometry.coordinates;
    
    // Point geometry [longitude, latitude]
    if (geometry.type === 'Point' && Array.isArray(coords) && coords.length === 2) {
      return [coords[1] as number, coords[0] as number]; // [lat, lng]
    }
    
    // Polygon or MultiPolygon - calculate centroid
    if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
      const allCoords: number[][] = [];
      
      function flattenCoords(arr: any): void {
        if (Array.isArray(arr)) {
          if (arr.length === 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number') {
            allCoords.push(arr);
          } else {
            arr.forEach(item => flattenCoords(item));
          }
        }
      }
      
      flattenCoords(coords);
      
      if (allCoords.length > 0) {
        const avgLng = allCoords.reduce((sum, coord) => sum + coord[0], 0) / allCoords.length;
        const avgLat = allCoords.reduce((sum, coord) => sum + coord[1], 0) / allCoords.length;
        return [avgLat, avgLng];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting coordinates:', error);
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
    
    // Fetch severe weather data
    console.log('📡 Fetching NOAA Weather.gov alerts...');
    let response: Response;
    let isWeatherAPI = !USE_FALLBACK;
    
    if (USE_FALLBACK) {
      console.log('📊 Using fallback data source (USGS earthquakes as demo)');
      response = await fetch(FALLBACK_FEED_URL);
    } else {
      try {
        response = await fetch(NOAA_WEATHER_API, {
          headers: {
            'User-Agent': 'LossLocatorPro/1.0 (contact@losslocatorpro.com)',
            'Accept': 'application/geo+json',
          },
        });
        
        if (!response.ok) {
          console.warn(`Weather.gov API returned ${response.status}, using fallback`);
          response = await fetch(FALLBACK_FEED_URL);
          isWeatherAPI = false;
        }
      } catch (primaryError) {
        console.warn('Weather.gov API unavailable, using fallback:', primaryError);
        response = await fetch(FALLBACK_FEED_URL);
        isWeatherAPI = false;
      }
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch weather data: ${response.status} ${response.statusText}`);
    }
    
    const data: WeatherAPIResponse | NOAAFeatureCollection = await response.json();
    console.log(`📊 Found ${data.features?.length || 0} alerts to process`);
    
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
    
    // Process each alert/event
    for (const feature of data.features) {
      try {
        let eventId: string;
        let coordinates: [number, number] | null;
        let eventName: string;
        let timestamp: string;
        let weatherSeverity: string | undefined;
        let urgency: string | undefined;
        
        // Handle Weather.gov API format
        if (isWeatherAPI) {
          const alert = feature as WeatherAlert;
          eventId = alert.properties.id || alert.id;
          eventName = alert.properties.event;
          timestamp = alert.properties.sent || alert.properties.effective;
          weatherSeverity = alert.properties.severity;
          urgency = alert.properties.urgency;
          coordinates = extractCoordinates(alert.geometry);
          
          if (!coordinates) {
            console.log(`⚠️ No coordinates for alert ${eventId}, skipping`);
            skippedCount++;
            continue;
          }
        } 
        // Handle fallback format (USGS)
        else {
          const fallbackEvent = feature as NOAAEvent;
          eventId = fallbackEvent.id;
          eventName = fallbackEvent.properties.event || 'Unknown';
          timestamp = fallbackEvent.properties.time;
          
          if (!fallbackEvent.geometry?.coordinates) {
            skippedCount++;
            continue;
          }
          
          const [longitude, latitude] = fallbackEvent.geometry.coordinates;
          coordinates = [latitude, longitude];
        }
        
        const [latitude, longitude] = coordinates;
        const eventType = normalizeEventType(eventName);
        
        if (!eventType) {
          console.log(`⚠️ Skipping non-severe event: ${eventName}`);
          skippedCount++;
          continue;
        }
        
        // Reverse geocode to get ZIP and state
        const location = await reverseGeocodeToZip(latitude, longitude);
        
        if (!location?.zip) {
          console.log(`⚠️ Could not resolve ZIP for event ${eventId} at ${latitude},${longitude}`);
          skippedCount++;
          continue;
        }
        
        // Calculate severity and claim probability
        const severity = calculateSeverity(eventName, weatherSeverity, urgency);
        const claimProbability = calculateClaimProbability(severity);
        
        // Prepare event data
        const eventData = {
          event_type: eventType,
          severity,
          claim_probability: claimProbability,
          event_timestamp: timestamp || new Date().toISOString(),
          zip: location.zip,
          state_code: location.state || null,
          lat: latitude,
          lng: longitude,
          latitude,
          longitude,
          source: 'NOAA',
          source_event_id: eventId,
          status: 'Unreviewed' as const,
          property_type: 'residential' as const,
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
          if (error.code === '23505') {
            console.log(`⏭️ Skipping duplicate event: ${eventId}`);
            skippedCount++;
          } else {
            console.error(`❌ Error inserting event ${eventId}:`, error);
            errorCount++;
          }
        } else {
          console.log(`✅ Inserted: ${eventName} in ${location.zip}, ${location.state} (severity: ${severity.toFixed(2)})`);
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

