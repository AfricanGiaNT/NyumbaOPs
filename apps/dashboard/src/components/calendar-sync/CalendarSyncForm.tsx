"use client";

import { useState } from "react";
import { ActionButton } from "../ActionButton";

interface CalendarSyncFormProps {
  propertyId: string;
  initialData?: {
    id?: string;
    platform: string;
    icalUrl: string;
    isEnabled: boolean;
    syncFrequency: number;
    lastSyncAt?: string;
    lastSyncStatus?: string;
  };
  onSubmit: (data: CalendarSyncFormData) => Promise<void>;
  onTest?: (id: string) => Promise<void>;
  onSync?: (id: string) => Promise<void>;
}

export interface CalendarSyncFormData {
  platform: string;
  icalUrl: string;
  isEnabled: boolean;
  syncFrequency: number;
}

export function CalendarSyncForm({ 
  initialData, 
  onSubmit
}: CalendarSyncFormProps) {
  const [formData, setFormData] = useState<CalendarSyncFormData>({
    platform: initialData?.platform || "AIRBNB",
    icalUrl: initialData?.icalUrl || "",
    isEnabled: initialData?.isEnabled ?? true,
    syncFrequency: initialData?.syncFrequency || 30,
  });
  const [submitting, setSubmitting] = useState(false);
  const [testResult] = useState<{
    success: boolean;
    message: string;
    totalEvents?: number;
    futureEvents?: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Platform Selection */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Platform
          </label>
          <select
            value={formData.platform}
            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="AIRBNB">Airbnb</option>
            <option value="BOOKING_COM">Booking.com</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* iCal URL */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            iCal URL
          </label>
          <input
            type="url"
            value={formData.icalUrl}
            onChange={(e) => setFormData({ ...formData, icalUrl: e.target.value })}
            placeholder="https://www.airbnb.com/calendar/ical/..."
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Paste the iCal URL from {formData.platform}. Must be HTTPS and end with .ics
          </p>
        </div>

        {/* Sync Frequency */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Sync Frequency
          </label>
          <select
            value={formData.syncFrequency}
            onChange={(e) => setFormData({ ...formData, syncFrequency: parseInt(e.target.value) })}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={15}>Every 15 minutes</option>
            <option value={30}>Every 30 minutes (Recommended)</option>
            <option value={60}>Every hour</option>
            <option value={120}>Every 2 hours</option>
            <option value={360}>Every 6 hours</option>
            <option value={720}>Every 12 hours</option>
            <option value={1440}>Once daily</option>
          </select>
        </div>

        {/* Enable/Disable */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isEnabled"
            checked={formData.isEnabled}
            onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isEnabled" className="text-sm font-medium text-zinc-700">
            Enable automatic sync
          </label>
        </div>

        {/* Last Sync Status */}
        {initialData?.lastSyncAt && (
          <div className="rounded-md bg-zinc-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Last sync:</span>
              <span className="font-medium">
                {new Date(initialData.lastSyncAt).toLocaleString()}
              </span>
            </div>
            {initialData.lastSyncStatus && (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-zinc-600">Status:</span>
                <span
                  className={`font-medium ${
                    initialData.lastSyncStatus === "SUCCESS"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {initialData.lastSyncStatus}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Test Result */}
        {testResult && (
          <div
            className={`rounded-md p-3 text-sm ${
              testResult.success
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            <p className="font-medium">{testResult.message}</p>
            {testResult.success && testResult.futureEvents !== undefined && (
              <p className="mt-1 text-xs">
                Found {testResult.futureEvents} future bookings to sync
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <ActionButton
            type="submit"
            variant="primary"
            loading={submitting}
          >
            {submitting ? "Saving..." : initialData?.id ? "Update Sync" : "Create Sync"}
          </ActionButton>
        </div>
      </form>

      {/* Help Section */}
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <h3 className="text-sm font-semibold text-zinc-900 mb-2">
          How to get your Airbnb iCal URL:
        </h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-600">
          <li>Go to your Airbnb calendar</li>
          <li>Click on "Availability settings"</li>
          <li>Scroll to "Calendar sync"</li>
          <li>Click "Export calendar"</li>
          <li>Copy the calendar link (iCal format)</li>
          <li>Paste it in the field above</li>
        </ol>
        <p className="mt-3 text-xs text-zinc-500">
          <strong>Note:</strong> Airbnb bookings will automatically override any conflicting
          local bookings to prevent double bookings.
        </p>
      </div>
    </div>
  );
}
