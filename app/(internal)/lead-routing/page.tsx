'use client';

import { useMemo, useState } from 'react';
import { lossEvents, propertyIntel, routingQueue } from '@/app/lib/mockData';

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
};

export default function LeadRoutingPage() {
  const [activeStatus, setActiveStatus] = useState<LeadStatus | 'All'>('All');
  const [panelLeadId, setPanelLeadId] = useState<string | null>(null);
  const [assigneeType, setAssigneeType] = useState<string>('internal-ops');
  const [priority, setPriority] = useState<string>('High');
  const [notes, setNotes] = useState<string>('');

  const leads: Lead[] = useMemo(() => {
    return routingQueue.map((entry) => {
      const event = lossEvents.find((e) => e.id === entry.id);
      const intel = propertyIntel[entry.id];
      return {
        id: entry.id,
        address: intel?.address ?? 'Unknown address',
        event: event?.event ?? 'Unknown',
        severity: event?.severity ?? 0,
        claimProbability: event?.claimProbability ?? 0,
        assigned: entry.status !== 'Unassigned',
        status: entry.status,
      };
    });
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) =>
      activeStatus === 'All' ? true : lead.status === activeStatus,
    );
  }, [activeStatus, leads]);

  const openPanel = (id: string) => {
    setPanelLeadId(id);
  };

  const closePanel = () => {
    setPanelLeadId(null);
    setNotes('');
  };

  const handleSave = () => {
    // Placeholder internal persistence.
    closePanel();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <header className="border border-neutral-800 bg-neutral-900 px-4 py-3">
          <h1 className="text-sm font-semibold text-neutral-50">
            Lead routing
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            Internal workflow engine for assigning outreach and follow-up.
          </p>
        </header>

        <section className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-3">
          <h2 className="text-xs font-medium text-neutral-300">Status filters</h2>
          <div className="flex flex-wrap gap-2 text-[11px]">
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
        </section>

        <section className="relative border border-neutral-800 bg-neutral-900">
          <div className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between">
            <h2 className="text-xs font-medium text-neutral-300">
              Unrouted leads
            </h2>
            <span className="text-[11px] text-neutral-500">
              {filteredLeads.length} leads
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-neutral-100">
              <thead className="bg-neutral-950 border-b border-neutral-800">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">
                    Property address
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Event</th>
                  <th className="px-3 py-2 text-left font-medium">Severity</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Claim probability
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Assigned?
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-neutral-800 hover:bg-neutral-900/70"
                  >
                    <td className="px-3 py-2 align-top text-neutral-200">
                      {lead.address}
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-200">
                      {lead.event}
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-200">
                      {lead.severity}
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-200">
                      {(lead.claimProbability * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-200">
                      {lead.assigned ? 'Y' : 'N'}
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-200">
                      {lead.status}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => openPanel(lead.id)}
                        className="rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1 text-[11px] font-medium text-neutral-100 hover:border-neutral-500"
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-4 text-center text-xs text-neutral-500"
                    >
                      No leads match the selected status filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div
            className={`fixed top-0 right-0 h-full w-80 bg-neutral-900 border-l border-neutral-700 transition-transform duration-300 ${
              panelLeadId ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="p-4 space-y-4 text-xs">
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
              <select
                className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md"
                value={assigneeType}
                onChange={(e) => setAssigneeType(e.target.value)}
              >
                <option value="internal-ops">Internal Ops</option>
                <option value="adjuster-partner">Adjuster Partner</option>
                <option value="contractor-partner">Contractor Partner</option>
              </select>
              <select
                className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md text-xs text-neutral-100"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="High">High priority</option>
                <option value="Medium">Medium priority</option>
                <option value="Low">Low priority</option>
              </select>
              <textarea
                className="w-full h-32 p-2 bg-neutral-800 border border-neutral-700 rounded-md"
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSave}
                className="w-full p-2 bg-blue-600 rounded-md hover:bg-blue-500 text-xs font-medium text-neutral-50"
              >
                Save
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


