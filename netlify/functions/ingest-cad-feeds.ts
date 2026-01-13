/**
 * CAD/911 FEED INGESTION FUNCTION
 * 
 * Ingests fire/structure fire calls from open CAD (Computer-Aided Dispatch) feeds.
 * Sources: PulsePoint, Active911, or municipal CAD systems with public APIs
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

interface CADIncident {
  id: string;
  call_type: string;
  call_time: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  units_assigned?: string[];
  priority?: string;
  status?: string;
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

const SOURCE_TYPE = 'cad';
const CONFIDENCE_BASE = 0.55; // CAD calls have moderate-low confidence (unverified)

// Call type filters - only ingest fire-related calls
const FIRE_CALL_TYPES = [
  'STRUCTURE FIRE',
  'BUILDING FIRE',
  'RESIDENTIAL FIRE',
  'COMMERCIAL FIRE',
  'FIRE',
  'FIRE ALARM',
  'SMOKE INVESTIGATION',
  'WORKING FIRE'
];

// ============================================================================
// CAD FEED CLIENTS
// ============================================================================

/**
 * Fetch incidents from PulsePoint API
 * PulsePoint provides real-time fire/EMS incident data
 */
async function fetchPulsePointIncidents(): Promise<CADIncident[]> {
  const apiUrl = process.env.PULSEPOINT_API_URL;
  const apiKey = process.env.PULSEPOINT_API_KEY;
  
  if (!apiUrl) {
    console.log('PulsePoint API not configured');
    return [];
  }
  
  try {
    // PulsePoint typically provides incidents from last 24 hours
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': apiKey ? `Bearer ${apiKey}` : '',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`PulsePoint API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter for fire-related incidents only
    const incidents = (data.incidents || []).filter((incident: any) => 
      FIRE_CALL_TYPES.some(type => 
        incident.call_type?.toUpperCase().includes(type)
      )
    );
    
    console.log(`PulsePoint: ${incidents.length} fire incidents found`);
    return incidents;
    
  } catch (error) {
    console.error('Error fetching PulsePoint incidents:', error);
    return [];
  }
}

/**
 * Fetch incidents from Active911 API
 */
async function fetchActive911Incidents(): Promise<CADIncident[]> {
  const apiUrl = process.env.ACTIVE911_API_URL;
  const apiKey = process.env.ACTIVE911_API_KEY;
  
  if (!apiUrl || !apiKey) {
    console.log('Active911 API not configured');
    return [];
  }
  
  try {
    const response = await fetch(`${apiUrl}/alerts`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Active911 API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter for fire-related alerts
    const incidents = (data.alerts || []).filter((alert: any) => 
      FIRE_CALL_TYPES.some(type => 
        alert.call_type?.toUpperCase().includes(type)
      )
    );
    
    console.log(`Active911: ${incidents.length} fire incidents found`);
    return incidents;
    
  } catch (error) {
    console.error('Error fetching Active911 incidents:', error);
    return [];
  }
}

/**
 * Fetch incidents from custom municipal CAD feed
 */
async function fetchMunicipalCADIncidents(): Promise<CADIncident[]> {
  const apiUrl = process.env.MUNICIPAL_CAD_API_URL;
  const apiKey = process.env.MUNICIPAL_CAD_API_KEY;
  
  if (!apiUrl) {
    console.log('Municipal CAD API not configured');
    return [];
  }
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': apiKey ? `Bearer ${apiKey}` : '',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Municipal CAD API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter for fire-related calls
    const incidents = (data.calls || data.incidents || []).filter((call: any) => 
      FIRE_CALL_TYPES.some(type => 
        call.call_type?.toUpperCase().includes(type)
      )
    );
    
    console.log(`Municipal CAD: ${incidents.length} fire incidents found`);
    return incidents;
    
  } catch (error) {
    console.error('Error fetching municipal CAD incidents:', error);
    return [];
  }
}

// ============================================================================
// SIGNAL NORMALIZATION
// ============================================================================

/**
 * Normalize CAD incident data into loss_events format
 */
function normalizeCADIncident(incident: CADIncident, sourceName: string): any {
  // All CAD fire calls map to 'Fire' event type
  const eventType = 'Fire';
  
  // Calculate severity based on call type and priority
  // Normalize to 0-1 scale for loss_events.severity
  let severity = 0.40; // Default low-moderate severity
  
  const callTypeUpper = incident.call_type?.toUpperCase() || '';
  
  if (callTypeUpper.includes('STRUCTURE') || callTypeUpper.includes('BUILDING')) {
    severity = 0.70; // Structure fires are more severe
  } else if (callTypeUpper.includes('WORKING')) {
    severity = 0.80; // Working fires are active and severe
  } else if (callTypeUpper.includes('ALARM')) {
    severity = 0.30; // Fire alarms may be false
  }
  
  // Adjust for priority if available
  if (incident.priority === '1' || incident.priority === 'HIGH') {
    severity = Math.min(0.90, severity + 0.15);
  }
  
  // Parse dates
  const occurredAt = incident.call_time;
  
  if (!occurredAt) {
    throw new Error('Missing required call time');
  }
  
  // Combine source_type and source_name for the source field
  const source = `${SOURCE_TYPE}:${sourceName}`;
  
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
 * Ingest CAD incidents from all configured sources into loss_events table
 */
async function ingestCADIncidents(): Promise<IngestionResult> {
  const result: IngestionResult = {
    success: false,
    signalsIngested: 0,
    signalsSkipped: 0,
    errors: []
  };
  
  // Fetch from all configured CAD sources
  const sources = [
    { name: 'PulsePoint', fetcher: fetchPulsePointIncidents },
    { name: 'Active911', fetcher: fetchActive911Incidents },
    { name: 'Municipal_CAD', fetcher: fetchMunicipalCADIncidents }
  ];
  
  for (const source of sources) {
    try {
      console.log(`Fetching CAD incidents from ${source.name}...`);
      
      const incidents = await source.fetcher();
      
      console.log(`Retrieved ${incidents.length} incidents from ${source.name}`);
      
      let sourceIngested = 0;
      let sourceSkipped = 0;
      
      // Process each incident
      for (const incident of incidents) {
        try {
          const eventData = normalizeCADIncident(incident, source.name);
          
          // Insert into loss_events (will skip if duplicate)
          const { error } = await supabase
            .from('loss_events')
            .upsert(eventData, {
              onConflict: 'source,source_event_id',
              ignoreDuplicates: true
            });
          
          if (error) {
            if (error.code === '23505') {
              sourceSkipped++;
            } else {
              result.errors.push(`Error inserting ${source.name} event ${incident.id}: ${error.message}`);
            }
          } else {
            sourceIngested++;
          }
          
        } catch (error: any) {
          result.errors.push(`Error processing ${source.name} incident ${incident.id}: ${error.message}`);
        }
      }
      
      result.signalsIngested += sourceIngested;
      result.signalsSkipped += sourceSkipped;
      
    } catch (error: any) {
      result.errors.push(`Fatal error for ${source.name}: ${error.message}`);
    }
  }
  
  result.success = true;
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
  
  console.log('Starting CAD feed ingestion...');
  
  try {
    const result = await ingestCADIncidents();
    
    console.log('CAD feed ingestion complete:', result);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'CAD feed ingestion complete',
        result
      })
    };
    
  } catch (error: any) {
    console.error('CAD feed ingestion failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'CAD feed ingestion failed',
        message: error.message
      })
    };
  }
};





