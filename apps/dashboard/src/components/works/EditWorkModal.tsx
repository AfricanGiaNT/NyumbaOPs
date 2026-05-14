"use client";

import { useEffect, useState } from "react";
import { apiPatch } from "@/lib/api";
import { Currency, Work, WorkCategory, WorkPriority, WorkStatus } from "@/lib/types";

type Props = {
  work: Work | null;
  onClose: () => void;
  onSuccess?: () => void;
};

const PRIORITIES: WorkPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STATUSES: WorkStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const CATEGORIES: WorkCategory[] = [
  "PLUMBING", "ELECTRICAL", "PAINTING", "CLEANING",
  "CARPENTRY", "APPLIANCE", "HVAC", "LANDSCAPING", "GENERAL", "OTHER",
];

function formatLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

export function EditWorkModal({ work, onClose, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "PENDING" as WorkStatus,
    priority: "MEDIUM" as WorkPriority,
    category: "GENERAL" as WorkCategory,
    scheduledDate: "",
    completedDate: "",
    estimatedCost: "",
    actualCost: "",
    currency: "MWK" as Currency,
    notes: "",
  });

  useEffect(() => {
    if (work) {
      setForm({
        title: work.title,
        description: work.description ?? "",
        status: work.status,
        priority: work.priority,
        category: work.category,
        scheduledDate: work.scheduledDate ? work.scheduledDate.split("T")[0] : "",
        completedDate: work.completedDate ? work.completedDate.split("T")[0] : "",
        estimatedCost: work.estimatedCost?.toString() ?? "",
        actualCost: work.actualCost?.toString() ?? "",
        currency: work.currency,
        notes: work.notes ?? "",
      });
    }
  }, [work]);

  const isCompleting = form.status === "COMPLETED" && work?.status !== "COMPLETED";
  const willCreateExpense = isCompleting && parseInt(form.actualCost || "0") > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!work) return;
    setSubmitting(true);
    try {
      await apiPatch(`/works/${work.id}`, {
        title: form.title,
        description: form.description || undefined,
        status: form.status,
        priority: form.priority,
        category: form.category,
        scheduledDate: form.scheduledDate || undefined,
        completedDate: form.completedDate || undefined,
        estimatedCost: form.estimatedCost ? parseInt(form.estimatedCost) : undefined,
        actualCost: form.actualCost ? parseInt(form.actualCost) : undefined,
        currency: form.currency,
        notes: form.notes || undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to update work order");
    } finally {
      setSubmitting(false);
    }
  };

  if (!work) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-zinc-900 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Edit Work Order</h2>
            <p className="text-xs text-zinc-500 truncate max-w-xs">{work.title}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as WorkStatus })}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{formatLabel(s)}</option>)}
              </select>
            </div>

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

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Description <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Scheduled Date */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Scheduled Date</label>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
              />
            </div>

            {/* Completed Date */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Completed Date</label>
              <input
                type="date"
                value={form.completedDate}
                onChange={(e) => setForm({ ...form, completedDate: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Estimated Cost */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Est. Cost</label>
              <input
                type="number"
                value={form.estimatedCost}
                onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
                min="0"
                placeholder="0"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
              />
            </div>

            {/* Actual Cost */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Actual Cost</label>
              <input
                type="number"
                value={form.actualCost}
                onChange={(e) => setForm({ ...form, actualCost: e.target.value })}
                min="0"
                placeholder="0"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:text-zinc-100"
              />
            </div>
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
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
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

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Notes <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none dark:text-zinc-100"
            />
          </div>

          {/* Auto-expense notice */}
          {willCreateExpense && (
            <div className="flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
              <svg className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-green-700 dark:text-green-400">
                A <strong>Maintenance expense</strong> of {form.currency} {parseInt(form.actualCost).toLocaleString()} will be automatically recorded in Finance.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
