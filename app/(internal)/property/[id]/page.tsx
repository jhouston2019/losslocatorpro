'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/app/components/NavBar';
import { propertyIntel } from '@/app/lib/mockData';

interface PropertyPageProps {
  params: { id: string };
}

export default function PropertyPage({ params }: PropertyPageProps) {
  const { id } = params;
  const intel = propertyIntel[id];
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleExport = () => {
    setToastMessage('PDF export coming soon');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 relative">
      <NavBar />
      {toastMessage && (
        <div className="fixed bottom-4 right-4 rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-neutral-100 shadow-lg">
          {toastMessage}
        </div>
      )}
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
              onClick={handleExport}
              className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md hover:bg-neutral-700 text-xs font-medium text-neutral-100"
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
                    {intel?.address ?? 'Unknown property'}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-400">ZIP income band</dt>
                  <dd className="text-neutral-100">
                    {intel?.zipIncome ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-400">Property type</dt>
                  <dd className="text-neutral-100">
                    {intel?.propertyType ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-400">Estimated roof age</dt>
                  <dd className="text-neutral-100">
                    {intel?.roofAge ?? '—'}
                  </dd>
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
              <div className="mt-3 space-y-4 text-xs">
                {intel?.timeline ? (
                  <div className="space-y-4">
                    {intel.timeline.map((t, i) => (
                      <div
                        key={i}
                        className="border-l-2 border-neutral-600 pl-4"
                      >
                        <p className="text-neutral-400">{t.date}</p>
                        <p className="font-semibold">
                          {t.type} • {t.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-500">
                    No timeline data available for this property.
                  </p>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-2">
              <h2 className="text-xs font-medium text-neutral-300">
                Risk layers
              </h2>
              <div className="flex flex-wrap gap-2 text-xs">
                {intel?.risks?.map((risk) => (
                  <span
                    key={risk}
                    className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded-md text-sm"
                  >
                    {risk}
                  </span>
                )) || (
                  <span className="text-neutral-500">No risk data loaded.</span>
                )}
              </div>
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
                  <div className="flex flex-wrap gap-2">
                    {intel?.recommendedActions?.map((action) => (
                      <span
                        key={action}
                        className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded-md text-sm"
                      >
                        {action}
                      </span>
                    )) || (
                      <span className="text-neutral-500">
                        No recommended actions configured.
                      </span>
                    )}
                  </div>
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


