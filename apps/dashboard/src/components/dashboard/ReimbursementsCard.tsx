"use client";

import { useState } from "react";
import { Transaction, Currency } from "../../lib/types";
import { apiPatch } from "../../lib/api";
import { DashboardCard } from "./DashboardCard";

type Props = {
  transactions: Transaction[];
  loading?: boolean;
  onReimbursed: () => void;
};

type GroupedEmployee = {
  name: string;
  expenses: Transaction[];
  totalsByCurrency: Record<string, number>;
};

export function ReimbursementsCard({ transactions, loading = false, onReimbursed }: Props) {
  const [reimbursing, setReimbursing] = useState<string | null>(null);

  if (loading) {
    return (
      <DashboardCard title="Outstanding Reimbursements">
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </DashboardCard>
    );
  }

  const outstanding = transactions.filter(
    (tx) => tx.requiresReimbursement && !tx.reimbursedAt && tx.paidBy,
  );

  // Group by employee name
  const grouped: Record<string, GroupedEmployee> = {};
  for (const tx of outstanding) {
    const name = tx.paidBy!;
    if (!grouped[name]) {
      grouped[name] = { name, expenses: [], totalsByCurrency: {} };
    }
    grouped[name].expenses.push(tx);
    grouped[name].totalsByCurrency[tx.currency] =
      (grouped[name].totalsByCurrency[tx.currency] ?? 0) + tx.amount;
  }

  const employees = Object.values(grouped);

  const handleMarkReimbursed = async (txId: string) => {
    setReimbursing(txId);
    try {
      await apiPatch(`/transactions/${txId}/reimburse`, {});
      onReimbursed();
    } catch (err) {
      console.error(err);
      alert("Failed to mark as reimbursed");
    } finally {
      setReimbursing(null);
    }
  };

  return (
    <DashboardCard title="Outstanding Reimbursements" subtitle="Expenses paid out of pocket by employees">
      {employees.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
          <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">All clear — no outstanding reimbursements</p>
        </div>
      ) : (
        <div className="space-y-4">
          {employees.map((employee) => (
            <div key={employee.name} className="rounded-lg border border-amber-200 dark:border-amber-800 overflow-hidden">
              {/* Employee header */}
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800 text-sm font-semibold text-amber-800 dark:text-amber-200">
                    {employee.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{employee.name}</span>
                </div>
                <div className="text-right">
                  {Object.entries(employee.totalsByCurrency).map(([cur, total]) => (
                    <p key={cur} className="text-sm font-bold text-amber-700 dark:text-amber-400">
                      {cur} {total.toLocaleString()}
                    </p>
                  ))}
                </div>
              </div>

              {/* Expense list */}
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {employee.expenses.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {tx.name || tx.category?.name || "Expense"}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        {new Date(tx.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {tx.property && ` · ${tx.property.name}`}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                        {tx.currency} {tx.amount.toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleMarkReimbursed(tx.id)}
                        disabled={reimbursing === tx.id}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition"
                      >
                        {reimbursing === tx.id ? "..." : "Reimbursed"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
