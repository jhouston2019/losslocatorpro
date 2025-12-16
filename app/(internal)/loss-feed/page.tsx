'use client';

import { useMemo, useState, useEffect } from 'react';
import { getLossEvents, updateLossEventStatus } from '@/lib/data';
import type { LossEvent } from '@/lib/database.types';

export default function LossFeedPage() {
  const [events, setEvents] = useState<LossEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [severityThreshold, setSeverityThreshold] = useState<number>(0);
  const [incomeBandFilter, setIncomeBandFilter] = useState<string>('all');
  const [probThreshold, setProbThreshold] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortDesc, setSortDesc] = useState<boolean>(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoading(true);
        const data = await getLossEvents();
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
      if (lowered) {
        const matchesSearch =
          e.zip.toLowerCase().includes(lowered) ||
          e.event_type.toLowerCase().includes(lowered) ||
          (e.property_type || '').toLowerCase().includes(lowered);
        if (!matchesSearch) return false;
      }
      if (eventFilter !== 'all' && e.event_type !== eventFilter) return false;
      if (e.severity < severityThreshold) return false;
      if (
        incomeBandFilter !== 'all' &&
        (e.income_band || '').toLowerCase() !== incomeBandFilter
      )
        return false;
      if ((e.claim_probability || 0) * 100 < probThreshold) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
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
            placeholder="Search address, ZIP, event..."
            className="w-full p-2 rounded-md bg-neutral-800 border border-neutral-700 mb-4"
            onChange={(e) => setSearch(e.target.value.toLowerCase())}
          />
          <h2 className="text-xs font-medium text-neutral-300">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
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
              <label className="text-neutral-400">ZIP income band</label>
              <select
                value={incomeBandFilter}
                onChange={(e) => setIncomeBandFilter(e.target.value)}
                className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              >
                <option value="all">All</option>
                <option value="top 10%">Top 10%</option>
                <option value="top 25%">Top 25%</option>
                <option value="median">Median</option>
              </select>
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
                    Event type
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Severity score
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">ZIP</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Income band
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Property type
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Claim probability
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Internal priority
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Property
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slateglass-800">
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-sapphire-700/40 transition"
                  >
                    <td className="px-4 py-3 align-top text-white whitespace-nowrap">
                      {new Date(row.event_timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 align-top text-white">
                      {row.event_type}
                    </td>
                    <td className="px-4 py-3 align-top text-neutral-200">
                      {row.severity}
                    </td>
                    <td className="px-4 py-3 align-top text-neutral-200">
                      {row.zip}
                    </td>
                    <td className="px-4 py-3 align-top text-neutral-200">
                      {row.income_band || '—'}
                    </td>
                    <td className="px-4 py-3 align-top text-neutral-200">
                      {row.property_type || '—'}
                    </td>
                    <td className="px-4 py-3 align-top text-neutral-200">
                      {((row.claim_probability || 0) * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 align-top text-neutral-200">
                      {row.priority_score || '—'}
                    </td>
                    <td className="px-4 py-3 align-top text-neutral-200">
                      {row.status}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <a
                        href={`/property/${row.id}`}
                        className="text-[11px] font-medium text-neutral-100 underline-offset-2 hover:underline"
                      >
                        View property
                      </a>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-4 text-center text-xs text-neutral-500"
                    >
                      No rows match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}


