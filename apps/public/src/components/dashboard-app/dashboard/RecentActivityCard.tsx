import Link from "next/link";
import { Booking } from "@/lib/dashboard/types";
import { DashboardCard } from "./DashboardCard";

type RecentActivityCardProps = {
  bookings: Booking[];
  loading?: boolean;
};

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  CHECKED_IN: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-zinc-100 text-zinc-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

export function RecentActivityCard({
  bookings,
  loading = false,
}: RecentActivityCardProps) {
  if (loading) {
    return (
      <DashboardCard title="Recent Bookings">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-zinc-100" />
          ))}
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Recent Bookings"
      subtitle="Latest booking activity"
      action={{
        label: "View all",
        onClick: () => (window.location.href = "/bookings"),
      }}
    >
      {bookings.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-zinc-500">No recent bookings</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/dashboard/bookings/${booking.id}`}
              className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700">
                {booking.guest?.name?.[0] || "G"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">
                  {booking.guest?.name || "Guest"}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {booking.property?.name || booking.propertyId}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  statusColors[booking.status] || statusColors.PENDING
                }`}
              >
                {booking.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
