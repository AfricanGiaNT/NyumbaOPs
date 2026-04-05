"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost } from "../../lib/api";
import { Property, Currency } from "../../lib/types";

type AddExpenseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function AddExpenseModal({ isOpen, onClose, onSuccess }: AddExpenseModalProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    propertyId: "",
    amount: "",
    currency: "MWK" as Currency,
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      apiGet<Property[]>("/properties")
        .then((props) => {
          setProperties(props);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost("/transactions/expense", {
        amount: parseInt(form.amount),
        currency: form.currency,
        date: new Date(form.date).toISOString(),
        notes: form.notes || undefined,
        propertyId: form.propertyId || undefined,
      });
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({
      propertyId: "",
      amount: "",
      currency: "MWK",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Add Expense</h2>
            <p className="text-xs text-zinc-500">Record a business expense or cost</p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-zinc-100" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Property */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Property</label>
              <select
                value={form.propertyId}
                onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="">General (All)</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Amount */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Amount *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  min="1"
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Currency</label>
                <div className="flex gap-2">
                  {(["MWK", "USD"] as Currency[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, currency: c })}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                        form.currency === c
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
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
              <label className="mb-1 block text-sm font-medium text-zinc-700">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Notes <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="e.g. Cleaning supplies for Unit A..."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-zinc-300 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-rose-600 py-2.5 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Expense"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
