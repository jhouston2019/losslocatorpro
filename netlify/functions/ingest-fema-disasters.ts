import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';

// ============================================================================
// FEMA DISASTER DECLARATIONS INGESTION
// ============================================================================
// Fetches disaster declarations from FEMA OpenFEMA API
// Runs weekly via Netlify scheduled functions
// Prevents duplicates using unique source + source_event_id index

// FEMA Disaster Declaration structure
interface FEMADisasterDeclaration {
  disasterNumber: number;
  declarationDate: string; // ISO 8601 timestamp
  incidentType: string;
  declarationTitle: string;
  state: string; // Two-letter state code
  declarationType: string; // DR (Major Disaster) or EM (Emergency)
  incidentBeginDate?: string;
  incidentEndDate?: string;
  designatedArea?: string;
  fipsStateCode?: string;
  fipsCountyCode?: string;
  placeCode?: string;
  id: string;
}

interface FEMAResponse {
  DisasterDeclarationsSummaries: FEMADisasterDeclaration[];
  metadata?: {
    skip: number;
    top: number;
    count: number;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const FEMA_API_BASE = 'https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries';

// Lookback period: last 90 days (disasters are infrequent)
const DAYS_TO_BACKFILL = 90;

// Incident type mapping to loss_events event_type
// Maps to: 'Fire', 'Wind', 'Hail', 'Freeze'
const INCIDENT_TYPE_MAP: Record<string, 'Fire' | 'Wind' | 'Hail' | 'Freeze' | null> = {
  // Fire events
  'Fire': 'Fire',
  'Wildfire': 'Fire',
  
  // Wind events
  'Hurricane': 'Wind',
  'Typhoon': 'Wind',
  'Tornado': 'Wind',
  'Severe Storm': 'Wind',
  'Severe Storm(s)': 'Wind',
  'Tropical Storm': 'Wind',
  
  // Freeze events
  'Freezing': 'Freeze',
  'Snow': 'Freeze',
  'Severe Ice Storm': 'Freeze',
  
  // Note: Floods, Earthquakes, etc. are skipped (not in our event types)
};

// Severity by declaration type
const DECLARATION_SEVERITY: Record<string, number> = {
  'DR': 0.90, // Major Disaster Declaration - highest severity
  'EM': 0.75, // Emergency Declaration - high severity
  'FM': 0.60, // Fire Management Assistance
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize FEMA incident type to our schema
 */
function normalizeIncidentType(incidentType: string): 'Fire' | 'Wind' | 'Hail' | 'Freeze' | null {
  // Direct match
  if (INCIDENT_TYPE_MAP[incidentType]) {
    return INCIDENT_TYPE_MAP[incidentType];
  }
  
  // Partial match (case-insensitive)
  const lowerType = incidentType.toLowerCase();
  
  if (lowerType.includes('fire') || lowerType.includes('wildfire')) return 'Fire';
  if (lowerType.includes('hurricane') || lowerType.includes('tornado') || lowerType.includes('storm')) return 'Wind';
  if (lowerType.includes('freeze') || lowerType.includes('snow') || lowerType.includes('ice')) return 'Freeze';
  
  return null;
}

/**
 * Calculate severity from declaration type and incident type
 */
function calculateSeverity(declarationType: string, incidentType: string): number {
  const baseSeverity = DECLARATION_SEVERITY[declarationType] || 0.70;
  
  // Adjust for incident type
  if (incidentType.toLowerCase().includes('hurricane')) return Math.min(0.95, baseSeverity + 0.05);
  if (incidentType.toLowerCase().includes('wildfire')) return Math.min(0.95, baseSeverity + 0.05);
  
  return baseSeverity;
}

/**
 * Calculate claim probability for FEMA disasters
 * Federal disasters have high claim probability
 */
function calculateClaimProbability(severity: number): number {
  // FEMA disasters are confirmed, high-impact events
  return Math.min(0.95, severity * 0.95);
}

/**
 * Get state centroid coordinates for disasters without specific location
 * Returns approximate center of state for mapping purposes
 */
function getStateCentroid(stateCode: string): { lat: number; lng: number } | null {
  const STATE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
    'AL': { lat: 32.806671, lng: -86.791130 },
    'AK': { lat: 61.370716, lng: -152.404419 },
    'AZ': { lat: 33.729759, lng: -111.431221 },
    'AR': { lat: 34.969704, lng: -92.373123 },
    'CA': { lat: 36.116203, lng: -119.681564 },
    'CO': { lat: 39.059811, lng: -105.311104 },
    'CT': { lat: 41.597782, lng: -72.755371 },
    'DE': { lat: 39.318523, lng: -75.507141 },
    'FL': { lat: 27.766279, lng: -81.686783 },
    'GA': { lat: 33.040619, lng: -83.643074 },
    'HI': { lat: 21.094318, lng: -157.498337 },
    'ID': { lat: 44.240459, lng: -114.478828 },
    'IL': { lat: 40.349457, lng: -88.986137 },
    'IN': { lat: 39.849426, lng: -86.258278 },
    'IA': { lat: 42.011539, lng: -93.210526 },
    'KS': { lat: 38.526600, lng: -96.726486 },
    'KY': { lat: 37.668140, lng: -84.670067 },
    'LA': { lat: 31.169546, lng: -91.867805 },
    'ME': { lat: 44.693947, lng: -69.381927 },
    'MD': { lat: 39.063946, lng: -76.802101 },
    'MA': { lat: 42.230171, lng: -71.530106 },
    'MI': { lat: 43.326618, lng: -84.536095 },
    'MN': { lat: 45.694454, lng: -93.900192 },
    'MS': { lat: 32.741646, lng: -89.678696 },
    'MO': { lat: 38.456085, lng: -92.288368 },
    'MT': { lat: 46.921925, lng: -110.454353 },
    'NE': { lat: 41.125370, lng: -98.268082 },
    'NV': { lat: 38.313515, lng: -117.055374 },
    'NH': { lat: 43.452492, lng: -71.563896 },
    'NJ': { lat: 40.298904, lng: -74.521011 },
    'NM': { lat: 34.840515, lng: -106.248482 },
    'NY': { lat: 42.165726, lng: -74.948051 },
    'NC': { lat: 35.630066, lng: -79.806419 },
    'ND': { lat: 47.528912, lng: -99.784012 },
    'OH': { lat: 40.388783, lng: -82.764915 },
    'OK': { lat: 35.565342, lng: -96.928917 },
    'OR': { lat: 44.572021, lng: -122.070938 },
    'PA': { lat: 40.590752, lng: -77.209755 },
    'RI': { lat: 41.680893, lng: -71.511780 },
    'SC': { lat: 33.856892, lng: -80.945007 },
    'SD': { lat: 44.299782, lng: -99.438828 },
    'TN': { lat: 35.747845, lng: -86.692345 },
    'TX': { lat: 31.054487, lng: -97.563461 },
    'UT': { lat: 40.150032, lng: -111.862434 },
    'VT': { lat: 44.045876, lng: -72.710686 },
    'VA': { lat: 37.769337, lng: -78.169968 },
    'WA': { lat: 47.400902, lng: -121.490494 },
    'WV': { lat: 38.491226, lng: -80.954453 },
    'WI': { lat: 44.268543, lng: -89.616508 },
    'WY': { lat: 42.755966, lng: -107.302490 },
  };
  
  return STATE_CENTROIDS[stateCode] || null;
}

/**
 * Format date for filtering (YYYY-MM-DD)
 */
function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================================================
// MAIN INGESTION LOGIC
// ============================================================================

const handler: Handler = async (event, context) => {
  console.log('🏛️ Starting FEMA disaster declarations ingestion...');
  
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
    
    // Calculate date range (last 90 days)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - DAYS_TO_BACKFILL * 24 * 60 * 60 * 1000);
    
    const startDateStr = formatDateForAPI(startDate);
    
    // Build FEMA API URL with filters
    const apiUrl = `${FEMA_API_BASE}?$filter=declarationDate ge '${startDateStr}'&$orderby=declarationDate desc&$top=1000`;
    
    console.log(`📡 Fetching FEMA declarations since ${startDateStr}`);
    console.log(`📍 API URL: ${apiUrl}`);
    
    // Fetch disaster declarations from FEMA
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`FEMA API returned ${response.status}: ${response.statusText}`);
    }
    
