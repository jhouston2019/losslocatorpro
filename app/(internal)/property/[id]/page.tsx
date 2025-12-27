'use client';

import { useState, useEffect } from 'react';
import { getPropertyById, parseTimeline, createRoutingQueueEntry } from '@/lib/data';
import type { Property, TimelineEntry } from '@/lib/database.types';

interface PropertyPageProps {
  params: { id: string };
}

export default function PropertyPage({ params }: PropertyPageProps) {
  const { id } = params;
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProperty() {
      try {
        setLoading(true);
        const data = await getPropertyById(id);
        setProperty(data);
      } catch (error) {
        console.error('Error loading property:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProperty();
  }, [id]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleExport = () => {
    setToastMessage('PDF export coming soon');
  };

  const handleRouteLead = async () => {
    try {
      await createRoutingQueueEntry(id);
      setToastMessage('Lead created successfully');
    } catch (error: any) {
      console.error('Error creating lead:', error);
      const message = error?.message || 'Failed to create lead';
      setToastMessage(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1D29]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9FF] mx-auto mb-4"></div>
          <p className="text-[#B8BFCC]">Loading property...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1D29]">
        <div className="text-center">
          <p className="text-[#FF3B5C] mb-4">Property not found</p>
          <a href="/dashboard" className="text-[#00D9FF] hover:underline">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const timeline = parseTimeline(property.timeline);

  return (
    <div className="min-h-screen bg-[#1A1D29] relative">
      {toastMessage && (
        <div className="fixed bottom-4 right-4 rounded-md bg-[#252936] border border-[#2F3441] px-3 py-2 text-xs text-white shadow-panel">
          {toastMessage}
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <header className="card flex items-center justify-between gap-3">
          <div>
            <h1 className="card-header">Property intelligence</h1>
            <p className="subtext">
              Internal claim decision interface for property ID {id}.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRouteLead}
              className="px-3 py-2 bg-[#00D9FF] border border-[#00D9FF] rounded-lg text-xs font-semibold text-slate-900 hover:bg-[#00B8D9] shadow-glow-cyan transition-all duration-200"
            >
              Route lead
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="px-3 py-2 bg-[#2F3441] border border-[#2F3441] rounded-lg hover:bg-[#3A3F4E] hover:border-[#00D9FF] text-xs font-medium text-[#B8BFCC] transition-all duration-200"
            >
              Export property report (PDF)
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="card space-y-3">
              <h2 className="card-header">Property summary</h2>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                <div>
                  <dt className="text-[#8B92A3]">Address</dt>
                  <dd className="text-white">
                    {property.address}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#8B92A3]">ZIP income band</dt>
                  <dd className="text-white">
                    {property.zip_income_band ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#8B92A3]">Property type</dt>
                  <dd className="text-white">
                    {property.property_type ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#8B92A3]">Estimated roof age</dt>
                  <dd className="text-white">
                    {property.roof_age ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#8B92A3]">ZIP</dt>
                  <dd className="text-white">{property.zip}</dd>
                </div>
              </dl>
            </div>

            <div className="card">
              <h2 className="card-header">Event timeline</h2>
              <div className="mt-3 space-y-2 text-xs">
                {timeline.length > 0 ? (
                  <div className="space-y-2">
                    {timeline.map((t, i) => (
                      <div
                        key={i}
                        className="border-l-2 border-[#00D9FF] pl-4 py-2"
                      >
                        <p className="text-[#8B92A3] text-sm">{t.date}</p>
                        <p className="text-white font-semibold">
                          {t.type} • {t.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#8B92A3]">
                    No timeline data available for this property.
                  </p>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="card space-y-2">
              <h2 className="card-header">Risk layers</h2>
              <div className="flex flex-wrap gap-2 text-xs">
                {property.risk_tags && property.risk_tags.length > 0 ? (
                  property.risk_tags.map((risk) => (
                    <span
                      key={risk}
                      className="px-3 py-1 bg-[#FF8A3D]/20 border border-[#FF8A3D]/30 rounded-lg text-sm text-[#FF8A3D] mr-2"
                    >
                      {risk}
                    </span>
                  ))
                ) : (
                  <span className="text-[#8B92A3]">No risk data loaded.</span>
                )}
              </div>
            </div>

            <div className="card space-y-3">
              <h2 className="card-header">Internal assessment</h2>
              <form className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[#B8BFCC]">
                    Outreach needed (Y/N)
                  </label>
                  <select className="rounded-sm border border-[#2F3441] bg-[#1A1D29] px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]">
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[#B8BFCC]">
                    Lead priority score
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={93}
                    className="w-20 rounded-sm border border-[#2F3441] bg-[#1A1D29] px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#B8BFCC]">Internal notes</label>
                  <textarea
                    rows={3}
                    className="w-full resize-none rounded-sm border border-[#2F3441] bg-[#1A1D29] px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#B8BFCC]">
                    Recommended actions
                  </label>
                    <div className="flex flex-wrap gap-2">
                    {property.recommended_actions && property.recommended_actions.length > 0 ? (
                      property.recommended_actions.map((action) => (
                        <span
                          key={action}
                          className="px-3 py-1 bg-[#00E5A0]/20 border border-[#00E5A0]/30 rounded-lg text-sm text-[#00E5A0] mr-2"
                        >
                          {action}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#8B92A3]">
                        No recommended actions configured.
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[#B8BFCC]">
                    Contractor assignment
                  </label>
                  <input
                    type="text"
                    placeholder="Preferred vendor / notes"
                  className="w-full rounded-sm border border-[#2F3441] bg-[#1A1D29] px-2 py-1.5 text-white placeholder:text-[#8B92A3] focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 focus:border-[#00D9FF]"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-1 inline-flex w-full items-center justify-center rounded-sm border border-[#00D9FF] bg-[#00D9FF] px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-[#00B8D9] shadow-glow-cyan transition-all duration-200"
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


