"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost } from "../../lib/api";
import { Property, Currency, Booking } from "../../lib/types";
import { ModalFrame } from "../ModalFrame";

type AddRevenueModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function AddRevenueModal({ isOpen, onClose, onSuccess }: AddRevenueModalProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");
  const [showBookingDropdown, setShowBookingDropdown] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    bookingId: "" as string,
    propertyId: "" as string,
    amount: "",
    currency: "MWK" as Currency,
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      let active = true;
      setLoading(true);
      Promise.all([
        apiGet<Property[]>("/properties"),
        apiGet<Booking[]>("/bookings"),
      ])
        .then(([props, bkgs]) => {
          if (active) {
            setProperties(props);
            setBookings(bkgs);
          }
        })
        .catch(() => { if (active) setError("Could not load properties or bookings. You can still enter revenue manually."); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }
  }, [isOpen]);

  const handleBookingSelect = (booking: Booking) => {
    const property = properties.find((p) => p.id === booking.propertyId);
    setForm((f) => ({
      ...f,
      bookingId: booking.id,
      propertyId: booking.propertyId,
      amount: booking.totalAmount ? String(booking.totalAmount) : f.amount,
      currency: booking.currency ?? f.currency,
      date: booking.checkInDate.split("T")[0],
    }));
    setBookingSearch(
      `${booking.guest?.name ?? "Guest"} · ${booking.checkInDate} – ${booking.checkOutDate}${property ? ` · ${property.name}` : ""}`
    );
    setShowBookingDropdown(false);
  };

  const clearBooking = () => {
    setForm((f) => ({ ...f, bookingId: "", propertyId: "", amount: "", date: new Date().toISOString().split("T")[0] }));
    setBookingSearch("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiPost("/transactions/revenue", {
        name: form.name || undefined,
        amount: parseInt(form.amount),
        currency: form.currency,
        date: new Date(form.date).toISOString(),
        notes: form.notes || undefined,
        propertyId: form.propertyId || undefined,
        bookingId: form.bookingId || undefined,
      });
      handleClose();
      onSuccess?.();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save revenue entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({
      name: "",
      bookingId: "",
      propertyId: "",
      amount: "",
      currency: "MWK",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setBookingSearch("");
    setShowBookingDropdown(false);
    setDetailsOpen(false);
    setError(null);
    onClose();
  };

  const filteredBookings = bookings.filter((b) => {
    const term = bookingSearch.toLowerCase();
    const guestName = b.guest?.name?.toLowerCase() ?? "";
    const propName = properties.find((p) => p.id === b.propertyId)?.name?.toLowerCase() ?? "";
    return guestName.includes(term) || propName.includes(term) || b.checkInDate.includes(term);
  }).slice(0, 8);

  return (
    <ModalFrame open={isOpen} onClose={handleClose} busy={submitting} title="Log Revenue" description="Record income from a booking or other source" footer={<div className="flex gap-2">
      <button type="button" onClick={handleClose} disabled={submitting} className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Cancel</button>
      <button type="submit" form="log-revenue-form" disabled={submitting} className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">{submitting ? "Saving..." : "Save Revenue"}</button>
    </div>}>
        <form id="log-revenue-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
            {error && <p role="alert" className="order-first rounded-lg bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
            <div>
              <label htmlFor="revenue-name" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Name <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
              </label>
              <input
                data-initial-focus
                id="revenue-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. November Airbnb payout"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Property */}
              <div className="col-span-2">
                <label htmlFor="revenue-property" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Property</label>
                <select
                  id="revenue-property"
                  value={form.propertyId}
                  onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                  disabled={loading}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
                >
                  <option value="">{loading ? "Loading..." : "General (All)"}</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Amount */}
              <div>
                <label htmlFor="revenue-amount" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Amount *</label>
                <input
                  id="revenue-amount"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  min="1"
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Currency</label>
                <div className="flex gap-2" role="group" aria-label="Currency">
                  {(["MWK", "USD"] as Currency[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={form.currency === c}
                      onClick={() => setForm({ ...form, currency: c })}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                        form.currency === c
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400"
                          : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Date */}
            <div>
              <label htmlFor="revenue-date" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Date *</label>
              <input
                id="revenue-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button type="button" aria-expanded={detailsOpen} onClick={() => setDetailsOpen(!detailsOpen)} className="flex w-full items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-left text-sm font-medium text-zinc-700 dark:text-zinc-200"><span>Booking and notes{form.bookingId ? " · linked" : ""}</span><span aria-hidden="true">{detailsOpen ? "−" : "+"}</span></button>
            {/* Link to booking (optional) */}
            <div className={detailsOpen ? "" : "hidden"}>
              <label htmlFor="revenue-booking" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Link to Booking <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
              </label>
              {loading ? (
                <div className="h-9 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
              ) : form.bookingId ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="flex-1 text-sm text-emerald-800 dark:text-emerald-300 truncate">{bookingSearch}</span>
                  <button type="button" aria-label="Remove linked booking" onClick={clearBooking} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    id="revenue-booking"
                    type="text"
                    value={bookingSearch}
                    onChange={(e) => {
                      setBookingSearch(e.target.value);
                      setShowBookingDropdown(true);
                    }}
                    onFocus={() => setShowBookingDropdown(true)}
                    placeholder="Search by guest name or property..."
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                  {showBookingDropdown && filteredBookings.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-52 overflow-y-auto">
                      {filteredBookings.map((b) => {
                        const prop = properties.find((p) => p.id === b.propertyId);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleBookingSelect(b)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-b border-zinc-100 dark:border-zinc-700 last:border-b-0"
                          >
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">{b.guest?.name ?? "Guest"}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {prop?.name ?? "Property"} · {b.checkInDate} – {b.checkOutDate}
                              {b.totalAmount ? ` · MWK ${b.totalAmount.toLocaleString()}` : ""}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className={detailsOpen ? "" : "hidden"}>
              <label htmlFor="revenue-notes" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Notes <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
              </label>
              <textarea
                id="revenue-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="e.g. Airbnb payout for November..."
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none resize-none"
              />
            </div>

          </form>
    </ModalFrame>
  );
}
