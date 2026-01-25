import Link from "next/link";
import { Inquiry } from "../../lib/types";
import { DashboardCard } from "./DashboardCard";

type InquiriesCardProps = {
  inquiries: Inquiry[];
  loading?: boolean;
};

export function InquiriesCard({
  inquiries,
  loading = false,
}: InquiriesCardProps) {
  if (loading) {
    return (
      <DashboardCard title="New Inquiries">
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
      title="New Inquiries"
      subtitle="Pending responses"
      action={{
        label: "View all",
        onClick: () => (window.location.href = "/inquiries"),
      }}
    >
      {inquiries.length === 0 ? (
        <div className="py-8 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <svg
              className="h-6 w-6 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-900">All caught up!</p>
          <p className="text-xs text-zinc-500">No new inquiries to review</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inquiries.slice(0, 5).map((inquiry) => {
            const isNew = inquiry.status === "NEW";
            return (
              <div
                key={inquiry.id}
                className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/50"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                  {inquiry.guestName?.[0] || "I"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {inquiry.guestName}
                    </p>
                    {isNew && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 truncate">
                    {inquiry.numberOfGuests} guests •{" "}
                    {new Date(inquiry.checkInDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    -{" "}
                    {new Date(inquiry.checkOutDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          {inquiries.length > 5 && (
            <p className="text-center text-xs text-zinc-500">
              +{inquiries.length - 5} more inquiries
            </p>
          )}
        </div>
      )}
    </DashboardCard>
  );
}
