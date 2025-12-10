import NavBar from '@/app/components/Navbar';
import { lossEvents, routingQueue } from '@/app/lib/mockData';

export default function DashboardPage() {
  const dailyLossCount = lossEvents.length;

  const eventsByCategory = lossEvents.reduce<Record<string, number>>(
    (acc, e) => {
      acc[e.event] = (acc[e.event] || 0) + 1;
      return acc;
    },
    {},
  );

  const highValueZips = Array.from(
    new Set(
      lossEvents
        .filter((e) => e.incomeBand.includes('7') || e.incomeBand.includes('8'))
        .map((e) => e.zip),
    ),
  ).slice(0, 6);

  const topBySeverity = [...lossEvents]
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 10);

  const totalLeads = routingQueue.length;
  const convertedLeads = routingQueue.filter((r) => r.status === 'Converted')
    .length;
  const qualifiedLeads = routingQueue.filter(
    (r) => r.status === 'Qualified' || r.status === 'Converted',
  ).length;
  const qualifiedPct =
    totalLeads === 0 ? 0 : Math.round((qualifiedLeads / totalLeads) * 100);
  const convertedPct =
    totalLeads === 0 ? 0 : Math.round((convertedLeads / totalLeads) * 100);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="border border-neutral-800 bg-neutral-900 px-4 py-3">
              <h1 className="text-sm font-semibold text-neutral-50">
                Internal Loss Overview
              </h1>
              <p className="mt-1 text-xs text-neutral-400">
                Daily operational snapshot for loss events and lead routing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-2">
                <h2 className="text-xs font-medium text-neutral-300">
                  Daily loss count
                </h2>
                <p className="text-2xl font-semibold text-neutral-50">
                  {dailyLossCount}
                </p>
                <p className="text-[11px] text-neutral-500">
                  Events ingested in the last 24 hours across all sources.
                </p>
              </div>

              <div className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-2">
                <h2 className="text-xs font-medium text-neutral-300">
                  High-value ZIPs hit in last 24h
                </h2>
                <ul className="mt-1 space-y-1 text-xs text-neutral-200">
                  {highValueZips.map((zip) => (
                    <li
                      key={zip}
                      className="flex items-center justify-between text-neutral-300"
                    >
                      <span>{zip}</span>
                      <span className="text-[11px] text-neutral-500">
                        top 10% income
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-2">
                <h2 className="text-xs font-medium text-neutral-300">
                  Events by category (24h)
                </h2>
                <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
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

              <div className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-2">
                <h2 className="text-xs font-medium text-neutral-300">
                  Lead conversion summary (rolling 7d)
                </h2>
                <dl className="mt-1 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-400">Qualified</dt>
                    <dd className="text-neutral-100 font-medium">
                      {qualifiedPct}%
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-400">Converted</dt>
                    <dd className="text-neutral-100 font-medium">
                      {convertedPct}%
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-400">Avg. time to contact</dt>
                    <dd className="text-neutral-100 font-medium">3.2 hrs</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">
                Recent Loss Activity Map
              </h2>
              <img
                src="/map-placeholder.jpg"
                alt="Map Placeholder"
                className="w-full rounded-md opacity-80"
              />
            </div>

            <div className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-2">
              <h2 className="text-xs font-medium text-neutral-300">
                Quick navigation
              </h2>
              <div className="mt-2 grid grid-cols-1 gap-2 text-xs">
                <a
                  href="/loss-feed"
                  className="border border-neutral-700 bg-neutral-950 px-3 py-2 hover:border-neutral-500"
                >
                  <div className="font-medium text-neutral-50">Loss feed</div>
                  <div className="text-[11px] text-neutral-500">
                    Full table of ingested events and scoring.
                  </div>
                </a>
                <a
                  href="/lead-routing"
                  className="border border-neutral-700 bg-neutral-950 px-3 py-2 hover:border-neutral-500"
                >
                  <div className="font-medium text-neutral-50">
                    Lead routing
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Assign and track outreach on high-priority leads.
                  </div>
                </a>
                <a
                  href="/property/12345"
                  className="border border-neutral-700 bg-neutral-950 px-3 py-2 hover:border-neutral-500"
                >
                  <div className="font-medium text-neutral-50">
                    Property lookup
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Inspect property-level event and risk layers.
                  </div>
                </a>
              </div>
            </div>

            <div className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-2">
              <h2 className="text-xs font-medium text-neutral-300">
                Top 10 loss events by severity
              </h2>
              <ol className="mt-2 space-y-1.5 text-xs text-neutral-200">
                {topBySeverity.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between text-neutral-300"
                  >
                    <span>
                      {event.event} • {event.zip}
                    </span>
                    <span className="text-[11px] text-neutral-400">
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


