import NavBar from '../../components/NavBar';

interface PropertyPageProps {
  params: { id: string };
}

export default function PropertyPage({ params }: PropertyPageProps) {
  const { id } = params;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <header className="flex items-center justify-between gap-3 border border-neutral-800 bg-neutral-900 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-neutral-50">
              Property intelligence
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Internal claim decision interface for property ID {id}.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/lead-routing"
              className="rounded-sm border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-100 hover:border-neutral-500"
            >
              Route lead
            </a>
            <button
              type="button"
              className="rounded-sm border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-100 hover:border-neutral-500"
            >
              Export property report (PDF)
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-3">
              <h2 className="text-xs font-medium text-neutral-300">
                Property summary
              </h2>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                <div>
                  <dt className="text-neutral-400">Address</dt>
                  <dd className="text-neutral-100">
                    1234 Example Ln, Sample City
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-400">ZIP income band</dt>
                  <dd className="text-neutral-100">Top 10%</dd>
                </div>
                <div>
                  <dt className="text-neutral-400">Property type</dt>
                  <dd className="text-neutral-100">Single family</dd>
                </div>
                <div>
                  <dt className="text-neutral-400">Estimated roof age</dt>
                  <dd className="text-neutral-100">8 years</dd>
                </div>
                <div>
                  <dt className="text-neutral-400">Current claim probability</dt>
                  <dd className="text-neutral-100">78%</dd>
                </div>
                <div>
                  <dt className="text-neutral-400">
                    Internal lead priority score
                  </dt>
                  <dd className="text-neutral-100">93</dd>
                </div>
              </dl>
            </div>

            <div className="border border-neutral-800 bg-neutral-900 px-4 py-3">
              <h2 className="text-xs font-medium text-neutral-300">
                Event timeline
              </h2>
              <ol className="mt-3 border-l border-neutral-700 pl-4 space-y-3 text-xs">
                <li>
                  <div className="relative">
                    <div className="absolute -left-4 mt-1 h-2 w-2 rounded-full bg-neutral-100" />
                    <p className="text-neutral-100">
                      2025-12-09 • Hail impact 2.0&quot; • severity 92
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      0.4 mi distance • matched to carrier exposure grid.
                    </p>
                  </div>
                </li>
                <li>
                  <div className="relative">
                    <div className="absolute -left-4 mt-1 h-2 w-2 rounded-full bg-neutral-100" />
                    <p className="text-neutral-100">
                      2025-11-14 • Straight-line wind 68mph • severity 81
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Roof-facing quadrant exposed; correlated with radar gust
                      core.
                    </p>
                  </div>
                </li>
                <li>
                  <div className="relative">
                    <div className="absolute -left-4 mt-1 h-2 w-2 rounded-full bg-neutral-100" />
                    <p className="text-neutral-100">
                      2025-07-02 • Excessive rainfall cell • severity 63
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Radar-based precipitation anomaly; surface flooding
                      possible.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-2">
              <h2 className="text-xs font-medium text-neutral-300">
                Risk layers
              </h2>
              <dl className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-400">Income layer</dt>
                  <dd className="text-neutral-100">High</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-400">Carrier density</dt>
                  <dd className="text-neutral-100">Clustered</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-400">Deductible norms</dt>
                  <dd className="text-neutral-100">1–2%</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-400">Historical payout avg</dt>
                  <dd className="text-neutral-100">$17,400</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-400">Roof age risk</dt>
                  <dd className="text-neutral-100">Elevated</dd>
                </div>
              </dl>
            </div>

            <div className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-3">
              <h2 className="text-xs font-medium text-neutral-300">
                Internal assessment
              </h2>
              <form className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-neutral-400">
                    Outreach needed (Y/N)
                  </label>
                  <select className="rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400">
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-neutral-400">
                    Lead priority score
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={93}
                    className="w-20 rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400">Internal notes</label>
                  <textarea
                    rows={3}
                    className="w-full resize-none rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400">
                    Recommended actions
                  </label>
                  <textarea
                    rows={3}
                    className="w-full resize-none rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400">
                    Contractor assignment
                  </label>
                  <input
                    type="text"
                    placeholder="Preferred vendor / notes"
                    className="w-full rounded-sm border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-1 inline-flex w-full items-center justify-center rounded-sm border border-neutral-700 bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-white"
                >
                  Save internal assessment
                </button>
              </form>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}


