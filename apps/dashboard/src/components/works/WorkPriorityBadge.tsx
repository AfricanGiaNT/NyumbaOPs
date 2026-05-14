import { WorkPriority } from "@/lib/types";

const CONFIG: Record<WorkPriority, { label: string; className: string }> = {
  LOW: {
    label: "Low",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
  MEDIUM: {
    label: "Medium",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  HIGH: {
    label: "High",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  URGENT: {
    label: "Urgent",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

export function WorkPriorityBadge({ priority }: { priority: WorkPriority }) {
  const { label, className } = CONFIG[priority] ?? CONFIG.MEDIUM;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
