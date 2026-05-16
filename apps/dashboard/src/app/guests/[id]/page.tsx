"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet } from "../../../lib/api";
import { Booking, Guest } from "../../../lib/types";
import { EmptyState } from "../../../components/EmptyState";
import { LoadingSkeleton } from "../../../components/LoadingSkeleton";

type GuestDetail = Guest & { bookings: Booking[] };

export default function GuestDetailPage() {
  const params = useParams();
  const guestId = params?.id as string;

  const [guest, setGuest] = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<GuestDetail>(`/guests/${guestId}`)
      .then((data) => setGuest(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [guestId]);

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">{guest?.name ?? "Guest"}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {guest?.email ?? "No email on file"}
            </p>
          </div>
          <Link
            href="/guests"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Back to Guests
          </Link>
        </header>

        {loading && <LoadingSkeleton rows={6} />}
        {!loading && error && (
          <EmptyState title="Unable to load guest" message={error} />
        )}

        {!loading && !error && guest && (
          <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Guest Details</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-zinc-600 dark:text-zinc-400 md:grid-cols-2">
              <div>Phone: {guest.phone ?? "N/A"}</div>
              <div>Source: {guest.source}</div>
              <div>Rating: {guest.rating ?? "N/A"}</div>
              <div>Notes: {guest.notes ?? "None"}</div>
            </div>
          </section>
        )}

        {!loading && !error && (
          <section>
            <h2 className="text-lg font-semibold">Bookings</h2>
            <div className="mt-3 space-y-3">
              {guest?.bookings?.length ? (
                guest.bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-sm"
                  >
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {booking.property?.name ?? booking.propertyId}
                    </div>
                    <div className="text-zinc-500 dark:text-zinc-400">
                      {new Date(booking.checkInDate).toLocaleDateString()} →{" "}
                      {new Date(booking.checkOutDate).toLocaleDateString()}
                    </div>
                    <div className="text-zinc-500 dark:text-zinc-400">Status: {booking.status}</div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No bookings yet"
                  message="Create a booking to start tracking guest stays."
                />
              )}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
