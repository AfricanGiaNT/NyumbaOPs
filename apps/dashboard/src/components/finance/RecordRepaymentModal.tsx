"use client";

import { useState } from "react";
import { apiPost } from "../../lib/api";
import { Loan } from "../../lib/types";

type RecordRepaymentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  onSuccess?: () => void;
};

export function RecordRepaymentModal({
  isOpen,
  onClose,
  loan,
  onSuccess,
}: RecordRepaymentModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const remainingBalance = loan ? loan.amount - loan.amountRepaid : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loan) return;

    const amount = parseInt(formData.amount);
    if (amount > remainingBalance) {
      alert(`Repayment amount cannot exceed remaining balance (MWK ${remainingBalance.toLocaleString()})`);
      return;
    }

    setSubmitting(true);

    try {
      await apiPost(`/loans/${loan.id}/repayments`, {
        amount,
        date: formData.date,
        notes: formData.notes || undefined,
      });

      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Error recording repayment:", error);
      alert("Failed to record repayment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      amount: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    onClose();
  };

  if (!isOpen || !loan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900">Record Repayment</h2>
          <button onClick={handleClose} className="text-zinc-400 hover:text-zinc-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-zinc-50 p-4">
          <p className="text-sm text-zinc-600">Loan from: {loan.lenderName}</p>
          <p className="text-sm text-zinc-600">
            Remaining Balance:{" "}
            <span className="font-semibold text-zinc-900">MWK {remainingBalance.toLocaleString()}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Repayment Amount (MWK) *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              placeholder="100000"
              required
              min="1"
              max={remainingBalance}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Maximum: MWK {remainingBalance.toLocaleString()}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Payment Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              required
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
              {submitting ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
