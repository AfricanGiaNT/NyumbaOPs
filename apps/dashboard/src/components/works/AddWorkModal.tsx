"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { Currency, Property, WorkCategory, WorkPriority } from "@/lib/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const PRIORITIES: WorkPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const CATEGORIES: WorkCategory[] = [
  "PLUMBING", "ELECTRICAL", "PAINTING", "CLEANING",
  "CARPENTRY", "APPLIANCE", "HVAC", "LANDSCAPING", "GENERAL", "OTHER",
];

function formatLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

export function AddWorkModal({ isOpen, onClose, onSuccess }: Props) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    propertyId: "",
    description: "",
    priority: "MEDIUM" as WorkPriority,
    category: "GENERAL" as WorkCategory,
    scheduledDate: "",
    estimatedCost: "",
    currency: "MWK" as Currency,
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      apiGet<Property[]>("/properties")
        .then(setProperties)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost("/works", {
        title: form.title,
        propertyId: form.propertyId,
        description: form.description || undefined,
        priority: form.priority,
        category: form.category,
        scheduledDate: form.scheduledDate || undefined,
        estimatedCost: form.estimatedCost ? parseInt(form.estimatedCost) : undefined,
        currency: form.currency,
        notes: form.notes || undefined,
      });
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error(err);
      alert("Failed to create work order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({
      title: "",
      propertyId: "",
      description: "",
      priority: "MEDIUM",
      category: "GENERAL",
      scheduledDate: "",
      estimatedCost: "",
      currency: "MWK",
      notes: "",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-zinc-900 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">New Work Order</h2>
            <p className="text-xs text-zinc-500">Log a maintenance or repair task</p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="e.g. Fix leaking pipe in bathroom"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
              />
            </div>

            {/* Property */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Property *</label>
              <select
                value={form.propertyId}
                onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
              >
                <option value="">Select a property…</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.location ? ` — ${p.location}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as WorkPriority })}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
                >
                  {PRIORITIES.map((p) => <option key={p} value={p}>{formatLabel(p)}</option>)}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as WorkCategory })}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{formatLabel(c)}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Description <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Details about what needs to be done…"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none dark:text-zinc-100"
              />
            </div>

            {/* Scheduled Date */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Scheduled Date <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Estimated Cost */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Est. Cost <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  value={form.estimatedCost}
                  onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
                  min="0"
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Currency</label>
                <div className="flex gap-2">
                  {(["MWK", "USD"] as Currency[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, currency: c })}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
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

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Notes <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Any additional notes…"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none dark:text-zinc-100"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleClose} className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
                {submitting ? "Creating…" : "Create Work Order"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
