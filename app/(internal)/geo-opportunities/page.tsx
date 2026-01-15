'use client';

import { useMemo, useState, useEffect } from 'react';
import { 
  getZipOpportunities, 
  type ZipOpportunity,
  type GeoAggregateFilters 
} from '@/lib/geoAggregatesData';
import {
  getCandidatesForZip,
  resolveAddressesForZip,
  shouldResolveZip,
  type LossPropertyCandidate
} from '@/lib/propertyCandidatesData';

export default function GeoOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<ZipOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<LossPropertyCandidate[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);
  
  // Filters
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [minProbability, setMinProbability] = useState<number>(50);

  useEffect(() => {
    loadOpportunities();
  }, []);

  async function loadOpportunities() {
    try {
      setLoading(true);
      const data = await getZipOpportunities();
      setOpportunities(data);
    } catch (error) {
      console.error('Error loading opportunities:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolveProperties(zipCode: string) {
    setResolving(zipCode);
    
    try {
      // Check if should resolve
      const check = await shouldResolveZip(zipCode);
      
      if (!check.shouldResolve) {
        alert(`Cannot resolve: ${check.reason}`);
        setResolving(null);
        return;
      }
      
      // Trigger resolution
      const result = await resolveAddressesForZip({
        zipCode,
        triggerType: 'user_action',
        resolutionSource: 'mock_source' // In production, select appropriate source
      });
      
      if (result.success) {
        alert(`Successfully resolved ${result.propertiesInserted} properties for ZIP ${zipCode}`);
        // Load candidates for this ZIP
        await loadCandidatesForZip(zipCode);
      } else {
        alert(`Failed to resolve: ${result.error}`);
      }
    } catch (error) {
      console.error('Error resolving properties:', error);
      alert('Failed to resolve properties');
    } finally {
      setResolving(null);
    }
  }

  async function loadCandidatesForZip(zipCode: string) {
    try {
      const data = await getCandidatesForZip(zipCode);
      setCandidates(data);
      setSelectedZip(zipCode);
    } catch (error) {
      console.error('Error loading candidates:', error);
    }
  }

  const filtered = useMemo(() => {
    return opportunities.filter(opp => {
      if (stateFilter !== 'all' && opp.stateCode !== stateFilter) return false;
      if (eventTypeFilter !== 'all' && opp.eventType !== eventTypeFilter) return false;
      if (opp.avgClaimProbability < minProbability) return false;
      return true;
    });
  }, [opportunities, stateFilter, eventTypeFilter, minProbability]);

  const uniqueStates = useMemo(() => {
    return Array.from(new Set(opportunities.map(o => o.stateCode))).sort();
  }, [opportunities]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9FF] mx-auto mb-4"></div>
          <p className="text-[#B8BFCC]">Loading geographic opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <header className="card">
          <h1 className="card-header">Geographic Opportunities</h1>
          <p className="subtext">
            ZIP and county-level opportunity clusters based on active loss events.
            No addresses shown until explicitly resolved.
          </p>
        </header>

        {/* Filters */}
        <section className="card space-y-3">
          <h2 className="text-xs font-medium text-white">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[#B8BFCC] font-medium">State</label>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full rounded border border-[#3A4556] bg-[#1A1D29] px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
              >
                <option value="all">All States</option>
                {uniqueStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[#B8BFCC] font-medium">Event Type</label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
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
              <label className="text-[#B8BFCC] font-medium">
                Min Claim Probability (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={minProbability}
                onChange={(e) => setMinProbability(Number(e.target.value))}
                className="w-full rounded border border-[#3A4556] bg-[#1A1D29] px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
              />
            </div>
          </div>
        </section>

        {/* ZIP Opportunities Table */}
        <section className="card p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#3A4556]">
            <h2 className="text-sm font-semibold text-white">
              ZIP-Level Opportunity Clusters
            </h2>
            <span className="text-xs text-[#B8BFCC]">
              {filtered.length} clusters
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#1A1D29] text-[#B8BFCC] border-b border-[#3A4556] sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-xs">ZIP Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">State</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">County FIPS</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Event Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Events</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Avg Severity</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Claim Prob</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Latest Event</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2F3441]">
                {filtered.map((opp) => {
                  const probabilityColor = 
                    opp.avgClaimProbability >= 70 ? 'text-[#00E5A0]' : 
                    opp.avgClaimProbability >= 50 ? 'text-[#FFB020]' : 
                    'text-[#8B92A3]';
                  
                  return (
                    <tr
                      key={`${opp.zipCode}-${opp.eventType}`}
                      className="hover:bg-[#3A4556]/30 transition"
                    >
                      <td className="px-4 py-3 align-top text-white font-medium">
                        {opp.zipCode}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC]">
                        {opp.stateCode}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC] text-xs">
                        {opp.countyFips || '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-white">
                        {opp.eventType}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC]">
                        {opp.eventCount}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC]">
                        {opp.avgSeverity.toFixed(0)}
                      </td>
                      <td className={`px-4 py-3 align-top font-semibold ${probabilityColor}`}>
                        {opp.avgClaimProbability.toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC] text-xs whitespace-nowrap">
                        {new Date(opp.latestEvent).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <button
                          onClick={() => handleResolveProperties(opp.zipCode)}
                          disabled={resolving === opp.zipCode}
                          className="text-xs font-medium text-[#00D9FF] hover:text-[#00B8D9] underline-offset-2 hover:underline transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {resolving === opp.zipCode ? 'Resolving...' : 'Resolve Properties'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3 py-4 text-center text-sm text-[#8B92A3]"
                    >
                      No opportunities match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#3A4556] text-xs text-[#8B92A3] bg-[#1A1D29]">
            <p>
              <strong className="text-[#B8BFCC]">Note:</strong> ZIP-level opportunity clusters based on active loss events. 
              Addresses shown are candidates within affected ZIPs, not confirmed losses. 
              Click "Resolve Properties" to identify specific addresses.
            </p>
          </div>
        </section>

        {/* Property Candidates (if ZIP selected) */}
        {selectedZip && candidates.length > 0 && (
          <section className="card p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#3A4556]">
              <h2 className="text-sm font-semibold text-white">
                Property Candidates - ZIP {selectedZip}
              </h2>
              <button
                onClick={() => {
                  setSelectedZip(null);
                  setCandidates([]);
                }}
                className="text-xs text-[#B8BFCC] hover:text-[#00D9FF]"
              >
                Close
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#1A1D29] text-[#B8BFCC] border-b border-[#3A4556]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Address</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">City</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Property Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Claim Prob</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2F3441]">
                  {candidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      className="hover:bg-[#3A4556]/30 transition"
                    >
                      <td className="px-4 py-3 align-top text-white">
                        {candidate.address}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC]">
                        {candidate.city || '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC]">
                        {candidate.property_type || 'unknown'}
                      </td>
                      <td className="px-4 py-3 align-top text-[#00E5A0] font-semibold">
                        {((candidate.estimated_claim_probability || 0) * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC]">
                        {candidate.status}
                      </td>
                      <td className="px-4 py-3 align-top text-[#B8BFCC] text-xs">
                        {candidate.resolution_source}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
