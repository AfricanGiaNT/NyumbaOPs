import Link from "next/link";
import { Property } from "@/lib/dashboard/types";
import { DashboardCard } from "./DashboardCard";

type PropertiesOverviewCardProps = {
  properties: Property[];
  loading?: boolean;
};

export function PropertiesOverviewCard({
  properties,
  loading = false,
}: PropertiesOverviewCardProps) {
  if (loading) {
    return (
      <DashboardCard title="Property Overview">
        <div className="space-y-4">
          <div className="h-16 animate-pulse rounded bg-zinc-100" />
          <div className="h-16 animate-pulse rounded bg-zinc-100" />
        </div>
      </DashboardCard>
    );
  }

  const statusCounts = properties.reduce(
    (acc, property) => {
      acc[property.status] = (acc[property.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const statusConfig = [
    {
      status: "ACTIVE",
      label: "Active",
      color: "text-emerald-700 bg-emerald-100",
      dotColor: "bg-emerald-500",
    },
    {
      status: "MAINTENANCE",
      label: "Maintenance",
      color: "text-amber-700 bg-amber-100",
      dotColor: "bg-amber-500",
    },
    {
      status: "INACTIVE",
      label: "Inactive",
      color: "text-zinc-700 bg-zinc-100",
      dotColor: "bg-zinc-500",
    },
  ];

  return (
    <DashboardCard
      title="Property Overview"
      subtitle={`${properties.length} total properties`}
      action={{
        label: "View all",
        onClick: () => (window.location.href = "/dashboard/properties"),
      }}
    >
      {properties.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-zinc-500">No properties yet</p>
          <Link
            href="/dashboard/properties"
            className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Add your first property
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {statusConfig.map(({ status, label, color, dotColor }) => {
            const count = statusCounts[status] || 0;
            return (
              <div
                key={status}
                className="flex items-center justify-between rounded-lg border border-zinc-100 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${dotColor}`} />
                  <span className="text-sm font-medium text-zinc-700">
                    {label}
                  </span>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${color}`}
                >
                  {count}
                </span>
              </div>
            );
          })}

          {/* Total summary */}
          <div className="mt-4 rounded-lg bg-indigo-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-indigo-900">
                Total Properties
              </span>
              <span className="text-2xl font-bold text-indigo-900">
                {properties.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
