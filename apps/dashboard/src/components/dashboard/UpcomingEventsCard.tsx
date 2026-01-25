import Link from "next/link";
import { Booking } from "../../lib/types";
import { DashboardCard } from "./DashboardCard";

type UpcomingEventsCardProps = {
  checkIns: Booking[];
  checkOuts: Booking[];
  loading?: boolean;
};

export function UpcomingEventsCard({
  checkIns,
  checkOuts,
  loading = false,
}: UpcomingEventsCardProps) {
  const hasEvents = checkIns.length > 0 || checkOuts.length > 0;

  if (loading) {
    return (
      <DashboardCard title="Today's Schedule">
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded bg-zinc-100" />
          <div className="h-16 animate-pulse rounded bg-zinc-100" />
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Today's Schedule"
      subtitle="Check-ins and check-outs"
      action={{
        label: "View all",
        onClick: () => (window.location.href = "/bookings"),
      }}
    >
      {!hasEvents ? (
        <div className="py-8 text-center">
          <p className="text-sm text-zinc-500">No events scheduled for today</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Check-ins */}
          {checkIns.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-zinc-700">
                Check-ins ({checkIns.length})
              </h4>
              <div className="space-y-2">
                {checkIns.slice(0, 3).map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/bookings/${booking.id}`}
                    className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-700">
                      {booking.guest?.name?.[0] || "G"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-900">
                        {booking.guest?.name || "Guest"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {booking.property?.name || booking.propertyId}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                      Check-in
                    </span>
                  </Link>
                ))}
                {checkIns.length > 3 && (
                  <p className="text-xs text-zinc-500">
                    +{checkIns.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Check-outs */}
          {checkOuts.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-zinc-700">
                Check-outs ({checkOuts.length})
              </h4>
              <div className="space-y-2">
                {checkOuts.slice(0, 3).map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/bookings/${booking.id}`}
                    className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700">
                      {booking.guest?.name?.[0] || "G"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-900">
                        {booking.guest?.name || "Guest"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {booking.property?.name || booking.propertyId}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                      Check-out
                    </span>
                  </Link>
                ))}
                {checkOuts.length > 3 && (
                  <p className="text-xs text-zinc-500">
                    +{checkOuts.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardCard>
  );
}
