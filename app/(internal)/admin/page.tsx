export default function AdminPage() {
  return (
    <div className="min-h-screen text-neutral-200">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <header className="card">
          <h1 className="card-header">Admin</h1>
          <p className="subtext">
            Internal configuration for users, event sources, thresholds, and
            automation.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3">
            <div className="card space-y-2">
              <h2 className="card-header text-base">User management</h2>
              <p className="subtext">
                Manage internal console access and roles.
              </p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="new.user@internal"
                    className="flex-1 rounded-md border border-slateglass-700 bg-sapphire-900 px-2 py-1.5 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-sapphire-600"
                  />
                  <button
                    type="button"
                    className="rounded-md border border-slateglass-700 bg-sapphire-700 px-3 py-1.5 text-[11px] font-medium text-neutral-100 hover:bg-sapphire-600"
                  >
                    Invite
                  </button>
                </div>
              </div>
            </div>

            <div className="card space-y-2">
              <h2 className="card-header text-base">
                Event source configuration
              </h2>
              <p className="subtext">
                Configure incoming hail, wind, fire, freeze and precipitation
                feeds.
              </p>
              <ul className="mt-1 space-y-1 text-neutral-300 text-sm">
                <li>• Hail + wind grid (enabled)</li>
                <li>• Fire incidents (enabled)</li>
                <li>• Freeze &amp; precipitation (enabled)</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <div className="card space-y-2">
              <h2 className="card-header text-base">API keys</h2>
              <p className="subtext">
                Rotate keys used by ingestion jobs and internal tools.
              </p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Create new API key"
                    className="flex-1 rounded-md border border-slateglass-700 bg-sapphire-900 px-2 py-1.5 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-sapphire-600"
                  />
                  <button
                    type="button"
                    className="rounded-md border border-slateglass-700 bg-sapphire-700 px-3 py-1.5 text-[11px] font-medium text-neutral-100 hover:bg-sapphire-600"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>

            <div className="card space-y-2">
              <h2 className="card-header text-base">Threshold settings</h2>
              <p className="subtext">
                Configure scoring thresholds for claim probability and routing
                rules.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400">
                    High priority claim prob ≥
                  </label>
                  <input
                    type="number"
                    defaultValue={70}
                    className="mt-1 w-full rounded-md border border-slateglass-700 bg-sapphire-900 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-sapphire-600"
                  />
                </div>
                <div>
                  <label className="text-neutral-400">
                    Minimum severity score
                  </label>
                  <input
                    type="number"
                    defaultValue={75}
                    className="mt-1 w-full rounded-md border border-slateglass-700 bg-sapphire-900 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-sapphire-600"
                  />
                </div>
              </div>
            </div>

            <div className="card space-y-2">
              <h2 className="card-header text-base">
                Trigger rules &amp; exports
              </h2>
              <p className="subtext">
                Configure trigger logic and downstream export automation.
              </p>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-neutral-300">
                  <input
                    type="checkbox"
                    className="h-3 w-3 rounded border border-neutral-600 bg-neutral-950"
                    defaultChecked
                  />
                  Auto-create lead when severity &gt;= 85 and claim
                  probability &gt;= 70%.
                </label>
                <label className="flex items-center gap-2 text-neutral-300">
                  <input
                    type="checkbox"
                    className="h-3 w-3 rounded border border-neutral-600 bg-neutral-950"
                  />
                  Nightly export of converted leads to CRM.
                </label>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


