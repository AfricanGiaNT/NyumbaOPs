import { ReactNode } from "react";

type DashboardCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export function DashboardCard({
  title,
  subtitle,
  children,
  className = "",
  action,
}: DashboardCardProps) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-4 ${className}`}
    >
      {(title || action) && (
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h3 className="text-sm sm:text-base font-semibold text-zinc-800 dark:text-zinc-100">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
            )}
          </div>
          {action && (
            <button
              onClick={action.onClick}
              className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