    const femaData: FEMAResponse = await response.json();
    const declarations = femaData.DisasterDeclarationsSummaries || [];
    
    console.log(`📊 Retrieved ${declarations.length} disaster declarations`);
    
    if (declarations.length === 0) {
      console.log('✅ No disaster declarations to ingest');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No disaster declarations in date range',
          inserted: 0,
          skipped: 0,
          errors: 0,
          duration: Date.now() - startTime,
        }),
      };
    }
    
    // Process each disaster declaration
    for (const declaration of declarations) {
      try {
        // Validate required fields
        if (!declaration.disasterNumber || !declaration.declarationDate || !declaration.incidentType) {
          skippedCount++;
          continue;
        }
        
        // Normalize incident type
        const eventType = normalizeIncidentType(declaration.incidentType);
        if (!eventType) {
          // Skip disasters that don't map to our event types (floods, earthquakes, etc.)
          skippedCount++;
          continue;
        }
        
        // Calculate severity and claim probability
        const severity = calculateSeverity(declaration.declarationType, declaration.incidentType);
        const claimProbability = calculateClaimProbability(severity);
        
        // Get coordinates (use state centroid as disasters are often state-wide)
        const coords = getStateCentroid(declaration.state);
        
        // Use incident begin date if available, otherwise declaration date
        const eventTimestamp = declaration.incidentBeginDate || declaration.declarationDate;
        
        // Generate unique source event ID
        const sourceEventId = `FEMA-${declaration.disasterNumber}`;
        
        // Prepare event data
        const eventData = {
          event_type: eventType,
          severity,
          claim_probability: claimProbability,
          event_timestamp: eventTimestamp,
          zip: '00000', // FEMA disasters are state/county level, not ZIP specific
          state_code: declaration.state,
          lat: coords?.lat || null,
          lng: coords?.lng || null,
          latitude: coords?.lat || null,
          longitude: coords?.lng || null,
          source: 'FEMA',
          source_event_id: sourceEventId,
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
            console.error(`❌ Error inserting ${sourceEventId}:`, error);
            errorCount++;
          }
        } else {
          console.log(`✅ ${declaration.declarationType} ${declaration.disasterNumber}: ${declaration.incidentType} in ${declaration.state} (${severity.toFixed(2)})`);
          insertedCount++;
        }
        
      } catch (declarationError) {
        console.error('Error processing declaration:', declarationError);
        errorCount++;
      }
    }
    
    const duration = Date.now() - startTime;
    const summary = {
      success: true,
      declarations_fetched: declarations.length,
      inserted: insertedCount,
      skipped: skippedCount,
      errors: errorCount,
      duration_ms: duration,
    };
    
    console.log('🎉 FEMA disaster declarations ingestion complete:', summary);
    
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

// Export as scheduled function (runs weekly)
export { handler };
