import { ReactNode } from "react";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  valuePrefix?: string;
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  valuePrefix = "",
}: StatCardProps) {
  const trendColor = trend?.direction === "up" ? "text-emerald-600" : "text-rose-600";
  const trendIcon = trend?.direction === "up" ? "↑" : "↓";

  return (
    <div className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {valuePrefix}
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {trend && (
              <span className={`text-sm font-medium ${trendColor}`}>
                {trendIcon} {Math.abs(trend.value)}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 p-3 text-indigo-600 dark:text-indigo-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
