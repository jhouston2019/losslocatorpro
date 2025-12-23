import { supabase } from './supabaseClient';
import { getCurrentUser } from './auth';
import { LossEventStatus, RoutingQueueStatus } from './types';
import type {
  LossEvent,
  Property,
  RoutingQueueEntry,
  AdminSettings,
  TimelineEntry,
  Database,
  TablesUpdate,
  LossProperty,
  ZipDemographic,
} from './database.types';

// ============================================================================
// ROLE ENFORCEMENT
// ============================================================================

async function requireRole(allowedRoles: Array<'admin' | 'ops' | 'viewer'>): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    console.error('[AUDIT] Role Check: FAILED - No authenticated user');
    throw new Error('Authentication required');
  }
  if (!allowedRoles.includes(user.role)) {
    console.error('[AUDIT] Role Check: DENIED - User:', user.email, '- Role:', user.role, '- Required:', allowedRoles.join(' or '));
    throw new Error(`Insufficient permissions. Required: ${allowedRoles.join(' or ')}`);
  }
  console.log('[AUDIT] Role Check: PASSED - User:', user.email, '- Role:', user.role, '- Required:', allowedRoles.join(' or '));
}

async function requireWriteAccess(): Promise<void> {
  console.log('[AUDIT] Permission: Checking write access (admin/ops)');
  await requireRole(['admin', 'ops']);
}

async function requireAdminAccess(): Promise<void> {
  console.log('[AUDIT] Permission: Checking admin access');
  await requireRole(['admin']);
}

// ============================================================================
// LOSS EVENTS
// ============================================================================

export async function getLossEvents(): Promise<LossEvent[]> {
  const { data, error } = await supabase
    .from('loss_events')
    .select('*')
    .order('event_timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching loss events:', error);
    throw error;
  }

  return data || [];
}

export async function getLossEventById(id: string): Promise<LossEvent | null> {
  if (!id || id.trim() === '') {
    console.warn('getLossEventById called with invalid ID');
    return null;
  }
  
  const { data, error } = await supabase
    .from('loss_events')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching loss event:', error);
    return null;
  }

  return data;
}

type LossEventUpdate = Database['public']['Tables']['loss_events']['Update'];

