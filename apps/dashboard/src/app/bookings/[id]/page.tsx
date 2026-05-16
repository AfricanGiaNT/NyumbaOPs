"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch } from "../../../lib/api";
import { Booking, BookingStatus, Payment } from "../../../lib/types";
import { EmptyState } from "../../../components/EmptyState";
import { LoadingSkeleton } from "../../../components/LoadingSkeleton";
import { PaymentModal } from "../../../components/PaymentModal";

const statusOptions: BookingStatus[] = [
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
];

type StatusForm = {
  status: BookingStatus;
  actualCheckIn: string;
  actualCheckOut: string;
  checkInNotes: string;
  checkOutNotes: string;
};

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params?.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [form, setForm] = useState<StatusForm>({
    status: "CONFIRMED",
    actualCheckIn: "",
    actualCheckOut: "",
    checkInNotes: "",
    checkOutNotes: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const bookingData = await apiGet<Booking>(`/bookings/${bookingId}`);
        setBooking(bookingData);
        setForm((prev) => ({ ...prev, status: bookingData.status }));
        const paymentResponse = await apiGet<{ success: boolean; data: Payment[] }>(
          `/bookings/${bookingId}/payments`,
        );
        setPayments(paymentResponse.data ?? []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId]);

  const allowedStatuses = useMemo(() => {
    if (!booking) {
      return statusOptions;
    }
    if (booking.status === "PENDING") {
      return ["CONFIRMED", "CANCELLED"];
    }
    if (booking.status === "CONFIRMED") {
      return ["CHECKED_IN", "CANCELLED"];
    }
    if (booking.status === "CHECKED_IN") {
      return ["COMPLETED"];
    }
    return [];
  }, [booking]);

  const handleStatusUpdate = async () => {
    if (!booking) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        status: form.status,
        actualCheckIn: form.actualCheckIn || undefined,
        actualCheckOut: form.actualCheckOut || undefined,
        checkInNotes: form.checkInNotes || undefined,
        checkOutNotes: form.checkOutNotes || undefined,
      };
      const updated = await apiPatch<Booking>(`/bookings/${booking.id}/status`, payload);
      setBooking(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Booking</h1>
            <p className="text-sm text-zinc-600">
              {booking?.guest?.name ?? booking?.guestId ?? "Guest"} →{" "}
              {booking?.property?.name ?? booking?.propertyId ?? "Property"}
            </p>
          </div>
          <Link
            href="/bookings"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Back to Bookings
          </Link>
        </header>

        {loading && <LoadingSkeleton rows={6} />}
        {!loading && error && (
          <EmptyState title="Unable to load booking" message={error} />
        )}

        {!loading && !error && booking && (
          <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Details</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-zinc-600 dark:text-zinc-400 md:grid-cols-2">
              <div>Status: {booking.status}</div>
              <div>
                Dates: {new Date(booking.checkInDate).toLocaleDateString()} →{" "}
                {new Date(booking.checkOutDate).toLocaleDateString()}
              </div>
              <div>Notes: {booking.notes ?? "None"}</div>
            </div>
          </section>
        )}

        {!loading && !error && booking && (
          <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Payments</h2>
              <button
                type="button"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                onClick={() => setShowPaymentModal(true)}
              >
                Add payment
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-zinc-600 dark:text-zinc-400 md:grid-cols-3">
              <div>Total: {booking.totalAmount ?? 0}</div>
              <div>Paid: {booking.amountPaid ?? 0}</div>
              <div>Status: {booking.paymentStatus ?? "UNPAID"}</div>
            </div>
            <div className="mt-4 space-y-2">
              {payments.length === 0 ? (
                <p className="text-sm text-zinc-500">No payments recorded yet.</p>
              ) : (
                payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <span>
                      {payment.amount} {payment.currency} • {payment.method}
                    </span>
                    <span className="text-xs text-zinc-500">{payment.status}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {!loading && !error && booking && (
          <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Update Status</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <select
                className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as BookingStatus,
                  }))
                }
                disabled={allowedStatuses.length === 0}
              >
                {allowedStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                value={form.actualCheckIn}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, actualCheckIn: event.target.value }))
                }
              />
              <input
                type="datetime-local"
                className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                value={form.actualCheckOut}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, actualCheckOut: event.target.value }))
                }
              />
              <input
                className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                placeholder="Check-in notes"
                value={form.checkInNotes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, checkInNotes: event.target.value }))
                }
              />
              <input
                className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                placeholder="Check-out notes"
                value={form.checkOutNotes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, checkOutNotes: event.target.value }))
                }
              />
              <button
                type="button"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
                onClick={handleStatusUpdate}
                disabled={submitting || allowedStatuses.length === 0}
              >
                {submitting ? "Updating..." : "Update Status"}
              </button>
              {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>
          </section>
        )}

        {booking && showPaymentModal && (
          <PaymentModal
            bookingId={booking.id}
            currency={booking.currency ?? "MWK"}
            remainingAmount={(booking.totalAmount ?? 0) - (booking.amountPaid ?? 0)}
            onClose={() => setShowPaymentModal(false)}
            onPaymentAdded={(payment) => setPayments((prev) => [payment, ...prev])}
          />
        )}
      </div>
    </AppLayout>
  );
}
