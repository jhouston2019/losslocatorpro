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
      <div className="min-h-screen flex items-center justify-center text-neutral-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading routing queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-neutral-200">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <header className="card">
          <h1 className="card-header">Lead routing</h1>
          <p className="subtext">
            Internal workflow engine for assigning outreach and follow-up.
          </p>
        </header>

        <section className="card space-y-3">
          <h2 className="text-xs font-medium text-neutral-300">Filters</h2>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">Status:</span>
              {(['All', 'Unassigned', 'Assigned', 'Contacted', 'Qualified', 'Converted'] as const).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setActiveStatus(status as LeadStatus | 'All')}
                    className={
                      activeStatus === status
                        ? 'rounded-sm border border-neutral-300 bg-neutral-100 px-2.5 py-1 text-neutral-900'
                        : 'rounded-sm border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-neutral-200 hover:border-neutral-500'
                    }
                  >
                    {status}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <label className="flex items-center gap-2 text-neutral-300">
              <input
                type="checkbox"
                checked={commercialOnly}
                onChange={(e) => setCommercialOnly(e.target.checked)}
                className="h-3 w-3 rounded border border-neutral-600 bg-neutral-950"
              />
              Commercial properties only
            </label>
            <label className="flex items-center gap-2 text-neutral-300">
              <input
                type="checkbox"
                checked={phoneRequired}
                onChange={(e) => setPhoneRequired(e.target.checked)}
                className="h-3 w-3 rounded border border-neutral-600 bg-neutral-950"
              />
              Phone number required
            </label>
          </div>
        </section>

        <section className="relative card p-0">
          <div className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between">
            <h2 className="text-xs font-medium text-neutral-300">
              Unrouted leads
            </h2>
            <span className="text-[11px] text-neutral-500">
              {filteredLeads.length} leads
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sapphire-800 text-neutral-300 border-b border-slateglass-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    Property address
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Owner</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Event</th>
                  <th className="px-4 py-3 text-left font-semibold">Severity</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Income %ile
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Claim Prob
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slateglass-800">
                {filteredLeads.map((lead) => {
                  const phoneConfidence = lead.lossProperty?.phone_confidence || 0;
                  const hasPhone = !!lead.lossProperty?.phone_primary;
                  const phoneDisplay = hasPhone && phoneConfidence >= 60 
                    ? lead.lossProperty?.phone_primary 
                    : hasPhone && phoneConfidence < 60 
                    ? '***-***-****' 
                    : '—';
                  
                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-sapphire-700/40 transition"
                    >
                      <td className="px-4 py-3 align-top text-white">
                        {lead.address}
                      </td>
                      <td className="px-4 py-3 align-top text-neutral-200 text-xs">
                        {lead.lossProperty?.owner_name || '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-neutral-200">
                        {lead.lossEvent?.is_commercial ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900 text-blue-200">
                            Commercial
                          </span>
                        ) : lead.lossEvent?.property_type === 'residential' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-200">
                            Residential
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-neutral-200">
                        {lead.event}
                      </td>
                      <td className="px-4 py-3 align-top text-neutral-200">
                        {lead.severity}
                      </td>
                      <td className="px-4 py-3 align-top text-neutral-200">
                        {lead.zipDemographic?.income_percentile ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            lead.zipDemographic.income_percentile >= 90 
                              ? 'bg-yellow-900 text-yellow-200' 
                              : lead.zipDemographic.income_percentile >= 75 
                              ? 'bg-orange-900 text-orange-200' 
                              : 'bg-neutral-800 text-neutral-300'
                          }`}>
                            {lead.zipDemographic.income_percentile}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-neutral-200 text-xs">
                        {hasPhone ? (
                          <div className="flex flex-col gap-0.5">
                            <span>{phoneDisplay}</span>
                            <span className="text-[10px] text-neutral-400">
                              conf: {phoneConfidence}%
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-neutral-200">
                        {(lead.claimProbability * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 align-top text-neutral-200">
                        {lead.status}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => openPanel(lead.id)}
                          className="rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1 text-[11px] font-medium text-neutral-100 hover:border-neutral-500"
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
                      className="px-3 py-4 text-center text-xs text-neutral-500"
                    >
                      No leads match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div
            className={`fixed top-0 right-0 h-full w-96 bg-sapphire-800 shadow-card border-l border-slateglass-700 p-6 transition-transform duration-300 ${
              panelLeadId ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg text-neutral-50">
                  Assign Lead
                </h2>
                <button
                  type="button"
                  onClick={closePanel}
                  className="text-[11px] text-neutral-400 hover:text-neutral-100"
                >
                  Close
                </button>
              </div>
              {panelLeadId && (
                <p className="text-[11px] text-neutral-400">
                  Lead ID: <span className="text-neutral-100">{panelLeadId}</span>
                </p>
              )}
              <input
                type="text"
                placeholder="Assignee name"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full p-2 bg-sapphire-700 border border-slateglass-700 rounded-md text-neutral-100 placeholder-neutral-400"
              />
              <select
                className="w-full p-2 bg-sapphire-700 border border-slateglass-700 rounded-md text-neutral-100"
                value={assigneeType}
                onChange={(e) => setAssigneeType(e.target.value)}
              >
                <option value="internal-ops">Internal Ops</option>
                <option value="adjuster-partner">Adjuster Partner</option>
                <option value="contractor-partner">Contractor Partner</option>
              </select>
              <select
                className="w-full p-2 bg-sapphire-700 border border-slateglass-700 rounded-md text-xs text-neutral-100"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="High">High priority</option>
                <option value="Medium">Medium priority</option>
                <option value="Low">Low priority</option>
              </select>
              <textarea
                className="w-full h-32 p-2 bg-sapphire-700 border border-slateglass-700 rounded-md text-neutral-100"
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full p-2 bg-blue-600 rounded-md hover:bg-blue-500 text-xs font-medium text-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
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


