"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../lib/api";
import { Guest, GuestSource } from "../../lib/types";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSkeleton } from "../../components/LoadingSkeleton";
import { SidebarForm } from "../../components/SidebarForm";
import { FormField } from "../../components/FormField";
import { ActionButton } from "../../components/ActionButton";

const sources: GuestSource[] = ["AIRBNB", "LOCAL", "REFERRAL", "REPEAT"];

type GuestFormState = {
  name: string;
  email: string;
  phone: string;
  source: GuestSource;
  rating: string;
  notes: string;
};

const initialForm: GuestFormState = {
  name: "",
  email: "",
  phone: "",
  source: "LOCAL",
  rating: "",
  notes: "",
};

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<GuestFormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadGuests = () =>
    apiGet<Guest[]>("/guests")
      .then((data) => setGuests(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadGuests();
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        source: form.source,
        notes: form.notes || undefined,
        rating: form.rating ? Number(form.rating) : undefined,
      };
      const created = await apiPost<Guest>("/guests", payload);
      setGuests((prev) => [created, ...prev]);
      setForm(initialForm);
      setShowAddForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowAddForm(false);
    setForm(initialForm);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-8 py-10 text-zinc-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Guests</h1>
            <p className="text-sm text-zinc-600">
              Track guest profiles and booking history.
            </p>
          </div>
          <div className="flex gap-2">
            <ActionButton
              variant="primary"
              onClick={() => setShowAddForm(true)}
            >
              + Add Guest
            </ActionButton>
            <Link
              href="/"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Back to Overview
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {loading && <LoadingSkeleton rows={6} />}
          {!loading && guests.length === 0 && (
            <EmptyState
              title="No guests yet"
              message="Add your first guest to start tracking bookings."
            />
          )}
          {!loading &&
            guests.map((guest) => (
              <Link
                key={guest.id}
                href={`/guests/${guest.id}`}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-indigo-200"
              >
                <div className="text-lg font-semibold">{guest.name}</div>
                <div className="text-sm text-zinc-600">{guest.email ?? "No email"}</div>
                <div className="text-sm text-zinc-500">{guest.source}</div>
              </Link>
            ))}
        </section>
      </div>

      {/* Add Guest Sidebar Form */}
      <SidebarForm
        isOpen={showAddForm}
        onClose={handleClose}
        title="Add Guest"
      >
        <div className="space-y-6">
          {/* Section 1: Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
              Contact Information
            </h3>
            <FormField label="Full Name" required htmlFor="name">
              <input
                id="name"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., John Doe"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                aria-required="true"
              />
            </FormField>

            <FormField
              label="Email"
              htmlFor="email"
              helpText="Optional - used for booking confirmations"
            >
              <input
                id="email"
                type="email"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., john@example.com"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </FormField>

            <FormField
              label="Phone"
              htmlFor="phone"
              helpText="Include country code if international"
            >
              <input
                id="phone"
                type="tel"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., +265 123 456 789"
                value={form.phone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
            </FormField>
          </div>

          {/* Section 2: Booking Details */}
          <div className="space-y-4 border-t border-zinc-200 pt-6">
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
              Booking Details
            </h3>
            <FormField
              label="Source"
              required
              htmlFor="source"
              helpText="How did this guest find your property?"
            >
              <select
                id="source"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.source}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    source: event.target.value as GuestSource,
                  }))
                }
                aria-required="true"
              >
                {sources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Rating"
              htmlFor="rating"
              helpText="Guest rating from 1 (poor) to 5 (excellent)"
            >
              <input
                id="rating"
                type="number"
                min={1}
                max={5}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="5"
                value={form.rating}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    rating: event.target.value,
                  }))
                }
              />
            </FormField>
          </div>

          {/* Section 3: Additional Notes */}
          <div className="space-y-4 border-t border-zinc-200 pt-6">
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
              Additional Notes
            </h3>
            <FormField
              label="Notes"
              htmlFor="notes"
              helpText="Any special requests, preferences, or important information"
            >
              <textarea
                id="notes"
                rows={4}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Prefers ground floor, allergic to pets..."
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
            </FormField>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 border-t border-zinc-200 pt-6">
            <ActionButton
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting || !form.name}
              loading={submitting}
              className="flex-1"
            >
              {submitting ? "Saving..." : "Save Guest"}
            </ActionButton>
            <ActionButton
              variant="secondary"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </ActionButton>
          </div>
        </div>
      </SidebarForm>
    </div>
  );
}
