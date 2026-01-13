/**
 * LOSS SIGNALS DATA LAYER
 * 
 * Functions to expose loss clusters to the UI.
 * Clusters augment existing weather layers, not replace them.
 * 
 * Loss Locator Pro aggregates and organizes multi-source loss signals
 * into confidence-scored loss intelligence.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database, LossCluster, LossSignal } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// ============================================================================
// TYPES
// ============================================================================

export interface LossClusterFilters {
  eventType?: string;
  confidenceTier?: 'probable' | 'reported' | 'confirmed';
  minConfidence?: number;
  stateCode?: string;
  startDate?: Date;
  endDate?: Date;
  sourceTypes?: string[]; // Filter by presence of specific source types
}

export interface EnrichedLossCluster extends LossCluster {
  signals?: LossSignal[];
  signalSources?: string[];
  hasWeatherSignal?: boolean;
  hasNonWeatherSignal?: boolean;
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get loss clusters with optional filters
 * For map overlays and list views
 */
export async function getLossClusters(
  filters?: LossClusterFilters
): Promise<EnrichedLossCluster[]> {
  let query = supabase
    .from('loss_clusters')
    .select('*')
    .order('time_window_start', { ascending: false });
  
  // Apply filters
  if (filters?.eventType) {
    query = query.eq('event_type', filters.eventType);
  }
  
  if (filters?.confidenceTier) {
    query = query.eq('verification_status', filters.confidenceTier);
  }
  
  if (filters?.minConfidence) {
    query = query.gte('confidence_score', filters.minConfidence);
  }
  
  if (filters?.stateCode) {
    query = query.eq('state_code', filters.stateCode);
  }
  
  if (filters?.startDate) {
    query = query.gte('time_window_start', filters.startDate.toISOString());
  }
  
  if (filters?.endDate) {
    query = query.lte('time_window_end', filters.endDate.toISOString());
  }
  
  // Filter by source types if specified
  if (filters?.sourceTypes && filters.sourceTypes.length > 0) {
    query = query.overlaps('source_types', filters.sourceTypes);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching loss clusters:', error);
    throw error;
  }
  
  // Enrich clusters with signal information
  const enriched: EnrichedLossCluster[] = (data || []).map(cluster => ({
    ...cluster,
    signalSources: cluster.source_types || [],
    hasWeatherSignal: cluster.source_types?.includes('weather') || false,
    hasNonWeatherSignal: cluster.source_types?.some(t => t !== 'weather') || false
  }));
  
  return enriched;
}

/**
 * Get a single loss cluster with full signal details
 * For detail views
 */
export async function getLossClusterById(
  clusterId: string
): Promise<EnrichedLossCluster | null> {
  // Get cluster
  const { data: cluster, error: clusterError } = await supabase
    .from('loss_clusters')
    .select('*')
    .eq('id', clusterId)
    .single();
  
  if (clusterError || !cluster) {
    console.error('Error fetching loss cluster:', clusterError);
    return null;
  }
  
  // Get associated signals
  const { data: clusterSignals, error: signalsError } = await supabase
    .from('loss_cluster_signals')
    .select('signal_id')
    .eq('cluster_id', clusterId);
  
  if (signalsError) {
    console.error('Error fetching cluster signals:', signalsError);
    return {
      ...cluster,
      signalSources: cluster.source_types || [],
      hasWeatherSignal: cluster.source_types?.includes('weather') || false,
      hasNonWeatherSignal: cluster.source_types?.some(t => t !== 'weather') || false
    };
  }
  
  const signalIds = clusterSignals?.map(cs => cs.signal_id) || [];
  
  if (signalIds.length > 0) {
    const { data: signals } = await supabase
      .from('loss_signals')
      .select('*')
      .in('id', signalIds);
    
    return {
      ...cluster,
      signals: signals || [],
      signalSources: cluster.source_types || [],
      hasWeatherSignal: cluster.source_types?.includes('weather') || false,
      hasNonWeatherSignal: cluster.source_types?.some(t => t !== 'weather') || false
    };
  }
  
  return {
    ...cluster,
    signalSources: cluster.source_types || [],
    hasWeatherSignal: cluster.source_types?.includes('weather') || false,
    hasNonWeatherSignal: cluster.source_types?.some(t => t !== 'weather') || false
  };
}

