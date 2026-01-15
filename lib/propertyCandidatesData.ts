/**
 * PROPERTY CANDIDATES DATA LAYER
 * 
 * Functions to manage staged address resolution
 * Addresses are resolved on-demand, not bulk imported
 */

import { createClient } from '@supabase/supabase-js';
import type { Database, LossPropertyCandidate, AddressResolutionLog } from './database.types';

// Re-export types for convenience
export type { LossPropertyCandidate, AddressResolutionLog };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// ============================================================================
// TYPES
// ============================================================================

export interface PropertyCandidateFilters {
  zipCode?: string;
  countyFips?: string;
  stateCode?: string;
  eventId?: string;
  eventType?: string;
  status?: 'unreviewed' | 'reviewed' | 'qualified' | 'discarded';
  minClaimProbability?: number;
  propertyType?: string;
}

export interface ResolveAddressesRequest {
  zipCode: string;
  eventId?: string;
  triggerType: 'threshold' | 'user_action' | 'downstream_request' | 'manual';
  triggeredBy?: string;
  resolutionSource?: string;
}

export interface ResolveAddressesResponse {
  success: boolean;
  zipCode: string;
  propertiesFound: number;
  propertiesInserted: number;
  error?: string;
  logId?: string;
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get property candidates with filters
 */
export async function getPropertyCandidates(
  filters?: PropertyCandidateFilters
): Promise<LossPropertyCandidate[]> {
  let query = supabase
    .from('loss_property_candidates')
    .select('*')
    .order('estimated_claim_probability', { ascending: false });
  
  if (filters?.zipCode) {
    query = query.eq('zip_code', filters.zipCode);
  }
  
  if (filters?.countyFips) {
    query = query.eq('county_fips', filters.countyFips);
  }
  
  if (filters?.stateCode) {
    query = query.eq('state_code', filters.stateCode);
  }
  
  if (filters?.eventId) {
    query = query.eq('event_id', filters.eventId);
  }
  
  if (filters?.eventType) {
    query = query.eq('event_type', filters.eventType);
  }
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters?.minClaimProbability !== undefined) {
    query = query.gte('estimated_claim_probability', filters.minClaimProbability / 100);
  }
  
