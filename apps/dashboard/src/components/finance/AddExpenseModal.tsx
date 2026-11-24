"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost } from "../../lib/api";
import { Property, Currency } from "../../lib/types";
import { ModalFrame } from "../ModalFrame";

type AddExpenseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function AddExpenseModal({ isOpen, onClose, onSuccess }: AddExpenseModalProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    propertyId: "",
    amount: "",
    currency: "MWK" as Currency,
    date: new Date().toISOString().split("T")[0],
    notes: "",
    paidBy: "",
    requiresReimbursement: false,
  });

  useEffect(() => {
    if (isOpen) {
      let active = true;
      setLoading(true);
      apiGet<Property[]>("/properties")
        .then((props) => {
          if (active) setProperties(props);
        })
        .catch(() => { if (active) setError("Could not load properties. You can still enter a general expense."); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiPost("/transactions/expense", {
        name: form.name || undefined,
        amount: parseInt(form.amount),
        currency: form.currency,
        date: new Date(form.date).toISOString(),
        notes: form.notes || undefined,
        propertyId: form.propertyId || undefined,
        paidBy: form.paidBy || undefined,
        requiresReimbursement: form.paidBy ? form.requiresReimbursement : false,
      });
      handleClose();
      onSuccess?.();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({
      name: "",
      propertyId: "",
      amount: "",
      currency: "MWK",
      date: new Date().toISOString().split("T")[0],
      notes: "",
      paidBy: "",
      requiresReimbursement: false,
    });
    setDetailsOpen(false);
    setError(null);
    onClose();
  };

  return (
    <ModalFrame open={isOpen} onClose={handleClose} busy={submitting} title="Log Expense" description="Record a business expense or cost" footer={<div className="flex gap-2">
      <button type="button" onClick={handleClose} disabled={submitting} className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Cancel</button>
      <button type="submit" form="log-expense-form" disabled={submitting} className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50">{submitting ? "Saving..." : "Save Expense"}</button>
    </div>}>
        <form id="log-expense-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
            {error && <p role="alert" className="order-first rounded-lg bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
            {/* Name */}
            <div>
              <label htmlFor="expense-name" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Name <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
              </label>
              <input
                data-initial-focus
                id="expense-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Gas cylinder transport"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Property */}
            <div>
              <label htmlFor="expense-property" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Property</label>
              <select
                id="expense-property"
                value={form.propertyId}
                onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                disabled={loading}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
              >
                <option value="">{loading ? "Loading..." : "General (All)"}</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Amount */}
              <div>
                <label htmlFor="expense-amount" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Amount *</label>
                <input
                  id="expense-amount"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  min="1"
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Currency</label>
                <div className="flex gap-2" role="group" aria-label="Currency">
                  {(["MWK", "USD"] as Currency[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={form.currency === c}
                      onClick={() => setForm({ ...form, currency: c })}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                        form.currency === c
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400"
                          : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Date */}
            <div>
              <label htmlFor="expense-date" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Date *</label>
              <input
                id="expense-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button type="button" aria-expanded={detailsOpen} onClick={() => setDetailsOpen(!detailsOpen)} className="flex w-full items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-left text-sm font-medium text-zinc-700 dark:text-zinc-200"><span>Payment and notes{form.paidBy ? " · employee" : ""}</span><span aria-hidden="true">{detailsOpen ? "−" : "+"}</span></button>

            {/* Notes */}
            <div className={detailsOpen ? "" : "hidden"}>
              <label htmlFor="expense-notes" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Notes <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
              </label>
              <textarea
                id="expense-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="e.g. Cleaning supplies for Unit A..."
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none resize-none"
              />
            </div>

            {/* Paid by employee */}
            <div className={detailsOpen ? "" : "hidden"}>
              <label htmlFor="expense-paid-by" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Paid by <span className="text-zinc-400 dark:text-zinc-500 font-normal">(if employee paid out of pocket)</span>
              </label>
              <input
                id="expense-paid-by"
                type="text"
                value={form.paidBy}
                onChange={(e) => setForm({
                  ...form,
                  paidBy: e.target.value,
                  requiresReimbursement: e.target.value.trim().length > 0,
                })}
                placeholder="e.g. John"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Reimbursement toggle — only shown when paidBy is set */}
            {form.paidBy.trim() && detailsOpen && (
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.requiresReimbursement}
                  onChange={(e) => setForm({ ...form, requiresReimbursement: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Needs reimbursement</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">Track this as money owed to {form.paidBy}</p>
                </div>
              </label>
            )}

          </form>
    </ModalFrame>
  );
}
