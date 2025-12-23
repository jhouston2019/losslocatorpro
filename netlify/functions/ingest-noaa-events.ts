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
// Note: NOAA SPC provides CSV format, not JSON
const NOAA_STORM_REPORTS_BASE = 'https://www.spc.noaa.gov/climo/reports/';
// Backfill configuration
const DAYS_TO_BACKFILL = 7; // Last 7 days including today
const MAX_REPORTS_PER_RUN = 500; // Safety limit

// CSV column indices for NOAA storm reports
const CSV_COLUMNS = {
  TIME: 0,
  F_SCALE: 1,
  LOCATION: 2,
  COUNTY: 3,
  STATE: 4,
  LAT: 5,
  LON: 6,
  COMMENTS: 7,
};

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
 * Generate array of dates for backfill (last N days)
 */
function generateDateArray(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Format as YYYYMMDD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    dates.push(`${year}${month}${day}`);
  }
  
  return dates;
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Parse NOAA CSV storm report into StormReport object
 */
function parseStormReportFromCSV(fields: string[], reportType: string, dateStr: string): StormReport | null {
  try {
    // Extract fields
    const time = fields[0]?.trim() || '';
    const magnitude = fields[1]?.trim() || '';
    const location = fields[2]?.trim() || '';
    const county = fields[3]?.trim() || '';
    const state = fields[4]?.trim() || '';
    const latStr = fields[5]?.trim() || '';
    const lonStr = fields[6]?.trim() || '';
    const comments = fields[7]?.trim() || '';
    
    // Parse coordinates
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    
    if (isNaN(lat) || isNaN(lon)) {
      return null;
    }
    
    // Build timestamp (YYYYMMDD + HHMM)
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = time.substring(0, 2) || '12';
    const minute = time.substring(2, 4) || '00';
    const reportTime = `${year}-${month}-${day}T${hour}:${minute}:00Z`;
    
    // Parse magnitude based on report type
    let hailSize: number | undefined;
    let windSpeed: number | undefined;
    
    if (reportType === 'hail') {
      hailSize = parseFloat(magnitude);
      if (isNaN(hailSize)) hailSize = undefined;
    } else if (reportType === 'wind') {
      windSpeed = parseInt(magnitude);
      if (isNaN(windSpeed)) windSpeed = undefined;
    }
    
    return {
      reportTime,
      reportType: reportType.charAt(0).toUpperCase() + reportType.slice(1),
      lat,
      lon,
      state,
      county,
      city: location,
      hailSize,
      windSpeed,
      comments,
    };
  } catch (error) {
    console.error('Error parsing CSV line:', error);
    return null;
  }
}

/**
 * Fetch storm reports for a specific date from NOAA CSV files
 */
async function fetchStormReportsForDate(dateStr: string): Promise<StormReport[]> {
  const allReports: StormReport[] = [];
  
  // NOAA SPC provides separate CSV files for hail, wind, and tornado
  // Try both date-specific and "today/yesterday" formats
  const isToday = dateStr === generateDateArray(1)[0];
  const isYesterday = dateStr === generateDateArray(2)[1];
  
  let filePrefix = dateStr;
  if (isToday) filePrefix = 'today';
  else if (isYesterday) filePrefix = 'yesterday';
  
  const reportTypes = [
    { type: 'hail', file: `${filePrefix}_rpts_hail.csv` },
    { type: 'wind', file: `${filePrefix}_rpts_wind.csv` },
    { type: 'tornado', file: `${filePrefix}_rpts_torn.csv` },
  ];
  
  for (const { type, file } of reportTypes) {
    try {
      const url = `${NOAA_STORM_REPORTS_BASE}${file}`;
      console.log(`🔍 Fetching ${type} reports: ${url}`);
      
      let response = await fetch(url, {
        headers: {
          'User-Agent': 'LossLocatorPro/1.0 (contact@losslocatorpro.com)',
        },
      });
      
      // If using shortcut failed, try actual date format
      if (!response.ok && (isToday || isYesterday)) {
        const altUrl = `${NOAA_STORM_REPORTS_BASE}${dateStr}_rpts_${type === 'tornado' ? 'torn' : type}.csv`;
        console.log(`   🔄 Trying alternate format: ${altUrl}`);
        response = await fetch(altUrl, {
          headers: {
            'User-Agent': 'LossLocatorPro/1.0 (contact@losslocatorpro.com)',
          },
        });
      }
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`   📅 No ${type} reports for ${dateStr} (404)`);
        } else {
          console.log(`   ⚠️ ${type} returned ${response.status}`);
        }
        continue;
      }
      
      const csvText = await response.text();
      const lines = csvText.split('\n').filter(line => line.trim().length > 0);
      
      console.log(`   📄 Got ${lines.length} lines`);
      
      // Skip header line and parse data
      for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i]);
        const report = parseStormReportFromCSV(fields, type, dateStr);
        
        if (report) {
          allReports.push(report);
        }
      }
      
      console.log(`   ✅ Parsed ${allReports.length} ${type} reports`);
      
    } catch (error) {
      console.error(`   ❌ Error fetching ${type}:`, error);
    }
  }
  
  if (allReports.length > 0) {
    console.log(`📊 ${dateStr}: Total ${allReports.length} reports`);
  }
  
  return allReports;
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
    
    // Generate date array for last 7 days
    const dates = generateDateArray(DAYS_TO_BACKFILL);
    console.log(`📅 Fetching storm reports for last ${DAYS_TO_BACKFILL} days...`);
    
    let allReports: StormReport[] = [];
    let daysChecked = 0;
    
    // Fetch storm reports for each date
    for (const dateStr of dates) {
      daysChecked++;
      
      const reports = await fetchStormReportsForDate(dateStr);
      allReports = allReports.concat(reports);
      
      // Safety limit: stop if we have enough reports
      if (allReports.length >= MAX_REPORTS_PER_RUN) {
        console.log(`⚠️ Reached max reports limit (${MAX_REPORTS_PER_RUN}), stopping fetch`);
        allReports = allReports.slice(0, MAX_REPORTS_PER_RUN);
        break;
      }
    }
    
    console.log(`📊 Total: ${allReports.length} reports from ${daysChecked} days`);
    
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
      days_checked: daysChecked,
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

