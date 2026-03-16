import { CurrencySummary } from "@/lib/dashboard/types";

export function SummaryCard({ summary }: { summary: CurrencySummary }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-medium text-zinc-500">{summary.currency}</div>
      <div className="mt-2 text-2xl font-semibold text-zinc-900">
        {summary.currency} {summary.profit}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-zinc-600">
        <div>Revenue: {summary.revenue}</div>
        <div>Expense: {summary.expense}</div>
      </div>
    </div>
  );
}

