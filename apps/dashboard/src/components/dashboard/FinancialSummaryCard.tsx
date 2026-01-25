import { AnalyticsSummary } from "../../lib/types";
import { DashboardCard } from "./DashboardCard";

type FinancialSummaryCardProps = {
  summary: AnalyticsSummary | null;
  loading?: boolean;
};

export function FinancialSummaryCard({
  summary,
  loading = false,
}: FinancialSummaryCardProps) {
  if (loading) {
    return (
      <DashboardCard title="Financial Summary">
        <div className="space-y-4">
          <div className="h-20 animate-pulse rounded bg-zinc-100" />
          <div className="h-20 animate-pulse rounded bg-zinc-100" />
        </div>
      </DashboardCard>
    );
  }

  const hasData = summary && summary.totals.length > 0;

  return (
    <DashboardCard
      title="Financial Summary"
      subtitle={summary?.month ? `Month: ${summary.month}` : "Current month"}
    >
      {!hasData ? (
        <div className="py-8 text-center">
          <p className="text-sm text-zinc-500">
            No financial data available yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {summary.totals.map((item) => {
            const profitColor =
              item.profit > 0
                ? "text-emerald-600"
                : item.profit < 0
                  ? "text-rose-600"
                  : "text-zinc-600";
            const profitBg =
              item.profit > 0
                ? "bg-emerald-50"
                : item.profit < 0
                  ? "bg-rose-50"
                  : "bg-zinc-50";

            return (
              <div
                key={item.currency}
                className="rounded-lg border border-zinc-200 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-700">
                    {item.currency}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-bold ${profitBg} ${profitColor}`}
                  >
                    {item.profit > 0 ? "+" : ""}
                    {item.profit.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500">Revenue</p>
                    <p className="font-semibold text-emerald-600">
                      +{item.revenue.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Expenses</p>
                    <p className="font-semibold text-rose-600">
                      -{item.expense.toLocaleString()}
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full bg-emerald-500"
                    style={{
                      width: `${item.revenue > 0 ? Math.min((item.revenue / (item.revenue + item.expense)) * 100, 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}
