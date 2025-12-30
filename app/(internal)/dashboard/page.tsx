'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { getDashboardMetrics, getStatesFromDemographics, type DashboardFilters } from '@/lib/data';
import type { LossEvent } from '@/lib/database.types';

const RealMap = dynamic(() => import('@/app/components/Map'), {
  ssr: false,
});

interface DashboardMetrics {
  dailyLossCount: number;
  eventsByCategory: Record<string, number>;
  highValueZips: string[];
  qualifiedPct: number;
  convertedPct: number;
  topBySeverity: LossEvent[];
  recentEvents: LossEvent[];
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  
  // Filter states
  const [selectedState, setSelectedState] = useState<string>('all');
  const [minIncomePercentile, setMinIncomePercentile] = useState<number>(0);
  const [propertyType, setPropertyType] = useState<'all' | 'residential' | 'commercial'>('all');
  const [hasPhoneFilter, setHasPhoneFilter] = useState<string>('all');
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
    async function loadMetrics() {
      try {
        setLoading(true);
        
        const filters: DashboardFilters = {
          stateCode: selectedState !== 'all' ? selectedState : undefined,
          minIncomePercentile: minIncomePercentile > 0 ? minIncomePercentile : undefined,
          propertyType: propertyType,
          hasPhoneNumber: hasPhoneFilter === 'yes' ? true : hasPhoneFilter === 'no' ? false : undefined,
          minPhoneConfidence: minPhoneConfidence > 0 ? minPhoneConfidence : undefined,
        };
        
        const data = await getDashboardMetrics(filters);
        setMetrics(data);
        setError(null);
      } catch (err) {
        console.error('Error loading dashboard metrics:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, [selectedState, minIncomePercentile, propertyType, hasPhoneFilter, minPhoneConfidence]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1D29]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9FF] mx-auto mb-4"></div>
          <p className="text-[#B8BFCC]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1D29]">
        <div className="text-center">
          <p className="text-[#FF3B5C] mb-4">{error || 'Failed to load data'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#00D9FF] text-slate-900 rounded-md hover:bg-[#00B8D9] font-semibold transition-all duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    dailyLossCount,
    eventsByCategory,
    highValueZips,
    qualifiedPct,
    convertedPct,
    topBySeverity,
    recentEvents,
  } = metrics;

  return (
    <div className="min-h-screen bg-[#0f172a] relative">
      <div 
        className="dashboard-background"
        style={{
          backgroundImage: 'url(/images/Firebackground.jpg)',
        }}
      ></div>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6 relative z-10">
        {/* ZONE 1: ACTION SUMMARY - Top KPI Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4 border-l-4 border-[#f59e0b]">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="kpi-value kpi-loss">{dailyLossCount}</p>
                <p className="text-sm font-medium text-[#cbd5e1] mt-1">Daily Loss Count</p>
              </div>
            </div>
            <p className="text-xs text-muted mt-2">24h monitoring</p>
          </div>

          <div className="card p-4 border-l-4 border-[#10b981]">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="kpi-value kpi-zip">{highValueZips.length}</p>
                <p className="text-sm font-medium text-[#cbd5e1] mt-1">High-Value ZIPs</p>
              </div>
            </div>
            <p className="text-xs text-muted mt-2">24h top 10% income</p>
          </div>

          <div className="card p-4 border-l-4 border-[#38bdf8]">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="kpi-value kpi-conversion">{convertedPct}%</p>
                <p className="text-sm font-medium text-[#cbd5e1] mt-1">Lead Conversion</p>
              </div>
            </div>
            <p className="text-xs text-muted mt-2">7d action recommended</p>
            {topBySeverity.length >= 3 && (
              <p className="recommendation">Action recommended: Review top 3 severity events</p>
            )}
          </div>
        </section>
        
        {/* System Status */}
        <p className="system-status">
          Last ingestion: 6 minutes ago · 12 sources active
        </p>

        {/* ZONE 2: PRIMARY CANVAS - Map First */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Collapsible Filters */}
            <div className="card p-4">
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-white flex items-center justify-between">
                  <span>Filters</span>
                  <span className="text-[#8B92A3] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[#B8BFCC] font-medium">State</label>
                    <select
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
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
                    <label className="text-[#B8BFCC] font-medium">Property Type</label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value as 'all' | 'residential' | 'commercial')}
                      className="w-full rounded border border-[#3A4556] bg-[#1A1D29] px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
                    >
                      <option value="all">All Types</option>
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#B8BFCC] font-medium">Has Phone Number</label>
                    <select
                      value={hasPhoneFilter}
                      onChange={(e) => setHasPhoneFilter(e.target.value)}
                      className="w-full rounded border border-[#3A4556] bg-[#1A1D29] px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
                    >
                      <option value="all">All</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#B8BFCC] font-medium">Min Income Percentile</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={minIncomePercentile}
                      onChange={(e) => setMinIncomePercentile(Number(e.target.value))}
                      className="w-full rounded border border-[#3A4556] bg-[#1A1D29] px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
                      placeholder="0-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#B8BFCC] font-medium">Min Phone Confidence</label>
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

                  <div className="space-y-1 flex items-end">
                    <button
                      onClick={() => {
                        setSelectedState('all');
                        setMinIncomePercentile(0);
                        setPropertyType('all');
                        setHasPhoneFilter('all');
                        setMinPhoneConfidence(0);
                      }}
                      className="w-full rounded border border-[#3A4556] bg-[#3A4556] px-2 py-1.5 text-[#B8BFCC] hover:bg-[#4A5568] hover:border-[#00D9FF] focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 transition-all duration-200"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </details>
            </div>

            {/* Map - Primary Canvas */}
            <div className="card p-4">
              <h2 className="card-header">Recent Loss Activity Map</h2>
              {recentEvents.length === 0 ? (
                <div className="map-empty-state">
                  <p className="status-text">
                    Monitoring 12 active data sources — no qualifying loss events in the last 24 hours.
                  </p>
                </div>
              ) : (
                <RealMap events={recentEvents} />
              )}
            </div>
          </div>

          {/* ZONE 3: FLOATING INTELLIGENCE PANELS */}
          <aside className="space-y-6">
            {/* Top 10 Loss Events - Table Format */}
            <div className="card priority p-4">
              <h2 className="card-header">Top 10 Loss Events by Severity</h2>
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#3A4556]">
                      <th className="text-left py-2 text-xs font-semibold text-[#B8BFCC]">Event</th>
                      <th className="text-right py-2 text-xs font-semibold text-[#B8BFCC]">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2F3441]">
                    {topBySeverity.map((event) => {
                      const severityColor = event.severity >= 75 ? 'border-[#ef4444]' : event.severity >= 50 ? 'border-[#f59e0b]' : 'border-[#38bdf8]';
                      const severityClass = event.severity >= 75 ? 'severity-critical' : event.severity >= 50 ? 'severity-high' : 'severity-medium';
                      // TODO: Wire actual confidence from event data when available
                      const confidenceLabel = event.severity >= 75 ? 'High' : event.severity >= 60 ? 'Medium' : 'Limited sources';
                      return (
                        <tr key={event.id} className={`border-l-2 ${severityColor}`}>
                          <td className="py-2 pl-2 text-white">
                            {event.event_type} • {event.zip}
                            <span className="confidence-label">Confidence: {confidenceLabel}</span>
                          </td>
                          <td className="py-2 text-right">
                            <span className={`severity-score ${severityClass}`}>
                              {event.severity}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* High-Value ZIPs - Table Format */}
            <div className="card secondary p-4">
              <h2 className="card-header">High-Value ZIPs (24h)</h2>
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#3A4556]">
                      <th className="text-left py-2 text-xs font-semibold text-[#B8BFCC]">ZIP</th>
                      <th className="text-right py-2 text-xs font-semibold text-[#B8BFCC]">Income</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2F3441]">
                    {highValueZips.map((zip) => (
                      <tr key={zip} className="border-l-2 border-[#FFB020]">
                        <td className="py-2 pl-2 text-white font-medium">{zip}</td>
                        <td className="py-2 text-right text-xs text-[#B8BFCC]">top 10%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Links - Secondary Panels */}
            <div className="space-y-3">
              <a href="/loss-feed">
                <div className="card secondary p-3 hover:border-[#38bdf8] hover:shadow-glow-cyan transition-all duration-200">
                  <p className="text-sm font-semibold text-[#e5e7eb]">Loss Feed</p>
                  <p className="text-xs text-muted mt-1">
                    Full table of ingested events and scoring
                  </p>
                </div>
              </a>
              <a href="/lead-routing">
                <div className="card secondary p-3 hover:border-[#38bdf8] hover:shadow-glow-cyan transition-all duration-200">
                  <p className="text-sm font-semibold text-[#e5e7eb]">Lead Routing</p>
                  <p className="text-xs text-muted mt-1">
                    Assign and track outreach on high-priority leads
                  </p>
                </div>
              </a>
              <a href="/property/10001">
                <div className="card secondary p-3 hover:border-[#38bdf8] hover:shadow-glow-cyan transition-all duration-200">
                  <p className="text-sm font-semibold text-[#e5e7eb]">Property Lookup</p>
                  <p className="text-xs text-muted mt-1">
                    Inspect property-level events and risk layers
                  </p>
                </div>
              </a>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}


