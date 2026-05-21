"use client";

import { Transaction, Property, Currency } from "../../lib/types";
import { DashboardCard } from "./DashboardCard";

type Props = {
  transactions: Transaction[];
  properties: Property[];
  loading?: boolean;
};

type CurrencyTotals = { revenue: number; expense: number; profit: number };
type PropertySummary = {
  id: string;
  name: string;
  byCurrency: Record<string, CurrencyTotals>;
};

const CURRENCIES: Currency[] = ["MWK", "USD"];

function emptyCurrencyMap(): Record<string, CurrencyTotals> {
  return { MWK: { revenue: 0, expense: 0, profit: 0 }, USD: { revenue: 0, expense: 0, profit: 0 } };
}

export function PropertyFinancialBreakdown({ transactions, properties, loading = false }: Props) {
  if (loading) {
    return (
      <DashboardCard title="Property Breakdown (This Month)">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      </DashboardCard>
    );
  }

  const UNASSIGNED = "__unassigned__";

  // Build per-property summaries, seeding all active properties
  const summaryMap: Record<string, PropertySummary> = {};
  for (const p of properties) {
    summaryMap[p.id] = { id: p.id, name: p.name, byCurrency: emptyCurrencyMap() };
  }
  summaryMap[UNASSIGNED] = { id: UNASSIGNED, name: "General / Unassigned", byCurrency: emptyCurrencyMap() };

  for (const tx of transactions) {
    const key = tx.propertyId ?? UNASSIGNED;
    if (!summaryMap[key]) {
      summaryMap[key] = { id: key, name: tx.property?.name ?? "Unknown", byCurrency: emptyCurrencyMap() };
    }
    const cur = tx.currency;
    if (!summaryMap[key].byCurrency[cur]) {
      summaryMap[key].byCurrency[cur] = { revenue: 0, expense: 0, profit: 0 };
    }
    const totals = summaryMap[key].byCurrency[cur];
    if (tx.type === "REVENUE") {
      totals.revenue += tx.amount;
    } else {
      totals.expense += tx.amount;
    }
    totals.profit = totals.revenue - totals.expense;
  }

  const propertyRows = properties.map((p) => summaryMap[p.id]).filter(Boolean);
  const unassignedRow = summaryMap[UNASSIGNED];
  const unassignedHasData = CURRENCIES.some(
    (c) => unassignedRow.byCurrency[c].revenue > 0 || unassignedRow.byCurrency[c].expense > 0,
  );
  const displayRows = [...propertyRows, ...(unassignedHasData ? [unassignedRow] : [])];

  return (
    <DashboardCard title="Property Breakdown (This Month)">
      {displayRows.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No transactions recorded this month</p>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="pb-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Property</th>
                <th className="hidden sm:table-cell pb-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400">Revenue</th>
                <th className="hidden sm:table-cell pb-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400">Expenses</th>
                <th className="pb-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
              {displayRows.map((row) => {
                const activeCurrencies = CURRENCIES.filter(
                  (c) => row.byCurrency[c].revenue > 0 || row.byCurrency[c].expense > 0,
                );

                if (activeCurrencies.length === 0) {
                  return (
                    <tr key={row.id}>
                      <td className="py-2.5 font-medium text-zinc-700 dark:text-zinc-300 max-w-[150px] sm:max-w-none truncate">{row.name}</td>
                      <td className="hidden sm:table-cell py-2.5 text-right text-zinc-400">—</td>
                      <td className="hidden sm:table-cell py-2.5 text-right text-zinc-400">—</td>
                      <td className="py-2.5 text-right text-zinc-400">—</td>
                    </tr>
                  );
                }

                return activeCurrencies.map((cur, idx) => {
                  const t = row.byCurrency[cur];
                  return (
                    <tr key={`${row.id}-${cur}`}>
                      <td className="py-2.5 font-medium text-zinc-700 dark:text-zinc-300 max-w-[150px] sm:max-w-none">
                        <span className="block truncate">
                          {idx === 0 ? row.name : ""}
                        </span>
                        {activeCurrencies.length > 1 && (
                          <span className="text-xs text-zinc-400">({cur})</span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell py-2.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {t.revenue > 0 ? `+${t.revenue.toLocaleString()}` : "—"}
                      </td>
                      <td className="hidden sm:table-cell py-2.5 text-right font-medium text-rose-600 dark:text-rose-400">
                        {t.expense > 0 ? `-${t.expense.toLocaleString()}` : "—"}
                      </td>
                      <td className={`py-2.5 text-right font-semibold ${
                        t.profit > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : t.profit < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-zinc-500 dark:text-zinc-400"
                      }`}>
                        {`${t.profit >= 0 ? "+" : ""}${t.profit.toLocaleString()}`}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardCard>
  );
}
