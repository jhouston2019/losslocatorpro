/**
 * LOSS SIGNAL CLUSTERING ENGINE
 * 
 * Deduplicates and clusters loss signals from multiple sources into
 * confidence-scored loss intelligence (loss_clusters).
 * 
 * Clustering rules:
 * - Group signals by spatial proximity (within configurable radius)
 * - Group signals by time window (within configurable hours)
 * - Group signals by event type
 * - Merge duplicates across sources
 * - Suppress low-severity single-source noise
 * 
 * Loss Locator Pro aggregates and organizes multi-source loss signals
 * into confidence-scored loss intelligence.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import type { Database, LossSignal, LossCluster } from '../../lib/database.types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// ============================================================================
// CONFIGURATION
// ============================================================================

const CLUSTERING_CONFIG = {
  // Spatial clustering
  MAX_DISTANCE_KM: 5, // Signals within 5km are considered same incident
  
  // Temporal clustering
  TIME_WINDOW_HOURS: 24, // Signals within 24 hours are considered same incident
  
  // Suppression rules
  MIN_CONFIDENCE_SINGLE_SOURCE: 0.70, // Single-source signals need 70% confidence
  MIN_SEVERITY_SINGLE_SOURCE: 60, // Single-source signals need severity >= 60
  
  // Verification thresholds
  CONFIDENCE_THRESHOLD_PROBABLE: 60,
  CONFIDENCE_THRESHOLD_REPORTED: 60,
  CONFIDENCE_THRESHOLD_CONFIRMED: 86
};

// ============================================================================
// TYPES
// ============================================================================

interface ClusterCandidate {
  signals: LossSignal[];
  centerLat: number;
  centerLng: number;
  timeWindowStart: string;
  timeWindowEnd: string;
  eventType: string;
}

interface ClusteringResult {
  success: boolean;
  clustersCreated: number;
  clustersUpdated: number;
  signalsClustered: number;
  signalsSuppressed: number;
  errors: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Calculate time difference in hours
 */
function calculateTimeDiffHours(date1: string, date2: string): number {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  return Math.abs(d1 - d2) / (1000 * 60 * 60);
}

/**
 * Check if signal should be suppressed (noise filtering)
 */
function shouldSuppressSignal(signal: LossSignal, isMultiSource: boolean): boolean {
  // Never suppress multi-source signals
  if (isMultiSource) {
    return false;
  }
  
  // Suppress single-source signals below thresholds
  const confidence = signal.confidence_raw || 0;
  const severity = signal.severity_raw || 0;
  
  if (confidence < CLUSTERING_CONFIG.MIN_CONFIDENCE_SINGLE_SOURCE &&
      severity < CLUSTERING_CONFIG.MIN_SEVERITY_SINGLE_SOURCE) {
    return true;
  }
  
  return false;
}

// ============================================================================
// CLUSTERING LOGIC
// ============================================================================

/**
 * Fetch unclustered signals from the database
 */
async function fetchUnclusteredSignals(): Promise<LossSignal[]> {
  // Get signals that haven't been assigned to a cluster yet
  const { data: signals, error } = await supabase
    .from('loss_signals')
    .select('*')
    .not('id', 'in', 
      supabase
        .from('loss_cluster_signals')
        .select('signal_id')
    )
    .order('occurred_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to fetch unclustered signals: ${error.message}`);
  }
  
  return signals || [];
}

/**
 * Find signals that should be clustered together
 */
