'use client';

import { useMemo, useState } from 'react';
import NavBar from '../components/NavBar';

type LeadStatus = 'Unassigned' | 'Assigned' | 'Contacted' | 'Qualified' | 'Converted';

type Lead = {
  id: string;
  address: string;
  event: string;
  severity: number;
  claimProbability: number;
  assigned: boolean;
  status: LeadStatus;
};

const LEADS: Lead[] = [
  {
    id: '1',
    address: '1234 Example Ln, Sample City, 77024',
    event: 'Hail',
    severity: 92,
    claimProbability: 0.82,
    assigned: false,
    status: 'Unassigned',
  },
  {
    id: '2',
    address: '56 Windcrest Dr, Metro, 30327',
    event: 'Wind',
    severity: 81,
    claimProbability: 0.71,
    assigned: true,
    status: 'Assigned',
  },
];

export default function LeadRoutingPage() {
  const [activeStatus, setActiveStatus] = useState<LeadStatus | 'All'>('All');
  const [panelLeadId, setPanelLeadId] = useState<string | null>(null);
  const [assigneeType, setAssigneeType] = useState<string>('internal-ops');
  const [priority, setPriority] = useState<string>('High');
  const [notes, setNotes] = useState<string>('');

  const filteredLeads = useMemo(() => {
    return LEADS.filter((lead) =>
      activeStatus === 'All' ? true : lead.status === activeStatus,
    );
  }, [activeStatus]);

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
      <NavBar />
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

          {panelLeadId && (
            <div className="fixed inset-y-0 right-0 w-full max-w-md border-l border-neutral-800 bg-neutral-950 shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
                <h3 className="text-xs font-semibold text-neutral-50">
                  Assign lead
                </h3>
                <button
                  type="button"
                  onClick={closePanel}
                  className="text-[11px] text-neutral-400 hover:text-neutral-100"
                >
                  Close
                </button>
              </div>
              <div className="px-4 py-3 space-y-3 text-xs">
                <div>
                  <p className="text-neutral-400">Lead ID</p>
                  <p className="text-neutral-100">{panelLeadId}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400">
                    Assign to
                  </label>
                  <select
                    value={assigneeType}
                    onChange={(e) => setAssigneeType(e.target.value)}
                    className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  >
                    <option value="internal-ops">Internal ops</option>
                    <option value="adjuster-partner">Adjuster partner</option>
                    <option value="contractor-partner">Contractor partner</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400">Priority level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400">Notes</label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full resize-none rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closePanel}
                    className="rounded-sm border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-[11px] font-medium text-neutral-100 hover:border-neutral-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-sm border border-neutral-700 bg-neutral-100 px-3 py-1.5 text-[11px] font-medium text-neutral-900 hover:bg-white"
                  >
                    Save assignment
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


