"use client";

import { useState } from "react";
import { apiPost } from "../../lib/api";

type AddLoanModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function AddLoanModal({ isOpen, onClose, onSuccess }: AddLoanModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    lenderName: "",
    amount: "",
    dateTaken: new Date().toISOString().split("T")[0],
    dueDate: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiPost("/loans", {
        lenderName: formData.lenderName,
        amount: parseInt(formData.amount),
        dateTaken: formData.dateTaken,
        dueDate: formData.dueDate || undefined,
        notes: formData.notes || undefined,
      });

      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Error creating loan:", error);
      alert("Failed to create loan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      lenderName: "",
      amount: "",
      dateTaken: new Date().toISOString().split("T")[0],
      dueDate: "",
      notes: "",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900">Add Loan</h2>
          <button onClick={handleClose} className="text-zinc-400 hover:text-zinc-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Lender Name *</label>
            <input
              type="text"
              value={formData.lenderName}
              onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Amount (MWK) *</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              placeholder="500000"
              required
              min="1"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Date Taken *</label>
            <input
              type="date"
              value={formData.dateTaken}
              onChange={(e) => setFormData({ ...formData, dateTaken: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Due Date (optional)</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              rows={3}
              placeholder="Add any notes..."
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Add Loan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
