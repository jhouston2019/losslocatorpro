import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabaseClient';

export default function PropertyPage() {
  const router = useRouter();
  const { id } = router.query;

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [property, setProperty] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

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
    if (!user || !id) return;

    const fetchPropertyAndEvents = async () => {
      setLoading(true);

      const { data: propertyData } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      setProperty(propertyData || null);

      if (propertyData?.matched_events && propertyData.matched_events.length) {
        const { data: eventsData } = await supabase
          .from('events')
          .select('*')
          .in('id', propertyData.matched_events)
          .order('timestamp', { ascending: true });

        setEvents(eventsData || []);
      } else {
        setEvents([]);
      }

      setLoading(false);
    };

    fetchPropertyAndEvents();
  }, [user, id]);

  const probability = property?.claim_probability ?? 0;

  const probabilityBadge = useMemo(() => {
    let badgeClass = 'ci-badge-severity-low';
    let label = 'Low';
    if (probability >= 0.7) {
      badgeClass = 'ci-badge-severity-high';
      label = 'High';
    } else if (probability >= 0.4) {
      badgeClass = 'ci-badge-severity-medium';
      label = 'Elevated';
    }
    return { badgeClass, label };
  }, [probability]);

  const mostRecentEvent = useMemo(() => {
    if (!events.length) return null;
    return events[events.length - 1];
  }, [events]);

  const firstEvent = events[0];

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
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex items-center text-xs font-medium text-sky-500 hover:text-sky-400 mb-2"
            >
              ← Back to dashboard
            </button>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-50">
              Property claim intelligence
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-xl">
              Address-level view of modeled claim probability, matched events,
              and hazard history for this location.
            </p>
          </div>
          <button
            type="button"
            className="ci-button-secondary mt-1"
            onClick={() => {
              // Placeholder for future export logic
            }}
          >
            Export property report
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-4">
            <div className="ci-card p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">
                Property overview
              </h2>
              {loading && !property && (
                <p className="text-xs text-slate-500">Loading property…</p>
              )}
              {!loading && !property && (
                <p className="text-xs text-slate-500">
                  This property could not be found.
                </p>
              )}
              {property && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {property.address}
                    </p>
                    <p className="text-xs text-slate-500">
                      {property.county} County • {property.zip}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="border border-slate-100 rounded-lg px-3 py-2.5">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        Claim probability
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-semibold text-slate-900">
                          {(probability * 100).toFixed(0)}%
                        </span>
                        <span className={probabilityBadge.badgeClass}>
                          {probabilityBadge.label}
                        </span>
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-lg px-3 py-2.5">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        Matched events
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {events.length}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Hail, wind, fire, FEMA
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-lg px-3 py-2.5">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        First recorded event
                      </div>
                      <div className="mt-1 text-xs font-medium text-slate-900">
                        {firstEvent?.timestamp
                          ? new Date(
                              firstEvent.timestamp
                            ).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {firstEvent?.type || '—'}
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-lg px-3 py-2.5">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        Most recent event
                      </div>
                      <div className="mt-1 text-xs font-medium text-slate-900">
                        {mostRecentEvent?.timestamp
                          ? new Date(
                              mostRecentEvent.timestamp
                            ).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {mostRecentEvent?.type || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="ci-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Event timeline
                </h2>
                <span className="text-xs text-slate-500">
                  Sorted by event date
                </span>
              </div>
              {events.length === 0 && (
                <p className="text-xs text-slate-500">
                  No hazard events have been matched to this property yet.
                </p>
              )}
              <ol className="relative border-l border-slate-200 ml-2 space-y-4">
                {events.map((event) => {
                  let severityClass = 'ci-badge-severity-low';
                  if (event.severity === 'high') {
                    severityClass = 'ci-badge-severity-high';
                  } else if (event.severity === 'medium') {
                    severityClass = 'ci-badge-severity-medium';
                  }

                  return (
                    <li key={event.id} className="ml-4">
                      <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-sky-500 border-2 border-white shadow-sm" />
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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
                                year: 'numeric',
                              })
                            : ''}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {event.county} County • {event.zip} •{' '}
                        {event.lat?.toFixed(2)}, {event.lng?.toFixed(2)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="ci-card p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-2">
                Claim guidance
              </h2>
              <p className="text-xs text-slate-600 mb-2">
                Use this view to inform outreach and triage decisions for this
                policyholder.
              </p>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>
                  • High probabilities and recent severe events suggest
                  immediate outbound contact.
                </li>
                <li>
                  • Multiple moderate events over time may warrant proactive
                  inspection.
                </li>
                <li>
                  • Share this timeline with adjusters as a concise event
                  history for the address.
                </li>
              </ul>
            </div>

            <div className="ci-card p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-2">
                Matched event types
              </h2>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="ci-badge-severity-high">Severe hail</span>
                <span className="ci-badge-severity-medium">
                  Straight-line wind
                </span>
                <span className="ci-badge-severity-medium">Wildfire</span>
                <span className="ci-badge-severity-low">FEMA incident</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}



