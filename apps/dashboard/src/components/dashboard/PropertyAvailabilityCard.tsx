"use client";

import { useEffect, useState } from "react";
import { Booking, Property } from "../../lib/types";
import { DashboardCard } from "./DashboardCard";

type PropertyAvailabilityCardProps = {
  bookings: Booking[];
  properties: Property[];
  onUnblock: (bookingId: string) => void;
  unblockingId: string | null;
  error: string | null;
  successMsg?: string | null;
  loading?: boolean;
};

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  CHECKED_IN: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-zinc-100 text-zinc-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

const sourceBadge: Record<string, string> = {
  AIRBNB: "bg-orange-100 text-orange-700",
  BOOKING_COM: "bg-cyan-100 text-cyan-700",
  MANUAL: "bg-indigo-100 text-indigo-700",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function PropertyAvailabilityCard({
  bookings,
  properties,
  onUnblock,
  unblockingId,
  error,
  successMsg,
  loading = false,
}: PropertyAvailabilityCardProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setLocalError(error);
  }, [error]);

  if (loading) {
    return (
      <DashboardCard title="Property Availability">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-zinc-100" />
          ))}
        </div>
      </DashboardCard>
    );
  }

  const activeProperties = properties.filter((p) => p.status === "ACTIVE");

  if (activeProperties.length === 0) {
    return (
      <DashboardCard
        title="Property Availability"
        subtitle="Upcoming bookings & blocks"
      >
        <p className="py-6 text-center text-sm text-zinc-500">
          No active properties configured.
        </p>
      </DashboardCard>
    );
  }

  const grouped = activeProperties.map((property) => ({
    property,
    bookings: bookings
      .filter((b) => b.propertyId === property.id)
      .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate)),
  }));

  const allAvailable = grouped.every((g) => g.bookings.length === 0);

  return (
    <DashboardCard
      title="Property Availability"
      subtitle="Upcoming bookings & blocks"
      action={{
        label: "View all",
        onClick: () => (window.location.href = "/bookings"),
      }}
    >
      {localError && (
        <div className="mb-4 flex items-start justify-between gap-2 rounded bg-rose-50 px-3 py-2 text-xs text-rose-600">
          <span>{localError}</span>
          <button
            onClick={() => setLocalError(null)}
            className="font-bold leading-none hover:text-rose-800"
          >
            ×
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {allAvailable ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <p className="text-sm font-medium text-emerald-700">
            All properties are currently available
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ property, bookings: propBookings }) => (
            <div key={property.id}>
              {/* Property header */}
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                    propBookings.length === 0
                      ? "bg-emerald-500"
                      : "bg-amber-400"
                  }`}
                />
                <span className="text-sm font-semibold text-zinc-800">
                  {property.name}
                </span>
                {propBookings.length === 0 && (
                  <span className="text-xs text-zinc-400">Available</span>
                )}
                {propBookings.length > 0 && (
                  <span className="text-xs text-zinc-400">
                    {propBookings.length} upcoming{" "}
                    {propBookings.length === 1 ? "booking" : "bookings"}
                  </span>
                )}
              </div>

              {/* Booking rows */}
              {propBookings.length > 0 && (
                <div className="space-y-2 pl-4">
                  {propBookings.map((booking) => {
                    const source = booking.source ?? "MANUAL";
                    const guestName =
                      booking.guest?.name ||
                      (booking.isSyncedBooking ? "Airbnb Block" : "Guest");
                    const isConfirming = confirmingId === booking.id;
                    const isLoading = unblockingId === booking.id;
                    const canCancel =
                      booking.status === "PENDING" ||
                      booking.status === "CONFIRMED";

                    return (
                      <div
                        key={booking.id}
                        className="rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Source badge */}
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              sourceBadge[source] ?? sourceBadge.MANUAL
                            }`}
                          >
                            {source.replace("_", ".")}
                          </span>

                          {/* Guest name */}
                          <span className="text-sm font-medium text-zinc-800">
                            {guestName}
                          </span>

                          {/* Date range */}
                          <span className="text-xs text-zinc-500">
                            {formatDate(booking.checkInDate)} →{" "}
                            {formatDate(booking.checkOutDate)}
                          </span>

                          {/* Status badge */}
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              statusColors[booking.status] ??
                              statusColors.PENDING
                            }`}
                          >
                            {booking.status}
                          </span>

                          {/* Action area */}
                          <div className="ml-auto flex items-center gap-2">
                            {booking.status === "CHECKED_IN" && (
                              <span className="text-xs italic text-zinc-400">
                                In progress
                              </span>
                            )}

                            {canCancel && !isConfirming && (
                              <button
                                onClick={() => setConfirmingId(booking.id)}
                                disabled={unblockingId !== null}
                                className="rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Unblock
                              </button>
                            )}

                            {canCancel && isConfirming && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    onUnblock(booking.id);
                                    setConfirmingId(null);
                                  }}
                                  disabled={isLoading}
                                  className="rounded border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isLoading ? "Cancelling…" : "Confirm"}
                                </button>
                                <button
                                  onClick={() => setConfirmingId(null)}
                                  disabled={isLoading}
                                  className="rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Keep
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Airbnb sync guidance */}
                        {booking.isSyncedBooking && canCancel && (
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs italic text-zinc-400">
                              This block originated on Airbnb — Unblock removes it from NyumbaOPs only.
                            </p>
                            <p className="text-xs italic text-zinc-400">
                              To fully free these dates, also cancel it on Airbnb. NyumbaOPs will auto-detect the change within 30 min.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
