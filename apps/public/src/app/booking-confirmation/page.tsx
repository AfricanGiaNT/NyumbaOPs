"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { fetchPublicBooking } from "@/lib/api";
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
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") ?? "";
  const intentId = searchParams.get("intentId") ?? "";
  const paymentStatus = searchParams.get("status") ?? "";
  const txRef = searchParams.get("tx_ref") ?? "";

  const [booking, setBooking] = useState<PublicBookingDetail["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId && !intentId) {
      setError("No booking reference provided.");
      setLoading(false);
      return;
    }

    // Handle payment failure redirect from PayChangu
    if (paymentStatus === "failed") {
      setError("Payment was not completed. You can try again or contact support.");
      setLoading(false);
      return;
    }

    // If we have intentId but no bookingId, poll for booking creation
    // PayChangu redirects here after successful payment; the webhook creates the booking
    if (intentId && !bookingId) {
      let pollAttempts = 0;
      const maxAttempts = 30; // 1 minute total (2 seconds * 30)
      
      const pollForBooking = async () => {
        try {
          pollAttempts++;
          
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/public/payment-intents/${intentId}`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.status === "COMPLETED" && data.bookingId) {
              // Intent converted to booking — load the booking
              try {
                const bookingResponse = await fetchPublicBooking(data.bookingId);
                setBooking(bookingResponse.data);
                setLoading(false);
                return true; // Signal to stop polling
              } catch {
                // Booking not ready yet, keep polling
              }
            }
          }
          
          if (pollAttempts >= maxAttempts) {
            setError("Payment is being processed. You will receive a confirmation email shortly.");
            setLoading(false);
            return true; // Signal to stop polling
          }
          return false;
        } catch (err) {
          return false; // Continue polling
        }
      };

      const interval = setInterval(async () => {
        const done = await pollForBooking();
        if (done) clearInterval(interval);
      }, 2000);
      
      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (loading) {
          setError("Payment is being processed. You will receive a confirmation email shortly.");
          setLoading(false);
        }
      }, 60000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }

    // Normal flow with bookingId
    if (!bookingId) return;

    const load = async () => {
      try {
        const response = await fetchPublicBooking(bookingId);
        setBooking(response.data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    load();

    // Poll for payment status updates (webhook may take a few seconds)
    const interval = setInterval(async () => {
      try {
        const response = await fetchPublicBooking(bookingId);
        setBooking(response.data);
        if (response.data.paymentStatus === "PAID") {
          clearInterval(interval);
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [bookingId, intentId, paymentStatus, txRef]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-[var(--accent)]" />
          <p className="mt-4 text-sm text-zinc-500">Loading your booking...</p>
        </div>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Booking not found</h1>
          <p className="mt-2 text-sm text-zinc-600">{error ?? "We couldn't find this booking."}</p>
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

  const isPaid = booking.paymentStatus === "PAID";
  const isPending = booking.paymentStatus === "UNPAID" || booking.paymentStatus === "PARTIAL";
  const isCancelled = booking.status === "CANCELLED";

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 hover:text-zinc-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Properties
          </Link>
          <h1 className="text-lg font-bold text-zinc-900">Booking confirmation</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Status Banner */}
        {isPaid && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-bold text-emerald-900">Booking confirmed!</h2>
            <p className="mt-1 text-sm text-emerald-700">
              Your payment has been received. A confirmation email has been sent.
            </p>
          </div>
        )}

        {isPending && !isCancelled && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-amber-900">Payment processing</h2>
            <p className="mt-1 text-sm text-amber-700">
              We&apos;re waiting for your payment confirmation. This usually takes a few moments.
            </p>
            {booking.paymentLink && (
              <a
                href={booking.paymentLink}
                className="mt-4 inline-block rounded-full bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Complete payment
              </a>
            )}
          </div>
        )}

        {isCancelled && (
          <div className="mb-6 rounded-2xl border border-zinc-200 bg-zinc-100 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200">
              <svg className="h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-bold text-zinc-700">Booking cancelled</h2>
            <p className="mt-1 text-sm text-zinc-500">This booking has been cancelled.</p>
          </div>
        )}

        {/* Booking Details Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {booking.propertyImage && (
            <img
              src={booking.propertyImage}
              alt={booking.propertyName}
              className="h-48 w-full rounded-t-2xl object-cover"
            />
          )}

          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">{booking.propertyName}</h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Ref: {booking.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isPaid
                    ? "bg-emerald-100 text-emerald-700"
                    : isCancelled
                      ? "bg-zinc-100 text-zinc-500"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {isPaid ? "Paid" : isCancelled ? "Cancelled" : "Pending"}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-zinc-500">Check-in</p>
                <p className="mt-0.5 font-medium text-zinc-900">{formatDate(booking.checkInDate)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Check-out</p>
                <p className="mt-0.5 font-medium text-zinc-900">{formatDate(booking.checkOutDate)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Guest</p>
                <p className="mt-0.5 font-medium text-zinc-900">{booking.guestName}</p>
              </div>
              <div>
                <p className="text-zinc-500">Guests</p>
                <p className="mt-0.5 font-medium text-zinc-900">
                  {booking.numberOfGuests} guest{booking.numberOfGuests > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-zinc-100 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">
                  {booking.nights ? `${booking.nights} night${booking.nights > 1 ? "s" : ""}` : "Stay"}
                </span>
                <span className="font-medium text-zinc-900">
                  {formatCurrency(booking.totalAmount, booking.currency)}
                </span>
              </div>
              <div className="mt-2 flex justify-between text-sm font-semibold">
                <span className="text-zinc-900">Amount paid</span>
                <span className={isPaid ? "text-emerald-600" : "text-zinc-900"}>
                  {formatCurrency(booking.amountPaid, booking.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        {isPaid && (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-zinc-900">What happens next?</h3>
            <ul className="mt-3 space-y-3 text-sm text-zinc-600">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">1</span>
                <span>Check your email for a detailed confirmation with check-in instructions.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">2</span>
                <span>We will contact you before your arrival with access details.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">3</span>
                <span>WiFi, parking, and local support are included with your stay.</span>
              </li>
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/properties"
            className="flex-1 rounded-full border border-zinc-300 px-6 py-3 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            Browse more properties
          </Link>
          {!isCancelled && (
            <Link
              href={`/cancel-booking?bookingId=${booking.id}`}
              className="flex-1 rounded-full border border-zinc-300 px-6 py-3 text-center text-sm font-medium text-zinc-500 hover:bg-zinc-100"
            >
              Cancel booking
            </Link>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-[var(--accent)]" />
        </main>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
