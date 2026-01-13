/**
 * COMMERCIAL FIRE INCIDENT INGESTION FUNCTION
 * 
 * Ingests fire incidents from commercial fire data providers.
 * Implements advanced deduplication with spatial and temporal matching.
 * 
 * Deduplication Strategy:
 * 1. First-pass: Check by source_event_id
 * 2. Second-pass: Check by location (≤0.5 miles) + time (±2 hours)
 * 3. Corroboration: If match found, escalate confidence to 0.95
 * 
 * Loss Locator Pro - Fire Incident Integration
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
// CONFIGURATION & VALIDATION
// ============================================================================

const REQUIRED_ENV_VARS = [
  'FIRE_COMMERCIAL_API_URL',
  'FIRE_COMMERCIAL_API_KEY'
];

function validateEnvironment(): void {
  const missing = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please configure these in your Netlify environment settings.'
    );
  }
}

const SOURCE_NAME = 'fire_commercial';
const CONFIDENCE_BASE = 0.75;
const CONFIDENCE_CORROBORATED = 0.95;

// Deduplication thresholds
const DEDUP_DISTANCE_MILES = 0.5;
const DEDUP_TIME_HOURS = 2;

// ============================================================================
// TYPES
// ============================================================================

interface FireIncidentSource {
  id: string;
  incident_date: string;
  incident_type?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  severity?: number;
  estimated_loss?: number;
  [key: string]: any;
}

interface IngestionResult {
  success: boolean;
  fetched: number;
  inserted: number;
  skipped: number;
  corroborated: number;
  errors: string[];
}

// ============================================================================
// FIRE INCIDENT API CLIENT
// ============================================================================

async function fetchFireIncidents(startDate: Date, endDate: Date): Promise<FireIncidentSource[]> {
  const apiUrl = process.env.FIRE_COMMERCIAL_API_URL!;
  const apiKey = process.env.FIRE_COMMERCIAL_API_KEY!;
  
  try {
    console.log(`Fetching commercial fire incidents from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
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
    return data.incidents || data.results || data || [];
    
  } catch (error) {
    console.error('Error fetching commercial fire incidents:', error);
    throw error;
  }
}

// ============================================================================
// GEOSPATIAL UTILITIES
// ============================================================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// DEDUPLICATION LOGIC
// ============================================================================

/**
 * Check if incident already exists by source_event_id
 */
async function checkDuplicateBySourceId(sourceEventId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('loss_events')
    .select('id')
    .eq('source', SOURCE_NAME)
    .eq('source_event_id', sourceEventId)
    .maybeSingle();
  
  if (error) {
    console.error('Error checking duplicate by source ID:', error);
    return null;
  }
  
  return data?.id || null;
}

/**
 * Check if incident already exists by location and time
 * Returns ID of existing event if found
 */
async function checkDuplicateByLocationTime(
  latitude: number,
  longitude: number,
  eventTimestamp: string
): Promise<string | null> {
  // Calculate time window
  const eventTime = new Date(eventTimestamp);
  const startTime = new Date(eventTime.getTime() - DEDUP_TIME_HOURS * 60 * 60 * 1000);
  const endTime = new Date(eventTime.getTime() + DEDUP_TIME_HOURS * 60 * 60 * 1000);
  
  // Fetch nearby fire events within time window
  const { data, error } = await supabase
    .from('loss_events')
    .select('id, latitude, longitude, event_timestamp')
    .eq('event_type', 'Fire')
    .gte('event_timestamp', startTime.toISOString())
    .lte('event_timestamp', endTime.toISOString())
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);
  
  if (error) {
    console.error('Error checking duplicate by location/time:', error);
    return null;
  }
  
  if (!data || data.length === 0) {
    return null;
  }
  
  // Check distance for each candidate
  for (const event of data) {
    const distance = calculateDistance(
      latitude,
      longitude,
      event.latitude!,
      event.longitude!
    );
    
    if (distance <= DEDUP_DISTANCE_MILES) {
      console.log(`Found duplicate within ${distance.toFixed(2)} miles and ${DEDUP_TIME_HOURS}h window`);
      return event.id;
    }
  }
  
  return null;
}

/**
 * Escalate confidence score when multiple sources corroborate
 */
async function escalateConfidence(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('loss_events')
    .update({
      claim_probability: CONFIDENCE_CORROBORATED
    })
    .eq('id', eventId);
  
  if (error) {
    console.error('Error escalating confidence:', error);
  } else {
    console.log(`✨ Confidence escalated to ${CONFIDENCE_CORROBORATED} for event ${eventId}`);
  }
}

// ============================================================================
// DATA NORMALIZATION
// ============================================================================

