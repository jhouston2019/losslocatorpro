/**
 * FIRE INCIDENT INGESTION FUNCTION
 * 
 * Ingests fire incident reports from federal/state fire reporting systems.
 * Sources: NFIRS (National Fire Incident Reporting System) or state equivalents
 * 
 * Loss Locator Pro aggregates and organizes multi-source loss signals
 * into confidence-scored loss intelligence.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
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

interface FireIncidentSource {
  id: string;
  incident_date: string;
  incident_type: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  alarm_time?: string;
  property_use?: string;
  estimated_loss?: number;
  [key: string]: any;
}

interface IngestionResult {
  success: boolean;
  signalsIngested: number;
  signalsSkipped: number;
  errors: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SOURCE_TYPE = 'fire_report';
const SOURCE_NAME = 'NFIRS_API'; // Configurable per deployment
const CONFIDENCE_BASE = 0.65; // Fire reports have moderate confidence

// Event type mapping from fire incident codes
// Maps to loss_events.event_type values: 'Fire', 'Wind', 'Hail', 'Freeze'
const EVENT_TYPE_MAP: Record<string, string> = {
  '100': 'Fire', // Structure fire
  '110': 'Fire', // Building fire
  '111': 'Fire', // Residential building fire
  '120': 'Fire', // Fire in mobile property
  '130': 'Fire', // Outside fire
  '140': 'Fire', // Natural vegetation fire
  '150': 'Fire', // Outside rubbish fire
  'default': 'Fire'
};

// ============================================================================
// FIRE INCIDENT API CLIENT
// ============================================================================

/**
 * Fetch fire incidents from external API
 * This is a template - implement actual API integration based on available source
 */
async function fetchFireIncidents(startDate: Date, endDate: Date): Promise<FireIncidentSource[]> {
  // IMPLEMENTATION NOTE:
  // Replace this with actual fire incident API integration
  // Options include:
  // 1. NFIRS data (if accessible via API or bulk download)
  // 2. State fire marshal APIs
  // 3. Local fire department CAD feeds
  // 4. Commercial fire incident data providers
  
  const apiUrl = process.env.FIRE_INCIDENT_API_URL;
  const apiKey = process.env.FIRE_INCIDENT_API_KEY;
  
  if (!apiUrl) {
    console.log('No fire incident API configured - skipping ingestion');
    return [];
  }
  
  try {
    const response = await fetch(
      `${apiUrl}/incidents?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.incidents || [];
    
  } catch (error) {
    console.error('Error fetching fire incidents:', error);
    throw error;
  }
}

// ============================================================================
// SIGNAL NORMALIZATION
// ============================================================================

/**
 * Normalize fire incident data into loss_events format
 */
function normalizeFireIncident(incident: FireIncidentSource): any {
  // Map incident type to standardized event type
  const eventType = EVENT_TYPE_MAP[incident.incident_type] || EVENT_TYPE_MAP['default'];
  
  // Calculate severity from estimated loss (if available)
  // Normalize to 0-1 scale for loss_events.severity
  let severity = 0.50; // Default moderate severity
  if (incident.estimated_loss) {
    // Scale: $0-10k = 0.25, $10k-50k = 0.50, $50k-100k = 0.75, $100k+ = 0.90
    if (incident.estimated_loss < 10000) severity = 0.25;
    else if (incident.estimated_loss < 50000) severity = 0.50;
    else if (incident.estimated_loss < 100000) severity = 0.75;
    else severity = 0.90;
  }
  
  // Parse dates
  const occurredAt = incident.incident_date || incident.alarm_time;
  
  if (!occurredAt) {
    throw new Error('Missing required incident date');
  }
  
  // Combine source_type and source_name for the source field
  const source = `${SOURCE_TYPE}:${SOURCE_NAME}`;
  
  // Use ZIP or placeholder
  const zip = incident.zip || '00000';
  
  return {
    // Core fields (mapped to loss_events schema)
    event_type: eventType,
    event_timestamp: new Date(occurredAt).toISOString(),
    severity: severity,
    zip: zip,
    state_code: incident.state || null,
    
    // Coordinate fields (populate both new and legacy)
    latitude: incident.latitude || null,
    longitude: incident.longitude || null,
    lat: incident.latitude || null,
    lng: incident.longitude || null,
    
    // Source tracking and deduplication
    source: source,
    source_event_id: incident.id,
    
    // Confidence and priority
    claim_probability: CONFIDENCE_BASE,
    priority_score: Math.round(severity * 100),
    
    // Status and property type
    status: 'Unreviewed' as const,
    property_type: 'residential' as const
  };
}

// ============================================================================
// INGESTION LOGIC
// ============================================================================

/**
 * Ingest fire incidents into loss_events table
 */
async function ingestFireIncidents(): Promise<IngestionResult> {
  const result: IngestionResult = {
    success: false,
    signalsIngested: 0,
    signalsSkipped: 0,
    errors: []
  };
  
  try {
    // Fetch incidents from last 24 hours
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    
    console.log(`Fetching fire incidents from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const incidents = await fetchFireIncidents(startDate, endDate);
    
    console.log(`Retrieved ${incidents.length} fire incidents`);
    
    // Process each incident
    for (const incident of incidents) {
      try {
        const eventData = normalizeFireIncident(incident);
        
        // Insert into loss_events (will skip if duplicate based on unique constraint)
        const { error } = await supabase
          .from('loss_events')
          .upsert(eventData, {
            onConflict: 'source,source_event_id',
            ignoreDuplicates: true
          });
        
        if (error) {
          // Check if it's a duplicate (unique constraint violation)
          if (error.code === '23505') {
            result.signalsSkipped++;
          } else {
            result.errors.push(`Error inserting event ${incident.id}: ${error.message}`);
          }
        } else {
          result.signalsIngested++;
        }
        
      } catch (error: any) {
        result.errors.push(`Error processing incident ${incident.id}: ${error.message}`);
      }
    }
    
    result.success = true;
    
  } catch (error: any) {
    result.errors.push(`Fatal error: ${error.message}`);
  }
  
  return result;
}

// ============================================================================
// NETLIFY FUNCTION HANDLER
// ============================================================================

export const handler: Handler = async (event: HandlerEvent) => {
  // Verify this is a scheduled function call or authenticated request
  const authHeader = event.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  console.log('Starting fire incident ingestion...');
  
  try {
    const result = await ingestFireIncidents();
    
    console.log('Fire incident ingestion complete:', result);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Fire incident ingestion complete',
        result
      })
    };
    
  } catch (error: any) {
    console.error('Fire incident ingestion failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Fire incident ingestion failed',
        message: error.message
      })
    };
  }
};





