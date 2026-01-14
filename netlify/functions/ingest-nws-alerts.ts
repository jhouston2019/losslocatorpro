import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';

// ============================================================================
// NWS ALERTS INGESTION
// ============================================================================
// Fetches active weather alerts from National Weather Service API
// Runs every hour via Netlify scheduled functions
// Prevents duplicates using unique source + source_event_id index

// NWS Alert structure
interface NWSAlertProperties {
  id: string;
  event: string;
  severity: string; // Extreme | Severe | Moderate | Minor | Unknown
  certainty: string; // Observed | Likely | Possible | Unlikely | Unknown
  onset: string; // ISO 8601 timestamp
  expires: string; // ISO 8601 timestamp
  areaDesc: string;
  headline?: string;
  description?: string;
  instruction?: string;
}

interface NWSAlertFeature {
  id: string;
  type: string;
  properties: NWSAlertProperties;
  geometry: {
    type: string;
    coordinates: any;
  } | null;
}

interface NWSAlertsResponse {
  type: string;
  features: NWSAlertFeature[];
  title?: string;
  updated?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const NWS_ALERTS_URL = 'https://api.weather.gov/alerts/active';

// Event type mapping from NWS alert types to loss_events event_type
// Maps to: 'Fire', 'Wind', 'Hail', 'Freeze'
const EVENT_TYPE_MAP: Record<string, 'Fire' | 'Wind' | 'Hail' | 'Freeze' | null> = {
  // Fire events
  'Fire Weather Watch': 'Fire',
  'Red Flag Warning': 'Fire',
  'Fire Warning': 'Fire',
  'Extreme Fire Danger': 'Fire',
  
  // Wind events
  'High Wind Warning': 'Wind',
  'High Wind Watch': 'Wind',
  'Wind Advisory': 'Wind',
  'Extreme Wind Warning': 'Wind',
  'Tornado Warning': 'Wind',
  'Tornado Watch': 'Wind',
  'Severe Thunderstorm Warning': 'Wind',
  'Severe Thunderstorm Watch': 'Wind',
  'Hurricane Warning': 'Wind',
  'Hurricane Watch': 'Wind',
  'Tropical Storm Warning': 'Wind',
  'Tropical Storm Watch': 'Wind',
  
  // Hail events (usually part of severe thunderstorm)
  'Severe Weather Statement': 'Hail', // Can include hail
  
  // Freeze events
  'Freeze Warning': 'Freeze',
  'Freeze Watch': 'Freeze',
  'Hard Freeze Warning': 'Freeze',
  'Hard Freeze Watch': 'Freeze',
  'Frost Advisory': 'Freeze',
};

// Severity mapping to 0-1 scale
const SEVERITY_MAP: Record<string, number> = {
  'Extreme': 0.95,
  'Severe': 0.80,
  'Moderate': 0.60,
  'Minor': 0.40,
  'Unknown': 0.50,
};

// Certainty mapping affects confidence
const CERTAINTY_MAP: Record<string, number> = {
  'Observed': 0.95,
  'Likely': 0.85,
  'Possible': 0.65,
  'Unlikely': 0.40,
  'Unknown': 0.50,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize NWS event type to our schema
 */
function normalizeEventType(nwsEvent: string): 'Fire' | 'Wind' | 'Hail' | 'Freeze' | null {
  return EVENT_TYPE_MAP[nwsEvent] || null;
}

/**
 * Calculate severity from NWS severity level
 */
function calculateSeverity(severity: string): number {
  return SEVERITY_MAP[severity] || 0.50;
}

/**
 * Calculate claim probability from severity and certainty
 */
function calculateClaimProbability(severity: string, certainty: string): number {
  const severityScore = SEVERITY_MAP[severity] || 0.50;
  const certaintyScore = CERTAINTY_MAP[certainty] || 0.50;
  
  // Weighted average: severity 70%, certainty 30%
  return Math.min(0.99, (severityScore * 0.7) + (certaintyScore * 0.3));
}

/**
 * Extract coordinates from NWS geometry
 * Returns center point of polygon or first point of line
 */
function extractCoordinates(geometry: any): { lat: number; lng: number } | null {
  if (!geometry || !geometry.coordinates) {
    return null;
  }
  
  try {
    if (geometry.type === 'Point') {
      const [lng, lat] = geometry.coordinates;
      return { lat, lng };
    }
    
    if (geometry.type === 'Polygon') {
      // Get centroid of polygon
      const coords = geometry.coordinates[0];
      if (!coords || coords.length === 0) return null;
      
      let sumLat = 0;
      let sumLng = 0;
      
      for (const [lng, lat] of coords) {
        sumLat += lat;
        sumLng += lng;
      }
      
      return {
        lat: sumLat / coords.length,
        lng: sumLng / coords.length,
      };
    }
    
    if (geometry.type === 'MultiPolygon') {
      // Get centroid of first polygon
      const coords = geometry.coordinates[0]?.[0];
      if (!coords || coords.length === 0) return null;
      
      let sumLat = 0;
      let sumLng = 0;
      
      for (const [lng, lat] of coords) {
        sumLat += lat;
        sumLng += lng;
      }
      
      return {
        lat: sumLat / coords.length,
        lng: sumLng / coords.length,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting coordinates:', error);
    return null;
  }
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
 * Parse state code from areaDesc
 * Example: "Tarrant, TX" -> "TX"
 */
function parseStateFromAreaDesc(areaDesc: string): string | null {
  const stateMatch = areaDesc.match(/\b([A-Z]{2})\b/);
  return stateMatch ? stateMatch[1] : null;
}

// ============================================================================
// MAIN INGESTION LOGIC
// ============================================================================

const handler: Handler = async (event, context) => {
  console.log('🚨 Starting NWS alerts ingestion...');
  
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
    
    // Fetch active alerts from NWS
    console.log(`📡 Fetching active alerts from ${NWS_ALERTS_URL}`);
    
    const response = await fetch(NWS_ALERTS_URL, {
      headers: {
        'User-Agent': 'LossLocatorPro/1.0 (contact@losslocatorpro.com)',
        'Accept': 'application/geo+json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`NWS API returned ${response.status}: ${response.statusText}`);
    }
    
    const alertsData: NWSAlertsResponse = await response.json();
    const alerts = alertsData.features || [];
    
    console.log(`📊 Retrieved ${alerts.length} active alerts`);
    
    if (alerts.length === 0) {
      console.log('✅ No active alerts to ingest');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No active alerts',
          inserted: 0,
          skipped: 0,
          errors: 0,
          duration: Date.now() - startTime,
        }),
      };
    }
    
    // Process each alert
    for (const alert of alerts) {
      try {
        const props = alert.properties;
        
        // Validate required fields
        if (!props.id || !props.event || !props.onset) {
          skippedCount++;
          continue;
        }
        
        // Normalize event type
        const eventType = normalizeEventType(props.event);
        if (!eventType) {
          // Skip alerts that don't map to our event types
          skippedCount++;
          continue;
        }
        
        // Calculate severity and claim probability
        const severity = calculateSeverity(props.severity);
        const claimProbability = calculateClaimProbability(props.severity, props.certainty);
        
        // Extract coordinates from geometry
        const coords = extractCoordinates(alert.geometry);
        
        // Try to get ZIP and state
        let zip: string | null = null;
        let stateCode: string | null = parseStateFromAreaDesc(props.areaDesc);
        
        if (coords) {
          try {
            const location = await reverseGeocodeToZip(coords.lat, coords.lng);
            if (location) {
              zip = location.zip;
              stateCode = location.state || stateCode;
            }
          } catch (geoError) {
            console.warn(`Geocoding failed for ${props.id}, continuing without ZIP`);
          }
        }
        
        // Use placeholder if no ZIP found
        if (!zip) {
          zip = '00000';
        }
        
        // Prepare event data
        const eventData = {
          event_type: eventType,
          severity,
          claim_probability: claimProbability,
          event_timestamp: props.onset,
          zip,
          state_code: stateCode,
          lat: coords?.lat || null,
          lng: coords?.lng || null,
          latitude: coords?.lat || null,
          longitude: coords?.lng || null,
          source: 'NWS',
          source_event_id: props.id,
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
            skippedCount++;
          } else {
            console.error(`❌ Error inserting ${props.id}:`, error);
            errorCount++;
          }
        } else {
          console.log(`✅ ${props.event} (${props.severity}) in ${props.areaDesc}`);
          insertedCount++;
        }
        
      } catch (alertError) {
        console.error('Error processing alert:', alertError);
        errorCount++;
      }
    }
    
    const duration = Date.now() - startTime;
    const summary = {
      success: true,
      alerts_fetched: alerts.length,
      inserted: insertedCount,
      skipped: skippedCount,
      errors: errorCount,
      duration_ms: duration,
    };
    
    console.log('🎉 NWS alerts ingestion complete:', summary);
    
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

// Export as scheduled function (runs every hour)
export { handler };
