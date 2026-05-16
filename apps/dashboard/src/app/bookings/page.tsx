"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../lib/api";
import { Booking, Guest, Property } from "../../lib/types";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSkeleton } from "../../components/LoadingSkeleton";
import { SidebarForm } from "../../components/SidebarForm";
import { FormField } from "../../components/FormField";
import { ActionButton } from "../../components/ActionButton";
import { AppLayout } from "@/components/layout/AppLayout";

type BookingFormState = {
  guestId: string;
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
  notes: string;
};

type NewGuestFormState = {
  name: string;
  email: string;
  phone: string;
  source: "AIRBNB" | "LOCAL" | "REFERRAL" | "REPEAT";
};

const initialForm: BookingFormState = {
  guestId: "",
  propertyId: "",
  checkInDate: new Date().toISOString().slice(0, 10),
  checkOutDate: new Date().toISOString().slice(0, 10),
  notes: "",
};

const initialGuestForm: NewGuestFormState = {
  name: "",
  email: "",
  phone: "",
  source: "LOCAL",
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BookingFormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showNewGuestForm, setShowNewGuestForm] = useState(false);
  const [newGuestForm, setNewGuestForm] = useState<NewGuestFormState>(initialGuestForm);
  const [creatingGuest, setCreatingGuest] = useState(false);

  useEffect(() => {
    Promise.all([
      apiGet<Booking[]>("/bookings"),
      apiGet<Guest[]>("/guests"),
      apiGet<Property[]>("/properties"),
    ])
      .then(([bookingData, guestData, propertyData]) => {
        setBookings(bookingData);
        setGuests(guestData);
        setProperties(propertyData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateGuest = async () => {
    setCreatingGuest(true);
    setError(null);
    try {
      const payload = {
        ...newGuestForm,
        email: newGuestForm.email || undefined,
        phone: newGuestForm.phone || undefined,
      };
      const created = await apiPost<Guest>("/guests", payload);
      setGuests((prev) => [created, ...prev]);
      setForm((prev) => ({ ...prev, guestId: created.id }));
      setNewGuestForm(initialGuestForm);
      setShowNewGuestForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreatingGuest(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        notes: form.notes || undefined,
      };
      const created = await apiPost<Booking>("/bookings", payload);
      setBookings((prev) => [created, ...prev]);
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
    setShowNewGuestForm(false);
    setForm(initialForm);
    setNewGuestForm(initialGuestForm);
    setError(null);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Bookings</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage bookings and status updates.
            </p>
          </div>
          <ActionButton variant="primary" onClick={() => setShowAddForm(true)}>+ Add Booking</ActionButton>
        </header>

        <section className="space-y-3">
          {loading && <LoadingSkeleton rows={6} />}
          {!loading && bookings.length === 0 && (
            <EmptyState
              title="No bookings yet"
              message="Create a booking to start tracking stays."
            />
          )}
          {!loading &&
            bookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/bookings/${booking.id}`}
                className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm transition hover:border-indigo-200 dark:hover:border-indigo-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {booking.guest?.name ?? booking.guestId}
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {booking.property?.name ?? booking.propertyId}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {booking.status}
                  </span>
                </div>
                <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {new Date(booking.checkInDate).toLocaleDateString()} →{" "}
                  {new Date(booking.checkOutDate).toLocaleDateString()}
                </div>
              </Link>
            ))}
        </section>
      </div>

      {/* Add Booking Sidebar Form */}
      <SidebarForm
        isOpen={showAddForm}
        onClose={handleClose}
        title="Create Booking"
      >
        <div className="space-y-6">
          {/* Guest Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              Guest Information
            </h3>
            <FormField label="Select Guest" required htmlFor="guestId">
              <select
                id="guestId"
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.guestId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, guestId: event.target.value }))
                }
                aria-required="true"
              >
                <option value="">Select a guest...</option>
                {guests.map((guest) => (
                  <option key={guest.id} value={guest.id}>
                    {guest.name} {guest.email ? `(${guest.email})` : ""}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Create New Guest Toggle */}
            <button
              type="button"
              onClick={() => setShowNewGuestForm(!showNewGuestForm)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {showNewGuestForm ? "− Cancel new guest" : "+ Create new guest"}
            </button>

            {/* Inline New Guest Form */}
            {showNewGuestForm && (
              <div className="space-y-4 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/20 p-4">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  New Guest Details
                </h4>
                <FormField label="Guest Name" required htmlFor="newGuestName">
                  <input
                    id="newGuestName"
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Jane Smith"
                    value={newGuestForm.name}
                    onChange={(event) =>
                      setNewGuestForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    aria-required="true"
                  />
                </FormField>

                <FormField label="Email" htmlFor="newGuestEmail">
                  <input
                    id="newGuestEmail"
                    type="email"
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., jane@example.com"
                    value={newGuestForm.email}
                    onChange={(event) =>
                      setNewGuestForm((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                  />
                </FormField>

                <FormField label="Phone" htmlFor="newGuestPhone">
                  <input
                    id="newGuestPhone"
                    type="tel"
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., +265 123 456 789"
                    value={newGuestForm.phone}
                    onChange={(event) =>
                      setNewGuestForm((prev) => ({
                        ...prev,
                        phone: event.target.value,
                      }))
                    }
                  />
                </FormField>

                <FormField label="Source" htmlFor="newGuestSource">
                  <select
                    id="newGuestSource"
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newGuestForm.source}
                    onChange={(event) =>
                      setNewGuestForm((prev) => ({
                        ...prev,
                        source: event.target.value as NewGuestFormState["source"],
                      }))
                    }
                  >
                    <option value="LOCAL">LOCAL</option>
                    <option value="AIRBNB">AIRBNB</option>
                    <option value="REFERRAL">REFERRAL</option>
                    <option value="REPEAT">REPEAT</option>
                  </select>
                </FormField>

                <ActionButton
                  variant="primary"
                  size="sm"
                  onClick={handleCreateGuest}
                  disabled={creatingGuest || !newGuestForm.name}
                  loading={creatingGuest}
                  className="w-full"
                >
                  {creatingGuest ? "Creating..." : "Create Guest"}
                </ActionButton>
              </div>
            )}
          </div>

          {/* Property and Dates */}
          <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              Booking Details
            </h3>
            <FormField label="Property" required htmlFor="propertyId">
              <select
                id="propertyId"
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.propertyId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, propertyId: event.target.value }))
                }
                aria-required="true"
              >
                <option value="">Select a property...</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Check-In Date" required htmlFor="checkInDate">
                <input
                  id="checkInDate"
                  type="date"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.checkInDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      checkInDate: event.target.value,
                    }))
                  }
                  aria-required="true"
                />
              </FormField>

              <FormField label="Check-Out Date" required htmlFor="checkOutDate">
                <input
                  id="checkOutDate"
                  type="date"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.checkOutDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      checkOutDate: event.target.value,
                    }))
                  }
                  aria-required="true"
                />
              </FormField>
            </div>

            <FormField
              label="Notes"
              htmlFor="notes"
              helpText="Any special requests or important information"
            >
              <textarea
                id="notes"
                rows={3}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Early check-in requested..."
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
            </FormField>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-6">
            <ActionButton
              variant="primary"
              onClick={handleSubmit}
              disabled={
                submitting || !form.guestId || !form.propertyId || !form.checkInDate
              }
              loading={submitting}
              className="flex-1"
            >
              {submitting ? "Saving..." : "Save Booking"}
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
    </AppLayout>
  );
}