function findClusterCandidates(signals: LossSignal[]): ClusterCandidate[] {
  const candidates: ClusterCandidate[] = [];
  const processed = new Set<string>();
  
  for (const signal of signals) {
    if (processed.has(signal.id)) {
      continue;
    }
    
    // Skip signals without coordinates
    if (!signal.lat || !signal.lng) {
      processed.add(signal.id);
      continue;
    }
    
    // Find all signals that cluster with this one
    const clusterSignals: LossSignal[] = [signal];
    processed.add(signal.id);
    
    for (const otherSignal of signals) {
      if (processed.has(otherSignal.id)) {
        continue;
      }
      
      // Skip signals without coordinates
      if (!otherSignal.lat || !otherSignal.lng) {
        continue;
      }
      
      // Check if signals should cluster
      const sameEventType = signal.event_type === otherSignal.event_type;
      const withinDistance = calculateDistance(
        signal.lat,
        signal.lng,
        otherSignal.lat,
        otherSignal.lng
      ) <= CLUSTERING_CONFIG.MAX_DISTANCE_KM;
      const withinTimeWindow = calculateTimeDiffHours(
        signal.occurred_at,
        otherSignal.occurred_at
      ) <= CLUSTERING_CONFIG.TIME_WINDOW_HOURS;
      
      if (sameEventType && withinDistance && withinTimeWindow) {
        clusterSignals.push(otherSignal);
        processed.add(otherSignal.id);
      }
    }
    
    // Check if cluster should be suppressed
    const isMultiSource = new Set(clusterSignals.map(s => s.source_type)).size > 1;
    const shouldSuppress = clusterSignals.every(s => shouldSuppressSignal(s, isMultiSource));
    
    if (shouldSuppress) {
      continue; // Skip this cluster
    }
    
    // Calculate cluster centroid
    const centerLat = clusterSignals.reduce((sum, s) => sum + (s.lat || 0), 0) / clusterSignals.length;
    const centerLng = clusterSignals.reduce((sum, s) => sum + (s.lng || 0), 0) / clusterSignals.length;
    
    // Calculate time window
    const times = clusterSignals.map(s => new Date(s.occurred_at).getTime());
    const timeWindowStart = new Date(Math.min(...times)).toISOString();
    const timeWindowEnd = new Date(Math.max(...times)).toISOString();
    
    candidates.push({
      signals: clusterSignals,
      centerLat,
      centerLng,
      timeWindowStart,
      timeWindowEnd,
      eventType: signal.event_type
    });
  }
  
  return candidates;
}

/**
 * Calculate confidence score for a cluster
 * See STEP 4 in prompt for scoring rules
 */
function calculateConfidenceScore(signals: LossSignal[]): number {
  let score = 0;
  
  // Get unique source types
  const sourceTypes = new Set(signals.map(s => s.source_type));
  
  // Base scores by source type
  if (sourceTypes.has('weather')) {
    score += 40; // Weather only: 30-50, using middle value
  }
  
  if (sourceTypes.has('fire_report')) {
    score += 25;
  }
  
  if (sourceTypes.has('cad')) {
    score += 20;
  }
  
  if (sourceTypes.has('news')) {
    score += 15;
  }
  
  // Future: partner confirmation would add +20
  
  // Cap at 100
  return Math.min(100, score);
}

/**
 * Get verification status from confidence score
 */
function getVerificationStatus(confidenceScore: number): string {
  if (confidenceScore < CLUSTERING_CONFIG.CONFIDENCE_THRESHOLD_REPORTED) {
    return 'probable';
  } else if (confidenceScore < CLUSTERING_CONFIG.CONFIDENCE_THRESHOLD_CONFIRMED) {
    return 'reported';
  } else {
    return 'confirmed';
  }
}

/**
 * Create or update loss cluster
 */
