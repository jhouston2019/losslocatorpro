import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';

const MapboxMap = dynamic(() => import('../components/MapboxMap'), {
  ssr: false,
});

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [properties, setProperties] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'claim_probability',
    direction: 'desc',
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.replace('/auth');
        return;
      }
      setUser(data.user);
      setAuthLoading(false);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setDataLoading(true);

      const [{ data: eventsData }, { data: propertiesData }] = await Promise.all(
        [
          supabase
            .from('events')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(100),
          supabase
            .from('properties')
            .select('*')
            .order('claim_probability', { ascending: false })
            .limit(200),
        ]
      );

      setEvents(eventsData || []);
      setProperties(propertiesData || []);
      setDataLoading(false);
    };

    fetchData();
  }, [user]);

  const filteredProperties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = properties || [];
    if (!q) return base;
    return base.filter((p) => {
      return (
        p.address?.toLowerCase().includes(q) ||
        p.zip?.toLowerCase().includes(q) ||
        p.county?.toLowerCase().includes(q)
      );
    });
  }, [properties, searchQuery]);

  const sortedProperties = useMemo(() => {
    const list = [...filteredProperties];
    if (!sortConfig?.key) return list;
    list.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return list;
  }, [filteredProperties, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((current) => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return { key: null, direction: 'asc' };
    });
  };

  const handleExportCsv = () => {
    const rows = sortedProperties.map((p) => ({
      address: p.address,
      zip: p.zip,
      county: p.county,
      claim_probability: p.claim_probability,
    }));

    const header = ['Address', 'ZIP', 'County', 'Claim Probability'];
    const csvLines = [
      header.join(','),
      ...rows.map((row) =>
        [
          row.address?.replace(/"/g, '""') ?? '',
          row.zip ?? '',
          row.county?.replace(/"/g, '""') ?? '',
          row.claim_probability ?? '',
        ]
          .map((value) => `"${value}"`)
          .join(',')
      ),
    ];

    const blob = new Blob([csvLines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'claim-intel-properties.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="ci-card px-6 py-4 text-sm text-slate-500">
          Checking your session…
        </div>
      </div>
    );
  }

  return (
    <Layout user={user}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-50">
              Claim Intelligence Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Search properties, monitor weather and catastrophe events, and
              prioritize claims by modeled loss probability.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="ci-button-secondary"
          >
            Export properties (CSV)
          </button>
        </div>

        <div className="ci-card p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex-1">
              <label
                htmlFor="search"
                className="block text-xs font-medium text-slate-500 mb-1"
              >
                Search by address, ZIP, or county
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">
                  🔍
                </span>
                <input
                  id="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. 75001 or Harris County or 123 Main St"
                  className="block w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <div>
                <span className="font-medium text-slate-400">
                  Properties loaded
                </span>
                <div className="text-sm text-slate-900">
                  {dataLoading ? 'Loading…' : filteredProperties.length}
                </div>
              </div>
              <div>
                <span className="font-medium text-slate-400">Events loaded</span>
                <div className="text-sm text-slate-900">
                  {dataLoading ? 'Loading…' : events.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="ci-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Event & loss activity map
                </h2>
                <span className="text-xs text-slate-500">
                  Mapbox • recent hail, wind, fire, FEMA events
                </span>
              </div>
              <MapboxMap events={events} properties={properties} />
            </div>

            <div className="ci-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Affected properties
                </h2>
                <span className="text-xs text-slate-500">
                  Ranked by modeled claim probability
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-3 py-2 font-medium text-slate-500 cursor-pointer whitespace-nowrap"
                        onClick={() => handleSort('address')}
                      >
                        Address {renderSortIndicator('address')}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 font-medium text-slate-500 cursor-pointer whitespace-nowrap"
                        onClick={() => handleSort('zip')}
                      >
                        ZIP {renderSortIndicator('zip')}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 font-medium text-slate-500 whitespace-nowrap"
                      >
                        Event type
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 font-medium text-slate-500 whitespace-nowrap"
                      >
                        Event date
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 font-medium text-slate-500 cursor-pointer whitespace-nowrap"
                        onClick={() => handleSort('claim_probability')}
                      >
                        Claim probability {renderSortIndicator('claim_probability')}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 font-medium text-slate-500 whitespace-nowrap"
                      >
                        Property
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedProperties.map((property) => {
                      const probability = property.claim_probability ?? 0;
                      let badgeClass = 'ci-badge-severity-low';
                      let badgeLabel = 'Low';
                      if (probability >= 0.7) {
                        badgeClass = 'ci-badge-severity-high';
                        badgeLabel = 'High';
                      } else if (probability >= 0.4) {
                        badgeClass = 'ci-badge-severity-medium';
                        badgeLabel = 'Elevated';
                      }

                      const primaryEventId =
                        property.matched_events &&
                        Array.isArray(property.matched_events) &&
                        property.matched_events.length > 0
                          ? property.matched_events[0]
                          : null;
                      const primaryEvent = events.find(
                        (e) => e.id === primaryEventId
                      );

                      return (
                        <tr key={property.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2 align-top">
                            <div className="text-xs sm:text-sm font-medium text-slate-900">
                              {property.address}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {property.county} County
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top text-xs text-slate-600 whitespace-nowrap">
                            {property.zip}
                          </td>
                          <td className="px-3 py-2 align-top text-xs text-slate-600 whitespace-nowrap">
                            {primaryEvent?.type || '—'}
                          </td>
                          <td className="px-3 py-2 align-top text-xs text-slate-600 whitespace-nowrap">
                            {primaryEvent?.timestamp
                              ? new Date(
                                  primaryEvent.timestamp
                                ).toLocaleDateString()
                              : '—'}
                          </td>
                          <td className="px-3 py-2 align-top whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-semibold text-slate-900">
                                {(probability * 100).toFixed(0)}%
                              </span>
                              <span className={badgeClass}>{badgeLabel}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/property/${property.id}`)
                              }
                              className="text-xs font-medium text-sky-600 hover:text-sky-700"
                            >
                              View property
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {sortedProperties.length === 0 && !dataLoading && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-xs text-slate-500"
                        >
                          No properties match your filters yet.
                        </td>
                      </tr>
                    )}
                    {dataLoading && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-xs text-slate-500"
                        >
                          Loading properties and events…
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="ci-card p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">
                Recent hazard events
              </h2>
              <div className="space-y-3 max-h-[420px] overflow-y-auto">
                {events.map((event) => {
                  let severityClass = 'ci-badge-severity-low';
                  if (event.severity === 'high') {
                    severityClass = 'ci-badge-severity-high';
                  } else if (event.severity === 'medium') {
                    severityClass = 'ci-badge-severity-medium';
                  }

                  return (
                    <div
                      key={event.id}
                      className="border border-slate-100 rounded-lg px-3 py-2.5 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900">
                            {event.type}
                          </span>
                          <span className={severityClass}>
                            {String(event.severity || '').toUpperCase() ||
                              'N/A'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 whitespace-nowrap">
                          {event.timestamp
                            ? new Date(
                                event.timestamp
                              ).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })
                            : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span>
                          {event.county} County • {event.zip}
                        </span>
                        <span className="text-slate-400">
                          {event.lat?.toFixed(2)}, {event.lng?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {events.length === 0 && !dataLoading && (
                  <p className="text-xs text-slate-500">
                    No recent events have been ingested yet.
                  </p>
                )}
              </div>
            </div>

            <div className="ci-card p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-2">
                How Claim Intel prioritizes risk
              </h2>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>
                  • Combines hail, straight-line wind, fire, and FEMA incident
                  feeds.
                </li>
                <li>
                  • Scores each property by proximity, frequency, and severity
                  of events.
                </li>
                <li>
                  • Supports underwriting, triage, and proactive outreach for
                  your claims team.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}



