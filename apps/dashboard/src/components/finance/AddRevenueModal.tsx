"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost } from "../../lib/api";
import { Property, Currency, Booking } from "../../lib/types";

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

  const [form, setForm] = useState({
    bookingId: "" as string,
    propertyId: "" as string,
    amount: "",
    currency: "MWK" as Currency,
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        apiGet<Property[]>("/properties"),
        apiGet<Booking[]>("/bookings"),
      ])
        .then(([props, bkgs]) => {
          setProperties(props);
          setBookings(bkgs);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
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
      date: booking.checkInDate,
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
    try {
      await apiPost("/transactions/revenue", {
        amount: parseInt(form.amount),
        currency: form.currency,
        date: new Date(form.date).toISOString(),
        notes: form.notes || undefined,
        propertyId: form.propertyId || undefined,
        bookingId: form.bookingId || undefined,
      });
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save revenue entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({
      bookingId: "",
      propertyId: "",
      amount: "",
      currency: "MWK",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setBookingSearch("");
    setShowBookingDropdown(false);
    onClose();
  };

  const filteredBookings = bookings.filter((b) => {
    const term = bookingSearch.toLowerCase();
    const guestName = b.guest?.name?.toLowerCase() ?? "";
    const propName = properties.find((p) => p.id === b.propertyId)?.name?.toLowerCase() ?? "";
    return guestName.includes(term) || propName.includes(term) || b.checkInDate.includes(term);
  }).slice(0, 8);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Add Revenue</h2>
            <p className="text-xs text-zinc-500">Record income from a booking or other source</p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-zinc-100" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Link to booking (optional) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Link to Booking <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              {form.bookingId ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="flex-1 text-sm text-emerald-800 truncate">{bookingSearch}</span>
                  <button type="button" onClick={clearBooking} className="text-emerald-600 hover:text-emerald-800">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={bookingSearch}
                    onChange={(e) => {
                      setBookingSearch(e.target.value);
                      setShowBookingDropdown(true);
                    }}
                    onFocus={() => setShowBookingDropdown(true)}
                    placeholder="Search by guest name or property..."
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  {showBookingDropdown && filteredBookings.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                      {filteredBookings.map((b) => {
                        const prop = properties.find((p) => p.id === b.propertyId);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleBookingSelect(b)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 border-b border-zinc-100 last:border-b-0"
                          >
                            <p className="font-medium text-zinc-900">{b.guest?.name ?? "Guest"}</p>
                            <p className="text-xs text-zinc-500">
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

            <div className="grid grid-cols-2 gap-4">
              {/* Property */}
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-zinc-700">Property</label>
                <select
                  value={form.propertyId}
                  onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">General (All)</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Amount */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Amount *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  min="1"
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Currency</label>
                <div className="flex gap-2">
                  {(["MWK", "USD"] as Currency[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, currency: c })}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                        form.currency === c
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
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
              <label className="mb-1 block text-sm font-medium text-zinc-700">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Notes <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="e.g. Airbnb payout for November..."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-zinc-300 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Revenue"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
