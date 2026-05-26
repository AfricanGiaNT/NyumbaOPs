"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";
import { Currency, Property, UtilityType } from "@/lib/types";

type Props = {
  isOpen: boolean;
  properties: Property[];
  onClose: () => void;
  onSuccess: () => void;
};

const UTILITY_LABELS: Record<UtilityType, string> = {
  ELECTRICITY: "Electricity",
  WATER: "Water",
  GAS: "Gas",
  INTERNET: "Internet",
  OTHER: "Other",
};

export function LogUtilityBillModal({ isOpen, properties, onClose, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    propertyId: "",
    type: "ELECTRICITY" as UtilityType,
    amount: "",
    currency: "MWK" as Currency,
    billingDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.propertyId || !form.amount) return;
    setSubmitting(true);
    try {
      await apiPost("/utility-bills", {
        propertyId: form.propertyId,
        type: form.type,
        amount: parseInt(form.amount),
        currency: form.currency,
        billingDate: form.billingDate,
        notes: form.notes || undefined,
      });
      setForm({
        propertyId: "",
        type: "ELECTRICITY",
        amount: "",
        currency: "MWK",
        billingDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to log bill");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Log Utility Bill</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Property *</label>
            <select
              required
              value={form.propertyId}
              onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
            >
              <option value="">Select property…</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Utility Type *</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {(Object.keys(UTILITY_LABELS) as UtilityType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, type })}
                  className={`rounded-lg border py-2 text-xs font-medium transition ${
                    form.type === type
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                      : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {UTILITY_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Amount *</label>
              <input
                type="number"
                required
                min="1"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Currency</label>
              <div className="flex gap-2 h-[38px]">
                {(["MWK", "USD"] as Currency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, currency: c })}
                    className={`flex-1 rounded-lg border text-xs font-medium transition ${
                      form.currency === c
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                        : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Billing Date *</label>
            <input
              type="date"
              required
              value={form.billingDate}
              onChange={(e) => setForm({ ...form, billingDate: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Notes <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="e.g. ESCOM bill for April, meter reading 1240 kWh"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none dark:text-zinc-100"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Log Bill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
