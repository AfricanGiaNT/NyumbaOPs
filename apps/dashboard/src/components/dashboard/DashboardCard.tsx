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
      className={`rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-zinc-800">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
            )}
          </div>
          {action && (
            <button
              onClick={action.onClick}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
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
