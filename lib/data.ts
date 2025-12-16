import { supabase } from './supabaseClient';
import { getCurrentUser } from './auth';
import type {
  LossEvent,
  Property,
  RoutingQueueEntry,
  AdminSettings,
  TimelineEntry,
} from './database.types';

// ============================================================================
// ROLE ENFORCEMENT
// ============================================================================

async function requireRole(allowedRoles: Array<'admin' | 'ops' | 'viewer'>): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Insufficient permissions. Required: ${allowedRoles.join(' or ')}`);
  }
}

async function requireWriteAccess(): Promise<void> {
  await requireRole(['admin', 'ops']);
}

async function requireAdminAccess(): Promise<void> {
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

export async function updateLossEventStatus(
  id: string,
  status: 'Unreviewed' | 'Contacted' | 'Qualified' | 'Converted'
): Promise<void> {
  if (!id || id.trim() === '') {
    throw new Error('Invalid loss event ID');
  }
  
  await requireWriteAccess();
  
  const { error } = await supabase
    .from('loss_events')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Error updating loss event status:', error);
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
    .update(updates)
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
  if (!id || id.trim() === '') {
    throw new Error('Invalid routing queue ID');
  }
  if (!assignedTo || assignedTo.trim() === '') {
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
      status: 'Assigned',
    })
    .eq('id', id);

  if (error) {
    console.error('Error assigning lead:', error);
    throw error;
  }
}

export async function updateLeadStatus(
  id: string,
  status: 'Unassigned' | 'Assigned' | 'Contacted' | 'Qualified' | 'Converted'
): Promise<void> {
  await requireWriteAccess();
  
  const { error } = await supabase
    .from('routing_queue')
    .update({ status })
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
  if (!lossEventId || lossEventId.trim() === '') {
    throw new Error('Loss event ID is required');
  }
  
  await requireWriteAccess();
  
  const { data, error } = await supabase
    .from('routing_queue')
    .insert({
      loss_event_id: lossEventId,
      property_id: propertyId,
      status: 'Unassigned',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating routing queue entry:', error);
    throw error;
  }

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
  await requireAdminAccess();
  
  // Get the first (and should be only) settings record
  const { data: existing } = await supabase
    .from('admin_settings')
    .select('id')
    .limit(1)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('admin_settings')
      .update(settings)
      .eq('id', existing.id);

    if (error) {
      console.error('Error updating admin settings:', error);
      throw error;
    }
  } else {
    // Create if doesn't exist
    const { error } = await supabase.from('admin_settings').insert(settings);

    if (error) {
      console.error('Error creating admin settings:', error);
      throw error;
    }
  }
}

// ============================================================================
// DASHBOARD METRICS
// ============================================================================

export async function getDashboardMetrics() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get loss events from last 24 hours
  const { data: recentEvents, error: eventsError } = await supabase
    .from('loss_events')
    .select('*')
    .gte('event_timestamp', twentyFourHoursAgo.toISOString());

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

  // Get routing queue for conversion metrics
  const { data: routingData, error: routingError } = await supabase
    .from('routing_queue')
    .select('*');

  if (routingError) {
    console.error('Error fetching routing data:', routingError);
    // Continue with events data only
  }

  // Calculate metrics
  const dailyLossCount = recentEvents?.length || 0;

  const eventsByCategory = (recentEvents || []).reduce<Record<string, number>>(
    (acc, e) => {
      acc[e.event_type] = (acc[e.event_type] || 0) + 1;
      return acc;
    },
    {}
  );

  const highValueZips = Array.from(
    new Set(
      (recentEvents || [])
        .filter(
          (e) =>
            e.income_band?.includes('7') ||
            e.income_band?.includes('8') ||
            e.income_band?.includes('9')
        )
        .map((e) => e.zip)
    )
  ).slice(0, 6);

  const totalLeads = routingData?.length || 0;
  const convertedLeads =
    routingData?.filter((r) => r.status === 'Converted').length || 0;
  const qualifiedLeads =
    routingData?.filter(
      (r) => r.status === 'Qualified' || r.status === 'Converted'
    ).length || 0;

  const qualifiedPct =
    totalLeads === 0 ? 0 : Math.round((qualifiedLeads / totalLeads) * 100);
  const convertedPct =
    totalLeads === 0 ? 0 : Math.round((convertedLeads / totalLeads) * 100);

  const topBySeverity = [...(recentEvents || [])]
    .sort((a, b) => (b.severity || 0) - (a.severity || 0))
    .slice(0, 10);

  return {
    dailyLossCount,
    eventsByCategory,
    highValueZips,
    qualifiedPct,
    convertedPct,
    topBySeverity,
    recentEvents: recentEvents || [],
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
  const settings = await getAdminSettings();
  
  if (!settings || !settings.auto_create_lead) {
    return false;
  }
  
  const minSeverity = settings.min_severity || 75;
  const minProb = settings.min_claim_probability || 0.7;
  
  return severity >= minSeverity && claimProbability >= minProb;
}

/**
 * Calculate priority score based on admin settings and event data
 */
export function calculatePriorityScore(
  severity: number,
  claimProbability: number,
  incomeBand?: string | null
): number {
  // Base score from severity (0-100)
  let score = Math.min(100, Math.max(0, severity));
  
  // Boost for high claim probability
  if (claimProbability >= 0.8) {
    score += 10;
  } else if (claimProbability >= 0.7) {
    score += 5;
  }
  
  // Boost for high-income areas
  if (incomeBand) {
    const band = incomeBand.toLowerCase();
    if (band.includes('top 10') || band.includes('9') || band.includes('8')) {
      score += 10;
    } else if (band.includes('top 25') || band.includes('7')) {
      score += 5;
    }
  }
  
  return Math.min(100, Math.round(score));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function parseTimeline(timeline: unknown): TimelineEntry[] {
  if (!timeline) return [];
  if (Array.isArray(timeline)) return timeline as TimelineEntry[];
  return [];
}

