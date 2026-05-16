"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet } from "../../lib/api";
import { AnalyticsSummary, Loan, Transaction } from "../../lib/types";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "../../components/dashboard/StatCard";
import { QuickActionsGrid } from "../../components/finance/QuickActionsGrid";
import { LoansSection } from "../../components/finance/LoansSection";
import { AddRevenueModal } from "../../components/finance/AddRevenueModal";
import { AddExpenseModal } from "../../components/finance/AddExpenseModal";
import { TransactionsList } from "../../components/finance/TransactionsList";
import { PeriodSelector, Period } from "../../components/finance/PeriodSelector";

const now = new Date();
const defaultPeriod: Period = {
  type: "month",
  value: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
};

function periodToParams(period: Period): string {
  if (period.type === "month") return `?month=${period.value}`;
  if (period.type === "year") return `?year=${period.value}`;
  if (period.type === "custom") return `?from=${period.from}&to=${period.to}`;
  return "";
}

function exportTransactionsCsv(transactions: Transaction[]) {
  const headers = ["Date", "Type", "Category", "Property", "Amount", "Currency", "Notes"];
  const rows = transactions.map((t) => [
    new Date(t.date).toLocaleDateString("en-GB"),
    t.type,
    t.category?.name ?? "",
    t.property?.name ?? "General",
    t.amount,
    t.currency,
    t.notes ?? "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinancePage() {
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loansLoading, setLoansLoading] = useState(true);
  const [txRefreshKey, setTxRefreshKey] = useState(0);
  const [cachedTransactions, setCachedTransactions] = useState<Transaction[]>([]);

  // Modals
  const [showRevenue, setShowRevenue] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showRepaymentPicker, setShowRepaymentPicker] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setStatsLoading(true);
    try {
      const params = periodToParams(period);
      const result = await apiGet<AnalyticsSummary>(`/analytics/summary${params}`);
      setAnalytics(result);
    } catch (err) {
      console.error("Analytics error:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [period]);

  const loadLoans = useCallback(async () => {
    setLoansLoading(true);
    try {
      const result = await apiGet<Loan[]>("/loans");
      setLoans(result);
    } catch (err) {
      console.error("Loans error:", err);
    } finally {
      setLoansLoading(false);
    }
  }, []);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);
  useEffect(() => { loadLoans(); }, [loadLoans]);

  const handleTransactionSuccess = () => {
    setTxRefreshKey((k) => k + 1);
    loadAnalytics();
  };

  const totalRevenue = analytics?.totals.reduce((s, i) => s + i.revenue, 0) ?? 0;
  const totalExpenses = analytics?.totals.reduce((s, i) => s + i.expense, 0) ?? 0;
  const netProfit = totalRevenue - totalExpenses;
  const outstandingLoans = loans
    .filter((l) => l.status === "ACTIVE")
    .reduce((s, l) => s + (l.amount - l.amountRepaid), 0);

  const periodLabel =
    period.type === "month"
      ? `Month: ${period.value}`
      : period.type === "year"
      ? `Year: ${period.value}`
      : period.type === "custom"
      ? `${period.from} → ${period.to}`
      : "All Time";

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-7xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Finance & Loans</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage your revenue, expenses, and loans
            </p>
          </header>

          {/* Period Selector */}
          <div className="mb-6">
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>

          {/* Financial Overview Stats */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Revenue"
              value={statsLoading ? "—" : totalRevenue.toLocaleString()}
              subtitle={periodLabel}
              valuePrefix="MWK "
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Total Expenses"
              value={statsLoading ? "—" : totalExpenses.toLocaleString()}
              subtitle={periodLabel}
              valuePrefix="MWK "
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <StatCard
              title="Outstanding Loans"
              value={loansLoading ? "—" : outstandingLoans.toLocaleString()}
              subtitle="MWK owed (active loans)"
              valuePrefix="MWK "
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <StatCard
              title="Net Profit"
              value={statsLoading ? "—" : netProfit.toLocaleString()}
              subtitle="Revenue − Expenses"
              valuePrefix="MWK "
              trend={
                !statsLoading
                  ? { value: Math.abs(netProfit), direction: netProfit >= 0 ? "up" : "down" }
                  : undefined
              }
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Quick Actions</h2>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
              <QuickActionsGrid
                onAddRevenue={() => setShowRevenue(true)}
                onAddExpense={() => setShowExpense(true)}
                onAddLoan={() => setShowAddLoan(true)}
                onRecordRepayment={() => setShowRepaymentPicker(true)}
                onExportCsv={() => exportTransactionsCsv(cachedTransactions)}
              />
            </div>
          </div>

          {/* Transactions */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Transactions</h2>
            <TransactionsList
              period={period}
              refreshTrigger={txRefreshKey}
              onTransactionsLoaded={setCachedTransactions}
            />
          </div>

          {/* Loans Management */}
          <div>
            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Loans Management</h2>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <LoansSection
                loans={loans}
                loading={loansLoading}
                onRefresh={loadLoans}
                externalShowAddLoan={showAddLoan}
                onAddLoanClose={() => setShowAddLoan(false)}
                externalShowRepayment={showRepaymentPicker}
                onRepaymentClose={() => setShowRepaymentPicker(false)}
              />
            </div>
          </div>
        </div>

        {/* Modals */}
        <AddRevenueModal
        isOpen={showRevenue}
        onClose={() => setShowRevenue(false)}
        onSuccess={handleTransactionSuccess}
      />
        <AddExpenseModal
          isOpen={showExpense}
          onClose={() => setShowExpense(false)}
          onSuccess={handleTransactionSuccess}
        />
      </AppLayout>
    </ProtectedRoute>
  );
}
