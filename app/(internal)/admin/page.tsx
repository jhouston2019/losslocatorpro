export default function AdminPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <header className="border border-neutral-800 bg-neutral-900 px-4 py-3">
          <h1 className="text-sm font-semibold text-neutral-50">Admin</h1>
          <p className="mt-1 text-xs text-neutral-400">
            Internal configuration for users, event sources, thresholds, and
            automation.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3">
            <div className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-2">
              <h2 className="text-xs font-medium text-neutral-300">
                User management
              </h2>
              <p className="text-neutral-400">
                Manage internal console access and roles.
              </p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="new.user@internal"
                    className="flex-1 rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                  <button
                    type="button"
                    className="rounded-sm border border-neutral-700 bg-neutral-100 px-3 py-1.5 text-[11px] font-medium text-neutral-900 hover:bg-white"
                  >
                    Invite
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-2">
              <h2 className="text-xs font-medium text-neutral-300">
                Event source configuration
              </h2>
              <p className="text-neutral-400">
                Configure incoming hail, wind, fire, freeze and precipitation
                feeds.
              </p>
              <ul className="mt-1 space-y-1 text-neutral-300">
                <li>• Hail + wind grid (enabled)</li>
                <li>• Fire incidents (enabled)</li>
                <li>• Freeze &amp; precipitation (enabled)</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <div className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-2">
              <h2 className="text-xs font-medium text-neutral-300">
                API keys
              </h2>
              <p className="text-neutral-400">
                Rotate keys used by ingestion jobs and internal tools.
              </p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Create new API key"
                    className="flex-1 rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                  <button
                    type="button"
                    className="rounded-sm border border-neutral-700 bg-neutral-100 px-3 py-1.5 text-[11px] font-medium text-neutral-900 hover:bg-white"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-2">
              <h2 className="text-xs font-medium text-neutral-300">
                Threshold settings
              </h2>
              <p className="text-neutral-400">
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
                    className="mt-1 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
                <div>
                  <label className="text-neutral-400">
                    Minimum severity score
                  </label>
                  <input
                    type="number"
                    defaultValue={75}
                    className="mt-1 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
              </div>
            </div>

            <div className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-2">
              <h2 className="text-xs font-medium text-neutral-300">
                Trigger rules &amp; exports
              </h2>
              <p className="text-neutral-400">
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


