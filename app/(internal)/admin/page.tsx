'use client';

import { useState, useEffect } from 'react';
import { getAdminSettings, updateAdminSettings } from '@/lib/data';
import type { AdminSettings } from '@/lib/database.types';

export default function AdminPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [minSeverity, setMinSeverity] = useState(75);
  const [minClaimProb, setMinClaimProb] = useState(70);
  const [autoCreateLead, setAutoCreateLead] = useState(true);
  const [nightlyExport, setNightlyExport] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await getAdminSettings();
        if (data) {
          setSettings(data);
          setMinSeverity(data.min_severity || 75);
          setMinClaimProb((data.min_claim_probability || 0.7) * 100);
          setAutoCreateLead(data.auto_create_lead ?? true);
          setNightlyExport(data.nightly_export ?? false);
        }
      } catch (error) {
        console.error('Error loading admin settings:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await updateAdminSettings({
        min_severity: minSeverity,
        min_claim_probability: minClaimProb / 100,
        auto_create_lead: autoCreateLead,
        nightly_export: nightlyExport,
      });
      alert('Settings saved successfully. Changes will apply to new events.');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      const message = error?.message || 'Failed to save settings. Please try again.';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading admin settings...</p>
        </div>
      </div>
    );
  }

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
                    High priority claim prob ≥ (%)
                  </label>
                  <input
                    type="number"
                    value={minClaimProb}
                    onChange={(e) => setMinClaimProb(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="mt-1 w-full rounded-md border border-slateglass-700 bg-sapphire-900 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-sapphire-600"
                  />
                </div>
                <div>
                  <label className="text-neutral-400">
                    Minimum severity score
                  </label>
                  <input
                    type="number"
                    value={minSeverity}
                    onChange={(e) => setMinSeverity(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="mt-1 w-full rounded-md border border-slateglass-700 bg-sapphire-900 px-2 py-1.5 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-sapphire-600"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="mt-3 px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-500 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Threshold Settings'}
              </button>
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
                    checked={autoCreateLead}
                    onChange={(e) => setAutoCreateLead(e.target.checked)}
                    className="h-3 w-3 rounded border border-neutral-600 bg-neutral-950"
                  />
                  Auto-create lead when severity &gt;= {minSeverity} and claim
                  probability &gt;= {minClaimProb}%.
                </label>
                <label className="flex items-center gap-2 text-neutral-300">
                  <input
                    type="checkbox"
                    checked={nightlyExport}
                    onChange={(e) => setNightlyExport(e.target.checked)}
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


