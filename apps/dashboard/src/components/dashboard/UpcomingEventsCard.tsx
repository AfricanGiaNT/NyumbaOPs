import Link from "next/link";
import { Booking } from "../../lib/types";
import { DashboardCard } from "./DashboardCard";

type UpcomingEventsCardProps = {
  checkIns: Booking[];
  checkOuts: Booking[];
  loading?: boolean;
};

function formatDateLabel(dateKey: string): string {
  const today = new Date().toISOString().split("T")[0];
  if (dateKey === today) return "Today";
  // Parse as local date to avoid timezone display shift
  const [year, month, day] = dateKey.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function UpcomingEventsCard({
  checkIns,
  checkOuts,
  loading = false,
}: UpcomingEventsCardProps) {
  if (loading) {
    return (
      <DashboardCard title="Upcoming Schedule">
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded bg-zinc-100" />
          <div className="h-16 animate-pulse rounded bg-zinc-100" />
        </div>
      </DashboardCard>
    );
  }

  // Group check-ins and check-outs by date (YYYY-MM-DD)
  // Use .split("T")[0] — reliable, timezone-safe extraction from ISO datetime strings
  const eventsByDate = new Map<
    string,
    { checkIns: Booking[]; checkOuts: Booking[] }
  >();

  for (const b of checkIns) {
    const key = b.checkInDate.split("T")[0];
    if (!eventsByDate.has(key)) {
      eventsByDate.set(key, { checkIns: [], checkOuts: [] });
    }
    eventsByDate.get(key)!.checkIns.push(b);
  }

  for (const b of checkOuts) {
    const key = b.checkOutDate.split("T")[0];
    if (!eventsByDate.has(key)) {
      eventsByDate.set(key, { checkIns: [], checkOuts: [] });
    }
    eventsByDate.get(key)!.checkOuts.push(b);
  }

  const sortedDates = [...eventsByDate.keys()].sort();
  const hasEvents = sortedDates.length > 0;

  return (
    <DashboardCard
      title="Upcoming Schedule"
      subtitle="Next 30 days"
      action={{
        label: "View all",
        onClick: () => (window.location.href = "/bookings"),
      }}
    >
      {!hasEvents ? (
        <div className="py-8 text-center">
          <p className="text-sm text-zinc-500">
            No upcoming check-ins or check-outs in the next 30 days
          </p>
        </div>
      ) : (
        <div className="max-h-72 space-y-5 overflow-y-auto pr-1">
          {sortedDates.map((dateKey) => {
            const { checkIns: dayIns, checkOuts: dayOuts } =
              eventsByDate.get(dateKey)!;
            return (
              <div key={dateKey}>
                {/* Date section header */}
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {formatDateLabel(dateKey)}
                </p>

                <div className="space-y-2">
                  {/* Check-ins for this date */}
                  {dayIns.map((booking) => (
                    <Link
                      key={`in-${booking.id}`}
                      href={`/bookings/${booking.id}`}
                      className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/50"
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-700">
                        {booking.guest?.name?.[0]?.toUpperCase() || "G"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {booking.guest?.name || "Guest"}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {booking.property?.name || booking.propertyId}
                        </p>
                      </div>
                      <span className="whitespace-nowrap rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                        Check-in
                      </span>
                    </Link>
                  ))}

                  {/* Check-outs for this date */}
                  {dayOuts.map((booking) => (
                    <Link
                      key={`out-${booking.id}`}
                      href={`/bookings/${booking.id}`}
                      className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/50"
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700">
                        {booking.guest?.name?.[0]?.toUpperCase() || "G"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {booking.guest?.name || "Guest"}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {booking.property?.name || booking.propertyId}
                        </p>
                      </div>
                      <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                        Check-out
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}
