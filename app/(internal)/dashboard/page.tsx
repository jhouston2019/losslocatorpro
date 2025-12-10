import { lossEvents, routingQueue } from '@/app/lib/mockData';
import RealMap from '@/app/components/Map';

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
              <RealMap />
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
              <a href="/property/12345">
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
                      {event.event} • {event.zip}
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