async function createOrUpdateCluster(candidate: ClusterCandidate): Promise<string> {
  const confidenceScore = calculateConfidenceScore(candidate.signals);
  const verificationStatus = getVerificationStatus(confidenceScore);
  const sourceTypes = Array.from(new Set(candidate.signals.map(s => s.source_type)));
  
  // Get location data from first signal with complete info
  const primarySignal = candidate.signals.find(s => s.state_code && s.zip) || candidate.signals[0];
  
  // Check if cluster already exists nearby
  const { data: existingClusters } = await supabase
    .from('loss_clusters')
    .select('*')
    .eq('event_type', candidate.eventType)
    .gte('time_window_start', new Date(Date.parse(candidate.timeWindowStart) - 24 * 60 * 60 * 1000).toISOString())
    .lte('time_window_end', new Date(Date.parse(candidate.timeWindowEnd) + 24 * 60 * 60 * 1000).toISOString());
  
  let clusterId: string;
  
  // Find existing cluster within distance
  const nearbyCluster = existingClusters?.find(cluster => 
    calculateDistance(
      cluster.center_lat,
      cluster.center_lng,
      candidate.centerLat,
      candidate.centerLng
    ) <= CLUSTERING_CONFIG.MAX_DISTANCE_KM
  );
  
  if (nearbyCluster) {
    // Update existing cluster
    const { error } = await supabase
      .from('loss_clusters')
      .update({
        confidence_score: Math.max(nearbyCluster.confidence_score, confidenceScore),
        verification_status: getVerificationStatus(Math.max(nearbyCluster.confidence_score, confidenceScore)),
        signal_count: nearbyCluster.signal_count + candidate.signals.length,
        source_types: Array.from(new Set([...(nearbyCluster.source_types || []), ...sourceTypes])),
        updated_at: new Date().toISOString()
      })
      .eq('id', nearbyCluster.id);
    
    if (error) {
      throw new Error(`Failed to update cluster: ${error.message}`);
    }
    
    clusterId = nearbyCluster.id;
    
  } else {
    // Create new cluster
    const { data: newCluster, error } = await supabase
      .from('loss_clusters')
      .insert({
        event_type: candidate.eventType,
        center_lat: candidate.centerLat,
        center_lng: candidate.centerLng,
        geometry: {
          type: 'Point',
          coordinates: [candidate.centerLng, candidate.centerLat]
        },
        address_text: primarySignal.address_text,
        city: primarySignal.city,
        state_code: primarySignal.state_code,
        zip: primarySignal.zip,
        time_window_start: candidate.timeWindowStart,
        time_window_end: candidate.timeWindowEnd,
        confidence_score: confidenceScore,
        verification_status: verificationStatus,
        signal_count: candidate.signals.length,
        source_types: sourceTypes
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create cluster: ${error.message}`);
    }
    
    clusterId = newCluster.id;
  }
  
  // Link signals to cluster
  for (const signal of candidate.signals) {
    await supabase
      .from('loss_cluster_signals')
      .insert({
        cluster_id: clusterId,
        signal_id: signal.id
      })
      .onConflict('signal_id')
      .ignore();
  }
  
  return clusterId;
}

// ============================================================================
// MAIN CLUSTERING FUNCTION
// ============================================================================

/**
 * Run clustering algorithm on unclustered signals
 */
async function clusterLossSignals(): Promise<ClusteringResult> {
  const result: ClusteringResult = {
    success: false,
    clustersCreated: 0,
    clustersUpdated: 0,
    signalsClustered: 0,
    signalsSuppressed: 0,
    errors: []
  };
  
  try {
    console.log('Fetching unclustered signals...');
    
    const signals = await fetchUnclusteredSignals();
    
    console.log(`Found ${signals.length} unclustered signals`);
    
    if (signals.length === 0) {
      result.success = true;
      return result;
    }
    
    // Find cluster candidates
    console.log('Finding cluster candidates...');
    const candidates = findClusterCandidates(signals);
    
    console.log(`Found ${candidates.length} cluster candidates`);
    
    // Calculate suppressed signals
    const clusteredSignalIds = new Set(
      candidates.flatMap(c => c.signals.map(s => s.id))
    );
    result.signalsSuppressed = signals.length - clusteredSignalIds.size;
    
    // Create or update clusters
    for (const candidate of candidates) {
      try {
        await createOrUpdateCluster(candidate);
        result.clustersCreated++;
        result.signalsClustered += candidate.signals.length;
      } catch (error: any) {
        result.errors.push(`Error creating cluster: ${error.message}`);
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
  
  console.log('Starting loss signal clustering...');
  
  try {
    const result = await clusterLossSignals();
    
    console.log('Loss signal clustering complete:', result);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Loss signal clustering complete',
        result
      })
    };
    
  } catch (error: any) {
    console.error('Loss signal clustering failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Loss signal clustering failed',
        message: error.message
      })
    };
  }
};







