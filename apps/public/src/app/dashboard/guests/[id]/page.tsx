"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/dashboard/api";
import { Booking, Guest } from "@/lib/dashboard/types";
import { EmptyState } from "@/components/dashboard-app/EmptyState";
import { LoadingSkeleton } from "@/components/dashboard-app/LoadingSkeleton";

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
    <div className="min-h-screen bg-zinc-50 px-8 py-10 text-zinc-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{guest?.name ?? "Guest"}</h1>
            <p className="text-sm text-zinc-600">
              {guest?.email ?? "No email on file"}
            </p>
          </div>
          <Link
            href="/dashboard/guests"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Back to Guests
          </Link>
        </header>

        {loading && <LoadingSkeleton rows={6} />}
        {!loading && error && (
          <EmptyState title="Unable to load guest" message={error} />
        )}

        {!loading && !error && guest && (
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Guest Details</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-zinc-600 md:grid-cols-2">
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
                    className="rounded-lg border border-zinc-200 bg-white p-4 text-sm"
                  >
                    <div className="font-medium text-zinc-900">
                      {booking.property?.name ?? booking.propertyId}
                    </div>
                    <div className="text-zinc-500">
                      {new Date(booking.checkInDate).toLocaleDateString()} →{" "}
                      {new Date(booking.checkOutDate).toLocaleDateString()}
                    </div>
                    <div className="text-zinc-500">Status: {booking.status}</div>
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
    </div>
  );
}