/**
 * Get recent loss clusters for dashboard
 * Default to last 7 days
 */
export async function getRecentLossClusters(
  days: number = 7,
  limit: number = 50
): Promise<EnrichedLossCluster[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return getLossClusters({
    startDate,
    endDate: new Date()
  });
}

/**
 * Get loss clusters by geographic bounds
 * For map viewport queries
 */
export async function getLossClustersByBounds(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
  filters?: LossClusterFilters
): Promise<EnrichedLossCluster[]> {
  let query = supabase
    .from('loss_clusters')
    .select('*')
    .gte('center_lat', minLat)
    .lte('center_lat', maxLat)
    .gte('center_lng', minLng)
    .lte('center_lng', maxLng)
    .order('confidence_score', { ascending: false });
  
  // Apply additional filters
  if (filters?.eventType) {
    query = query.eq('event_type', filters.eventType);
  }
  
  if (filters?.confidenceTier) {
    query = query.eq('verification_status', filters.confidenceTier);
  }
  
  if (filters?.minConfidence) {
    query = query.gte('confidence_score', filters.minConfidence);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching loss clusters by bounds:', error);
    throw error;
  }
  
  const enriched: EnrichedLossCluster[] = (data || []).map(cluster => ({
    ...cluster,
    signalSources: cluster.source_types || [],
    hasWeatherSignal: cluster.source_types?.includes('weather') || false,
    hasNonWeatherSignal: cluster.source_types?.some(t => t !== 'weather') || false
  }));
  
  return enriched;
}

/**
 * Get cluster statistics for dashboard metrics
 */
export async function getLossClusterStats(days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data: clusters } = await supabase
    .from('loss_clusters')
    .select('*')
    .gte('time_window_start', startDate.toISOString());
  
  if (!clusters) {
    return {
      totalClusters: 0,
      byVerificationStatus: {
        probable: 0,
        reported: 0,
        confirmed: 0
      },
      byEventType: {} as Record<string, number>,
      multiSourceCount: 0,
      averageConfidence: 0
    };
  }
  
  const stats = {
    totalClusters: clusters.length,
    byVerificationStatus: {
      probable: clusters.filter(c => c.verification_status === 'probable').length,
      reported: clusters.filter(c => c.verification_status === 'reported').length,
      confirmed: clusters.filter(c => c.verification_status === 'confirmed').length
    },
    byEventType: clusters.reduce((acc, c) => {
      acc[c.event_type] = (acc[c.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    multiSourceCount: clusters.filter(c => (c.source_types?.length || 0) > 1).length,
    averageConfidence: clusters.reduce((sum, c) => sum + c.confidence_score, 0) / clusters.length
  };
  
  return stats;
}

/**
 * Get verification status badge info
 */
export function getVerificationBadge(cluster: LossCluster): {
  label: string;
  description: string;
  color: string;
} {
  const hasWeather = cluster.source_types?.includes('weather');
  const hasNonWeather = cluster.source_types?.some(t => t !== 'weather');
  
  if (cluster.verification_status === 'confirmed') {
    return {
      label: 'Multi-Source Confirmed',
      description: `Confidence: ${cluster.confidence_score}% - Verified by ${cluster.signal_count} signals`,
      color: 'green'
    };
  }
  
  if (cluster.verification_status === 'reported' && hasNonWeather) {
    return {
      label: 'Reported Incident',
      description: `Confidence: ${cluster.confidence_score}% - ${cluster.signal_count} signals including non-weather sources`,
      color: 'amber'
    };
  }
  
  if (hasWeather && !hasNonWeather) {
    return {
      label: 'Weather-Derived',
      description: `Confidence: ${cluster.confidence_score}% - Based on weather data`,
      color: 'blue'
    };
  }
  
  return {
    label: 'Probable',
    description: `Confidence: ${cluster.confidence_score}% - ${cluster.signal_count} signals`,
    color: 'gray'
  };
}







