'use client';

import { useMemo, useState, useEffect } from 'react';
import { getLossEventsWithEnrichment, updateLossEvent, getStatesFromDemographics, type EnrichedLossEvent } from '@/lib/data';

export default function LossFeedPage() {
  const [events, setEvents] = useState<EnrichedLossEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  
  // Existing filters
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [severityThreshold, setSeverityThreshold] = useState<number>(0);
  const [incomeBandFilter, setIncomeBandFilter] = useState<string>('all');
  const [probThreshold, setProbThreshold] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortDesc, setSortDesc] = useState<boolean>(true);
  const [search, setSearch] = useState('');
  
  // New filters
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');
  const [incomePercentileFilter, setIncomePercentileFilter] = useState<number>(0);
  const [phoneFilter, setPhoneFilter] = useState<string>('all');
  const [minPhoneConfidence, setMinPhoneConfidence] = useState<number>(0);

  useEffect(() => {
    async function loadStates() {
      try {
        const states = await getStatesFromDemographics();
        setAvailableStates(states);
      } catch (err) {
        console.error('Error loading states:', err);
      }
    }
    loadStates();
  }, []);

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoading(true);
        const data = await getLossEventsWithEnrichment();
        setEvents(data);
      } catch (error) {
        console.error('Error loading loss events:', error);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  const filtered = useMemo(() => {
    const lowered = search.trim().toLowerCase();

    const base = events.filter((e) => {
      // Search filter
      if (lowered) {
        const property = Array.isArray(e.loss_property) ? e.loss_property[0] : e.loss_property;
        const matchesSearch =
          e.zip.toLowerCase().includes(lowered) ||
          e.event_type.toLowerCase().includes(lowered) ||
          (e.property_type || '').toLowerCase().includes(lowered) ||
          (property?.address || '').toLowerCase().includes(lowered) ||
          (property?.owner_name || '').toLowerCase().includes(lowered);
        if (!matchesSearch) return false;
      }
      
      // Event type filter
      if (eventFilter !== 'all' && e.event_type !== eventFilter) return false;
      
      // Severity filter
      if (e.severity < severityThreshold) return false;
      
      // Old income band filter (kept for backward compatibility)
      if (
        incomeBandFilter !== 'all' &&
        (e.income_band || '').toLowerCase() !== incomeBandFilter
      )
        return false;
      
      // Claim probability filter
      if ((e.claim_probability || 0) * 100 < probThreshold) return false;
      
      // Status filter
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      
      // State filter
      if (stateFilter !== 'all' && e.state_code !== stateFilter) return false;
      
      // Property type filter
      if (propertyTypeFilter !== 'all' && e.property_type !== propertyTypeFilter) return false;
      
      // Income percentile filter
      if (incomePercentileFilter > 0) {
        const demographic = Array.isArray(e.zip_demographic) ? e.zip_demographic[0] : e.zip_demographic;
        if (!demographic || (demographic.income_percentile || 0) < incomePercentileFilter) return false;
      }
      
      // Phone filter
      const property = Array.isArray(e.loss_property) ? e.loss_property[0] : e.loss_property;
      if (phoneFilter === 'yes' && !property?.phone_primary) return false;
      if (phoneFilter === 'no' && property?.phone_primary) return false;
      
      // Phone confidence filter
      if (minPhoneConfidence > 0) {
        if (!property?.phone_primary || (property.phone_confidence || 0) < minPhoneConfidence) return false;
      }
      
      return true;
    });

    return base.sort((a, b) =>
      sortDesc
        ? b.event_timestamp.localeCompare(a.event_timestamp)
        : a.event_timestamp.localeCompare(b.event_timestamp),
    );
  }, [
    events,
    search,
    eventFilter,
    severityThreshold,
    incomeBandFilter,
    probThreshold,
    statusFilter,
    stateFilter,
    propertyTypeFilter,
    incomePercentileFilter,
    phoneFilter,
    minPhoneConfidence,
    sortDesc,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading loss events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-neutral-200">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <header className="card">
          <h1 className="card-header">Loss feed (internal)</h1>
          <p className="subtext">
            Data-dense view of ingested loss events, scoring, and routing
            status.
          </p>
        </header>

        <section className="card space-y-3">
          <input
            type="text"
            placeholder="Search address, ZIP, owner, event..."
            className="w-full p-2 rounded-md bg-neutral-800 border border-neutral-700 mb-4"
            onChange={(e) => setSearch(e.target.value.toLowerCase())}
          />
          <h2 className="text-xs font-medium text-neutral-300">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-neutral-400">State</label>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              >
                <option value="all">All States</option>
                {availableStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-neutral-400">Event type</label>
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              >
                <option value="all">All</option>
                <option value="Hail">Hail</option>
                <option value="Wind">Wind</option>
                <option value="Fire">Fire</option>
                <option value="Freeze">Freeze</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-neutral-400">Property Type</label>
              <select
                value={propertyTypeFilter}
                onChange={(e) => setPropertyTypeFilter(e.target.value)}
                className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              >
                <option value="all">All</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-neutral-400">
                Severity threshold (score)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={severityThreshold}
                onChange={(e) => setSeverityThreshold(Number(e.target.value))}
                className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-neutral-400">Income Percentile ≥</label>
              <input
                type="number"
                min={0}
                max={100}
                value={incomePercentileFilter}
                onChange={(e) => setIncomePercentileFilter(Number(e.target.value))}
                className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                placeholder="0-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-neutral-400">
                Claim probability ≥ (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={probThreshold}
                onChange={(e) => setProbThreshold(Number(e.target.value))}
                className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-neutral-400">Has Phone</label>
              <select
                value={phoneFilter}
                onChange={(e) => setPhoneFilter(e.target.value)}
                className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              >
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-neutral-400">Phone Confidence ≥</label>
              <input
                type="number"
                min={0}
                max={100}
                value={minPhoneConfidence}
                onChange={(e) => setMinPhoneConfidence(Number(e.target.value))}
                className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                placeholder="0-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-neutral-400">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              >
                <option value="all">All</option>
                <option value="Unreviewed">Unreviewed</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Converted">Converted</option>
              </select>
            </div>
          </div>
        </section>

        <section className="card p-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
            <h2 className="text-xs font-medium text-neutral-300">
              Loss feed results
            </h2>
            <button
              type="button"
              onClick={() => setSortDesc((v) => !v)}
              className="text-[11px] text-neutral-400 hover:text-neutral-100"
            >
              Sort by timestamp {sortDesc ? '▼' : '▲'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sapphire-800 text-neutral-300 border-b border-slateglass-700 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    State
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Event type
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Property Type
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Severity
                  </th>
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
                  <th className="px-4 py-3 text-left font-semibold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slateglass-800">
                {filtered.map((row) => {
                  const property = Array.isArray(row.loss_property) ? row.loss_property[0] : row.loss_property;
                  const demographic = Array.isArray(row.zip_demographic) ? row.zip_demographic[0] : row.zip_demographic;
                  const phoneConfidence = property?.phone_confidence || 0;
                  const hasPhone = !!property?.phone_primary;
                  const phoneDisplay = hasPhone && phoneConfidence >= 60 
                    ? property?.phone_primary 
                    : hasPhone && phoneConfidence < 60 
                    ? '***-***-****' 
                    : '—';
                  
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-sapphire-700/40 transition"
                    >
                      <td className="px-4 py-3 align-top text-white whitespace-nowrap text-xs">
                        {new Date(row.event_timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 align-top text-neutral-200">
                        {row.state_code || '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-neutral-200 max-w-xs truncate">
                        {property?.address || '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-neutral-200">
                        {property?.owner_name || '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-white">
                        {row.event_type}
                      </td>
                      <td className="px-4 py-3 align-top text-neutral-200">
                        {row.is_commercial ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900 text-blue-200">
                            Commercial
                          </span>
                        ) : row.property_type === 'residential' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-200">
                            Residential
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-neutral-200">
                        {row.severity}
                      </td>
                      <td className="px-4 py-3 align-top text-neutral-200">
                        {demographic?.income_percentile ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            demographic.income_percentile >= 90 
                              ? 'bg-yellow-900 text-yellow-200' 
                              : demographic.income_percentile >= 75 
                              ? 'bg-orange-900 text-orange-200' 
                              : 'bg-neutral-800 text-neutral-300'
                          }`}>
                            {demographic.income_percentile}%
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
                        {((row.claim_probability || 0) * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 align-top text-neutral-200">
                        {row.status}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <a
                          href={`/property/${row.id}`}
                          className="text-[11px] font-medium text-neutral-100 underline-offset-2 hover:underline"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-3 py-4 text-center text-xs text-neutral-500"
                    >
                      No rows match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-neutral-800 text-xs text-neutral-400">
            <p>
              <strong>Note:</strong> Contact data sourced from public records; accuracy may vary. 
              Phone numbers with confidence &lt; 60% are masked for privacy.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}


