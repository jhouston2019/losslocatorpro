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
      <div className="min-h-screen flex items-center justify-center bg-[#1A1D29]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9FF] mx-auto mb-4"></div>
          <p className="text-[#B8BFCC]">Loading loss events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1D29]">
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
            className="w-full p-3 rounded border border-[#3A4556] bg-[#1A1D29] text-white placeholder-[#8B92A3] focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF] mb-4 transition-all duration-200"
            onChange={(e) => setSearch(e.target.value.toLowerCase())}
          />
          <h2 className="text-xs font-medium text-white">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[#B8BFCC] font-medium">State</label>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full rounded border border-[#3A4556] bg-[#1A1D29] px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
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
              <label className="text-[#B8BFCC] font-medium">Event type</label>
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="w-full rounded border border-[#3A4556] bg-[#1A1D29] px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
              >
                <option value="all">All</option>
                <option value="Hail">Hail</option>
                <option value="Wind">Wind</option>
                <option value="Fire">Fire</option>
                <option value="Freeze">Freeze</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[#B8BFCC] font-medium">Property Type</label>
              <select
                value={propertyTypeFilter}
                onChange={(e) => setPropertyTypeFilter(e.target.value)}
                className="w-full rounded border border-[#3A4556] bg-[#1A1D29] px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
              >
                <option value="all">All</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[#B8BFCC] font-medium">
                Severity threshold (score)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={severityThreshold}
                onChange={(e) => setSeverityThreshold(Number(e.target.value))}
                className="w-full rounded border border-[#3A4556] bg-[#1A1D29] px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#B8BFCC] font-medium">Income Percentile ≥</label>
              <input
                type="number"
                min={0}
                max={100}
                value={incomePercentileFilter}
                onChange={(e) => setIncomePercentileFilter(Number(e.target.value))}
                className="w-full rounded border border-[#3A4556] bg-[#1A1D29] px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
                placeholder="0-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#B8BFCC] font-medium">
                Claim probability ≥ (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={probThreshold}
                onChange={(e) => setProbThreshold(Number(e.target.value))}
                className="w-full rounded border border-[#3A4556] bg-[#1A1D29] px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#B8BFCC] font-medium">Has Phone</label>
              <select
                value={phoneFilter}
                onChange={(e) => setPhoneFilter(e.target.value)}
                className="w-full rounded border border-[#3A4556] bg-[#1A1D29] px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
              >
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[#B8BFCC] font-medium">Phone Confidence ≥</label>
              <input
                type="number"
                min={0}
                max={100}
                value={minPhoneConfidence}
                onChange={(e) => setMinPhoneConfidence(Number(e.target.value))}
                className="w-full rounded border border-[#3A4556] bg-[#1A1D29] px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
                placeholder="0-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#B8BFCC] font-medium">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded border border-[#3A4556] bg-[#1A1D29] px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
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
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#3A4556]">
            <h2 className="text-sm font-semibold text-white">
              Loss Feed Results
            </h2>
            <button
              type="button"
              onClick={() => setSortDesc((v) => !v)}
              className="text-xs text-[#B8BFCC] hover:text-[#00D9FF] transition-colors duration-200"
            >
              Sort by timestamp {sortDesc ? '▼' : '▲'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#1A1D29] text-[#B8BFCC] border-b border-[#3A4556] sticky top-0">
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
              <tbody className="divide-y divide-[#2F3441]">
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
                  const severityColor = row.severity >= 75 ? 'border-[#FF3B5C]' : row.severity >= 50 ? 'border-[#FF8A3D]' : 'border-[#00E5A0]';
                  
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-[#3A4556]/30 transition border-l-2 ${severityColor}`}
                    >
                      <td className="px-4 py-3 align-top text-white whitespace-nowrap text-xs">
                        {new Date(row.event_timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC]">
                        {row.state_code || '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC] max-w-xs truncate">
                        {property?.address || '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC]">
                        {property?.owner_name || '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-white font-medium">
                        {row.event_type}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC]">
                        {row.is_commercial ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30">
                            Commercial
                          </span>
                        ) : row.property_type === 'residential' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#00E5A0]/20 text-[#00E5A0] border border-[#00E5A0]/30">
                            Residential
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-white font-semibold">
                        {row.severity}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC]">
                        {demographic?.income_percentile ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                            demographic.income_percentile >= 90 
                              ? 'bg-[#FFB020]/20 text-[#FFB020] border-[#FFB020]/30' 
                              : demographic.income_percentile >= 75 
                              ? 'bg-[#FF8A3D]/20 text-[#FF8A3D] border-[#FF8A3D]/30' 
                              : 'bg-[#8B92A3]/20 text-[#8B92A3] border-[#8B92A3]/30'
                          }`}>
                            {demographic.income_percentile}%
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
                        {((row.claim_probability || 0) * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC]">
                        {row.status}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <a
                          href={`/property/${row.id}`}
                          className="text-xs font-medium text-[#00D9FF] hover:text-[#00B8D9] underline-offset-2 hover:underline transition-colors duration-200"
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
                      className="px-3 py-4 text-center text-sm text-[#8B92A3]"
                    >
                      No rows match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#3A4556] text-xs text-[#8B92A3] bg-[#1A1D29]">
            <p>
              <strong className="text-[#B8BFCC]">Note:</strong> Contact data sourced from public records; accuracy may vary. 
              Phone numbers with confidence &lt; 60% are masked for privacy.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}


