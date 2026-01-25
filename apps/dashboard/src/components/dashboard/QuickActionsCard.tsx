import { useRouter } from "next/navigation";
import { DashboardCard } from "./DashboardCard";
import { ActionButton } from "../ActionButton";

export function QuickActionsCard() {
  const router = useRouter();

  const actions = [
    {
      label: "Add Booking",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      onClick: () => router.push("/bookings"),
      variant: "primary" as const,
    },
    {
      label: "Add Property",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
      onClick: () => router.push("/properties"),
      variant: "secondary" as const,
    },
    {
      label: "View Inquiries",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      onClick: () => router.push("/inquiries"),
      variant: "secondary" as const,
    },
    {
      label: "Add Guest",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
      ),
      onClick: () => router.push("/guests"),
      variant: "secondary" as const,
    },
  ];

  return (
    <DashboardCard title="Quick Actions" subtitle="Common tasks">
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <ActionButton
            key={action.label}
            variant={action.variant}
            onClick={action.onClick}
            className="flex items-center justify-center gap-2 py-4"
          >
            {action.icon}
            <span className="text-sm font-medium">{action.label}</span>
          </ActionButton>
        ))}
      </div>
    </DashboardCard>
  );
}
