"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { ActionButton } from "@/components/ActionButton";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

interface Property {
  id: string;
  name: string;
  address?: string;
  location?: string;
}

interface SyncConfig {
  id: string;
  propertyId: string;
  platform: string;
  icalUrl: string;
  isEnabled: boolean;
  syncFrequency: number;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncError?: string;
}

interface SyncLog {
  id: string;
  status: string;
  eventsImported: number;
  eventsSkipped: number;
  errorMessage?: string;
  syncDuration?: number;
  createdAt: string;
}

interface SyncResult {
  success: boolean;
  eventsImported: number;
  eventsSkipped: number;
  conflictsResolved: number;
  error?: string;
}

const ICAL_EXPORT_BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001") + "/api";

export default function CalendarSyncPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showExportUrl, setShowExportUrl] = useState(false);

  // Form state
  const [platform, setPlatform] = useState("AIRBNB");
  const [icalUrl, setIcalUrl] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [syncFrequency, setSyncFrequency] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Property[]>("/properties")
      .then((data) => setProperties(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to fetch properties:", err));
  }, []);

  useEffect(() => {
    if (!selectedProperty) {
      setSyncConfig(null);
      setSyncLogs([]);
      return;
    }
    loadSyncConfig(selectedProperty);
  }, [selectedProperty]);

  const loadSyncConfig = async (propertyId: string) => {
    setLoading(true);
    try {
      const cfg = await apiGet<(SyncConfig & { syncLogs?: SyncLog[] }) | null>(
        `/calendar-syncs/property/${propertyId}`
      );
      if (cfg) {
        setSyncConfig(cfg);
        setSyncLogs(cfg.syncLogs || []);
        setPlatform(cfg.platform || "AIRBNB");
        setIcalUrl(cfg.icalUrl || "");
        setIsEnabled(cfg.isEnabled ?? true);
        setSyncFrequency(cfg.syncFrequency || 30);
      } else {
        setSyncConfig(null);
        setSyncLogs([]);
        setPlatform("AIRBNB");
        setIcalUrl("");
        setIsEnabled(true);
        setSyncFrequency(30);
      }
    } catch {
      // No sync config yet for this property
      setSyncConfig(null);
      setSyncLogs([]);
      setPlatform("AIRBNB");
      setIcalUrl("");
      setIsEnabled(true);
      setSyncFrequency(30);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty || !icalUrl) return;
    setSaving(true);
    try {
      if (syncConfig) {
        await apiPatch(`/calendar-syncs/${syncConfig.id}`, { platform, icalUrl, isEnabled, syncFrequency });
      } else {
        await apiPost("/calendar-syncs", { platform, icalUrl, isEnabled, syncFrequency, propertyId: selectedProperty });
      }
      await loadSyncConfig(selectedProperty);
      alert("Calendar sync saved!");
    } catch (err: any) {
      alert("Failed to save: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!syncConfig) return;
    setSyncing(true);
    try {
      const result = await apiPost<SyncResult>(
        `/calendar-syncs/${syncConfig.id}/sync`,
        {}
      );
      if (!result.success) {
        alert(`Sync failed: ${result.error || 'Unknown error'}`);
      } else {
        alert(`Sync complete!\nImported: ${result.eventsImported}\nSkipped: ${result.eventsSkipped}\nConflicts: ${result.conflictsResolved || 0}`);
      }
      await loadSyncConfig(selectedProperty);
    } catch (err: any) {
      alert("Sync failed: " + (err.message || "Unknown error"));
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProperty || !syncConfig) return;
    if (!confirm("Delete this calendar sync configuration?")) return;
    try {
      await apiDelete(`/calendar-syncs/${syncConfig.id}`);
      setSyncConfig(null);
      setSyncLogs([]);
      setIcalUrl("");
      alert("Calendar sync deleted.");
    } catch (err: any) {
      alert("Failed to delete: " + (err.message || "Unknown error"));
    }
  };

  const exportUrl = selectedProperty
    ? `${ICAL_EXPORT_BASE}/v1/public/ical/${selectedProperty}.ics`
    : "";

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Calendar Sync</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Sync your Airbnb calendar to prevent double bookings
            </p>
          </header>

          {/* Property Selector */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-5 mb-5">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Select Property
            </label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full max-w-md rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">-- Select a property --</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.location ? ` - ${p.location}` : p.address ? ` - ${p.address}` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedProperty && (
            <>
              {/* Import Config Form — Step 1 */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-5 mb-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Step 1 — Import from Airbnb</h2>
                  {syncConfig && (
                    <div className="flex gap-2">
                      <ActionButton
                        variant="primary"
                        size="sm"
                        onClick={handleSync}
                        disabled={syncing}
                        loading={syncing}
                      >
                        {syncing ? "Syncing..." : "Sync Now"}
                      </ActionButton>
                      <ActionButton variant="danger" size="sm" onClick={handleDelete}>
                        Delete
                      </ActionButton>
                    </div>
                  )}
                </div>

                {loading ? (
                  <p className="text-sm text-zinc-500 py-6 text-center">Loading...</p>
                ) : (
                  <form onSubmit={handleSave} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Platform</label>
                      <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="AIRBNB">Airbnb</option>
                        <option value="BOOKING_COM">Booking.com</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">iCal URL</label>
                      <input
                        type="url"
                        value={icalUrl}
                        onChange={(e) => setIcalUrl(e.target.value)}
                        placeholder="https://www.airbnb.com/calendar/ical/..."
                        required
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                      />
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Must be HTTPS and end with .ics</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Sync Frequency</label>
                      <select
                        value={syncFrequency}
                        onChange={(e) => setSyncFrequency(parseInt(e.target.value))}
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                      >
                        <option value={15}>Every 15 minutes</option>
                        <option value={30}>Every 30 minutes (Recommended)</option>
                        <option value={60}>Every hour</option>
                        <option value={120}>Every 2 hours</option>
                        <option value={360}>Every 6 hours</option>
                        <option value={1440}>Once daily</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isEnabled"
                        checked={isEnabled}
                        onChange={(e) => setIsEnabled(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
                      />
                      <label htmlFor="isEnabled" className="text-sm text-zinc-700 dark:text-zinc-300">
                        Enable automatic sync
                      </label>
                    </div>

                    {syncConfig?.lastSyncAt && (
                      <div className="rounded-md bg-zinc-50 dark:bg-zinc-800/50 p-3 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-zinc-500 dark:text-zinc-400">Last sync:</span>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{new Date(syncConfig.lastSyncAt).toLocaleString()}</span>
                        </div>
                        {syncConfig.lastSyncStatus && (
                          <div className="flex justify-between">
                            <span className="text-zinc-500 dark:text-zinc-400">Status:</span>
                            <span className={syncConfig.lastSyncStatus === "SUCCESS" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                              {syncConfig.lastSyncStatus}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <ActionButton type="submit" variant="primary" loading={saving}>
                      {saving ? "Saving..." : syncConfig ? "Update Sync" : "Create Sync"}
                    </ActionButton>
                  </form>
                )}

                {/* Help */}
                <div className="mt-6 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    How to get your Airbnb iCal URL:
                  </h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                    <li>Go to your Airbnb calendar</li>
                    <li>Click &quot;Availability settings&quot;</li>
                    <li>Scroll to &quot;Calendar sync&quot;</li>
                    <li>Click &quot;Export calendar&quot;</li>
                    <li>Copy the calendar link</li>
                    <li>Paste it above</li>
                  </ol>
                </div>
              </div>

              {/* Export URL — Step 2 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg shadow-sm p-5 mb-5 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Step 2 — Export to Airbnb</h2>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                      Now give Airbnb this URL so it can import your bookings back
                    </p>
                  </div>
                  <ActionButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowExportUrl(!showExportUrl)}
                  >
                    {showExportUrl ? "Hide" : "Show"} URL
                  </ActionButton>
                </div>
                {showExportUrl && (
                  <div className="mt-3 space-y-2">
                    <div className="bg-white dark:bg-zinc-800 rounded-md p-3 border border-zinc-200 dark:border-zinc-700">
                      <code className="text-xs text-zinc-700 dark:text-zinc-300 break-all">{exportUrl}</code>
                    </div>
                    <div className="flex gap-2">
                      <ActionButton
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(exportUrl);
                          alert("Copied!");
                        }}
                      >
                        Copy URL
                      </ActionButton>
                      <ActionButton
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(exportUrl, "_blank")}
                      >
                        Test in Browser
                      </ActionButton>
                    </div>
                    <p className="text-xs text-blue-700">
                      <strong>Airbnb:</strong> Calendar → Availability Settings → Calendar Sync → Import Calendar → Paste URL
                    </p>
                  </div>
                )}
              </div>

              {/* Sync History */}
              {syncLogs.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-5">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Sync History</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-zinc-700 dark:text-zinc-300">Date</th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-700 dark:text-zinc-300">Status</th>
                          <th className="px-3 py-2 text-right font-medium text-zinc-700 dark:text-zinc-300">Imported</th>
                          <th className="px-3 py-2 text-right font-medium text-zinc-700 dark:text-zinc-300">Skipped</th>
                          <th className="px-3 py-2 text-right font-medium text-zinc-700 dark:text-zinc-300">Duration</th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-700 dark:text-zinc-300">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {syncLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="px-3 py-2 text-zinc-900 dark:text-zinc-100">{new Date(log.createdAt).toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${log.status === "SUCCESS" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">{log.eventsImported}</td>
                            <td className="px-3 py-2 text-right text-zinc-500 dark:text-zinc-400">{log.eventsSkipped}</td>
                            <td className="px-3 py-2 text-right text-zinc-500 dark:text-zinc-400">{log.syncDuration ? `${log.syncDuration}ms` : "-"}</td>
                            <td className="px-3 py-2 text-xs text-red-600">{log.errorMessage || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {!selectedProperty && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-12 text-center">
              <div className="text-5xl mb-3">📅</div>
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">Select a Property</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Choose a property above to manage its calendar sync</p>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