// Update loss event fields (uses undefined to preserve existing values)
export async function updateLossEvent(
  id: string,
  input: {
    event_type?: 'Hail' | 'Wind' | 'Fire' | 'Freeze';
    status?: 'Unreviewed' | 'Contacted' | 'Qualified' | 'Converted';
    severity?: number;
  }
): Promise<void> {
  const updatePayload: LossEventUpdate = {
    event_type: input.event_type ?? undefined,
    status: input.status ?? undefined,
    severity: input.severity !== undefined ? Number(input.severity) : undefined,
  };

  const { error } = await supabase
    .from('loss_events')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function createLossEvent(
  event: Omit<LossEvent, 'id' | 'created_at' | 'updated_at'>
): Promise<LossEvent> {
  await requireWriteAccess();
  
  const { data, error } = await supabase
    .from('loss_events')
    .insert(event)
    .select()
    .single();

  if (error) {
    console.error('Error creating loss event:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// PROPERTIES
// ============================================================================

export async function getProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching properties:', error);
    throw error;
  }

  return data || [];
}

export async function getPropertyById(id: string): Promise<Property | null> {
  if (!id || id.trim() === '') {
    console.warn('getPropertyById called with invalid ID');
    return null;
  }
  
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching property:', error);
    return null;
  }

  return data;
}

export async function getPropertyByLossEventId(
  lossEventId: string
): Promise<Property | null> {
  const { data, error } = await supabase
    .from('property_events')
    .select('properties(*)')
    .eq('loss_event_id', lossEventId)
    .single();

  if (error) {
    console.error('Error fetching property by loss event:', error);
    return null;
  }

  return data?.properties as Property | null;
}

export async function updateProperty(
  id: string,
  updates: Partial<Property>
): Promise<void> {
  await requireWriteAccess();
  
  const { error } = await supabase
    .from('properties')
    .update(updates satisfies Database['public']['Tables']['properties']['Update'])
    .eq('id', id);

  if (error) {
    console.error('Error updating property:', error);
    throw error;
  }
}

export async function createProperty(
  property: Omit<Property, 'id' | 'created_at' | 'updated_at'>
): Promise<Property> {
  await requireWriteAccess();
  
  const { data, error} = await supabase
    .from('properties')
    .insert(property)
    .select()
    .single();

  if (error) {
    console.error('Error creating property:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// ROUTING QUEUE
// ============================================================================

export async function getRoutingQueue(): Promise<RoutingQueueEntry[]> {
  const { data, error } = await supabase
    .from('routing_queue')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching routing queue:', error);
    throw error;
  }

  return data || [];
}

export async function getRoutingQueueWithDetails(): Promise<
  Array<
    RoutingQueueEntry & {
      loss_event?: LossEvent | null;
      property?: Property | null;
    }
  >
> {
  const { data, error } = await supabase
    .from('routing_queue')
    .select(
      `
      *,
      loss_event:loss_events(*),
      property:properties(*)
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching routing queue with details:', error);
    throw error;
  }

  return (data || []) as Array<
    RoutingQueueEntry & {
      loss_event?: LossEvent | null;
      property?: Property | null;
    }
  >;
}

export async function assignLead(
  id: string,
  assignedTo: string,
  assigneeType: 'internal-ops' | 'adjuster-partner' | 'contractor-partner',
  priority: 'High' | 'Medium' | 'Low',
  notes?: string
): Promise<void> {
  console.log('[AUDIT] Write: assignLead - Queue ID:', id, '- Assignee:', assignedTo, '- Type:', assigneeType, '- Priority:', priority);
  
  if (!id || id.trim() === '') {
    console.error('[AUDIT] Write: assignLead FAILED - Invalid queue ID');
    throw new Error('Invalid routing queue ID');
  }
  if (!assignedTo || assignedTo.trim() === '') {
    console.error('[AUDIT] Write: assignLead FAILED - Missing assignee name');
    throw new Error('Assignee name is required');
  }
  
  await requireWriteAccess();
  
  const { error } = await supabase
    .from('routing_queue')
    .update({
      assigned_to: assignedTo,
      assignee_type: assigneeType,
      priority,
      notes,
      status: RoutingQueueStatus.Assigned,
    } satisfies Database['public']['Tables']['routing_queue']['Update'])
    .eq('id', id);

  if (error) {
    console.error('[AUDIT] Write: assignLead FAILED -', error.message);
    console.error('Error assigning lead:', error);
    throw error;
  }
  
  console.log('[AUDIT] Write: assignLead SUCCESS - Queue ID:', id, '- Now assigned to:', assignedTo);
}

export async function updateLeadStatus(
  id: string,
  status: RoutingQueueStatus
): Promise<void> {
  await requireWriteAccess();
  
  const { error } = await supabase
    .from('routing_queue')
    .update({ status } satisfies Database['public']['Tables']['routing_queue']['Update'])
    .eq('id', id);

  if (error) {
    console.error('Error updating lead status:', error);
    throw error;
  }
}

export async function createRoutingQueueEntry(
  lossEventId: string,
  propertyId?: string
): Promise<RoutingQueueEntry> {
  console.log('[AUDIT] Routing: createRoutingQueueEntry - Loss Event ID:', lossEventId, '- Property ID:', propertyId || 'none');
  
  if (!lossEventId || lossEventId.trim() === '') {
    console.error('[AUDIT] Routing: createRoutingQueueEntry FAILED - Missing loss event ID');
    throw new Error('Loss event ID is required');
  }
  
  await requireWriteAccess();
  
  const { data, error } = await supabase
    .from('routing_queue')
    .insert({
      loss_event_id: lossEventId,
      property_id: propertyId,
      status: RoutingQueueStatus.Unassigned,
    } satisfies Database['public']['Tables']['routing_queue']['Insert'])
    .select()
    .single();

  if (error) {
    console.error('[AUDIT] Routing: createRoutingQueueEntry FAILED -', error.message);
    console.error('Error creating routing queue entry:', error);
    throw error;
  }

  console.log('[AUDIT] Routing: createRoutingQueueEntry SUCCESS - New Queue ID:', data.id);
  return data;
}

// ============================================================================
// ADMIN SETTINGS
// ============================================================================

export async function getAdminSettings(): Promise<AdminSettings | null> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching admin settings:', error);
    return null;
  }

  return data;
}

export async function updateAdminSettings(
  settings: Partial<AdminSettings>
): Promise<void> {
  console.log('[AUDIT] Admin: updateAdminSettings - Changes:', JSON.stringify(settings));
  
  await requireAdminAccess();
  
  // Get the first (and should be only) settings record
  const { data: existing } = await supabase
    .from('admin_settings')
    .select('id')
    .limit(1)
    .single();

  if (existing) {
    console.log('[AUDIT] Admin: Updating existing settings - ID:', existing.id);
    const { error } = await supabase
      .from('admin_settings')
      .update(settings satisfies Database['public']['Tables']['admin_settings']['Update'])
      .eq('id', existing.id);

    if (error) {
      console.error('[AUDIT] Admin: updateAdminSettings FAILED -', error.message);
      console.error('Error updating admin settings:', error);
      throw error;
    }
    console.log('[AUDIT] Admin: updateAdminSettings SUCCESS');
  } else {
    console.log('[AUDIT] Admin: Creating new settings record');
    // Create if doesn't exist
    const { error } = await supabase.from('admin_settings').insert(settings satisfies Database['public']['Tables']['admin_settings']['Update']);

    if (error) {
      console.error('[AUDIT] Admin: createAdminSettings FAILED -', error.message);
      console.error('Error creating admin settings:', error);
      throw error;
    }
    console.log('[AUDIT] Admin: createAdminSettings SUCCESS');
  }
}

// ============================================================================
// DASHBOARD METRICS
// ============================================================================

export interface DashboardFilters {
  stateCode?: string;
  minIncomePercentile?: number;
  propertyType?: 'all' | 'residential' | 'commercial';
  hasPhoneNumber?: boolean;
  minPhoneConfidence?: number;
}

export async function getDashboardMetrics(filters?: DashboardFilters) {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Build query with filters
  let query = supabase
    .from('loss_events')
    .select('*')
    .gte('event_timestamp', twentyFourHoursAgo.toISOString());

  // Apply state filter
  if (filters?.stateCode && filters.stateCode !== 'all') {
    query = query.eq('state_code', filters.stateCode);
  }

  // Apply property type filter
  if (filters?.propertyType && filters.propertyType !== 'all') {
    query = query.eq('property_type', filters.propertyType);
  }

  const { data: recentEvents, error: eventsError } = await query;

  if (eventsError) {
    console.error('Error fetching recent events:', eventsError);
    // Return empty metrics instead of throwing
    return {
      dailyLossCount: 0,
      eventsByCategory: {},
      highValueZips: [],
      qualifiedPct: 0,
      convertedPct: 0,
      topBySeverity: [],
      recentEvents: [],
    };
  }

  // Apply client-side filters for joined data
  let filteredEvents = recentEvents || [];

  // Filter by income percentile (only filter if demographic data exists)
  if (filters?.minIncomePercentile && filters.minIncomePercentile > 0) {
    filteredEvents = filteredEvents.filter((e: any) => {
      const demographic = Array.isArray(e.zip_demographic) ? e.zip_demographic[0] : e.zip_demographic;
      // Keep events without demographic data (don't filter them out)
      if (!demographic || demographic.income_percentile === null || demographic.income_percentile === undefined) {
        return false; // Only show events with demographic data when filter is active
      }
      return demographic.income_percentile >= filters.minIncomePercentile!;
    });
  }

  // Filter by phone number availability
  if (filters?.hasPhoneNumber !== undefined) {
    filteredEvents = filteredEvents.filter((e: any) => {
      const property = Array.isArray(e.loss_property) ? e.loss_property[0] : e.loss_property;
      const hasPhone = !!property?.phone_primary;
      return filters.hasPhoneNumber ? hasPhone : !hasPhone;
    });
  }

  // Filter by phone confidence (only filter if phone data exists)
  if (filters?.minPhoneConfidence && filters.minPhoneConfidence > 0) {
    filteredEvents = filteredEvents.filter((e: any) => {
      const property = Array.isArray(e.loss_property) ? e.loss_property[0] : e.loss_property;
      // Only show events with phone data when filter is active
      if (!property?.phone_primary) {
        return false;
      }
      return (property.phone_confidence || 0) >= filters.minPhoneConfidence!;
    });
  }

  // Get routing queue for conversion metrics
  const { data: routingData, error: routingError } = await supabase
    .from('routing_queue')
    .select('*');

  if (routingError) {
    console.error('Error fetching routing data:', routingError);
    // Continue with events data only
  }

  // Calculate metrics
  const dailyLossCount = filteredEvents.length;

  const eventsByCategory = filteredEvents.reduce<Record<string, number>>(
    (acc, e: any) => {
      acc[e.event_type] = (acc[e.event_type] || 0) + 1;
      return acc;
    },
    {}
  );

  // Get high value ZIPs using new income percentile data
  const highValueZips = Array.from(
    new Set(
      filteredEvents
        .filter((e: any) => {
          const demographic = Array.isArray(e.zip_demographic) ? e.zip_demographic[0] : e.zip_demographic;
          return demographic?.income_percentile >= 90;
        })
        .map((e: any) => e.zip)
    )
  ).slice(0, 6);

  const totalLeads = routingData?.length || 0;
  const convertedLeads =
    routingData?.filter((r) => r.status === RoutingQueueStatus.Converted).length || 0;
  const qualifiedLeads =
    routingData?.filter(
      (r) => r.status === RoutingQueueStatus.Qualified || r.status === RoutingQueueStatus.Converted
    ).length || 0;

  const qualifiedPct =
    totalLeads === 0 ? 0 : Math.round((qualifiedLeads / totalLeads) * 100);
  const convertedPct =
    totalLeads === 0 ? 0 : Math.round((convertedLeads / totalLeads) * 100);

  const topBySeverity = [...filteredEvents]
    .sort((a: any, b: any) => (b.severity || 0) - (a.severity || 0))
    .slice(0, 10);

  return {
    dailyLossCount,
    eventsByCategory,
    highValueZips,
    qualifiedPct,
    convertedPct,
    topBySeverity,
    recentEvents: filteredEvents,
  };
}

// ============================================================================
// ADMIN SETTINGS APPLICATION
// ============================================================================

/**
 * Check if a loss event meets admin-configured thresholds for auto-routing
 */
export async function shouldAutoCreateLead(
  severity: number,
  claimProbability: number
): Promise<boolean> {
  console.log('[AUDIT] Admin Logic: shouldAutoCreateLead - Severity:', severity, '- Claim Prob:', claimProbability);
  
  const settings = await getAdminSettings();
  
  if (!settings || !settings.auto_create_lead) {
    console.log('[AUDIT] Admin Logic: Auto-create DISABLED or no settings found');
    return false;
  }
  
  const minSeverity = settings.min_severity || 75;
  const minProb = settings.min_claim_probability || 0.7;
  
  const meetsThreshold = severity >= minSeverity && claimProbability >= minProb;
  console.log('[AUDIT] Admin Logic: Thresholds - Min Severity:', minSeverity, '- Min Prob:', minProb, '- Result:', meetsThreshold ? 'PASS' : 'FAIL');
  
  return meetsThreshold;
}

/**
 * Calculate priority score based on admin settings and event data
 */
export function calculatePriorityScore(
  severity: number,
  claimProbability: number,
  incomeBand?: string | null
): number {
  console.log('[AUDIT] Admin Logic: calculatePriorityScore - Severity:', severity, '- Claim Prob:', claimProbability, '- Income Band:', incomeBand || 'none');
  
  // Base score from severity (0-100)
  let score = Math.min(100, Math.max(0, severity));
  let boosts: string[] = [];
  
  // Boost for high claim probability
  if (claimProbability >= 0.8) {
    score += 10;
    boosts.push('+10 (high claim prob)');
  } else if (claimProbability >= 0.7) {
    score += 5;
    boosts.push('+5 (medium claim prob)');
  }
  
  // Boost for high-income areas
  if (incomeBand) {
    const band = incomeBand.toLowerCase();
    if (band.includes('top 10') || band.includes('9') || band.includes('8')) {
      score += 10;
      boosts.push('+10 (top income)');
    } else if (band.includes('top 25') || band.includes('7')) {
      score += 5;
      boosts.push('+5 (high income)');
    }
  }
  
  const finalScore = Math.min(100, Math.round(score));
  console.log('[AUDIT] Admin Logic: Priority Score - Base:', severity, '- Boosts:', boosts.join(', '), '- Final:', finalScore);
  
  return finalScore;
}

// ============================================================================
// ZIP DEMOGRAPHICS
// ============================================================================

export async function getZipDemographics(): Promise<ZipDemographic[]> {
  const { data, error } = await supabase
    .from('zip_demographics')
    .select('*')
    .order('state_code', { ascending: true });

  if (error) {
    console.error('Error fetching zip demographics:', error);
    throw error;
  }

  return data || [];
}

export async function getZipDemographicByZip(zip: string): Promise<ZipDemographic | null> {
  if (!zip || zip.trim() === '') {
    console.warn('getZipDemographicByZip called with invalid ZIP');
    return null;
  }

  const { data, error } = await supabase
    .from('zip_demographics')
    .select('*')
    .eq('zip', zip)
    .single();

  if (error) {
    console.error('Error fetching zip demographic:', error);
    return null;
  }

  return data;
}

export async function getZipDemographicsByState(stateCode: string): Promise<ZipDemographic[]> {
  const { data, error } = await supabase
    .from('zip_demographics')
    .select('*')
    .eq('state_code', stateCode)
    .order('income_percentile', { ascending: false });

  if (error) {
    console.error('Error fetching zip demographics by state:', error);
    throw error;
  }

  return data || [];
}

export async function getStatesFromDemographics(): Promise<string[]> {
  const { data, error } = await supabase
    .from('zip_demographics')
    .select('state_code')
    .order('state_code', { ascending: true });

  if (error) {
    console.error('Error fetching states:', error);
    return [];
  }

  // Get unique states
  const uniqueStates = Array.from(new Set(data?.map(d => d.state_code) || []));
  return uniqueStates;
}

// ============================================================================
// LOSS PROPERTIES
// ============================================================================

export async function getLossProperties(): Promise<LossProperty[]> {
  const { data, error } = await supabase
    .from('loss_properties')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching loss properties:', error);
    throw error;
  }

  return data || [];
}

export async function getLossPropertyByLossId(lossId: string): Promise<LossProperty | null> {
  if (!lossId || lossId.trim() === '') {
    console.warn('getLossPropertyByLossId called with invalid loss ID');
    return null;
  }

  const { data, error } = await supabase
    .from('loss_properties')
    .select('*')
    .eq('loss_id', lossId)
    .single();

  if (error) {
    console.error('Error fetching loss property:', error);
    return null;
  }

  return data;
}

export async function createLossProperty(
  property: Omit<LossProperty, 'id' | 'created_at' | 'updated_at'>
): Promise<LossProperty> {
  await requireWriteAccess();

  const { data, error } = await supabase
    .from('loss_properties')
    .insert(property)
    .select()
    .single();

  if (error) {
    console.error('Error creating loss property:', error);
    throw error;
  }

  return data;
}

export async function updateLossProperty(
  id: string,
  updates: Partial<LossProperty>
): Promise<void> {
  await requireWriteAccess();

  const { error } = await supabase
    .from('loss_properties')
    .update(updates satisfies Database['public']['Tables']['loss_properties']['Update'])
    .eq('id', id);

  if (error) {
    console.error('Error updating loss property:', error);
    throw error;
  }
}

// ============================================================================
// ENRICHED LOSS EVENTS (WITH JOINS)
// ============================================================================

// Supabase returns joined relations as arrays, so we need to handle that
export type EnrichedLossEvent = LossEvent & {
  loss_property?: LossProperty[] | LossProperty | null;
  zip_demographic?: ZipDemographic[] | ZipDemographic | null;
};

/**
 * Get loss events with enrichment data (property info, demographics)
 * This is the main function for displaying enriched loss data in the UI
 */
export async function getLossEventsWithEnrichment(): Promise<EnrichedLossEvent[]> {
  const { data, error } = await supabase
    .from('loss_events')
    .select('*')
    .order('event_timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching enriched loss events:', error);
    throw error;
  }

  // Return basic loss events without enrichment for now
  return (data || []) as any as EnrichedLossEvent[];
}

/**
 * Get a single enriched loss event by ID
 */
export async function getEnrichedLossEventById(id: string): Promise<EnrichedLossEvent | null> {
  if (!id || id.trim() === '') {
    console.warn('getEnrichedLossEventById called with invalid ID');
    return null;
  }

  const { data, error } = await supabase
    .from('loss_events')
    .select(`
      *,
      loss_property:loss_properties(*),
      zip_demographic:zip_demographics(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching enriched loss event:', error);
    return null;
  }

  // Supabase returns joined relations, we cast to any first to avoid type issues
  return data as any as EnrichedLossEvent;
}

// ============================================================================
// ENHANCED ROUTING LOGIC
// ============================================================================

/**
 * Check if a loss event meets enhanced routing criteria
 */
export async function shouldRouteEnhancedLead(
  lossEvent: LossEvent,
  lossProperty?: LossProperty | null,
  zipDemographic?: ZipDemographic | null
): Promise<{ shouldRoute: boolean; reason?: string }> {
  console.log('[AUDIT] Enhanced Routing: Evaluating loss event', lossEvent.id);

  const settings = await getAdminSettings();
  if (!settings || !settings.auto_create_lead) {
    console.log('[AUDIT] Enhanced Routing: Auto-create disabled');
    return { shouldRoute: false, reason: 'Auto-create disabled' };
  }

  // Check basic thresholds (existing logic)
  const minSeverity = settings.min_severity || 75;
  const minProb = settings.min_claim_probability || 0.7;

  if (lossEvent.severity < minSeverity) {
    return { shouldRoute: false, reason: `Severity ${lossEvent.severity} below minimum ${minSeverity}` };
  }

  if ((lossEvent.claim_probability || 0) < minProb) {
    return { shouldRoute: false, reason: `Claim probability below minimum ${minProb}` };
  }

  // Check commercial-only routing
  if (settings.commercial_only_routing && !lossEvent.is_commercial) {
    return { shouldRoute: false, reason: 'Commercial-only routing enabled, but property is not commercial' };
  }

  // Check residential leads enabled
  if (!settings.enable_residential_leads && lossEvent.property_type === 'residential') {
    return { shouldRoute: false, reason: 'Residential leads disabled' };
  }

  // Check phone required
  if (settings.phone_required_routing) {
    if (!lossProperty?.phone_primary) {
      return { shouldRoute: false, reason: 'Phone required but not available' };
    }

    const minPhoneConfidence = settings.min_phone_confidence || 0;
    if ((lossProperty.phone_confidence || 0) < minPhoneConfidence) {
      return { shouldRoute: false, reason: `Phone confidence ${lossProperty.phone_confidence} below minimum ${minPhoneConfidence}` };
    }
  }

  // Check income percentile
  const minIncomePercentile = settings.min_income_percentile || 0;
  if (minIncomePercentile > 0) {
    if (!zipDemographic?.income_percentile) {
      return { shouldRoute: false, reason: 'Income data not available' };
    }

    if (zipDemographic.income_percentile < minIncomePercentile) {
      return { shouldRoute: false, reason: `Income percentile ${zipDemographic.income_percentile} below minimum ${minIncomePercentile}` };
    }
  }

  console.log('[AUDIT] Enhanced Routing: All criteria met - ROUTE');
  return { shouldRoute: true };
}

/**
 * Calculate enhanced priority score with new factors
 */
export function calculateEnhancedPriorityScore(
  severity: number,
  claimProbability: number,
  incomeBand?: string | null,
  isCommercial?: boolean | null,
  phoneConfidence?: number | null,
  incomePercentile?: number | null
): number {
  console.log('[AUDIT] Enhanced Priority: Calculating score');

  // Base score from severity (0-100)
  let score = Math.min(100, Math.max(0, severity));
  let boosts: string[] = [];

  // Boost for high claim probability
  if (claimProbability >= 0.8) {
    score += 10;
    boosts.push('+10 (high claim prob)');
  } else if (claimProbability >= 0.7) {
    score += 5;
    boosts.push('+5 (medium claim prob)');
  }

  // Boost for high-income areas (using percentile if available)
  if (incomePercentile !== null && incomePercentile !== undefined) {
    if (incomePercentile >= 90) {
      score += 15;
      boosts.push('+15 (top 10% income)');
    } else if (incomePercentile >= 75) {
      score += 10;
      boosts.push('+10 (top 25% income)');
    } else if (incomePercentile >= 50) {
      score += 5;
      boosts.push('+5 (above median income)');
    }
  } else if (incomeBand) {
    // Fallback to old income band logic
    const band = incomeBand.toLowerCase();
    if (band.includes('top 10') || band.includes('9') || band.includes('8')) {
      score += 10;
      boosts.push('+10 (top income band)');
    } else if (band.includes('top 25') || band.includes('7')) {
      score += 5;
      boosts.push('+5 (high income band)');
    }
  }

  // Boost for commercial properties
  if (isCommercial) {
    score += 10;
    boosts.push('+10 (commercial property)');
  }

  // Boost for high phone confidence
  if (phoneConfidence !== null && phoneConfidence !== undefined) {
    if (phoneConfidence >= 80) {
      score += 8;
      boosts.push('+8 (high phone confidence)');
    } else if (phoneConfidence >= 60) {
      score += 4;
      boosts.push('+4 (medium phone confidence)');
    }
  }

  const finalScore = Math.min(100, Math.round(score));
  console.log('[AUDIT] Enhanced Priority: Base:', severity, '- Boosts:', boosts.join(', '), '- Final:', finalScore);

  return finalScore;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function parseTimeline(timeline: unknown): TimelineEntry[] {
  if (!timeline) return [];
  if (Array.isArray(timeline)) return timeline as TimelineEntry[];
  return [];
}

