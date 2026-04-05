"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { checkAvailability, initiateBooking, fetchPublicProperty } from "@/lib/api";

const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-MW", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

type PropertyInfo = {
  id: string;
  name: string;
  location?: string | null;
  nightlyRate?: number | null;
  currency: string;
  maxGuests: number;
  coverImageUrl?: string | null;
};

function CheckoutContent() {
  const searchParams = useSearchParams();

  const propertyId = searchParams.get("propertyId") ?? "";
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";

  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [nights, setNights] = useState(0);
  const [nightlyRate, setNightlyRate] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [currency, setCurrency] = useState("MWK");
  const [maxGuests, setMaxGuests] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [datesUnavailable, setDatesUnavailable] = useState(false);

  useEffect(() => {
    if (!propertyId || !checkIn || !checkOut) {
      setError("Missing booking details. Please go back and select dates.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [propertyRes, availRes] = await Promise.all([
          fetchPublicProperty(propertyId),
          checkAvailability({ propertyId, checkInDate: checkIn, checkOutDate: checkOut }),
        ]);

        const propData = propertyRes.data;
        const images = propData.images ?? [];
        const cover = images.find((img: { isCover?: boolean }) => img.isCover) ?? images[0];

        setProperty({
          id: propData.id,
          name: propData.name,
          location: propData.location,
          nightlyRate: propData.nightlyRate,
          currency: propData.currency,
          maxGuests: propData.maxGuests,
          coverImageUrl: cover?.url ?? null,
        });

        if (!availRes.data.available) {
          setError("These dates are no longer available. Please go back and choose different dates.");
          setLoading(false);
          return;
        }

        setNights(availRes.data.nights);
        setNightlyRate(availRes.data.nightlyRate);
        setTotalAmount(availRes.data.totalAmount);
        setCurrency(availRes.data.currency);
        setMaxGuests(availRes.data.maxGuests);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [propertyId, checkIn, checkOut]);

  // Poll availability every 30 seconds while on checkout page
  useEffect(() => {
    if (!propertyId || !checkIn || !checkOut || loading || datesUnavailable) return;

    const poll = async () => {
      try {
        const res = await checkAvailability({ propertyId, checkInDate: checkIn, checkOutDate: checkOut });
        if (!res.data.available) {
          setDatesUnavailable(true);
          setError("These dates have just been booked. Please go back and choose different dates.");
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, [propertyId, checkIn, checkOut, loading, datesUnavailable]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;

    setSubmitting(true);
    setError(null);

    // Final availability check before hitting payment gateway
    try {
      const availCheck = await checkAvailability({ propertyId, checkInDate: checkIn, checkOutDate: checkOut });
      if (!availCheck.data.available) {
        setDatesUnavailable(true);
        setError("These dates have just been booked. Please go back and choose different dates.");
        setSubmitting(false);
        return;
      }
    } catch {
      // If availability check fails, let the server-side check handle it
    }

    try {
      const response = await initiateBooking({
        propertyId: property.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guestName,
        guestEmail,
        guestPhone,
        numberOfGuests,
        notes: notes || undefined,
      });

      window.location.href = response.data.checkoutUrl;
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div
            className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-200"
            style={{ borderTopColor: "#0f766e" }}
          />
          <p className="mt-4 text-sm text-zinc-500">Loading checkout...</p>
        </div>
      </main>
    );
  }

  if (error && !property) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-5">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold text-zinc-900">Oops!</h1>
          <p className="mt-2 text-sm text-zinc-600">{error}</p>
          <Link
            href="/properties"
            className="mt-6 inline-block rounded-xl px-6 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: "#0f766e" }}
          >
            Browse properties
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href={`/properties/${propertyId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 hover:text-zinc-600 mb-6"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to property
        </Link>
        {/* Booking summary strip — always visible at top */}
        <div className="flex items-center gap-3 border-b border-zinc-100 bg-white px-4 py-3 sm:mt-6 sm:rounded-xl sm:border sm:border-zinc-200">
          {property?.coverImageUrl && (
            <img
              src={property.coverImageUrl}
              alt={property?.name ?? ""}
              className="h-14 w-14 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-900">{property?.name}</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {formatDate(checkIn)} – {formatDate(checkOut)} · {nights} night{nights > 1 ? "s" : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-bold text-zinc-900">{formatCurrency(totalAmount, currency)}</p>
            <p className="text-xs text-zinc-500">total</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-0">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-1 space-y-0 sm:mt-4 sm:space-y-4">
          {/* Guest details */}
          <div className="bg-white px-4 py-5 sm:rounded-xl sm:border sm:border-zinc-200 sm:px-5">
            <h2 className="text-base font-bold text-zinc-900">Your details</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Full name</label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-base text-zinc-900 outline-none transition-colors"
                  style={{ fontSize: "16px" }}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="John Banda"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-base text-zinc-900 outline-none transition-colors"
                  style={{ fontSize: "16px" }}
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="john@example.com"
                />
                <p className="mt-1.5 text-xs text-zinc-400">Confirmation will be sent here</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Phone</label>
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-base text-zinc-900 outline-none transition-colors"
                  style={{ fontSize: "16px" }}
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="0991234567"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Guests</label>
                <select
                  required
                  className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-base text-zinc-900 outline-none"
                  style={{ fontSize: "16px" }}
                  value={numberOfGuests}
                  onChange={(e) => setNumberOfGuests(Number(e.target.value))}
                >
                  {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} guest{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Collapsible notes */}
              {!showNotes ? (
                <button
                  type="button"
                  onClick={() => setShowNotes(true)}
                  className="text-sm font-medium active:opacity-70"
                  style={{ color: "#0f766e" }}
                >
                  + Add special requests
                </button>
              ) : (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">Special requests</label>
                  <textarea
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-900 outline-none"
                    style={{ fontSize: "16px" }}
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Early check-in, airport pickup, etc."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Divider on mobile */}
          <div className="h-2 bg-zinc-50 sm:hidden" />

          {/* Payment + policy compact */}
          <div className="bg-white px-4 py-5 sm:rounded-xl sm:border sm:border-zinc-200 sm:px-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Pay with mobile money or card</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Airtel Money · TNM Mpamba · Bank · Card
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Free cancellation</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Full refund up to 48 hrs before check-in
                </p>
              </div>
            </div>
          </div>

          {/* Price breakdown (mobile: above sticky button) */}
          <div className="bg-white px-4 pb-2 pt-4 sm:rounded-xl sm:border sm:border-zinc-200 sm:px-5 sm:py-5">
            <div className="flex justify-between text-sm text-zinc-500">
              <span>{formatCurrency(nightlyRate, currency)} × {nights} night{nights > 1 ? "s" : ""}</span>
              <span>{formatCurrency(totalAmount, currency)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-zinc-100 pt-2 text-base font-bold text-zinc-900">
              <span>Total</span>
              <span>{formatCurrency(totalAmount, currency)}</span>
            </div>
          </div>

          {/* Desktop submit button */}
          <div className="hidden px-4 sm:block sm:px-0">
            <button
              type="submit"
              disabled={submitting || datesUnavailable}
              style={{ backgroundColor: "#0f766e" }}
              className="w-full rounded-xl py-4 text-base font-semibold text-white active:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Processing...
                </span>
              ) : datesUnavailable ? (
                "Dates no longer available"
              ) : (
                `Proceed to payment · ${formatCurrency(totalAmount, currency)}`
              )}
            </button>
            <p className="mt-3 text-center text-xs text-zinc-400">
              By proceeding, you agree to our terms and cancellation policy.
            </p>
          </div>

          {/* Mobile sticky pay button */}
          <div
            className="sm:hidden"
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 40,
              background: "white",
              borderTop: "1px solid #e5e7eb",
              padding: "12px 16px",
              paddingBottom: "max(12px, env(safe-area-inset-bottom))",
            }}
          >
            <button
              type="submit"
              disabled={submitting || datesUnavailable}
              style={{ backgroundColor: "#0f766e" }}
              className="w-full rounded-xl py-4 text-base font-semibold text-white active:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Processing...
                </span>
              ) : datesUnavailable ? (
                "Dates no longer available"
              ) : (
                `Pay ${formatCurrency(totalAmount, currency)}`
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200"
            style={{ borderTopColor: "#0f766e" }}
          />
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
