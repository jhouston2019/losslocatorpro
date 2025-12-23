import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';

// ============================================================================
// NOAA SEVERE WEATHER DATA INGESTION
// ============================================================================
// Fetches live severe weather events from NOAA and ingests them into loss_events
// Runs every 15 minutes via Netlify scheduled functions
// Prevents duplicates using unique source + source_event_id index

// NOAA Storm Reports structure
interface StormReport {
  reportTime: string; // "2025-12-22T14:30:00Z"
  reportType: string; // "Hail", "Wind", "Tornado"
  lat: number;
  lon: number;
  state?: string;
  county?: string;
  city?: string;
  hailSize?: number; // inches
  windSpeed?: number; // mph
  comments?: string;
  source?: string;
}

interface StormReportsResponse {
  reports: StormReport[];
  generatedAt?: string;
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

// NOAA Storm Prediction Center - Storm Reports (hail, wind, tornado)
const NOAA_STORM_REPORTS_TODAY = 'https://www.spc.noaa.gov/climo/reports/today.json';
const NOAA_STORM_REPORTS_YESTERDAY = 'https://www.spc.noaa.gov/climo/reports/yesterday.json';
// Fallback: Use USGS earthquake API if NOAA is down
const FALLBACK_FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
// Use real storm reports
const USE_FALLBACK = false;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize storm report type to our schema
 */
function normalizeStormReportType(report: StormReport): 'Hail' | 'Wind' | 'Fire' | 'Freeze' | null {
  const type = report.reportType?.toLowerCase() || '';
  
  // Direct mapping from NOAA report types
  if (type.includes('hail') || report.hailSize) return 'Hail';
  if (type.includes('wind') || report.windSpeed) return 'Wind';
  if (type.includes('tornado')) return 'Wind'; // Tornadoes are wind events
  
  return null;
}

/**
 * Calculate severity score from storm report magnitude
 */
function calculateSeverityFromReport(report: StormReport): number {
  const type = report.reportType?.toLowerCase() || '';
  
  // Hail severity based on size
  if (report.hailSize) {
    if (report.hailSize >= 2.75) return 0.95; // Baseball or larger
    if (report.hailSize >= 2.0) return 0.9;   // Egg size
    if (report.hailSize >= 1.5) return 0.8;   // Walnut size
    if (report.hailSize >= 1.0) return 0.7;   // Quarter size
    if (report.hailSize >= 0.75) return 0.6;  // Penny size
    return 0.5;
  }
  
  // Wind severity based on speed
  if (report.windSpeed) {
    if (report.windSpeed >= 100) return 0.95; // Extreme
    if (report.windSpeed >= 80) return 0.9;   // Very severe
    if (report.windSpeed >= 65) return 0.8;   // Severe
    if (report.windSpeed >= 58) return 0.7;   // Damaging
    if (report.windSpeed >= 50) return 0.6;   // Strong
    return 0.5;
  }
  
  // Tornado - always high severity
  if (type.includes('tornado')) return 0.9;
  
  // Default
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

/**
 * Generate unique source event ID for storm report
 */
function generateSourceEventId(report: StormReport): string {
  const date = report.reportTime.split('T')[0]; // YYYY-MM-DD
  const type = report.reportType?.toLowerCase() || 'unknown';
  const lat = report.lat.toFixed(4);
  const lon = report.lon.toFixed(4);
  return `${date}-${type}-${lat}-${lon}`;
}

/**
 * Check if we should backfill yesterday's data
 * Returns true on first run (no NOAA events in database)
 */
async function shouldBackfill(supabase: any): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('loss_events')
      .select('id')
      .eq('source', 'NOAA')
      .limit(1);
    
    if (error) {
      console.warn('Error checking for backfill:', error);
      return false;
    }
    
    // If no NOAA events exist, backfill yesterday
    return !data || data.length === 0;
  } catch (error) {
    console.error('Backfill check error:', error);
    return false;
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
    
    // Check if we should backfill yesterday's data
    const needsBackfill = await shouldBackfill(supabase);
    const urlsToFetch = needsBackfill 
      ? [NOAA_STORM_REPORTS_YESTERDAY, NOAA_STORM_REPORTS_TODAY]
      : [NOAA_STORM_REPORTS_TODAY];
    
    if (needsBackfill) {
      console.log('🔄 First run detected - backfilling yesterday + today');
    }
    
    let allReports: StormReport[] = [];
    
    // Fetch storm reports
    for (const url of urlsToFetch) {
      try {
        console.log(`📡 Fetching storm reports from ${url.includes('yesterday') ? 'yesterday' : 'today'}...`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'LossLocatorPro/1.0 (contact@losslocatorpro.com)',
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.warn(`Storm reports returned ${response.status}, skipping`);
          continue;
        }
        
        const data: StormReportsResponse = await response.json();
        
        if (data.reports && Array.isArray(data.reports)) {
          allReports = allReports.concat(data.reports);
          console.log(`📊 Found ${data.reports.length} reports`);
        }
      } catch (fetchError) {
        console.error(`Error fetching ${url}:`, fetchError);
      }
    }
    
    console.log(`📊 Total reports to process: ${allReports.length}`);
    
    if (allReports.length === 0) {
      console.log('✅ No storm reports to ingest');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No storm reports available',
          inserted: 0,
          skipped: 0,
          errors: 0,
          duration: Date.now() - startTime,
        }),
      };
    }
    
    // Process each storm report
    for (const report of allReports) {
      try {
        // Validate report has required fields
        if (!report.lat || !report.lon || !report.reportTime) {
          skippedCount++;
          continue;
        }
        
        // Normalize event type
        const eventType = normalizeStormReportType(report);
        if (!eventType) {
          skippedCount++;
          continue;
        }
        
        // Generate unique event ID
        const eventId = generateSourceEventId(report);
        
        // Calculate severity from report magnitude
        const severity = calculateSeverityFromReport(report);
        const claimProbability = calculateClaimProbability(severity);
        
        // Try to reverse geocode to get ZIP and state
        let zip: string | null = null;
        let stateCode: string | null = report.state || null;
        
        try {
          const location = await reverseGeocodeToZip(report.lat, report.lon);
          if (location) {
            zip = location.zip;
            stateCode = location.state || stateCode;
          }
        } catch (geoError) {
          console.warn(`Geocoding failed for ${eventId}, continuing without ZIP`);
        }
        
        // Don't skip if ZIP is missing - insert anyway
        if (!zip) {
          zip = '00000'; // Placeholder for reports without ZIP
        }
        
        // Prepare event data
        const eventData = {
          event_type: eventType,
          severity,
          claim_probability: claimProbability,
          event_timestamp: report.reportTime,
          zip,
          state_code: stateCode,
          lat: report.lat,
          lng: report.lon,
          latitude: report.lat,
          longitude: report.lon,
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
            skippedCount++;
          } else {
            console.error(`❌ Error inserting ${eventId}:`, error);
            errorCount++;
          }
        } else {
          const reportDesc = report.hailSize 
            ? `${report.hailSize}" hail`
            : report.windSpeed 
              ? `${report.windSpeed}mph wind`
              : report.reportType;
          console.log(`✅ ${reportDesc} in ${stateCode || 'unknown'} (${severity.toFixed(2)})`);
          insertedCount++;
        }
        
      } catch (reportError) {
        console.error('Error processing report:', reportError);
        errorCount++;
      }
    }
    
    const duration = Date.now() - startTime;
    const summary = {
      success: true,
      reports_fetched: allReports.length,
      inserted: insertedCount,
      skipped: skippedCount,
      errors: errorCount,
      duration_ms: duration,
    };
    
    console.log('🎉 Storm reports ingestion complete:', summary);
    
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

