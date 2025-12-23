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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700">Loading loss events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <header className="card">
          <h1 className="card-header">Loss Feed</h1>
          <p className="subtext">
            Data-dense view of ingested loss events, scoring, and routing
            status.
          </p>
        </header>

        <section className="card space-y-3">
          <input
            type="text"
            placeholder="Search address, ZIP, owner, event..."
            className="w-full p-2 rounded border border-gray-300 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            onChange={(e) => setSearch(e.target.value.toLowerCase())}
          />
          <h2 className="text-xs font-medium text-slate-700">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-600 font-medium">State</label>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="text-slate-600 font-medium">Event type</label>
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="Hail">Hail</option>
                <option value="Wind">Wind</option>
                <option value="Fire">Fire</option>
                <option value="Freeze">Freeze</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 font-medium">Property Type</label>
              <select
                value={propertyTypeFilter}
                onChange={(e) => setPropertyTypeFilter(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 font-medium">
                Severity threshold (score)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={severityThreshold}
                onChange={(e) => setSeverityThreshold(Number(e.target.value))}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 font-medium">Income Percentile ≥</label>
              <input
                type="number"
                min={0}
                max={100}
                value={incomePercentileFilter}
                onChange={(e) => setIncomePercentileFilter(Number(e.target.value))}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 font-medium">
                Claim probability ≥ (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={probThreshold}
                onChange={(e) => setProbThreshold(Number(e.target.value))}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 font-medium">Has Phone</label>
              <select
                value={phoneFilter}
                onChange={(e) => setPhoneFilter(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 font-medium">Phone Confidence ≥</label>
              <input
                type="number"
                min={0}
                max={100}
                value={minPhoneConfidence}
                onChange={(e) => setMinPhoneConfidence(Number(e.target.value))}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 font-medium">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-slate-900">
              Loss Feed Results
            </h2>
            <button
              type="button"
              onClick={() => setSortDesc((v) => !v)}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              Sort by timestamp {sortDesc ? '▼' : '▲'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-slate-700 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-xs">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">
                    State
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">
                    Event type
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">
                    Property Type
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">
                    Severity
                  </th>
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
                  <th className="px-4 py-3 text-left font-semibold text-xs">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
                  const severityColor = row.severity >= 75 ? 'border-red-600' : row.severity >= 50 ? 'border-amber-500' : 'border-green-600';
                  
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-gray-50 transition border-l-2 ${severityColor}`}
                    >
                      <td className="px-4 py-3 align-top text-slate-900 whitespace-nowrap text-xs">
                        {new Date(row.event_timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">
                        {row.state_code || '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700 max-w-xs truncate">
                        {property?.address || '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">
                        {property?.owner_name || '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-900 font-medium">
                        {row.event_type}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">
                        {row.is_commercial ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            Commercial
                          </span>
                        ) : row.property_type === 'residential' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                            Residential
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-900 font-semibold">
                        {row.severity}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">
                        {demographic?.income_percentile ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            demographic.income_percentile >= 90 
                              ? 'bg-amber-50 text-amber-700' 
                              : demographic.income_percentile >= 75 
                              ? 'bg-orange-50 text-orange-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {demographic.income_percentile}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700 text-xs">
                        {hasPhone ? (
                          <div className="flex flex-col gap-0.5">
                            <span>{phoneDisplay}</span>
                            <span className="text-[10px] text-slate-500">
                              conf: {phoneConfidence}%
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">
                        {((row.claim_probability || 0) * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">
                        {row.status}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <a
                          href={`/property/${row.id}`}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
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
                      className="px-3 py-4 text-center text-sm text-slate-500"
                    >
                      No rows match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 text-xs text-slate-600 bg-gray-50">
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


