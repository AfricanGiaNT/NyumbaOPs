"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { fetchPublicBooking, cancelPublicBooking } from "@/lib/api";
import type { PublicBookingDetail } from "@/lib/types";
import { Footer } from "@/components/Footer";

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
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function CancelContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") ?? "";

  const [booking, setBooking] = useState<PublicBookingDetail["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [guestEmail, setGuestEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [refundNote, setRefundNote] = useState("");
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundCurrency, setRefundCurrency] = useState("MWK");

  useEffect(() => {
    if (!bookingId) {
      setError("No booking reference provided.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const response = await fetchPublicBooking(bookingId);
        setBooking(response.data);

        if (response.data.status === "CANCELLED") {
          setCancelled(true);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [bookingId]);

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId || !guestEmail) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await cancelPublicBooking(bookingId, guestEmail, reason || undefined);
      setCancelled(true);
      setRefundNote(response.data.refundNote);
      setRefundAmount(response.data.refundAmount);
      setRefundCurrency(response.data.currency);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-[var(--accent)]" />
          <p className="mt-4 text-sm text-zinc-500">Loading booking...</p>
        </div>
      </main>
    );
  }

  if (error && !booking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Booking not found</h1>
          <p className="mt-2 text-sm text-zinc-600">{error}</p>
          <Link
            href="/properties"
            className="mt-6 inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white"
          >
            Browse properties
          </Link>
        </div>
      </main>
    );
  }

  if (cancelled) {
    return (
      <main className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">

          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
              <svg className="h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-bold text-zinc-900">Booking cancelled</h2>
            {refundNote && (
              <p className="mt-2 text-sm text-zinc-600">{refundNote}</p>
            )}
            {refundAmount > 0 && (
              <p className="mt-2 text-sm font-semibold text-emerald-600">
                Refund: {formatCurrency(refundAmount, refundCurrency)}
              </p>
            )}
            <p className="mt-4 text-sm text-zinc-500">
              A cancellation confirmation has been sent to your email.
            </p>
            <Link
              href="/properties"
              className="mt-6 inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white"
            >
              Browse properties
            </Link>
          </div>
        </div>

        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {bookingId && (
          <Link
            href={`/booking-confirmation?bookingId=${bookingId}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 hover:text-zinc-600 mb-6"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to booking
          </Link>
        )}
        {/* Booking summary */}
        {booking && (
          <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-zinc-900">{booking.propertyName}</h3>
            <p className="mt-1 text-xs text-zinc-400">Ref: {booking.id.slice(0, 8).toUpperCase()}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-zinc-500">Check-in</p>
                <p className="font-medium text-zinc-900">{formatDate(booking.checkInDate)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Check-out</p>
                <p className="font-medium text-zinc-900">{formatDate(booking.checkOutDate)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Total</p>
                <p className="font-medium text-zinc-900">{formatCurrency(booking.totalAmount, booking.currency)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Paid</p>
                <p className="font-medium text-zinc-900">{formatCurrency(booking.amountPaid, booking.currency)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation policy */}
        <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-zinc-900">Cancellation policy</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">&#10003;</span>
              <span><strong>Free cancellation</strong> — 48+ hours before check-in (full refund)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-500">&#9679;</span>
              <span><strong>Partial refund</strong> — 24–48 hours before check-in (50% refund)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-rose-500">&#10005;</span>
              <span><strong>No refund</strong> — less than 24 hours before check-in</span>
            </li>
          </ul>
        </div>

        {/* Cancellation form */}
        <form onSubmit={handleCancel} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-zinc-900">Confirm cancellation</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Enter the email address you used when booking to verify your identity.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Email address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Reason for cancellation (optional)
              </label>
              <textarea
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Change of plans, found alternative, etc."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !guestEmail}
            className="mt-6 w-full rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-rose-700 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Cancelling...
              </span>
            ) : (
              "Cancel booking"
            )}
          </button>
        </form>
      </div>

      <Footer />
    </main>
  );
}

export default function CancelBookingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-[var(--accent)]" />
        </main>
      }
    >
      <CancelContent />
    </Suspense>
  );
}
