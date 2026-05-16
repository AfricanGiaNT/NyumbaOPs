"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiDelete } from "../../lib/api";
import { Transaction, Property, Category, TransactionType, Currency } from "../../lib/types";
import { Period } from "./PeriodSelector";

type TransactionsListProps = {
  refreshTrigger?: number;
  period: Period;
  onTransactionsLoaded?: (transactions: Transaction[]) => void;
};

function buildAnalyticsParams(period: Period): Record<string, string> {
  if (period.type === "month") return { month: period.value };
  if (period.type === "year") return { year: period.value };
  if (period.type === "custom") return { from: period.from, to: period.to };
  return {};
}

export function TransactionsList({ refreshTrigger, period, onTransactionsLoaded }: TransactionsListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    type: "" as TransactionType | "",
    propertyId: "",
    categoryId: "",
    search: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const periodParams = buildAnalyticsParams(period);
      const params = new URLSearchParams(periodParams);
      if (filters.type) params.set("type", filters.type);
      if (filters.propertyId) params.set("propertyId", filters.propertyId);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);

      const [txns, props, cats] = await Promise.all([
        apiGet<Transaction[]>(`/transactions?${params.toString()}`),
        properties.length ? Promise.resolve(properties) : apiGet<Property[]>("/properties"),
        categories.length ? Promise.resolve(categories) : apiGet<Category[]>("/categories"),
      ]);

      setTransactions(txns);
      onTransactionsLoaded?.(txns);
      if (!properties.length) setProperties(props);
      if (!categories.length) setCategories(cats);
    } catch (err) {
      console.error("Error loading transactions:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, filters.type, filters.propertyId, filters.categoryId, refreshTrigger]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await apiDelete(`/transactions/${id}`);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete transaction");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = transactions.filter((t) => {
    if (!filters.search) return true;
    const term = filters.search.toLowerCase();
    return (
      t.name?.toLowerCase().includes(term) ||
      t.notes?.toLowerCase().includes(term) ||
      t.category?.name?.toLowerCase().includes(term) ||
      t.property?.name?.toLowerCase().includes(term)
    );
  });

  const revenueTotal = filtered
    .filter((t) => t.type === "REVENUE")
    .reduce((s, t) => s + t.amount, 0);
  const expenseTotal = filtered
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Type filter */}
        <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          {([["", "All"], ["REVENUE", "Revenue"], ["EXPENSE", "Expenses"]] as [TransactionType | "", string][]).map(
            ([val, label]) => (
              <button
                key={val}
                onClick={() => setFilters((f) => ({ ...f, type: val }))}
                className={`px-3 py-1.5 text-sm font-medium border-r border-zinc-200 dark:border-zinc-700 last:border-r-0 transition ${
                  filters.type === val
                    ? val === "REVENUE"
                      ? "bg-emerald-600 text-white"
                      : val === "EXPENSE"
                      ? "bg-rose-600 text-white"
                      : "bg-indigo-600 text-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>

        {/* Property filter */}
        <select
          value={filters.propertyId}
          onChange={(e) => setFilters((f) => ({ ...f, propertyId: e.target.value }))}
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 shadow-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Category filter */}
        <select
          value={filters.categoryId}
          onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 shadow-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.type === "REVENUE" ? "Rev" : "Exp"})</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search notes, category..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-1.5 pl-9 pr-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Summary row */}
      {filtered.length > 0 && (
        <div className="mb-3 flex gap-4 text-sm">
          <span className="text-zinc-500">{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</span>
          <span className="text-emerald-600 font-medium">Revenue: MWK {revenueTotal.toLocaleString()}</span>
          <span className="text-rose-600 font-medium">Expenses: MWK {expenseTotal.toLocaleString()}</span>
          <span className={`font-semibold ${revenueTotal - expenseTotal >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            Profit: MWK {(revenueTotal - expenseTotal).toLocaleString()}
          </span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-12 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No transactions found</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">Try adjusting the filters or adding a transaction</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Name / Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Property</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Notes</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr
                    key={t.id}
                    className={`border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${i % 2 === 0 ? "" : "bg-zinc-50/40 dark:bg-zinc-800/20"}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {new Date(t.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.type === "REVENUE"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {t.type === "REVENUE" ? "Revenue" : "Expense"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {t.name ? (
                        <span className="font-medium">{t.name}</span>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500 italic">{t.category?.name ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{t.property?.name ?? <span className="text-zinc-400 dark:text-zinc-500">General</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                      <span className={t.type === "REVENUE" ? "text-emerald-600" : "text-rose-600"}>
                        {t.type === "REVENUE" ? "+" : "-"}{t.currency} {t.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-zinc-500 dark:text-zinc-400">{t.notes ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 transition"
                        title="Delete"
                      >
                        {deletingId === t.id ? (
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
