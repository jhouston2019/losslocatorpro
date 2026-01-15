/**
 * GEO AGGREGATES DATA LAYER
 * 
 * Functions to query ZIP/county-level opportunity clusters
 * Provides aggregated loss intelligence without address-level data
 */

import { createClient } from '@supabase/supabase-js';
import type { Database, LossGeoAggregate } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// ============================================================================
// TYPES
// ============================================================================

export interface GeoAggregateFilters {
  zipCode?: string;
  countyFips?: string;
  stateCode?: string;
  eventType?: string;
  minSeverity?: number;
  minClaimProbability?: number;
  confidenceLevel?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ZipOpportunity {
  zipCode: string;
  stateCode: string;
  countyFips: string | null;
  eventType: string;
  eventCount: number;
  avgSeverity: number;
  avgClaimProbability: number;
  maxSeverity: number;
  maxClaimProbability: number;
  latestEvent: string;
  earliestEvent: string;
  confidenceLevels: string;
  sources: string;
}

export interface CountyOpportunity {
  countyFips: string;
  stateCode: string;
  eventType: string;
  eventCount: number;
  zipCount: number;
  avgSeverity: number;
  avgClaimProbability: number;
  maxSeverity: number;
  maxClaimProbability: number;
  latestEvent: string;
  earliestEvent: string;
  confidenceLevels: string;
  sources: string;
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get geo aggregates with filters
 */
export async function getGeoAggregates(
  filters?: GeoAggregateFilters
): Promise<LossGeoAggregate[]> {
  let query = supabase
    .from('loss_geo_aggregates')
    .select('*')
    .order('event_timestamp', { ascending: false });
  
  if (filters?.zipCode) {
    query = query.eq('zip_code', filters.zipCode);
  }
  
  if (filters?.countyFips) {
    query = query.eq('county_fips', filters.countyFips);
  }
  
  if (filters?.stateCode) {
    query = query.eq('state_code', filters.stateCode);
  }
  
  if (filters?.eventType) {
    query = query.eq('event_type', filters.eventType);
  }
  
  if (filters?.minSeverity !== undefined) {
    query = query.gte('severity_score', filters.minSeverity / 100);
  }
  
  if (filters?.minClaimProbability !== undefined) {
    query = query.gte('claim_probability', filters.minClaimProbability / 100);
  }
  
  if (filters?.confidenceLevel) {
    query = query.eq('confidence_level', filters.confidenceLevel);
  }
  
  if (filters?.startDate) {
    query = query.gte('event_timestamp', filters.startDate.toISOString());
  }
  
  if (filters?.endDate) {
    query = query.lte('event_timestamp', filters.endDate.toISOString());
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching geo aggregates:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get ZIP-level opportunities (aggregated view)
 */
export async function getZipOpportunities(
  filters?: GeoAggregateFilters
): Promise<ZipOpportunity[]> {
  let query = (supabase as any)
    .from('loss_opportunities_by_zip')
    .select('*')
    .order('max_claim_probability', { ascending: false });
  
  if (filters?.zipCode) {
    query = query.eq('zip_code', filters.zipCode);
  }
  
  if (filters?.stateCode) {
    query = query.eq('state_code', filters.stateCode);
  }
  
  if (filters?.eventType) {
    query = query.eq('event_type', filters.eventType);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching ZIP opportunities:', error);
    throw error;
  }
  
  return (data || []).map((row: any) => ({
    zipCode: row.zip_code,
    stateCode: row.state_code,
    countyFips: row.county_fips,
    eventType: row.event_type,
    eventCount: row.event_count,
    avgSeverity: row.avg_severity * 100,
    avgClaimProbability: row.avg_claim_probability * 100,
    maxSeverity: row.max_severity * 100,
    maxClaimProbability: row.max_claim_probability * 100,
    latestEvent: row.latest_event,
    earliestEvent: row.earliest_event,
    confidenceLevels: row.confidence_levels,
    sources: row.sources
  }));
}

/**
 * Get county-level opportunities (aggregated view)
 */
export async function getCountyOpportunities(
  filters?: GeoAggregateFilters
): Promise<CountyOpportunity[]> {
  let query = (supabase as any)
    .from('loss_opportunities_by_county')
    .select('*')
    .order('max_claim_probability', { ascending: false });
  
  if (filters?.countyFips) {
    query = query.eq('county_fips', filters.countyFips);
  }
  
  if (filters?.stateCode) {
    query = query.eq('state_code', filters.stateCode);
  }
  
  if (filters?.eventType) {
    query = query.eq('event_type', filters.eventType);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching county opportunities:', error);
    throw error;
  }
  
  return (data || []).map((row: any) => ({
    countyFips: row.county_fips,
    stateCode: row.state_code,
    eventType: row.event_type,
    eventCount: row.event_count,
    zipCount: row.zip_count,
    avgSeverity: row.avg_severity * 100,
    avgClaimProbability: row.avg_claim_probability * 100,
    maxSeverity: row.max_severity * 100,
    maxClaimProbability: row.max_claim_probability * 100,
    latestEvent: row.latest_event,
    earliestEvent: row.earliest_event,
    confidenceLevels: row.confidence_levels,
    sources: row.sources
  }));
}

/**
 * Get high-confidence ZIP clusters ready for address resolution
 */
export async function getZipsReadyForResolution(): Promise<any[]> {
  const { data, error } = await (supabase as any)
    .from('zip_clusters_ready_for_resolution')
    .select('*')
    .eq('meets_threshold', true)
    .order('avg_claim_probability', { ascending: false });
  
  if (error) {
    console.error('Error fetching ZIPs ready for resolution:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get aggregates for a specific event
 */
export async function getAggregatesForEvent(eventId: string): Promise<LossGeoAggregate[]> {
  const { data, error } = await supabase
    .from('loss_geo_aggregates')
    .select('*')
    .eq('event_id', eventId);
  
  if (error) {
    console.error('Error fetching aggregates for event:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get statistics for dashboard
 */
export async function getGeoAggregateStats(days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data: aggregates } = await supabase
    .from('loss_geo_aggregates')
    .select('*')
    .gte('event_timestamp', startDate.toISOString());
  
  if (!aggregates) {
    return {
      totalAggregates: 0,
      uniqueZips: 0,
      uniqueCounties: 0,
      byEventType: {} as Record<string, number>,
      avgClaimProbability: 0,
      highConfidenceCount: 0
    };
  }
  
  const uniqueZips = new Set(aggregates.map(a => a.zip_code)).size;
  const uniqueCounties = new Set(
    aggregates.filter(a => a.county_fips).map(a => a.county_fips)
  ).size;
  
  const byEventType = aggregates.reduce((acc, a) => {
    acc[a.event_type] = (acc[a.event_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const avgClaimProbability = 
    aggregates.reduce((sum, a) => sum + a.claim_probability, 0) / aggregates.length;
  
  const highConfidenceCount = aggregates.filter(
    a => a.claim_probability >= 0.70
  ).length;
  
  return {
    totalAggregates: aggregates.length,
    uniqueZips,
    uniqueCounties,
    byEventType,
    avgClaimProbability: avgClaimProbability * 100,
    highConfidenceCount
  };
}

/**
 * Trigger geo enrichment for an event
 */
export async function triggerGeoEnrichment(eventId: string): Promise<boolean> {
  try {
    // Call the Netlify function
    const response = await fetch('/.netlify/functions/enrich-geo-resolution', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ eventId })
    });
    
    if (!response.ok) {
      console.error('Failed to trigger geo enrichment');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error triggering geo enrichment:', error);
    return false;
  }
}
