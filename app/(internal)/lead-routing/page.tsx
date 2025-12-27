'use client';

import { useMemo, useState, useEffect } from 'react';
import { getRoutingQueueWithDetails, assignLead, getLossPropertyByLossId, getZipDemographicByZip } from '@/lib/data';
import type { LossEvent, Property, RoutingQueueEntry, LossProperty, ZipDemographic } from '@/lib/database.types';

type LeadStatus =
  | 'Unassigned'
  | 'Assigned'
  | 'Contacted'
  | 'Qualified'
  | 'Converted';

type Lead = {
  id: string;
  address: string;
  event: string;
  severity: number;
  claimProbability: number;
  assigned: boolean;
  status: LeadStatus;
  lossEvent?: LossEvent;
  property?: Property;
  lossProperty?: LossProperty | null;
  zipDemographic?: ZipDemographic | null;
};

export default function LeadRoutingPage() {
  const [routingData, setRoutingData] = useState<
    Array<
      RoutingQueueEntry & {
        loss_event?: LossEvent | null;
        property?: Property | null;
      }
    >
  >([]);
  const [enrichmentData, setEnrichmentData] = useState<Map<string, { lossProperty: LossProperty | null; zipDemo: ZipDemographic | null }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStatus, setActiveStatus] = useState<LeadStatus | 'All'>('All');
  const [panelLeadId, setPanelLeadId] = useState<string | null>(null);
  const [assigneeType, setAssigneeType] = useState<string>('internal-ops');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [priority, setPriority] = useState<string>('High');
  const [notes, setNotes] = useState<string>('');
  
  // New filters
  const [commercialOnly, setCommercialOnly] = useState<boolean>(false);
  const [phoneRequired, setPhoneRequired] = useState<boolean>(false);

  useEffect(() => {
    loadRoutingQueue();
  }, []);

  async function loadRoutingQueue() {
    try {
      setLoading(true);
      const data = await getRoutingQueueWithDetails();
      setRoutingData(data);
      
      // Load enrichment data for each loss event
      const enrichmentMap = new Map();
      for (const entry of data) {
        if (entry.loss_event_id) {
          const lossProperty = await getLossPropertyByLossId(entry.loss_event_id);
          const zipDemo = entry.loss_event?.zip ? await getZipDemographicByZip(entry.loss_event.zip) : null;
          enrichmentMap.set(entry.id, { lossProperty, zipDemo });
        }
      }
      setEnrichmentData(enrichmentMap);
    } catch (error) {
      console.error('Error loading routing queue:', error);
    } finally {
      setLoading(false);
    }
  }

  const leads: Lead[] = useMemo(() => {
    return routingData.map((entry) => {
      const event = entry.loss_event;
      const property = entry.property;
      const enrichment = enrichmentData.get(entry.id);
      
      return {
        id: entry.id,
        address: enrichment?.lossProperty?.address || property?.address || 'Unknown address',
        event: event?.event_type ?? 'Unknown',
        severity: event?.severity ?? 0,
        claimProbability: event?.claim_probability ?? 0,
        assigned: entry.status !== 'Unassigned',
        status: entry.status as LeadStatus,
        lossEvent: event || undefined,
        property: property || undefined,
        lossProperty: enrichment?.lossProperty || null,
        zipDemographic: enrichment?.zipDemo || null,
      };
    });
  }, [routingData, enrichmentData]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Status filter
      if (activeStatus !== 'All' && lead.status !== activeStatus) return false;
      
      // Commercial only filter
      if (commercialOnly && !lead.lossEvent?.is_commercial) return false;
      
      // Phone required filter
      if (phoneRequired && !lead.lossProperty?.phone_primary) return false;
      
      return true;
    });
  }, [activeStatus, leads, commercialOnly, phoneRequired]);

  const openPanel = (id: string) => {
    setPanelLeadId(id);
  };

  const closePanel = () => {
    setPanelLeadId(null);
    setNotes('');
  };

  const handleSave = async () => {
    if (!panelLeadId || !assignedTo.trim()) {
      alert('Please enter assignee name');
      return;
    }

    try {
      setSaving(true);
      await assignLead(
        panelLeadId,
        assignedTo,
        assigneeType as 'internal-ops' | 'adjuster-partner' | 'contractor-partner',
        priority as 'High' | 'Medium' | 'Low',
        notes
      );
      await loadRoutingQueue();
      alert('Lead assigned successfully');
      closePanel();
    } catch (error: any) {
      console.error('Error assigning lead:', error);
      const message = error?.message || 'Failed to assign lead. Please try again.';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1D29]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9FF] mx-auto mb-4"></div>
          <p className="text-[#B8BFCC]">Loading routing queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1D29]">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <header className="card">
          <h1 className="card-header">Lead Routing</h1>
          <p className="subtext">
            Internal workflow engine for assigning outreach and follow-up.
          </p>
        </header>

        <section className="card space-y-3">
          <h2 className="text-xs font-medium text-white">Filters</h2>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-[#B8BFCC]">Status:</span>
              {(['All', 'Unassigned', 'Assigned', 'Contacted', 'Qualified', 'Converted'] as const).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setActiveStatus(status as LeadStatus | 'All')}
                    className={
                      activeStatus === status
                        ? 'rounded border border-[#00D9FF] bg-[#00D9FF] px-2.5 py-1 text-slate-900 font-semibold transition-all duration-200'
                        : 'rounded border border-[#3A4556] bg-[#3A4556] px-2.5 py-1 text-[#B8BFCC] hover:bg-[#4A5568] hover:border-[#00D9FF] transition-all duration-200'
                    }
                  >
                    {status}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <label className="flex items-center gap-2 text-[#B8BFCC]">
              <input
                type="checkbox"
                checked={commercialOnly}
                onChange={(e) => setCommercialOnly(e.target.checked)}
                className="h-3 w-3 rounded border border-[#3A4556] bg-[#1A1D29] text-[#00D9FF] focus:ring-[#00D9FF]"
              />
              Commercial properties only
            </label>
            <label className="flex items-center gap-2 text-[#B8BFCC]">
              <input
                type="checkbox"
                checked={phoneRequired}
                onChange={(e) => setPhoneRequired(e.target.checked)}
                className="h-3 w-3 rounded border border-[#3A4556] bg-[#1A1D29] text-[#00D9FF] focus:ring-[#00D9FF]"
              />
              Phone number required
            </label>
          </div>
        </section>

        <section className="relative card p-0">
          <div className="px-4 py-3 border-b border-[#3A4556] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Unrouted Leads
            </h2>
            <span className="text-xs text-[#B8BFCC]">
              {filteredLeads.length} leads
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#1A1D29] text-[#B8BFCC] border-b border-[#3A4556]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-xs">
                    Property address
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Owner</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Event</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Severity</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">
                    Income %ile
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">
                    Claim Prob
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2F3441]">
                {filteredLeads.map((lead) => {
                  const phoneConfidence = lead.lossProperty?.phone_confidence || 0;
                  const hasPhone = !!lead.lossProperty?.phone_primary;
                  const phoneDisplay = hasPhone && phoneConfidence >= 60 
                    ? lead.lossProperty?.phone_primary 
                    : hasPhone && phoneConfidence < 60 
                    ? '***-***-****' 
                    : '—';
                  const severityColor = lead.severity >= 75 ? 'border-[#FF3B5C]' : lead.severity >= 50 ? 'border-[#FF8A3D]' : 'border-[#00E5A0]';
                  
                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-[#3A4556]/30 transition border-l-2 ${severityColor}`}
                    >
                      <td className="px-4 py-3 align-top text-white font-medium">
                        {lead.address}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC] text-xs">
                        {lead.lossProperty?.owner_name || '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC]">
                        {lead.lossEvent?.is_commercial ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30">
                            Commercial
                          </span>
                        ) : lead.lossEvent?.property_type === 'residential' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#00E5A0]/20 text-[#00E5A0] border border-[#00E5A0]/30">
                            Residential
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC]">
                        {lead.event}
                      </td>
                      <td className="px-4 py-3 align-top text-white font-semibold">
                        {lead.severity}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC]">
                        {lead.zipDemographic?.income_percentile ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                            lead.zipDemographic.income_percentile >= 90 
                              ? 'bg-[#FFB020]/20 text-[#FFB020] border-[#FFB020]/30' 
                              : lead.zipDemographic.income_percentile >= 75 
                              ? 'bg-[#FF8A3D]/20 text-[#FF8A3D] border-[#FF8A3D]/30' 
                              : 'bg-[#8B92A3]/20 text-[#8B92A3] border-[#8B92A3]/30'
                          }`}>
                            {lead.zipDemographic.income_percentile}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC] text-xs">
                        {hasPhone ? (
                          <div className="flex flex-col gap-0.5">
                            <span>{phoneDisplay}</span>
                            <span className="text-[10px] text-[#8B92A3]">
                              conf: {phoneConfidence}%
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC]">
                        {(lead.claimProbability * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC]">
                        {lead.status}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => openPanel(lead.id)}
                          className="rounded border border-[#3A4556] bg-[#3A4556] px-2 py-1 text-xs font-medium text-[#B8BFCC] hover:bg-[#4A5568] hover:border-[#00D9FF] transition-all duration-200"
                        >
                          Assign
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-4 text-center text-sm text-[#8B92A3]"
                    >
                      No leads match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div
            className={`fixed top-0 right-0 h-full w-96 bg-[#2D3748] border-l border-[#3A4556] p-6 transition-transform duration-300 ${
              panelLeadId ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ boxShadow: '-2px 0 8px rgba(0,0,0,0.4)' }}
          >
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg text-white">
                  Assign Lead
                </h2>
                <button
                  type="button"
                  onClick={closePanel}
                  className="text-xs text-[#B8BFCC] hover:text-[#00D9FF] transition-colors duration-200"
                >
                  Close
                </button>
              </div>
              {panelLeadId && (
                <p className="text-xs text-[#B8BFCC]">
                  Lead ID: <span className="text-white font-medium">{panelLeadId}</span>
                </p>
              )}
              <input
                type="text"
                placeholder="Assignee name"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full p-3 bg-[#1A1D29] border border-[#3A4556] rounded text-white placeholder-[#8B92A3] focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF] transition-all duration-200"
              />
              <select
                className="w-full p-3 bg-[#1A1D29] border border-[#3A4556] rounded text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF] transition-all duration-200"
                value={assigneeType}
                onChange={(e) => setAssigneeType(e.target.value)}
              >
                <option value="internal-ops">Internal Ops</option>
                <option value="adjuster-partner">Adjuster Partner</option>
                <option value="contractor-partner">Contractor Partner</option>
              </select>
              <select
                className="w-full p-3 bg-[#1A1D29] border border-[#3A4556] rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF] transition-all duration-200"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="High">High priority</option>
                <option value="Medium">Medium priority</option>
                <option value="Low">Low priority</option>
              </select>
              <textarea
                className="w-full h-32 p-3 bg-[#1A1D29] border border-[#3A4556] rounded text-white placeholder-[#8B92A3] focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF] transition-all duration-200"
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full p-3 bg-[#00D9FF] rounded hover:bg-[#00B8D9] text-xs font-semibold text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-cyan transition-all duration-200"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


