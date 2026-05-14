import { WorkStatus } from "@/lib/types";

const CONFIG: Record<WorkStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  },
};

export function WorkStatusBadge({ status }: { status: WorkStatus }) {
  const { label, className } = CONFIG[status] ?? CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