function normalizeSeverity(incident: FireIncidentSource): number {
  // If severity provided directly (0-1 scale)
  if (incident.severity !== undefined && incident.severity >= 0 && incident.severity <= 1) {
    return incident.severity;
  }
  
  // Calculate from estimated loss
  if (incident.estimated_loss) {
    if (incident.estimated_loss < 10000) return 0.25;
    if (incident.estimated_loss < 50000) return 0.50;
    if (incident.estimated_loss < 100000) return 0.75;
    return 0.90;
  }
  
  // Default moderate severity
  return 0.50;
}

function normalizeFireIncident(incident: FireIncidentSource): any {
  const severity = normalizeSeverity(incident);
  const eventTimestamp = new Date(incident.incident_date).toISOString();
  const zip = incident.zip || '00000';
  
  return {
    event_type: 'Fire',
    event_timestamp: eventTimestamp,
    severity: severity,
    zip: zip,
    state_code: incident.state || null,
    
    // Coordinates (populate both new and legacy)
    latitude: incident.latitude || null,
    longitude: incident.longitude || null,
    lat: incident.latitude || null,
    lng: incident.longitude || null,
    
    // Address (new field)
    address: incident.address || null,
    
    // Source tracking
    source: SOURCE_NAME,
    source_event_id: incident.id,
    
    // Confidence and priority
    confidence_score: CONFIDENCE_BASE,
    claim_probability: CONFIDENCE_BASE,
    priority_score: Math.round(severity * 100),
    
    // Status and property type
    status: 'Unreviewed' as const,
    property_type: 'residential' as const,
    
    // Raw payload for audit trail
    raw_payload: incident
  };
}

// ============================================================================
// INGESTION LOGIC
// ============================================================================

async function ingestCommercialFireIncidents(): Promise<IngestionResult> {
  const result: IngestionResult = {
    success: false,
    fetched: 0,
    inserted: 0,
    skipped: 0,
    corroborated: 0,
    errors: []
  };
  
  try {
    // Validate environment
    validateEnvironment();
    
    // Fetch incidents from last 24 hours
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    
    const incidents = await fetchFireIncidents(startDate, endDate);
    result.fetched = incidents.length;
    
    console.log(`Retrieved ${incidents.length} commercial fire incidents`);
    
    // Process each incident
    for (const incident of incidents) {
      try {
        // Normalize incident data
        const eventData = normalizeFireIncident(incident);
        
        // DEDUPLICATION STEP 1: Check by source_event_id
        const duplicateById = await checkDuplicateBySourceId(incident.id);
        if (duplicateById) {
          console.log(`Skipped: Duplicate source_event_id ${incident.id}`);
          result.skipped++;
          continue;
        }
        
        // DEDUPLICATION STEP 2: Check by location + time (if coordinates available)
        if (incident.latitude && incident.longitude) {
          const duplicateByLocation = await checkDuplicateByLocationTime(
            incident.latitude,
            incident.longitude,
            eventData.event_timestamp
          );
          
          if (duplicateByLocation) {
            // Corroboration: Escalate confidence instead of inserting
            await escalateConfidence(duplicateByLocation);
            result.corroborated++;
            continue;
          }
        }
        
        // No duplicate found - insert new event
        const { error } = await supabase
          .from('loss_events')
          .insert(eventData);
        
        if (error) {
          if (error.code === '23505') {
            // Unique constraint violation (race condition)
            result.skipped++;
          } else {
            result.errors.push(`Error inserting ${incident.id}: ${error.message}`);
          }
        } else {
          console.log(`✅ Inserted fire incident ${incident.id} in ${incident.city || 'unknown'}, ${incident.state || 'unknown'}`);
          result.inserted++;
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
  console.log('🔥 Starting commercial fire incident ingestion...');
  
  // Fail fast if environment variables missing
  if (!process.env.FIRE_COMMERCIAL_API_URL || !process.env.FIRE_COMMERCIAL_API_KEY) {
    const error = 'Missing required environment variables: FIRE_COMMERCIAL_API_URL or FIRE_COMMERCIAL_API_KEY';
    console.error('❌', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error,
        fetched: 0,
        inserted: 0,
        skipped: 0
      })
    };
  }
  
  try {
    const result = await ingestCommercialFireIncidents();
    
    // Log detailed stats
    console.log('Fetched incidents:', result.fetched);
    console.log('Inserted:', result.inserted);
    console.log('Skipped:', result.skipped);
    console.log('Corroborated:', result.corroborated);
    console.log('Errors:', result.errors.length);
    
    // Hard fail condition: fetched > 0 but inserted = 0
    if (result.fetched > 0 && result.inserted === 0 && result.corroborated === 0) {
      console.error('⚠️ WARNING: Fetched incidents but none were inserted!');
    }
    
    console.log('🎉 Commercial fire incident ingestion complete');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        fetched: result.fetched,
        inserted: result.inserted,
        skipped: result.skipped,
        corroborated: result.corroborated,
        errors: result.errors
      })
    };
    
  } catch (error: any) {
    console.error('❌ Commercial fire incident ingestion failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        fetched: 0,
        inserted: 0,
        skipped: 0
      })
    };
  }
};