  if (filters?.propertyType) {
    query = query.eq('property_type', filters.propertyType);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching property candidates:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get candidates for a specific ZIP code
 */
export async function getCandidatesForZip(zipCode: string): Promise<LossPropertyCandidate[]> {
  return getPropertyCandidates({ zipCode });
}

/**
 * Get candidates for a specific event
 */
export async function getCandidatesForEvent(eventId: string): Promise<LossPropertyCandidate[]> {
  return getPropertyCandidates({ eventId });
}

/**
 * Get unreviewed candidates
 */
export async function getUnreviewedCandidates(): Promise<LossPropertyCandidate[]> {
  return getPropertyCandidates({ status: 'unreviewed' });
}

/**
 * Get high-probability candidates
 */
export async function getHighProbabilityCandidates(
  minProbability: number = 70
): Promise<LossPropertyCandidate[]> {
  return getPropertyCandidates({ 
    minClaimProbability: minProbability,
    status: 'unreviewed'
  });
}

// ============================================================================
// RESOLUTION FUNCTIONS
// ============================================================================

/**
 * Trigger address resolution for a ZIP code
 */
export async function resolveAddressesForZip(
  request: ResolveAddressesRequest
): Promise<ResolveAddressesResponse> {
  try {
    const response = await fetch('/.netlify/functions/resolve-addresses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        zipCode: request.zipCode,
        propertiesFound: 0,
        propertiesInserted: 0,
        error: error.error || 'Failed to resolve addresses'
      };
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error resolving addresses:', error);
    return {
      success: false,
      zipCode: request.zipCode,
      propertiesFound: 0,
      propertiesInserted: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if ZIP should be resolved (client-side check)
 */
export async function shouldResolveZip(zipCode: string): Promise<{
  shouldResolve: boolean;
  reason: string;
}> {
  // Check if already resolved
  const existing = await getCandidatesForZip(zipCode);
  if (existing.length > 0) {
    return {
      shouldResolve: false,
      reason: 'ZIP already has resolved properties'
    };
  }
  
  // Check ZIP-level statistics
  const { data: zipStats } = await (supabase as any)
    .from('loss_opportunities_by_zip')
    .select('*')
    .eq('zip_code', zipCode)
    .single();
  
  if (!zipStats) {
    return {
      shouldResolve: false,
      reason: 'No events found for ZIP'
    };
  }
  
  // Get settings
  const { data: settings } = await supabase
    .from('address_resolution_settings')
    .select('*')
    .limit(1)
    .single();
  
  if (!settings) {
    return {
      shouldResolve: false,
      reason: 'No settings configured'
    };
  }
  
  const avgProbability = zipStats.avg_claim_probability;
  const threshold = settings.auto_resolve_threshold || 0.70;
  
  if (avgProbability < threshold) {
    return {
      shouldResolve: false,
      reason: `Claim probability ${(avgProbability * 100).toFixed(0)}% below threshold ${(threshold * 100).toFixed(0)}%`
    };
  }
  
  return {
    shouldResolve: true,
    reason: `Meets threshold: ${(avgProbability * 100).toFixed(0)}% probability`
  };
}

// ============================================================================
// UPDATE FUNCTIONS
// ============================================================================

/**
 * Update candidate status
 */
export async function updateCandidateStatus(
  candidateId: string,
  status: 'unreviewed' | 'reviewed' | 'qualified' | 'discarded',
  userId?: string
): Promise<boolean> {
  const updates: any = {
    status,
    reviewed_at: new Date().toISOString()
  };
  
  if (userId) {
    updates.reviewed_by = userId;
  }
  
  const { error } = await supabase
    .from('loss_property_candidates')
    .update(updates)
    .eq('id', candidateId);
  
  if (error) {
    console.error('Error updating candidate status:', error);
    return false;
  }
  
  return true;
}

/**
 * Bulk update candidate statuses
 */
export async function bulkUpdateCandidates(
  candidateIds: string[],
  status: 'unreviewed' | 'reviewed' | 'qualified' | 'discarded',
  userId?: string
): Promise<number> {
  const updates: any = {
    status,
    reviewed_at: new Date().toISOString()
  };
  
  if (userId) {
    updates.reviewed_by = userId;
  }
  
  const { data, error } = await supabase
    .from('loss_property_candidates')
    .update(updates)
    .in('id', candidateIds)
    .select();
  
  if (error) {
    console.error('Error bulk updating candidates:', error);
    return 0;
  }
  
  return data?.length || 0;
}

// ============================================================================
// RESOLUTION LOG FUNCTIONS
// ============================================================================

/**
 * Get resolution logs
 */
export async function getResolutionLogs(
  filters?: {
    zipCode?: string;
    eventId?: string;
    triggerType?: string;
    status?: string;
  }
): Promise<AddressResolutionLog[]> {
  let query = supabase
    .from('address_resolution_log')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (filters?.zipCode) {
    query = query.eq('zip_code', filters.zipCode);
  }
  
  if (filters?.eventId) {
    query = query.eq('event_id', filters.eventId);
  }
  
  if (filters?.triggerType) {
    query = query.eq('trigger_type', filters.triggerType);
  }
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching resolution logs:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get recent resolution activity
 */
export async function getRecentResolutionActivity(limit: number = 10): Promise<AddressResolutionLog[]> {
  const { data, error } = await supabase
    .from('address_resolution_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching recent resolution activity:', error);
    throw error;
  }
  
  return data || [];
}

// ============================================================================
// STATISTICS FUNCTIONS
// ============================================================================

/**
 * Get property candidate statistics
 */
export async function getCandidateStats() {
  const { data: candidates } = await supabase
    .from('loss_property_candidates')
    .select('*');
  
  if (!candidates) {
    return {
      total: 0,
      byStatus: {
        unreviewed: 0,
        reviewed: 0,
        qualified: 0,
        discarded: 0
      },
      byPropertyType: {} as Record<string, number>,
      avgClaimProbability: 0,
      highConfidenceCount: 0
    };
  }
  
  const byStatus = {
    unreviewed: candidates.filter(c => c.status === 'unreviewed').length,
    reviewed: candidates.filter(c => c.status === 'reviewed').length,
    qualified: candidates.filter(c => c.status === 'qualified').length,
    discarded: candidates.filter(c => c.status === 'discarded').length
  };
  
  const byPropertyType = candidates.reduce((acc, c) => {
    const type = c.property_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const avgClaimProbability = candidates.reduce((sum, c) => 
    sum + (c.estimated_claim_probability || 0), 0) / candidates.length;
  
  const highConfidenceCount = candidates.filter(
    c => (c.estimated_claim_probability || 0) >= 0.70
  ).length;
  
  return {
    total: candidates.length,
    byStatus,
    byPropertyType,
    avgClaimProbability: avgClaimProbability * 100,
    highConfidenceCount
  };
}

/**
 * Get resolution settings
 */
export async function getResolutionSettings() {
  const { data, error } = await supabase
    .from('address_resolution_settings')
    .select('*')
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error fetching resolution settings:', error);
    return null;
  }
  
  return data;
}

/**
 * Update resolution settings (admin only)
 */
export async function updateResolutionSettings(
  settings: Partial<Database['public']['Tables']['address_resolution_settings']['Update']>,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('address_resolution_settings')
    .update({
      ...settings,
      updated_at: new Date().toISOString(),
      updated_by: userId
    })
    .limit(1);
  
  if (error) {
    console.error('Error updating resolution settings:', error);
    return false;
  }
  
  return true;
}
