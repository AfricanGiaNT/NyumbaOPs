"use client";

import { useState } from "react";
import { Currency, OutstandingReimbursement, Property } from "../../lib/types";
import { apiPost } from "../../lib/api";
import { DashboardCard } from "./DashboardCard";

type Props = {
  transactions: OutstandingReimbursement[];
  loading?: boolean;
  onReimbursed: () => void;
  properties?: Property[];
  error?: string | null;
  onRetry?: () => void;
};

type GroupedEmployee = {
  name: string;
  expenses: OutstandingReimbursement[];
  totalsByCurrency: Record<string, number>;
};

export function ReimbursementsCard({ transactions, loading = false, onReimbursed, properties = [], error, onRetry }: Props) {
  const [paymentFor, setPaymentFor] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [form, setForm] = useState({ paidBy: "", name: "", amount: "", currency: "MWK" as Currency, propertyId: "", date: new Date().toISOString().split("T")[0] });

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isInteger(amount) || amount < 1 || !form.paidBy.trim() || !form.name.trim()) {
      setAddError("Enter an employee, expense, and whole amount above zero.");
      return;
    }
    setSaving(true);
    setAddError(null);
    try {
      await apiPost("/transactions/expense", { name: form.name.trim(), amount, currency: form.currency, date: new Date(form.date).toISOString(), propertyId: form.propertyId || undefined, paidBy: form.paidBy.trim(), requiresReimbursement: true });
      setForm({ paidBy: "", name: "", amount: "", currency: "MWK", propertyId: "", date: new Date().toISOString().split("T")[0] });
      setShowAdd(false);
      onReimbursed();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not log this reimbursement.");
    } finally {
      setSaving(false);
    }
  };

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

  if (error) {
    return <DashboardCard title="Outstanding Reimbursements"><div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"><span>{error}</span>{onRetry && <button type="button" onClick={onRetry} className="font-semibold underline">Retry</button>}</div></DashboardCard>;
  }

  const outstanding = transactions.filter((tx) => tx.remainingAmount > 0 && tx.paidBy);

  // Group by employee name
  const grouped: Record<string, GroupedEmployee> = {};
  for (const tx of outstanding) {
    const name = tx.paidBy!;
    if (!grouped[name]) {
      grouped[name] = { name, expenses: [], totalsByCurrency: {} };
    }
    grouped[name].expenses.push(tx);
    grouped[name].totalsByCurrency[tx.currency] =
      (grouped[name].totalsByCurrency[tx.currency] ?? 0) + tx.remainingAmount;
  }

  const employees = Object.values(grouped);

  const handleRecordPayment = async (event: React.FormEvent, transaction: OutstandingReimbursement) => {
    event.preventDefault();
    const amount = Number(paymentAmount);
    if (!Number.isInteger(amount) || amount < 1 || amount > transaction.remainingAmount) {
      setPaymentError(`Enter a whole amount from 1 to ${transaction.remainingAmount.toLocaleString()} ${transaction.currency}.`);
      return;
    }
    setPaying(true);
    setPaymentError(null);
    try {
      await apiPost(`/transactions/${transaction.id}/reimbursements`, {
        amount,
        paidAt: new Date(paymentDate).toISOString(),
        notes: paymentNotes.trim() || undefined,
      });
      setPaymentFor(null);
      setPaymentAmount("");
      setPaymentNotes("");
      onReimbursed();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Could not record this payment.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <DashboardCard title="Outstanding Reimbursements" subtitle="Expenses paid out of pocket by employees" action={{ label: showAdd ? "Cancel" : "+ Add reimbursement", onClick: () => { if (!saving) { setShowAdd(!showAdd); setAddError(null); } } }}>
      {showAdd && <form onSubmit={handleAdd} className="mb-3 space-y-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900 dark:bg-indigo-950/20">
        <p className="text-xs text-zinc-600 dark:text-zinc-300">Log an employee-paid expense. It stays outstanding until you mark it reimbursed.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div><label htmlFor="reimbursement-paid-by" className="mb-0.5 block text-xs font-medium">Paid by *</label><input id="reimbursement-paid-by" required value={form.paidBy} onChange={(event) => setForm({ ...form, paidBy: event.target.value })} placeholder="Employee name" className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" /></div>
          <div><label htmlFor="reimbursement-name" className="mb-0.5 block text-xs font-medium">Expense *</label><input id="reimbursement-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="What was paid for?" className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" /></div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)]">
          <div><label htmlFor="reimbursement-amount" className="mb-0.5 block text-xs font-medium">Amount *</label><input id="reimbursement-amount" type="number" min="1" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0" className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" /></div>
          <div><label htmlFor="reimbursement-currency" className="mb-0.5 block text-xs font-medium">Currency</label><select id="reimbursement-currency" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as Currency })} className="w-full rounded-md border border-zinc-300 bg-white px-1 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"><option value="MWK">MWK</option><option value="USD">USD</option></select></div>
          <div className="col-span-2 sm:col-span-1"><label htmlFor="reimbursement-date" className="mb-0.5 block text-xs font-medium">Date</label><input id="reimbursement-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" /></div>
        </div>
        {properties.length > 0 && <div><label htmlFor="reimbursement-property" className="mb-0.5 block text-xs font-medium">Property <span className="font-normal text-zinc-500">(optional)</span></label><select id="reimbursement-property" value={form.propertyId} onChange={(event) => setForm({ ...form, propertyId: event.target.value })} className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"><option value="">General (All)</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></div>}
        {addError && <p role="alert" className="text-xs text-rose-600">{addError}</p>}
        <div className="flex justify-end"><button type="submit" disabled={saving} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Add outstanding expense"}</button></div>
      </form>}
      {employees.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
          <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">All clear — no outstanding reimbursements</p>
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map((employee) => (
            <div key={employee.name} className="overflow-hidden rounded-lg border border-amber-200 dark:border-amber-800">
              <button type="button" aria-expanded={expandedEmployee === employee.name} onClick={() => setExpandedEmployee(expandedEmployee === employee.name ? null : employee.name)} className="flex w-full flex-wrap items-center justify-between gap-2 bg-amber-50 px-3 py-2 text-left dark:bg-amber-950/30">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800 text-xs font-semibold text-amber-800 dark:text-amber-200">
                    {employee.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">{employee.name}</span>
                  <span className="text-xs text-zinc-500">{employee.expenses.length}</span>
                </div>
                <div className="flex items-center gap-2 text-right">
                  {Object.entries(employee.totalsByCurrency).map(([cur, total]) => (
                    <span key={cur} className="text-xs font-bold text-amber-700 dark:text-amber-400">
                      {cur} {total.toLocaleString()} owed
                    </span>
                  ))}
                  <span aria-hidden="true" className="text-zinc-500">{expandedEmployee === employee.name ? "−" : "+"}</span>
                </div>
              </button>

              {expandedEmployee === employee.name && <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {employee.expenses.map((tx) => (
                  <div key={tx.id} className="space-y-2 px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">{tx.name || tx.category?.name || "Expense"}</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          {new Date(tx.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          {tx.property && ` · ${tx.property.name}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{tx.currency} {tx.remainingAmount.toLocaleString()} left</p>
                        {tx.reimbursedAmount > 0 && <p className="text-xs text-zinc-500">{tx.reimbursedAmount.toLocaleString()} paid of {tx.amount.toLocaleString()}</p>}
                      </div>
                      <button type="button" onClick={() => { setPaymentFor(paymentFor === tx.id ? null : tx.id); setPaymentAmount(""); setPaymentNotes(""); setPaymentError(null); }} aria-expanded={paymentFor === tx.id} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500">{paymentFor === tx.id ? "Cancel" : "Record payment"}</button>
                    </div>
                    {paymentFor === tx.id && <form onSubmit={(event) => handleRecordPayment(event, tx)} className="grid gap-2 rounded-lg bg-emerald-50/60 p-2 dark:bg-emerald-950/20 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div><label htmlFor={`payment-amount-${tx.id}`} className="mb-0.5 block text-xs font-medium">Amount received ({tx.currency}) *</label><div className="flex gap-1"><input id={`payment-amount-${tx.id}`} type="number" min="1" max={tx.remainingAmount} required value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" /><button type="button" onClick={() => setPaymentAmount(String(tx.remainingAmount))} className="rounded-md border border-emerald-300 px-2 text-xs text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">Full</button></div></div>
                      <div><label htmlFor={`payment-date-${tx.id}`} className="mb-0.5 block text-xs font-medium">Date received *</label><input id={`payment-date-${tx.id}`} type="date" required value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" /></div>
                      <div className="sm:col-span-2"><label htmlFor={`payment-notes-${tx.id}`} className="mb-0.5 block text-xs font-medium">Notes <span className="font-normal text-zinc-500">(optional)</span></label><input id={`payment-notes-${tx.id}`} value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} placeholder="e.g. first instalment" className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" /></div>
                      {paymentError && <p role="alert" className="text-xs text-rose-600 sm:col-span-2">{paymentError}</p>}
                      <div className="flex items-center justify-between gap-2 sm:col-span-2"><p className="text-xs text-zinc-500">Remaining after payment: {tx.currency} {Math.max(0, tx.remainingAmount - (Number(paymentAmount) || 0)).toLocaleString()}</p><button type="submit" disabled={paying} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{paying ? "Saving…" : "Save payment"}</button></div>
                    </form>}
                    {tx.reimbursementPayments.length > 0 && <details className="text-xs text-zinc-500"><summary className="cursor-pointer">Payment history ({tx.reimbursementPayments.length})</summary><ul className="mt-1 space-y-1 pl-4">{tx.reimbursementPayments.map((payment) => <li key={payment.id}>{new Date(payment.paidAt).toLocaleDateString("en-GB")} · {tx.currency} {payment.amount.toLocaleString()}{payment.notes ? ` · ${payment.notes}` : ""}</li>)}</ul></details>}
                  </div>
                ))}
              </div>}
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
