'use client';

import { useMemo, useState } from 'react';
import NavBar from '../components/Navbar';
import { lossEvents } from '@/app/lib/mockData';

export default function LossFeedPage() {
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [severityThreshold, setSeverityThreshold] = useState<number>(0);
  const [incomeBandFilter, setIncomeBandFilter] = useState<string>('all');
  const [probThreshold, setProbThreshold] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortDesc, setSortDesc] = useState<boolean>(true);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const lowered = search.trim().toLowerCase();

    const base = lossEvents.filter((e) => {
      if (lowered) {
        const matchesSearch =
          e.zip.toLowerCase().includes(lowered) ||
          e.event.toLowerCase().includes(lowered) ||
          e.propertyType.toLowerCase().includes(lowered);
        if (!matchesSearch) return false;
      }
      if (eventFilter !== 'all' && e.event !== eventFilter) return false;
      if (e.severity < severityThreshold) return false;
      if (
        incomeBandFilter !== 'all' &&
        e.incomeBand.toLowerCase() !== incomeBandFilter
      )
        return false;
      if (e.claimProbability * 100 < probThreshold) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      return true;
    });

    return base.sort((a, b) =>
      sortDesc
        ? b.timestamp.localeCompare(a.timestamp)
        : a.timestamp.localeCompare(b.timestamp),
    );
  }, [
    search,
    eventFilter,
    severityThreshold,
    incomeBandFilter,
    probThreshold,
    statusFilter,
    sortDesc,
  ]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <header className="border border-neutral-800 bg-neutral-900 px-4 py-3">
          <h1 className="text-sm font-semibold text-neutral-50">
            Loss feed (internal)
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            Data-dense view of ingested loss events, scoring, and routing
            status.
          </p>
        </header>

        <section className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-3">
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

        <section className="border border-neutral-800 bg-neutral-900">
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
            <table className="min-w-full text-xs text-neutral-100">
              <thead className="bg-neutral-950 sticky top-0 border-b border-neutral-800">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">
                    Timestamp
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Event type
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Severity score
                  </th>
                  <th className="px-3 py-2 text-left font-medium">ZIP</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Income band
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Property type
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Claim probability
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Internal priority
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Property
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-neutral-800 hover:bg-neutral-900/60"
                  >
                    <td className="px-3 py-2 align-top text-neutral-200 whitespace-nowrap">
                      row.timestamp
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-200">
                      {row.event}
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-200">
                      {row.severity}
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-200">
                      {row.zip}
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-200">
                      {row.incomeBand}
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-200">
                      {row.propertyType}
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-200">
                      {(row.claimProbability * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-200">
                      {row.priorityScore}
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-200">
                      {row.status}
                    </td>
                    <td className="px-3 py-2 align-top">
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


