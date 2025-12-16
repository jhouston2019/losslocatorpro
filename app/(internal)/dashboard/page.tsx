'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { getDashboardMetrics } from '@/lib/data';
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

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        const data = await getDashboardMetrics();
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
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-200">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Failed to load data'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-500"
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
    <div className="min-h-screen text-neutral-200">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h1 className="card-header">Internal Loss Overview</h1>
              <p className="subtext">
                Daily operational snapshot for loss events and lead routing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="card-header">Daily loss count</h2>
                <p className="text-4xl font-bold text-white">
                  {dailyLossCount}
                </p>
                <p className="subtext mt-1">Events in last 24 hours</p>
              </div>

              <div className="card">
                <h2 className="card-header">High-value ZIPs (24h)</h2>
                <ul className="space-y-1 text-sm">
                  {highValueZips.map((zip) => (
                    <li
                      key={zip}
                      className="flex items-center justify-between text-neutral-300"
                    >
                      <span>{zip}</span>
                      <span className="text-xs text-neutral-400">
                        top 10% income
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="card-header">Events by category (24h)</h2>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {['Hail', 'Wind', 'Fire', 'Freeze'].map((label) => (
                    <div
                      key={label}
                      className="flex items-center justify-between"
                    >
                      <dt className="text-neutral-400">{label}</dt>
                      <dd className="text-neutral-100 font-medium">
                        {eventsByCategory[label] || 0}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="card">
                <h2 className="card-header">Lead conversion (7d)</h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-400">Qualified</dt>
                    <dd className="text-neutral-100 font-semibold">
                      {qualifiedPct}%
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-400">Converted</dt>
                    <dd className="text-neutral-100 font-semibold">
                      {convertedPct}%
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-400">Avg. time to contact</dt>
                    <dd className="text-neutral-100 font-semibold">3.2 hrs</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="card">
              <h2 className="card-header">Recent Loss Activity Map</h2>
              <RealMap events={recentEvents} />
            </div>

            <div className="space-y-4">
              <a href="/loss-feed">
                <div className="card px-4 py-3 hover:bg-sapphire-700/50 transition rounded-xl shadow-card !overflow-visible">
                  <p className="text-sm font-semibold text-white">Loss feed</p>
                  <p className="subtext mt-1">
                    Full table of ingested events and scoring.
                  </p>
                </div>
              </a>
              <a href="/lead-routing">
                <div className="card px-4 py-3 hover:bg-sapphire-700/50 transition rounded-xl shadow-card !overflow-visible">
                  <p className="text-sm font-semibold text-white">Lead routing</p>
                  <p className="subtext mt-1">
                    Assign and track outreach on high-priority leads.
                  </p>
                </div>
              </a>
              <a href="/property/10001">
                <div className="card px-4 py-3 hover:bg-sapphire-700/50 transition rounded-xl shadow-card !overflow-visible">
                  <p className="text-sm font-semibold text-white">
                    Property lookup
                  </p>
                  <p className="subtext mt-1">
                    Inspect property-level events and risk layers.
                  </p>
                </div>
              </a>
            </div>

            <div className="card">
              <h2 className="card-header">Top 10 loss events by severity</h2>
              <ol className="space-y-1.5 text-sm text-neutral-200">
                {topBySeverity.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between"
                  >
                    <span>
                      {event.event_type} • {event.zip}
                    </span>
                    <span className="text-xs text-neutral-400">
                      sev {event.severity}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}


